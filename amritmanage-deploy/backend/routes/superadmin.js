const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Customer = require('../models/Customer');
const DailyLog = require('../models/DailyLog');
const AuthLog = require('../models/AuthLog');
const PlanConfig = require('../models/PlanConfig');
const SystemConfig = require('../models/SystemConfig');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { sendStartTrialEvent, sendSubscribeEvent } = require('../services/metaCapiService');

// Helper to require main superadmin role
const requireMainSuperadmin = (req, res, next) => {
  if (req.user.parentAdminId) {
    return res.status(403).json({ error: 'Access denied. Only the main Superadmin can perform this action.' });
  }
  next();
};

// All routes require superadmin role
router.use(protect, authorize('superadmin'));

// ── Verify superadmin OTP from DB ─────────────────────────────
const verifySuperadminOtp = async (code) => {
  if (!code) return false;
  const cfg = await SystemConfig.getSingleton();
  return cfg.verifyOtp('superadmin', code.trim());
};

// ── Plan → feature matrix ─────────────────────────────────────
const PLAN_FEATURES = {
  silver:   { whatsapp_alerts: false, pdf_billing: false, advanced_reports: false, custom_message_templates: false },
  gold:     { whatsapp_alerts: true,  pdf_billing: true,  advanced_reports: false, custom_message_templates: false },
  platinum: { whatsapp_alerts: true,  pdf_billing: true,  advanced_reports: true,  custom_message_templates: true  }
};

