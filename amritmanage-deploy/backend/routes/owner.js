const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Customer = require('../models/Customer');
const Farmer = require('../models/Farmer');
const DailyLog = require('../models/DailyLog');
const Bill = require('../models/Bill');
const DefaultRate = require('../models/DefaultRate');
const DailyCollection = require('../models/DailyCollection');
const MessageTemplate = require('../models/MessageTemplate');
const SystemConfig = require('../models/SystemConfig');
const AuthLog = require('../models/AuthLog');
const { protect, authorize, requireActiveSubscription } = require('../middleware/auth');

router.use(protect, authorize('owner'), requireActiveSubscription);

// ── Verify owner OTP from DB ──────────────────────────────────
const verifyOwnerOtp = async (code) => {
  if (!code) return false;
  const cfg = await SystemConfig.getSingleton();
  return cfg.verifyOtp('owner', code.trim());
};

// ═══════════════════════════════════════════════════════════════
//  ONBOARDING
// ═══════════════════════════════════════════════════════════════

// PATCH /api/owner/onboarding-done
// Called after owner completes both onboarding pages.
// Sets onboardingDone = true on the user record (persists across devices).
router.patch('/onboarding-done', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { onboardingDone: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════

// GET /api/owner/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const cacheKey = `dashboard:${ownerId}`;
    const cache = req.app.locals.serverCache;

    // Serve from server-side cache (60s TTL) — avoids DB hit on every page visit
    const cached = cache?.get(cacheKey);
    if (cached) return res.json(cached);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [
      totalCustomers,
      activeCustomers,
      staffCount,
      todayLogs,
      monthBills
    ] = await Promise.all([
      Customer.countDocuments({ ownerId }),
      Customer.countDocuments({ ownerId, isActive: true }),
      User.countDocuments({ ownerId, role: 'staff', isActive: true }),
      DailyLog.find({ ownerId, date: today }).select('delivered_qty amount_calculated').lean(),
      Bill.find({ ownerId, month, year }).select('totalAmount amountPaid balance status').lean()
    ]);

    const todayLiters = todayLogs.reduce((sum, l) => sum + l.delivered_qty, 0);
    const todayRevenue = todayLogs.reduce((sum, l) => sum + l.amount_calculated, 0);
    const monthRevenue = monthBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const pendingAmount = monthBills
      .filter(b => b.status !== 'paid')
      .reduce((sum, b) => sum + b.balance, 0);

    const result = {
      totalCustomers, activeCustomers, staffCount,
      todayLiters, todayRevenue, monthRevenue, pendingAmount,
      todayDeliveries: todayLogs.length
    };

    cache?.set(cacheKey, result, 60 * 1000); // 60s TTL
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  CUSTOMERS
// ═══════════════════════════════════════════════════════════════

// GET /api/owner/customers
router.get('/customers', async (req, res, next) => {
  try {
    const { active, search, page = 1, limit = 50 } = req.query;
    const query = { ownerId: req.user._id };

    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      // Escape regex special chars to prevent ReDoS injection
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { customerCode: { $regex: escaped, $options: 'i' } }
      ];
    }

    // Enforce max limit — prevent client from dumping entire collection
    const safeLimit = Math.min(Math.max(parseInt(limit) || 15, 1), 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ name: 1 }).skip(skip).limit(safeLimit).lean(),
      Customer.countDocuments(query)
    ]);

    res.json({ customers, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/customers
router.post('/customers', async (req, res, next) => {
  try {
    const { name, phone, address, base_requirement, default_price, custom_price, notes, assignedStaffId, language } = req.body;
    if (!name || !phone || default_price === undefined) {
      return res.status(400).json({ error: 'Name, phone, and price are required.' });
    }

    // Enforce maxCustomers limit (skip if unlimited, represented by 999999 or -1)
    const maxCust = req.user.maxCustomers ?? 150; // default gold limit
    if (maxCust !== -1 && maxCust < 999999) {
      const activeCount = await Customer.countDocuments({ ownerId: req.user._id, isActive: true });
      if (activeCount >= maxCust) {
        return res.status(400).json({ error: `Customer limit reached (${maxCust}). Upgrade your plan or contact support to increase it.` });
      }
    }

    const customer = await Customer.create({
      ownerId: req.user._id,
      name, phone, address, notes,
      base_requirement: base_requirement || { morning: 0, evening: 0 },
      default_price,
      custom_price: custom_price || null,
      assignedStaffId: assignedStaffId || null,
      customerCode: req.body.customerCode?.trim() || null,
      showCodeToStaff: req.body.showCodeToStaff === true || req.body.showCodeToStaff === 'true',
      language: language || 'en'
    });

    res.status(201).json({ customer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/owner/customers/:id
router.put('/customers/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const allowed = ['name', 'phone', 'address', 'base_requirement', 'default_price', 'custom_price', 'notes', 'isActive', 'assignedStaffId', 'customerCode', 'showCodeToStaff', 'language'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) customer[field] = req.body[field];
    });

    await customer.save();
    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/owner/customers/:id (soft delete)
router.delete('/customers/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    customer.isActive = false;
    await customer.save();
    res.json({ message: 'Customer deactivated.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/farmers
router.get('/farmers', async (req, res, next) => {
  try {
    const { active, search, page = 1, limit = 50 } = req.query;
    const query = { ownerId: req.user._id };

    if (active !== undefined) query.isActive = active === 'true';
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { customerCode: { $regex: escaped, $options: 'i' } }
      ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit) || 15, 1), 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

    const [farmers, total] = await Promise.all([
      Farmer.find(query).sort({ name: 1 }).skip(skip).limit(safeLimit).lean(),
      Farmer.countDocuments(query)
    ]);

    res.json({ customers: farmers, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/farmers
router.post('/farmers', async (req, res, next) => {
  try {
    const { name, phone, address, default_price, custom_price, notes, assignedStaffId, language } = req.body;
    if (!name || !phone || default_price === undefined) {
      return res.status(400).json({ error: 'Name, phone, and price are required.' });
    }

    const farmer = await Farmer.create({
      ownerId: req.user._id,
      name, phone, address, notes,
      default_price,
      custom_price: custom_price || null,
      assignedStaffId: assignedStaffId || null,
      customerCode: req.body.customerCode?.trim() || null,
      showCodeToStaff: req.body.showCodeToStaff === true || req.body.showCodeToStaff === 'true',
      language: language || 'en'
    });

    res.status(201).json({ customer: farmer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/owner/farmers/:id
router.put('/farmers/:id', async (req, res, next) => {
  try {
    const farmer = await Farmer.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!farmer) return res.status(404).json({ error: 'Farmer not found.' });

    const allowed = ['name', 'phone', 'address', 'default_price', 'custom_price', 'notes', 'isActive', 'assignedStaffId', 'customerCode', 'showCodeToStaff', 'language'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) farmer[field] = req.body[field];
    });

    await farmer.save();
    res.json({ customer: farmer });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/owner/staff
router.get('/staff', async (req, res, next) => {
  try {
    // Only return fields staff management UI needs — never return password hash
    const staff = await User.find({ ownerId: req.user._id, role: 'staff' })
      .select('_id name phone isActive createdAt permissions')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ staff });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/staff
router.post('/staff', async (req, res, next) => {
  try {
    const { name, phone, password, permissions } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required.' });
    }

    // Enforce maxStaff limit (skip if unlimited, represented by 999999 or -1)
    const maxSt = req.user.maxStaff ?? 5; // default gold limit
    if (maxSt !== -1 && maxSt < 999999) {
      const staffCount = await User.countDocuments({ ownerId: req.user._id, role: 'staff' });
      if (staffCount >= maxSt) {
        return res.status(400).json({ error: `Staff limit reached (${maxSt}). Upgrade your plan or contact support to increase it.` });
      }
    }

    const existing = await User.findOne({ phone: phone.trim() });
    if (existing) return res.status(400).json({ error: 'Phone already registered.' });

    let staffPerms = ['milk_delivery'];
    if (req.user.ownerRole === 'dairy_owner' && Array.isArray(permissions)) {
      staffPerms = permissions.filter(p => ['milk_delivery', 'milk_collection'].includes(p));
      if (staffPerms.length === 0) staffPerms = ['milk_delivery'];
    }

    const staff = await User.create({
      name, phone: phone.trim(), password,
      role: 'staff',
      ownerId: req.user._id,
      ownerRole: req.user.ownerRole,
      permissions: staffPerms
    });

    res.status(201).json({ staff });
  } catch (err) {
    next(err);
  }
});

// PUT /api/owner/staff/:id
router.put('/staff/:id', async (req, res, next) => {
  try {
    const { name, phone, password, permissions } = req.body;
    const staff = await User.findOne({ _id: req.params.id, ownerId: req.user._id, role: 'staff' });
    if (!staff) return res.status(404).json({ error: 'Staff not found.' });

    if (name) staff.name = name.trim();
    if (phone) {
      const ph = phone.trim();
      if (ph !== staff.phone) {
        const existing = await User.findOne({ phone: ph });
        if (existing) return res.status(400).json({ error: 'Phone already registered.' });
        staff.phone = ph;
      }
    }
    if (password) {
      staff.password = password;
    }

    staff.ownerRole = req.user.ownerRole;

    if (req.user.ownerRole === 'dairy_owner' && Array.isArray(permissions)) {
      let staffPerms = permissions.filter(p => ['milk_delivery', 'milk_collection'].includes(p));
      if (staffPerms.length === 0) staffPerms = ['milk_delivery'];
      staff.permissions = staffPerms;
    }

    await staff.save();
    res.json({ staff });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/owner/staff/:id
router.delete('/staff/:id', async (req, res, next) => {
  try {
    const staff = await User.findOne({ _id: req.params.id, ownerId: req.user._id, role: 'staff' });
    if (!staff) return res.status(404).json({ error: 'Staff not found.' });

    staff.isActive = false;
    await staff.save();
    res.json({ message: 'Staff account disabled.' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/owner/staff/:id/password — Disabled (only Superadmin can reset staff passwords)
router.patch('/staff/:id/password', async (req, res, next) => {
  return res.status(403).json({ error: 'Only Superadmin can reset staff passwords.' });
});

// PATCH /api/owner/password — owner changes their own password
router.patch('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword, verificationCode } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    // Require owner verification code from DB
    if (!(await verifyOwnerOtp(verificationCode))) {
      return res.status(401).json({ error: 'Invalid verification code.' });
    }

    const owner = await User.findById(req.user._id).select('+password');
    const match = await owner.comparePassword(currentPassword);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    owner.password = newPassword;
    await owner.save();

    await AuthLog.create({
      event: 'password_change',
      role: 'owner',
      userId: owner._id,
      userName: owner.name,
      userPhone: owner.phone,
      detail: 'Owner changed their own password',
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  DAILY LOGS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/owner/logs
 *
 * Supports rich filtering:
 *   date          — single date YYYY-MM-DD
 *   dateFrom      — start of date range YYYY-MM-DD
 *   dateTo        — end of date range YYYY-MM-DD
 *   month + year  — all logs in a calendar month
 *   customerId    — single customer ID
 *   customerIds   — comma-separated customer IDs
 *   staffId       — single staff ID
 *   staffIds      — comma-separated staff IDs
 *   slot          — 'morning' | 'evening'
 *   limit         — max results (default 500)
 */
router.get('/logs', async (req, res, next) => {
  try {
    const {
      date, dateFrom, dateTo, month, year,
      customerId, customerIds,
      staffId, staffIds,
      slot,
      limit = 200
    } = req.query;

    const query = { ownerId: req.user._id };

    // ── Date filtering ────────────────────────────────────────
    if (date) {
      query.date = date;
    } else if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo)   query.date.$lte = dateTo;
    } else if (month && year) {
      const pad = String(month).padStart(2, '0');
      query.date = { $regex: `^${year}-${pad}` };
    }

    // ── Customer filtering — validate IDs are valid ObjectId strings ──
    const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);
    if (customerId && isValidId(customerId)) {
      query.customerId = customerId;
    } else if (customerIds) {
      const ids = customerIds.split(',').map(id => id.trim()).filter(isValidId);
      if (ids.length > 0) query.customerId = { $in: ids };
    }

    // ── Staff filtering — validate IDs ────────────────────────
    if (staffId && isValidId(staffId)) {
      query.staffId = staffId;
    } else if (staffIds) {
      const ids = staffIds.split(',').map(id => id.trim()).filter(isValidId);
      if (ids.length > 0) query.staffId = { $in: ids };
    }

    // ── Slot filtering ────────────────────────────────────────
    if (slot && ['morning', 'evening'].includes(slot)) {
      query.slot = slot;
    }

    const logs = await DailyLog.find(query)
      .populate('customerId', 'name phone language')
      .populate('staffId', 'name')
      .sort({ date: -1, slot: 1, createdAt: -1 })
      .limit(Math.min(parseInt(limit) || 200, 500))
      .lean();

    // Summary stats
    const totalLiters = logs.reduce((s, l) => s + l.delivered_qty, 0);
    const totalAmount = logs.reduce((s, l) => s + l.amount_calculated, 0);

    res.json({ logs, totalLiters, totalAmount, count: logs.length });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/owner/logs/:id — owner can edit a log entry (correct errors)
router.patch('/logs/:id', async (req, res, next) => {
  try {
    const { extra_qty, notes } = req.body;
    const log = await DailyLog.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!log) return res.status(404).json({ error: 'Log entry not found.' });

    // Recalculate quantities if extra_qty changed
    if (extra_qty !== undefined) {
      const newExtra = Math.max(0, parseFloat(extra_qty) || 0);
      log.extra_qty = newExtra;
      log.delivered_qty = log.base_qty + newExtra;
      log.amount_calculated = log.delivered_qty * log.price_per_liter;
    }
    if (notes !== undefined) log.notes = notes;
    if (req.body.whatsappSent !== undefined) log.whatsappSent = req.body.whatsappSent;
    if (req.body.whatsappError !== undefined) log.whatsappError = req.body.whatsappError;

    await log.save();

    // Re-populate for response
    const populated = await DailyLog.findById(log._id)
      .populate('customerId', 'name phone language')
      .populate('staffId', 'name')
      .lean();

    res.json({ log: populated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/owner/logs/:id — owner can delete a log entry
router.delete('/logs/:id', async (req, res, next) => {
  try {
    const log = await DailyLog.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!log) return res.status(404).json({ error: 'Log entry not found.' });
    res.json({ message: 'Log entry deleted.' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  BILLING
// ═══════════════════════════════════════════════════════════════

// POST /api/owner/bills/generate
router.post('/bills/generate', async (req, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'Month and year are required.' });

    const ownerId = req.user._id;
    const pad = String(month).padStart(2, '0');
    const datePrefix = `${year}-${pad}`;

    // ── Bulk fetch all logs for the month in ONE query ────────
    const [allLogs, customers, prevBills] = await Promise.all([
      DailyLog.find({
        ownerId,
        date: { $regex: `^${datePrefix}` }
      }).select('customerId date slot delivered_qty extra_qty amount_calculated').lean(),

      Customer.find({ ownerId, isActive: true })
        .select('_id name').lean(),

      // Previous month bills for carry-forward balance
      Bill.find({
        ownerId,
        $or: [
          { year: parseInt(year), month: parseInt(month) - 1 },
          { year: parseInt(year) - 1, month: 12 }
        ]
      }).select('customerId balance').lean()
    ]);

    // Build lookup maps
    const prevBalanceMap = {};
    prevBills.forEach(b => {
      prevBalanceMap[b.customerId.toString()] = b.balance || 0;
    });

    // Aggregate logs per customer
    const logsByCustomer = {};
    allLogs.forEach(log => {
      const cid = log.customerId.toString();
      if (!logsByCustomer[cid]) logsByCustomer[cid] = { totalLiters: 0, totalAmount: 0, logs: [] };
      logsByCustomer[cid].totalLiters += log.delivered_qty;
      logsByCustomer[cid].totalAmount += log.amount_calculated;
      logsByCustomer[cid].logs.push(log);
    });

    // Build upsert operations for all customers with logs
    const bulkOps = [];
    for (const customer of customers) {
      const cid = customer._id.toString();
      const agg = logsByCustomer[cid];
      if (!agg || agg.logs.length === 0) continue;

      const previousBalance = prevBalanceMap[cid] || 0;
      const grandTotal = agg.totalAmount + previousBalance;

      bulkOps.push({
        updateOne: {
          filter: { ownerId, customerId: customer._id, month: parseInt(month), year: parseInt(year) },
          update: {
            $set: {
              totalLiters: agg.totalLiters,
              totalAmount: agg.totalAmount,
              previousBalance,
              grandTotal,
              balance: grandTotal,
              status: 'pending',
              logSnapshot: agg.logs.map(l => ({
                date: l.date,
                slot: l.slot,
                delivered_qty: l.delivered_qty,
                extra_qty: l.extra_qty || 0,
                amount_calculated: l.amount_calculated
              }))
            }
          },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      await Bill.bulkWrite(bulkOps, { ordered: false });
    }

    res.json({ bills: bulkOps, count: bulkOps.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/bills?month=&year=
router.get('/bills', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const query = { ownerId: req.user._id };
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const bills = await Bill.find(query)
      .populate('customerId', 'name phone language')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ bills });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/bills/:id/payment
router.post('/bills/:id/payment', async (req, res, next) => {
  try {
    const { amount, method = 'cash', note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required.' });

    const bill = await Bill.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });

    bill.payments.push({ amount, method, note });
    bill.amountPaid += amount;
    bill.balance = bill.grandTotal - bill.amountPaid;
    bill.status = bill.balance <= 0 ? 'paid' : bill.amountPaid > 0 ? 'partial' : 'pending';

    await bill.save();
    res.json({ bill });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/bills/:id/send-pdf-whatsapp
router.post('/bills/:id/send-pdf-whatsapp', async (req, res, next) => {
  try {
    if (!req.user.features?.custom_message_templates) {
      return res.status(403).json({ error: 'Platinum plan required.' });
    }
    const { html, filename } = req.body;
    if (!html || !filename) {
      return res.status(400).json({ error: 'html and filename are required.' });
    }
    const bill = await Bill.findOne({ _id: req.params.id, ownerId: req.user._id })
      .populate('customerId', 'name phone language').lean();
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });

    let puppeteer;
    try { puppeteer = require('puppeteer'); } catch { puppeteer = require('puppeteer-core'); }
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const base64 = pdfBuffer.toString('base64');
    const { sendDocument } = require('../services/whatsappService');
    const caption = `Milk Bill — ${bill.customerId?.name}`;
    await sendDocument(req.user._id.toString(), bill.customerId.phone, base64, filename, caption);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  DEFAULT RATE
// ═══════════════════════════════════════════════════════════════

// GET /api/owner/default-rate — get current rate + history
router.get('/default-rate', async (req, res, next) => {
  try {
    const history = await DefaultRate.find({ ownerId: req.user._id })
      .sort({ effectiveFrom: -1 })
      .limit(50)
      .lean();
    const current = history[0] || null;
    res.json({ current, history });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/default-rate — set a new default rate
router.post('/default-rate', async (req, res, next) => {
  try {
    const { rate, note } = req.body;
    if (rate === undefined || rate < 0) {
      return res.status(400).json({ error: 'Valid rate is required.' });
    }
    const today = new Date().toISOString().split('T')[0];
    const entry = await DefaultRate.create({
      ownerId: req.user._id,
      rate: parseFloat(rate),
      effectiveFrom: today,
      note,
      changedBy: req.user._id
    });
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  REPORTS
// ═══════════════════════════════════════════════════════════════

// GET /api/owner/reports/monthly-summary?month=&year=
router.get('/reports/monthly-summary', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const ownerId = req.user._id;
    const pad = String(month).padStart(2, '0');

    const [logs, bills] = await Promise.all([
      DailyLog.aggregate([
        { $match: { ownerId, date: { $regex: `^${year}-${pad}` } } },
        { $group: {
          _id: '$date',
          totalLiters: { $sum: '$delivered_qty' },
          totalRevenue: { $sum: '$amount_calculated' },
          deliveries: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]),
      Bill.find({ ownerId, month: parseInt(month), year: parseInt(year) }).lean()
    ]);

    const totalRevenue = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.amountPaid, 0);
    const totalPending = bills.reduce((s, b) => s + b.balance, 0);

    res.json({ dailyBreakdown: logs, totalRevenue, totalPaid, totalPending, billCount: bills.length });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  DAILY COLLECTION (owner's milk intake + staff quotas)
// ═══════════════════════════════════════════════════════════════

// GET /api/owner/collection?date=YYYY-MM-DD
router.get('/collection', async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const collection = await DailyCollection.findOne({ ownerId, date }).lean();

    // Also return today's actual delivered liters per staff
    const logs = await DailyLog.find({ ownerId, date }).lean();
    const deliveredByStaff = {};
    logs.forEach(l => {
      const sid = l.staffId.toString();
      deliveredByStaff[sid] = (deliveredByStaff[sid] || 0) + l.delivered_qty;
    });

    // Get staff list for quota assignment UI
    const staff = await User.find({ ownerId, role: 'staff', isActive: true })
      .select('_id name phone').lean();

    res.json({ collection, deliveredByStaff, staff, date });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/collection — create or update today's collection
router.post('/collection', async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const { date, totalLiters, source, procurementRate, staffQuotas, notes } = req.body;

    if (!date || totalLiters === undefined) {
      return res.status(400).json({ error: 'date and totalLiters are required.' });
    }
    if (totalLiters < 0) {
      return res.status(400).json({ error: 'totalLiters cannot be negative.' });
    }

    // Validate quotas don't exceed total
    const quotaSum = (staffQuotas || []).reduce((s, q) => s + (q.assignedLiters || 0), 0);
    if (quotaSum > totalLiters) {
      return res.status(400).json({ error: `Staff quotas (${quotaSum}L) exceed total collection (${totalLiters}L).` });
    }

    // Enrich with staff names
    const enrichedQuotas = await Promise.all((staffQuotas || []).map(async q => {
      const staff = await User.findById(q.staffId).select('name').lean();
      return { ...q, staffName: staff?.name || '' };
    }));

    const collection = await DailyCollection.findOneAndUpdate(
      { ownerId, date },
      {
        ownerId, date, totalLiters,
        source: source || '',
        procurementRate: procurementRate || null,
        staffQuotas: enrichedQuotas,
        unallocatedLiters: totalLiters - quotaSum,
        notes: notes || ''
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ collection });
  } catch (err) {
    next(err);
  }
});

// GET /api/owner/collection/quota-check?staffId=&date=
// Returns how much a staff member has delivered vs their quota today
router.get('/collection/quota-check', async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const { staffId, date } = req.query;
    if (!staffId || !date) return res.status(400).json({ error: 'staffId and date required.' });

    const [collection, logs] = await Promise.all([
      DailyCollection.findOne({ ownerId, date }).lean(),
      DailyLog.find({ ownerId, staffId, date }).lean()
    ]);

    const quota = collection?.staffQuotas?.find(q => q.staffId.toString() === staffId);
    const delivered = logs.reduce((s, l) => s + l.delivered_qty, 0);

    res.json({
      assignedLiters: quota?.assignedLiters ?? null,
      deliveredLiters: delivered,
      remainingLiters: quota ? Math.max(0, quota.assignedLiters - delivered) : null,
      hasQuota: !!quota
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  MESSAGE TEMPLATES
// ═══════════════════════════════════════════════════════════════

// GET /api/owner/message-templates
router.get('/message-templates', async (req, res, next) => {
  try {
    const templates = await MessageTemplate.find({ ownerId: req.user._id, isActive: true })
      .sort({ type: 1, createdAt: 1 }).lean();
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/message-templates
router.post('/message-templates', async (req, res, next) => {
  try {
    const { name, type, body, isDefault, language } = req.body;
    if (!name || !body) return res.status(400).json({ error: 'name and body are required.' });

    const lang = language || 'en';
    // If setting as default for a type and language, unset others
    if (isDefault && type) {
      await MessageTemplate.updateMany(
        { ownerId: req.user._id, type, language: lang, isDefault: true },
        { isDefault: false }
      );
    }

    const template = await MessageTemplate.create({
      ownerId: req.user._id, name, type: type || 'custom', body, isDefault: !!isDefault, language: lang
    });
    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/owner/message-templates/:id
router.patch('/message-templates/:id', async (req, res, next) => {
  try {
    const { name, type, body, isDefault, isActive, language } = req.body;
    const template = await MessageTemplate.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!template) return res.status(404).json({ error: 'Template not found.' });

    const lang = language !== undefined ? language : template.language;
    if (isDefault && type) {
      await MessageTemplate.updateMany(
        { ownerId: req.user._id, type, language: lang, isDefault: true, _id: { $ne: template._id } },
        { isDefault: false }
      );
    }

    if (name !== undefined) template.name = name;
    if (type !== undefined) template.type = type;
    if (body !== undefined) template.body = body;
    if (isDefault !== undefined) template.isDefault = isDefault;
    if (isActive !== undefined) template.isActive = isActive;
    if (language !== undefined) template.language = language;
    await template.save();

    res.json({ template });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/owner/message-templates/:id
router.delete('/message-templates/:id', async (req, res, next) => {
  try {
    await MessageTemplate.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { isActive: false }
    );
    res.json({ message: 'Template deleted.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/owner/message-templates/seed-defaults
// Seeds the default templates (English and Marathi) if none exist
router.post('/message-templates/seed-defaults', async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const existing = await MessageTemplate.countDocuments({ ownerId });
    if (existing > 0) {
      // Check if payment_reminder template exists for each language; if not, create it
      const hasPaymentReminderEn = await MessageTemplate.exists({ ownerId, type: 'payment_reminder', language: 'en', isActive: true });
      if (!hasPaymentReminderEn) {
        await MessageTemplate.create({
          ownerId,
          name: 'Pending Payment Reminder',
          type: 'payment_reminder',
          body: 'Dear {{customerName}}, your milk bill for {{monthName}} is {{grandTotal}}. Paid: {{totalPaid}}. Balance due: {{balance}}. Please pay at your earliest. — {{businessName}}',
          isDefault: true,
          language: 'en'
        });
      }
      const hasPaymentReminderMr = await MessageTemplate.exists({ ownerId, type: 'payment_reminder', language: 'mr', isActive: true });
      if (!hasPaymentReminderMr) {
        await MessageTemplate.create({
          ownerId,
          name: 'Pending Payment Reminder (Marathi)',
          type: 'payment_reminder',
          body: 'प्रिय {{customerName}}, तुमचे {{monthName}} महिन्याचे दूध बिल {{grandTotal}} आहे. भरलेली रक्कम: {{totalPaid}}. थकीत रक्कम: {{balance}}. कृपया लवकरात लवकर भरणा करावा. — {{businessName}}',
          isDefault: true,
          language: 'mr'
        });
      }
      const templates = await MessageTemplate.find({ ownerId, isActive: true }).lean();
      return res.json({ templates });
    }

    const defaults = [
      // English templates
      {
        name: 'Regular Delivery',
        type: 'delivery',
        body: 'Hi {{customerName}}, {{quantity}} of milk has been delivered to you today. Any queries? Contact: {{ownerPhone}}',
        isDefault: true,
        language: 'en'
      },
      {
        name: 'Extra Delivery',
        type: 'extra_delivery',
        body: 'Hi {{customerName}}, {{quantity}} of milk (including {{extraQty}} extra) has been delivered to you today. Any queries? Contact: {{ownerPhone}}',
        isDefault: true,
        language: 'en'
      },
      {
        name: 'No Delivery Today',
        type: 'no_delivery',
        body: 'Hi {{customerName}}, no milk delivery is scheduled for you today. Any queries? Contact: {{ownerPhone}}',
        isDefault: true,
        language: 'en'
      },
      {
        name: 'Pending Payment Reminder',
        type: 'payment_reminder',
        body: 'Dear {{customerName}}, your milk bill for {{monthName}} is {{grandTotal}}. Paid: {{totalPaid}}. Balance due: {{balance}}. Please pay at your earliest. — {{businessName}}',
        isDefault: true,
        language: 'en'
      },
      {
        name: 'Monthly Bill Statement',
        type: 'monthly_bill',
        body: 'Hi {{customerName}}, your milk statement for {{monthName}}:\nTotal: {{grandTotal}}\nPaid: {{totalPaid}}\nBalance: {{balance}}\nContact: {{ownerPhone}}',
        isDefault: true,
        language: 'en'
      },
      // Marathi templates
      {
        name: 'Regular Delivery (Marathi)',
        type: 'delivery',
        body: 'नमस्कार {{customerName}}, आज तुम्हाला {{quantity}} दूध वितरित केले गेले आहे. काही अडचण असल्यास संपर्क साधा: {{ownerPhone}}',
        isDefault: true,
        language: 'mr'
      },
      {
        name: 'Extra Delivery (Marathi)',
        type: 'extra_delivery',
        body: 'नमस्कार {{customerName}}, आज तुम्हाला {{quantity}} दूध (अतिरिक्त: {{extraQty}}) वितरित केले गेले आहे. काही अडचण असल्यास संपर्क साधा: {{ownerPhone}}',
        isDefault: true,
        language: 'mr'
      },
      {
        name: 'No Delivery Today (Marathi)',
        type: 'no_delivery',
        body: 'नमस्कार {{customerName}}, आज कोणतेही दूध वितरण नियोजित नाही. काही अडचण असल्यास संपर्क साधा: {{ownerPhone}}',
        isDefault: true,
        language: 'mr'
      },
      {
        name: 'Pending Payment Reminder (Marathi)',
        type: 'payment_reminder',
        body: 'प्रिय {{customerName}}, तुमचे {{monthName}} महिन्याचे दूध बिल {{grandTotal}} आहे. भरलेली रक्कम: {{totalPaid}}. थकीत रक्कम: {{balance}}. कृपया लवकरात लवकर भरणा करावा. — {{businessName}}',
        isDefault: true,
        language: 'mr'
      },
      {
        name: 'Monthly Bill Statement (Marathi)',
        type: 'monthly_bill',
        body: 'नमस्कार {{customerName}}, तुमचे {{monthName}} महिन्याचे बिल विवरण:\nएकूण: {{grandTotal}}\nभरलेले: {{totalPaid}}\nथकीत: {{balance}}\nसंपर्क: {{ownerPhone}}',
        isDefault: true,
        language: 'mr'
      }
    ];

    await MessageTemplate.insertMany(defaults.map(d => ({ ...d, ownerId })));
    const templates = await MessageTemplate.find({ ownerId }).lean();
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/send-whatsapp ─────────────────────────────
// Owner sends a WhatsApp message to a customer directly
// (same as staff endpoint but accessible by owner role)
router.post('/send-whatsapp', async (req, res, next) => {
  try {
    const { customerId, message } = req.body;
    if (!customerId || !message) {
      return res.status(400).json({ error: 'customerId and message are required.' });
    }

    const customer = await Customer.findOne({ _id: customerId, ownerId: req.user._id });
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const { sendMessage } = require('../services/whatsappService');
    await sendMessage(req.user._id.toString(), customer.phone, message);

    // Mark the latest log for this customer as whatsappSent
    const today = new Date().toISOString().split('T')[0];
    await DailyLog.findOneAndUpdate(
      { ownerId: req.user._id, customerId, date: today },
      { whatsappSent: true },
      { sort: { createdAt: -1 } }
    );

    res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    next(err);
  }
});

// ── TERM RATES ────────────────────────────────────────────────
const TermRate = require('../models/TermRate');

router.get('/term-rates', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and Year are required.' });
    }
    const ownerId = req.user._id;
    const termRate = await TermRate.findOne({ ownerId, month: parseInt(month), year: parseInt(year) }).lean();
    
    // Fallback default rate
    let fallbackRate = 35;
    const DefaultRate = require('../models/DefaultRate');
    const currentDefaultRate = await DefaultRate.findOne({ ownerId }).sort({ effectiveFrom: -1 }).lean();
    if (currentDefaultRate) {
      fallbackRate = currentDefaultRate.rate;
    }

    res.json({
      termRate: termRate || {
        term1Rate: fallbackRate,
        term2Rate: fallbackRate,
        term3Rate: fallbackRate,
        isDefault: true
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/term-rates', async (req, res, next) => {
  try {
    const { month, year, term1Rate, term2Rate, term3Rate } = req.body;
    if (month === undefined || year === undefined || term1Rate === undefined || term2Rate === undefined || term3Rate === undefined) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const ownerId = req.user._id;
    const termRate = await TermRate.findOneAndUpdate(
      { ownerId, month: parseInt(month), year: parseInt(year) },
      {
        term1Rate: parseFloat(term1Rate),
        term2Rate: parseFloat(term2Rate),
        term3Rate: parseFloat(term3Rate),
        changedBy: ownerId
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, termRate });
  } catch (err) {
    next(err);
  }
});

// ── FARMER COLLECTIONS ─────────────────────────────────────────
const FarmerCollection = require('../models/FarmerCollection');

router.get('/farmer-collections', async (req, res, next) => {
  try {
    const { farmerId } = req.query;
    if (!farmerId) {
      return res.status(400).json({ error: 'farmerId is required.' });
    }
    const ownerId = req.user._id;
    const collections = await FarmerCollection.find({ ownerId, farmerId })
      .sort({ date: -1, time: -1 })
      .limit(10)
      .lean();
    res.json({ collections });
  } catch (err) {
    next(err);
  }
});

// ── DAIRY DEFAULT RATES ─────────────────────────────────────────
const DairyDefaultRate = require('../models/DairyDefaultRate');

router.get('/dairy-default-rates', async (req, res, next) => {
  try {
    const dairyOwnerId = req.user._id;
    // Find all active rates
    const activeRates = await DairyDefaultRate.find({ dairyOwnerId, isActive: true }).sort({ effectiveFrom: -1 }).lean();
    const history = await DairyDefaultRate.find({ dairyOwnerId }).sort({ createdAt: -1 }).limit(50).lean();
    
    // If empty, generate standard defaults in memory
    const defaultConfigs = {
      Cow: { milkType: 'Cow', baseRate: 40, fatMultiplier: 0.12, snfMultiplier: 0.08, standardFat: 4.0, standardSNF: 8.5, bonusPerLiter: 0, deductionPerLiter: 0, standardCLR: 28, clrDeductionPerUnit: 0, effectiveFrom: new Date(), isActive: true },
      Buffalo: { milkType: 'Buffalo', baseRate: 50, fatMultiplier: 0.15, snfMultiplier: 0.10, standardFat: 6.0, standardSNF: 9.0, bonusPerLiter: 0, deductionPerLiter: 0, standardCLR: 28, clrDeductionPerUnit: 0, effectiveFrom: new Date(), isActive: true },
      Mixed: { milkType: 'Mixed', baseRate: 45, fatMultiplier: 0.13, snfMultiplier: 0.09, standardFat: 4.5, standardSNF: 8.7, bonusPerLiter: 0, deductionPerLiter: 0, standardCLR: 28, clrDeductionPerUnit: 0, effectiveFrom: new Date(), isActive: true }
    };

    activeRates.forEach(r => {
      defaultConfigs[r.milkType] = r;
    });

    res.json({
      configs: Object.values(defaultConfigs),
      history
    });
  } catch (err) {
    next(err);
  }
});

router.post('/dairy-default-rates', async (req, res, next) => {
  try {
    const dairyOwnerId = req.user._id;
    const { milkType, baseRate, fatMultiplier, snfMultiplier, standardFat, standardSNF, bonusPerLiter, deductionPerLiter, standardCLR, clrDeductionPerUnit, effectiveFrom } = req.body;

    if (!milkType || baseRate === undefined || fatMultiplier === undefined || snfMultiplier === undefined || bonusPerLiter === undefined || deductionPerLiter === undefined || !effectiveFrom) {
      return res.status(400).json({ error: 'All default rate configuration fields are required.' });
    }

    // Deactivate previous active rates of this milkType
    await DairyDefaultRate.updateMany(
      { dairyOwnerId, milkType, isActive: true },
      { $set: { isActive: false } }
    );

    const newRate = await DairyDefaultRate.create({
      dairyOwnerId,
      milkType,
      baseRate: parseFloat(baseRate),
      fatMultiplier: parseFloat(fatMultiplier),
      snfMultiplier: parseFloat(snfMultiplier),
      standardFat: standardFat !== undefined ? parseFloat(standardFat) : 4.0,
      standardSNF: standardSNF !== undefined ? parseFloat(standardSNF) : 8.5,
      bonusPerLiter: parseFloat(bonusPerLiter),
      deductionPerLiter: parseFloat(deductionPerLiter),
      standardCLR: standardCLR !== undefined ? parseFloat(standardCLR) : 28,
      clrDeductionPerUnit: clrDeductionPerUnit !== undefined ? parseFloat(clrDeductionPerUnit) : 0,
      effectiveFrom: new Date(effectiveFrom),
      isActive: true,
      createdBy: dairyOwnerId,
      updatedBy: dairyOwnerId
    });

    res.status(201).json({ success: true, rate: newRate });
  } catch (err) {
    next(err);
  }
});

router.get('/farmer-collections/next-number', async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const formattedDate = dateStr.replace(/-/g, '');
    const count = await FarmerCollection.countDocuments({ ownerId, date: dateStr });
    const seq = String(count + 1).padStart(4, '0');
    const nextNum = `COL-${formattedDate}-${seq}`;
    res.json({ nextNumber: nextNum });
  } catch (err) {
    next(err);
  }
});

router.post('/farmer-collections', async (req, res, next) => {
  const mongoose = require('mongoose');
  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (e) {
    if (session) {
      session.endSession();
      session = null;
    }
  }

  try {
    const ownerId = req.user._id;
    const {
      farmerId,
      date,
      time,
      shift,
      milkType,
      quantity,
      fat,
      snf,
      clr,
      ratePerLiter,
      baseRate,
      fatValue,
      snfValue,
      grossAmount,
      bonusAmount,
      deductionAmount,
      netAmount,
      notes
    } = req.body;

    const opt = useTransaction ? { session } : {};

    if (!farmerId || !date || !time || !shift || !milkType || !quantity || !ratePerLiter || netAmount === undefined) {
      if (useTransaction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ error: 'All required collection details must be provided.' });
    }

    // Prevent duplicate request submissions within the last 15 seconds
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);
    const existingColl = await FarmerCollection.findOne({
      ownerId,
      farmerId,
      date,
      shift,
      milkType,
      quantity: parseFloat(quantity),
      fat: parseFloat(fat),
      snf: parseFloat(snf),
      createdAt: { $gte: fifteenSecondsAgo }
    }).session(useTransaction ? session : null);

    if (existingColl) {
      if (useTransaction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(409).json({ error: 'Duplicate collection detected. Please wait a moment before trying again.' });
    }

    const formattedDate = date.replace(/-/g, '');
    const count = await FarmerCollection.countDocuments({ ownerId, date }).session(useTransaction ? session : null);
    const seq = String(count + 1).padStart(4, '0');
    const collectionNumber = `COL-${formattedDate}-${seq}`;

    const farmer = await Farmer.findOne({ _id: farmerId, ownerId }).session(useTransaction ? session : null);
    if (!farmer) {
      if (useTransaction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ error: 'Farmer not found.' });
    }

    const newCollection = new FarmerCollection({
      ownerId,
      dairyOwnerId: ownerId,
      collectionNumber,
      farmerId,
      supplierId: farmerId,
      date,
      collectionDate: date,
      time,
      collectionTime: time,
      shift,
      milkType,
      quantity: parseFloat(quantity),
      fat: parseFloat(fat),
      snf: parseFloat(snf),
      clr: clr ? parseFloat(clr) : null,
      ratePerLiter: parseFloat(ratePerLiter),
      baseRate: baseRate ? parseFloat(baseRate) : 0,
      fatValue: fatValue ? parseFloat(fatValue) : 0,
      snfValue: snfValue ? parseFloat(snfValue) : 0,
      grossAmount: parseFloat(grossAmount),
      bonusAmount: parseFloat(bonusAmount),
      deductionAmount: parseFloat(deductionAmount),
      netAmount: parseFloat(netAmount),
      notes: notes || '',
      collectedBy: ownerId
    });

    await newCollection.save(opt);

    await Farmer.updateOne(
      { _id: farmerId, ownerId },
      { $inc: { balance: parseFloat(netAmount) } },
      opt
    );

    if (useTransaction) {
      await session.commitTransaction();
      session.endSession();
    }

    res.status(201).json({ success: true, collection: newCollection });
  } catch (err) {
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(err);
  }
});

router.post('/farmer-collections/send-whatsapp', async (req, res, next) => {
  try {
    const { collectionId } = req.body;
    if (!collectionId) {
      return res.status(400).json({ error: 'collectionId is required.' });
    }
    const ownerId = req.user._id;
    const coll = await FarmerCollection.findOne({ _id: collectionId, ownerId }).populate('farmerId');
    if (!coll) {
      return res.status(404).json({ error: 'Collection record not found.' });
    }

    const { sendMessage } = require('../services/whatsappService');
    const farmer = coll.farmerId;
    
    // Formatting currency in Rupee symbol
    const msg = `*Amrit Dairy Milk Collection Receipt*\n\n` +
                `Receipt No: ${coll.collectionNumber}\n` +
                `Date: ${coll.date} (${coll.shift === 'Morning' ? 'सकाळ' : 'संध्याकाळ'})\n` +
                `Farmer: ${farmer.name} (${farmer.customerCode || 'N/A'})\n` +
                `Milk Type: ${coll.milkType === 'Cow' ? 'गाय' : coll.milkType === 'Buffalo' ? 'म्हैस' : 'मिश्रित'}\n` +
                `Qty: ${coll.quantity.toFixed(2)} L\n` +
                `FAT: ${coll.fat.toFixed(2)}% | SNF: ${coll.snf.toFixed(2)}%\n` +
                `Rate: ₹${coll.ratePerLiter.toFixed(2)}/L\n` +
                `*Net Amount: ₹${coll.netAmount.toFixed(2)}*\n\n` +
                `Thank you for delivering milk!`;

    await sendMessage(ownerId.toString(), farmer.phone, msg);
    res.json({ success: true, message: 'Receipt sent successfully via WhatsApp.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/feedback ──────────────────────────────────
router.post('/feedback', async (req, res, next) => {
  try {
    const { category, message, rating } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Feedback message is required.' });
    }

    const Feedback = require('../models/Feedback');
    const feedback = await Feedback.create({
      ownerId: req.user._id,
      category,
      message,
      rating
    });

    res.status(201).json({ success: true, feedback, message: 'Feedback submitted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