// ── GET /api/superadmin/owners ────────────────────────────────
router.get('/owners', checkPermission('owners'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const query = { role: 'owner' };

    if (status) query['subscription.status'] = status;
    if (search) {
      // Escape regex special chars to prevent ReDoS
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { businessName: { $regex: escaped, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [owners, total] = await Promise.all([
      User.find(query)
        .select('_id name phone email businessName role ownerRole isActive subscription features createdAt lastLogin')
        .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(query)
    ]);

    const ownerIds = owners.map(o => o._id);
    const [customerCounts, staffCounts] = await Promise.all([
      Customer.aggregate([
        { $match: { ownerId: { $in: ownerIds } } },
        { $group: { _id: '$ownerId', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { ownerId: { $in: ownerIds }, role: 'staff' } },
        { $group: { _id: '$ownerId', count: { $sum: 1 } } }
      ])
    ]);

    const countMap = {};
    customerCounts.forEach(c => { countMap[c._id.toString()] = c.count; });
    const staffMap = {};
    staffCounts.forEach(c => { staffMap[c._id.toString()] = c.count; });

    const enriched = owners.map(o => ({
      ...o,
      customerCount: countMap[o._id.toString()] || 0,
      staffCount: staffMap[o._id.toString()] || 0,
      email: o.email || null
    }));

    res.json({ owners: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/superadmin/owners ───────────────────────────────
router.post('/owners', checkPermission('owners'), async (req, res, next) => {
  try {
    const {
      name, phone, email, password, businessName,
      plan = 'gold',
      subscriptionStatus = 'trial',
      billingCycle = 'monthly',
      months = 1,
      startDate,
      endDate,
      amountPaid = 0,
      setupFeePaid = 0,
      notes = '',
      maxCustomers,
      maxStaff
    } = req.body;

    if (!name || !phone || !password || !email) {
      return res.status(400).json({ error: 'Name, phone, email, and password are required.' });
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'Enter a valid 10-digit phone number.' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existingPhone = await User.findOne({ phone: phone.trim() });
    if (existingPhone) return res.status(400).json({ error: 'Phone number already registered.' });

    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) return res.status(400).json({ error: 'Email already registered.' });

    const planFeatures = PLAN_FEATURES[plan] || PLAN_FEATURES.gold;

    // Compute subscription dates
    const start = startDate ? new Date(startDate) : new Date();
    let end;
    if (endDate) {
      end = new Date(endDate);
    } else if (subscriptionStatus === 'trial') {
      end = new Date(start);
      end.setDate(end.getDate() + 7);
    } else if (billingCycle === 'yearly') {
      end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end = new Date(start);
      end.setMonth(end.getMonth() + parseInt(months));
    }

    // Default plan limits
    const planCfg = await PlanConfig.findOne({ plan }).lean();
    const defaultLim = planCfg?.limits || {
      maxCustomers: plan === 'silver' ? 50 : plan === 'platinum' ? 999999 : 150,
      maxStaff: plan === 'silver' ? 2 : plan === 'platinum' ? 15 : 5
    };
    const finalMaxCustomers = maxCustomers !== undefined && maxCustomers !== '' ? parseInt(maxCustomers) : defaultLim.maxCustomers;
    const finalMaxStaff = maxStaff !== undefined && maxStaff !== '' ? parseInt(maxStaff) : defaultLim.maxStaff;

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const owner = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      password,
      businessName: businessName?.trim() || '',
      role: 'owner',
      ownerRole: req.body.ownerRole || 'milk_supplier',
      features: planFeatures,
      maxCustomers: finalMaxCustomers,
      maxStaff: finalMaxStaff,
      source: req.body.source || 'organic',
      ownerVerificationCode: verificationCode,
      subscription: {
        status: subscriptionStatus,
        plan,
        trialEndsAt: subscriptionStatus === 'trial' ? end : undefined,
        expiresAt: subscriptionStatus !== 'trial' ? end : undefined,
        billingCycle: subscriptionStatus !== 'trial' ? billingCycle : undefined,
        startDate: start,
        amountPaid: parseFloat(amountPaid) || 0,
        setupFeePaid: parseFloat(setupFeePaid) || 0,
        adminNotes: notes || undefined,
      }
    });

    // Fire Meta CAPI events if this owner came from ads_landing
    if (subscriptionStatus === 'trial' || subscriptionStatus === 'active') {
      setImmediate(async () => {
        try {
          const lead = await SubscriptionRequest.findOne({
            contactPhone: phone.trim(),
            source: 'ads_landing',
          }).sort({ createdAt: -1 }).lean();

          if (lead) {
            owner.source = 'ads_landing';
            await owner.save();

            if (owner.source === 'ads_landing') {
              if (subscriptionStatus === 'trial') {
                const trialEventId = require('crypto').randomUUID();
                await SubscriptionRequest.findByIdAndUpdate(lead._id, {
                  ownerId: owner._id,
                  trialEventId,
                });
                await sendStartTrialEvent(lead, trialEventId);
              } else if (subscriptionStatus === 'active') {
                const subscribeEventId = require('crypto').randomUUID();
                await SubscriptionRequest.findByIdAndUpdate(lead._id, {
                  ownerId: owner._id,
                  subscribeEventId,
                });
                const planPrices = { silver: 99, gold: 199, platinum: 399 };
                await sendSubscribeEvent(lead, subscribeEventId, {
                  value:        planPrices[plan] || 199,
                  planName:     plan,
                  billingCycle: billingCycle || 'monthly',
                });
              }
            }
          }
        } catch (err) {
          console.error(`[META CAPI] ${subscriptionStatus} event failed:`, err.message);
        }
      });
    }

    res.status(201).json({ owner });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/owners/:id ────────────────────────────
router.get('/owners/:id', checkPermission('owners'), async (req, res, next) => {
  try {
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    const [customerCount, staffCount, logCount] = await Promise.all([
      Customer.countDocuments({ ownerId: owner._id }),
      User.countDocuments({ ownerId: owner._id, role: 'staff' }),
      DailyLog.countDocuments({ ownerId: owner._id })
    ]);

    res.json({ owner, stats: { customerCount, staffCount, logCount } });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/owners/:id/subscription ─────────────
router.patch('/owners/:id/subscription', checkPermission('owners'), async (req, res, next) => {
  try {
    const { status, plan, expiresAt, trialEndsAt, maxCustomers, maxStaff } = req.body;
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    if (status) owner.subscription.status = status;
    if (plan) {
      owner.subscription.plan = plan;
      const planCfg = await PlanConfig.findOne({ plan }).lean();
      if (planCfg) {
        if (planCfg.features) {
          Object.keys(planCfg.features).forEach(key => {
            owner.features[key] = planCfg.features[key];
          });
        }
        if (planCfg.limits) {
          owner.maxCustomers = planCfg.limits.maxCustomers;
          owner.maxStaff = planCfg.limits.maxStaff;
        }
      } else {
        const planFeatures = PLAN_FEATURES[plan];
        if (planFeatures) {
          Object.keys(planFeatures).forEach(key => { owner.features[key] = planFeatures[key]; });
        }
        const DEFAULT_PLAN_LIMITS = {
          silver: { maxCustomers: 50, maxStaff: 2 },
          gold: { maxCustomers: 150, maxStaff: 5 },
          platinum: { maxCustomers: 999999, maxStaff: 15 }
        };
        const defaultLim = DEFAULT_PLAN_LIMITS[plan];
        if (defaultLim) {
          owner.maxCustomers = defaultLim.maxCustomers;
          owner.maxStaff = defaultLim.maxStaff;
        }
      }
    }
    if (expiresAt) owner.subscription.expiresAt = new Date(expiresAt);
    if (trialEndsAt) owner.subscription.trialEndsAt = new Date(trialEndsAt);

    if (maxCustomers !== undefined && maxCustomers !== '') owner.maxCustomers = parseInt(maxCustomers);
    if (maxStaff !== undefined && maxStaff !== '') owner.maxStaff = parseInt(maxStaff);

    await owner.save();

    // Fire Meta CAPI Subscribe if activating a paid plan for an ads_landing user
    if (status === 'active') {
      setImmediate(async () => {
        try {
          const lead = await SubscriptionRequest.findOne({
            contactPhone: owner.phone,
            source: 'ads_landing',
          }).sort({ createdAt: -1 }).lean();

          if (lead) {
            owner.source = 'ads_landing';
            await owner.save();

            if (owner.source === 'ads_landing') {
              const subscribeEventId = require('crypto').randomUUID();
              const planPrices = { silver: 99, gold: 199, platinum: 399 };
              await SubscriptionRequest.findByIdAndUpdate(lead._id, { subscribeEventId });
              await sendSubscribeEvent(lead, subscribeEventId, {
                value:        planPrices[owner.subscription.plan] || 199,
                planName:     owner.subscription.plan,
                billingCycle: owner.subscription.billingCycle || 'monthly',
              });
            }
          }
        } catch (err) {
          console.error('[META CAPI] Subscribe event failed:', err.message);
        }
      });
    }

    res.json({ owner });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/owners/:id/features ─────────────────
router.patch('/owners/:id/features', checkPermission('owners'), async (req, res, next) => {
  try {
    const { features } = req.body;
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    Object.keys(features).forEach(key => {
      if (owner.features[key] !== undefined) owner.features[key] = features[key];
    });

    await owner.save();
    res.json({ owner });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/owners/:id/role ──────────────────────
router.patch('/owners/:id/role', checkPermission('owners'), async (req, res, next) => {
  try {
    const { ownerRole } = req.body;
    if (!ownerRole || !['dairy_owner', 'milk_supplier'].includes(ownerRole)) {
      return res.status(400).json({ error: 'Invalid owner role.' });
    }
    const owner = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'owner' },
      { ownerRole },
      { new: true }
    );
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });
    res.json({ owner });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/owners/:id/toggle ───────────────────
router.patch('/owners/:id/toggle', checkPermission('owners'), async (req, res, next) => {
  try {
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    owner.isActive = !owner.isActive;
    await owner.save();

    await AuthLog.create({
      event: 'account_disabled',
      role: 'owner',
      userId: owner._id,
      userName: owner.name,
      userPhone: owner.phone,
      detail: `Account ${owner.isActive ? 'enabled' : 'disabled'} by Superadmin ${req.user.name}`,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: req.headers['user-agent']
    });

    res.json({ owner, message: `Account ${owner.isActive ? 'enabled' : 'disabled'}.` });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/password ───────────────────────────
// Superadmin changes their OWN password
router.patch('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword, verificationCode } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Require superadmin verification code from DB
    if (!(await verifySuperadminOtp(verificationCode))) {
      return res.status(401).json({ error: 'Invalid verification code.' });
    }

    const admin = await User.findById(req.user._id).select('+password');
    if (!admin) return res.status(404).json({ error: 'Account not found.' });

    const match = await admin.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    admin.password = newPassword;
    await admin.save();

    await AuthLog.create({
      event: 'password_change',
      role: 'superadmin',
      userId: admin._id,
      userName: admin.name,
      userPhone: admin.phone,
      detail: 'Superadmin changed their own password',
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/owners/:id/password ────────────────
// Superadmin resets an owner's password and optionally changes username
router.patch('/owners/:id/password', checkPermission('owners'), async (req, res, next) => {
  try {
    const { newPassword, newUsername, verificationCode } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Require superadmin verification code from DB
    if (!(await verifySuperadminOtp(verificationCode))) {
      return res.status(401).json({ error: 'Invalid verification code.' });
    }

    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    owner.password = newPassword;

    if (newUsername && newUsername.trim().length >= 3) {
      const uname = newUsername.trim().toLowerCase();
      // Check uniqueness
      const conflict = await User.findOne({ username: uname, _id: { $ne: owner._id } });
      if (conflict) return res.status(400).json({ error: 'Username already taken.' });
      owner.username = uname;
    }

    await owner.save();

    await AuthLog.create({
      event: 'password_reset_success',
      role: 'owner',
      userId: owner._id,
      userName: owner.name,
      userPhone: owner.phone,
      detail: `Password reset by Superadmin ${req.user.name}`,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Owner credentials updated.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/owners/:id/staff ─────────────────────
router.get('/owners/:id/staff', checkPermission('owners'), async (req, res, next) => {
  try {
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    const staff = await User.find({ ownerId: req.params.id, role: 'staff' })
      .select('_id name phone isActive createdAt')
      .sort({ createdAt: -1 }).lean();
    res.json({ staff });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/superadmin/owners/:id/staff ────────────────────
// Superadmin adds a staff member on behalf of an owner
router.post('/owners/:id/staff', checkPermission('owners'), async (req, res, next) => {
  try {
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required.' });
    }

    const existing = await User.findOne({ phone: phone.trim() });
    if (existing) return res.status(400).json({ error: 'Phone already registered.' });

    const staff = await User.create({
      name, phone: phone.trim(), password,
      role: 'staff',
      ownerId: owner._id
    });

    res.status(201).json({ staff });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/staff/:id/password ─────────────────
router.patch('/staff/:id/password', checkPermission('owners'), async (req, res, next) => {
  try {
    const { newPassword, newUsername, verificationCode } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Require superadmin verification code from DB
    if (!(await verifySuperadminOtp(verificationCode))) {
      return res.status(401).json({ error: 'Invalid verification code.' });
    }

    const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
    if (!staff) return res.status(404).json({ error: 'Staff not found.' });

    staff.password = newPassword;

    if (newUsername && newUsername.trim().length >= 3) {
      const uname = newUsername.trim().toLowerCase();
      const conflict = await User.findOne({ username: uname, _id: { $ne: staff._id } });
      if (conflict) return res.status(400).json({ error: 'Username already taken.' });
      staff.username = uname;
    }

    await staff.save();

    await AuthLog.create({
      event: 'password_reset_success',
      role: 'staff',
      userId: staff._id,
      userName: staff.name,
      userPhone: staff.phone,
      detail: `Password reset by Superadmin ${req.user.name}`,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Staff credentials updated.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/owners/:id/customers ─────────────────
// List customers for a specific owner
router.get('/owners/:id/customers', checkPermission('owners'), async (req, res, next) => {
  try {
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    const customers = await Customer.find({ ownerId: owner._id })
      .sort({ name: 1 }).lean();
    res.json({ customers });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/superadmin/owners/:id/customers ────────────────
// Superadmin adds a customer on behalf of an owner
router.post('/owners/:id/customers', checkPermission('owners'), async (req, res, next) => {
  try {
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    const { name, phone, address, base_requirement, default_price, custom_price, notes, assignedStaffId } = req.body;
    if (!name || !phone || default_price === undefined) {
      return res.status(400).json({ error: 'Name, phone, and price are required.' });
    }

    const customer = await Customer.create({
      ownerId: owner._id,
      name, phone, address, notes,
      base_requirement: base_requirement || { morning: 0, evening: 0 },
      default_price,
      custom_price: custom_price || null,
      assignedStaffId: assignedStaffId || null
    });

    res.status(201).json({ customer });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/owners/:id/whatsapp-numbers ────────
// Superadmin can add extra WhatsApp numbers for an owner
// (stored as additional phone numbers allowed to send messages)
router.patch('/owners/:id/whatsapp-numbers', checkPermission('owners'), async (req, res, next) => {
  try {
    const { extraNumbers } = req.body; // array of phone numbers
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    if (!Array.isArray(extraNumbers)) {
      return res.status(400).json({ error: 'extraNumbers must be an array.' });
    }

    // Store in whatsappConfig
    owner.whatsappConfig = owner.whatsappConfig || {};
    owner.whatsappConfig.extraNumbers = extraNumbers.map(n => n.trim()).filter(Boolean);
    owner.markModified('whatsappConfig');
    await owner.save();

    res.json({ message: 'Extra WhatsApp numbers updated.', extraNumbers: owner.whatsappConfig.extraNumbers });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/stats ─────────────────────────────────
router.get('/stats', checkPermission('dashboard'), async (req, res, next) => {
  try {
    const [totalOwners, activeOwners, trialOwners, totalCustomers, todayLogs] = await Promise.all([
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'owner', 'subscription.status': 'active' }),
      User.countDocuments({ role: 'owner', 'subscription.status': 'trial' }),
      Customer.countDocuments({ isActive: true }),
      DailyLog.countDocuments({ date: new Date().toISOString().split('T')[0] })
    ]);

    res.json({ totalOwners, activeOwners, trialOwners, totalCustomers, todayLogs });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  PLAN CONFIG MANAGEMENT
// ═══════════════════════════════════════════════════════════════

router.get('/plan-configs', checkPermission('plans'), async (req, res, next) => {
  try {
    const configs = await PlanConfig.find().sort({ monthlyPrice: 1 }).lean();
    res.json({ configs });
  } catch (err) {
    next(err);
  }
});

router.patch('/plan-configs/:plan', checkPermission('plans'), async (req, res, next) => {
  try {
    const { plan } = req.params;
    const { features, limits, monthlyPrice, setupFee, description, label } = req.body;

    const config = await PlanConfig.findOne({ plan });
    if (!config) {
      return res.status(404).json({ error: `Plan config for '${plan}' not found. Run seed script first.` });
    }

    if (features) {
      Object.keys(features).forEach(k => {
        if (config.features[k] !== undefined) config.features[k] = features[k];
      });
    }
    if (limits) {
      if (limits.maxCustomers !== undefined) config.limits.maxCustomers = limits.maxCustomers;
      if (limits.maxStaff !== undefined) config.limits.maxStaff = limits.maxStaff;
    }
    if (monthlyPrice !== undefined) config.monthlyPrice = monthlyPrice;
    if (setupFee !== undefined) config.setupFee = setupFee;
    if (description !== undefined) config.description = description;
    if (label !== undefined) config.label = label;
    config.lastUpdatedBy = req.user._id;

    await config.save();

    const affectedCount = await User.countDocuments({
      role: 'owner',
      'subscription.plan': plan,
      'subscription.status': 'active'
    });

    res.json({
      config,
      notice: `Plan config updated. ${affectedCount} active owner(s) on this plan will receive the new features on their next renewal.`
    });
  } catch (err) {
    next(err);
  }
});

router.post('/plan-configs/:plan/apply-to-renewals', checkPermission('plans'), async (req, res, next) => {
  try {
    const { plan } = req.params;
    const config = await PlanConfig.findOne({ plan });
    if (!config) return res.status(404).json({ error: 'Plan config not found.' });

    const expiredOwners = await User.find({
      role: 'owner',
      'subscription.plan': plan,
      'subscription.status': { $in: ['expired', 'inactive'] }
    });

    let updated = 0;
    for (const owner of expiredOwners) {
      owner.features = { ...config.features };
      await owner.save();
      updated++;
    }

    res.json({ updated, message: `Applied new ${plan} plan features to ${updated} expired/inactive owner(s).` });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/activities ────────────────────────────
// All delivery logs across all owners/staff with multi-select filters.
// Query params:
//   ownerIds   — comma-separated owner IDs
//   staffIds   — comma-separated staff IDs
//   date       — exact date YYYY-MM-DD
//   dateFrom   — start date YYYY-MM-DD
//   dateTo     — end date YYYY-MM-DD
//   slot       — morning | evening
//   page, limit
router.get('/activities', checkPermission('activities'), async (req, res, next) => {
  try {
    const {
      ownerIds, staffIds, date, dateFrom, dateTo,
      slot, page = 1, limit = 50
    } = req.query;

    const query = {};

    // Multi-select owner filter
    if (ownerIds) {
      const ids = ownerIds.split(',').map(id => id.trim()).filter(Boolean);
      if (ids.length) query.ownerId = { $in: ids };
    }

    // Multi-select staff filter
    if (staffIds) {
      const ids = staffIds.split(',').map(id => id.trim()).filter(Boolean);
      if (ids.length) query.staffId = { $in: ids };
    }

    // Date filters
    if (date) {
      query.date = date;
    } else {
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) query.date.$gte = dateFrom;
        if (dateTo)   query.date.$lte = dateTo;
      }
    }

    if (slot) query.slot = slot;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      DailyLog.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('ownerId',    'name phone businessName')
        .populate('customerId', 'name phone')
        .populate('staffId',    'name phone')
        .lean(),
      DailyLog.countDocuments(query)
    ]);

    // Summary metrics
    const totalLiters  = logs.reduce((s, l) => s + l.delivered_qty, 0);
    const totalRevenue = logs.reduce((s, l) => s + l.amount_calculated, 0);

    res.json({ logs, total, totalLiters, totalRevenue, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/activities/owners-list ────────────────
// Returns all owners for the filter dropdown
router.get('/activities/owners-list', checkPermission('activities'), async (req, res, next) => {
  try {
    const owners = await User.find({ role: 'owner' })
      .select('_id name phone businessName')
      .sort({ name: 1 })
      .lean();
    res.json({ owners });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/activities/staff-list ─────────────────
// Returns all staff (optionally filtered by ownerIds)
router.get('/activities/staff-list', checkPermission('activities'), async (req, res, next) => {
  try {
    const { ownerIds } = req.query;
    const query = { role: 'staff' };
    if (ownerIds) {
      const ids = ownerIds.split(',').map(id => id.trim()).filter(Boolean);
      if (ids.length) query.ownerId = { $in: ids };
    }
    const staff = await User.find(query)
      .select('_id name phone ownerId')
      .sort({ name: 1 })
      .lean();
    res.json({ staff });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/superadmin/reset-code ──────────────────────────
// Superadmin generates a reset code for any user (owner/staff).
// Code is logged to server console only — never returned in response.
router.post('/reset-code', checkPermission('activities'), async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    user.otp = { code, expiresAt, attempts: 0 };
    await user.save({ validateBeforeSave: false });

    // Log to server console only — never expose in API response
    console.log(`[RESET CODE] ${user.name} (${user.phone}): ${code} — expires ${expiresAt.toISOString()}`);

    res.json({
      message: `Reset code generated for ${user.name}. Check the server console for the code.`,
      expiresAt
      // code intentionally NOT returned — admin must check server logs
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/auth-logs ────────────────────────────
// Security/auth event log: logins, logouts, resets, failures
// Query: event, role, userId, dateFrom, dateTo, page, limit
router.get('/auth-logs', checkPermission('activities'), async (req, res, next) => {
  try {
    const { event, role, userId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const query = {};

    if (event) query.event = event;
    if (role)  query.role  = role;
    if (userId) query.userId = userId;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuthLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId',  'name phone role')
        .populate('ownerId', 'name businessName')
        .lean(),
      AuthLog.countDocuments(query)
    ]);

    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/feedback ──────────────────────────────
router.get('/feedback', checkPermission('feedback'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const Feedback = require('../models/Feedback');
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [feedbacks, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('ownerId', 'name phone businessName')
        .lean(),
      Feedback.countDocuments(query)
    ]);

    res.json({ feedbacks, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/feedback/:id ─────────────────────────
router.patch('/feedback/:id', checkPermission('feedback'), async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const Feedback = require('../models/Feedback');
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found.' });

    if (status) feedback.status = status;
    if (adminNotes !== undefined) feedback.adminNotes = adminNotes;
    await feedback.save();

    res.json({ feedback });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/superadmin/impersonate ──────────────────────────
router.post('/impersonate', checkPermission('impersonate'), async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    const targetUser = await User.findOne({ phone: phone.trim() });
    if (!targetUser) return res.status(404).json({ error: 'Account not found with that phone number.' });

    if (targetUser.role === 'superadmin' && !targetUser.parentAdminId) {
      return res.status(400).json({ error: 'Cannot impersonate the main superadmin.' });
    }

    // Sign token with a special flag indicating it was impersonated by superadmin
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: targetUser._id, role: targetUser.role, impersonatedBy: 'superadmin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    let effectiveFeatures = targetUser.features;
    if (targetUser.role === 'owner' && targetUser.subscription?.status === 'trial') {
      try {
        const PlanConfig = require('../models/PlanConfig');
        const planName = targetUser.subscription?.plan || 'gold';
        const planCfg = await PlanConfig.findOne({ plan: planName }).lean();
        if (planCfg) effectiveFeatures = planCfg.features;
      } catch (_) {}
    }

    const payload = {
      _id:             targetUser._id,
      name:            targetUser.name,
      phone:           targetUser.phone,
      role:            targetUser.role,
      ownerId:         targetUser.ownerId,
      businessName:    targetUser.businessName,
      subscription:    targetUser.subscription,
      ownerRole:       targetUser.ownerRole,
      features:        effectiveFeatures,
      onboardingDone:  targetUser.onboardingDone || false,
      parentAdminId:   targetUser.parentAdminId,
      permissions:     targetUser.permissions,
      roleName:        targetUser.roleName,
      impersonated:    true
    };

    res.json({ token, user: payload });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/superadmin/admins ────────────────────────────────
router.get('/admins', requireMainSuperadmin, async (req, res, next) => {
  try {
    const admins = await User.find({
      role: 'superadmin',
      parentAdminId: { $ne: null }
    }).select('-password').sort({ createdAt: -1 });

    res.json({ admins });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/superadmin/admins ───────────────────────────────
router.post('/admins', requireMainSuperadmin, async (req, res, next) => {
  try {
    const { name, phone, email, username, password, roleName, permissions } = req.body;
    if (!name || !phone || !email || !username || !password || !roleName) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check uniqueness
    const exists = await User.findOne({
      $or: [
        { phone: phone.trim() },
        { email: email.trim().toLowerCase() },
        { username: username.trim().toLowerCase() }
      ]
    });
    if (exists) {
      return res.status(400).json({ error: 'An account with this phone, email, or username already exists.' });
    }

    const newAdmin = await User.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      password,
      role: 'superadmin',
      parentAdminId: req.user._id,
      roleName: roleName.trim(),
      permissions: permissions || [],
      isActive: true
    });

    // Log the event
    await AuthLog.create({
      event: 'password_change', // using password_change or other security action
      role: 'superadmin',
      userId: newAdmin._id,
      userName: newAdmin.name,
      userPhone: newAdmin.phone,
      detail: `Sub-admin account created by ${req.user.name}`,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      message: 'Admin account created successfully.',
      admin: {
        _id: newAdmin._id,
        name: newAdmin.name,
        phone: newAdmin.phone,
        email: newAdmin.email,
        username: newAdmin.username,
        roleName: newAdmin.roleName,
        permissions: newAdmin.permissions,
        isActive: newAdmin.isActive
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/admins/:id ──────────────────────────
router.patch('/admins/:id', requireMainSuperadmin, async (req, res, next) => {
  try {
    const { roleName, permissions, isActive } = req.body;
    const admin = await User.findOne({ _id: req.params.id, parentAdminId: req.user._id });
    if (!admin) return res.status(404).json({ error: 'Admin account not found.' });

    let statusLogged = false;
    if (isActive !== undefined && admin.isActive !== isActive) {
      admin.isActive = isActive;
      statusLogged = true;
    }
    if (roleName) admin.roleName = roleName.trim();
    if (permissions) admin.permissions = permissions;

    await admin.save();

    if (statusLogged) {
      await AuthLog.create({
        event: 'account_disabled',
        role: 'superadmin',
        userId: admin._id,
        userName: admin.name,
        userPhone: admin.phone,
        detail: `Sub-admin account ${isActive ? 'enabled' : 'disabled'} by ${req.user.name}`,
        ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
        userAgent: req.headers['user-agent']
      });
    }

    res.json({
      message: 'Admin account updated successfully.',
      admin: {
        _id: admin._id,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        username: admin.username,
        roleName: admin.roleName,
        permissions: admin.permissions,
        isActive: admin.isActive
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/superadmin/admins/:id/password ─────────────────
router.patch('/admins/:id/password', requireMainSuperadmin, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const admin = await User.findOne({ _id: req.params.id, parentAdminId: req.user._id });
    if (!admin) return res.status(404).json({ error: 'Admin account not found.' });

    admin.password = password;
    await admin.save();

    await AuthLog.create({
      event: 'password_change',
      role: 'superadmin',
      userId: admin._id,
      userName: admin.name,
      userPhone: admin.phone,
      detail: `Sub-admin password reset by ${req.user.name}`,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Admin password reset successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
