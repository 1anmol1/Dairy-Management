/**
 * Razorpay Simulation Routes
 * In production, replace with real Razorpay SDK calls.
 * For now, this simulates order creation and payment verification.
 */
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const PlanConfig = require('../models/PlanConfig');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const { protect, authorize } = require('../middleware/auth');

const PLAN_PRICES = {
  silver:   { monthly: 99,  setup: 499 },
  gold:     { monthly: 199, setup: 1499 },
  platinum: { monthly: 399, setup: 1999 }
};

const PLAN_FEATURES = {
  silver:   { whatsapp_alerts: false, pdf_billing: false, advanced_reports: false },
  gold:     { whatsapp_alerts: true,  pdf_billing: true,  advanced_reports: false },
  platinum: { whatsapp_alerts: true,  pdf_billing: true,  advanced_reports: true  }
};

// ── GET /api/payment/plans ────────────────────────────────────
// Public endpoint — returns plan configs from DB (falls back to hardcoded)
router.get('/plans', async (req, res, next) => {
  try {
    const configs = await PlanConfig.find({ isActive: true }).sort({ monthlyPrice: 1 }).lean();

    if (configs.length > 0) {
      // Build response from live DB config
      const plans = {};
      configs.forEach(cfg => {
        plans[cfg.plan] = {
          monthly: cfg.monthlyPrice,
          setup: cfg.setupFee,
          features: cfg.features,
          limits: {
            maxCustomers: cfg.limits.maxCustomers,
            maxStaff: cfg.limits.maxStaff
          },
          description: cfg.description,
          label: cfg.label,
          recommended: cfg.plan === 'gold'
        };
      });
      return res.json({ plans, source: 'db' });
    }

    // Fallback to hardcoded if DB not seeded
    res.json({
      source: 'fallback',
      plans: {
        silver: {
          monthly: 99, setup: 499,
          features: PLAN_FEATURES.silver,
          limits: { maxCustomers: 50, maxStaff: 2 },
          description: 'Entry plan – basic usage only', label: 'Amrit Silver'
        },
        gold: {
          monthly: 199, setup: 1499,
          features: PLAN_FEATURES.gold,
          limits: { maxCustomers: 300, maxStaff: 7 },
          description: 'Main plan – full working system', label: 'Amrit Gold',
          recommended: true
        },
        platinum: {
          monthly: 399, setup: 1999,
          features: PLAN_FEATURES.platinum,
          limits: { maxCustomers: 999999, maxStaff: 999999 },
          description: 'Premium plan – advanced usage', label: 'Amrit Platinum'
        }
      }
    });
  } catch (err) {
    next(err);
  }
});
// ── Rate limiter for public lead-capture endpoint ─────────────
const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // max 10 submissions per IP per hour
  message: { error: 'Too many requests. Please try again later.' }
});

// ── POST /api/payment/request-subscription ───────────────────
// Public lead capture — visitor submits their details from /start
// No auth required. Superadmin will review and call to activate.
router.post('/request-subscription', leadLimiter, async (req, res, next) => {
  try {
    const {
      contactName, contactEmail, contactPhone,
      address, state, pincode, companyName,
      plan, billingCycle = 'monthly', months = 1
    } = req.body;

    if (!contactName || !contactEmail || !contactPhone || !address || !state || !pincode || !plan) {
      return res.status(400).json({ error: 'All required fields must be filled.' });
    }
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ error: 'Enter a valid 6-digit pincode.' });
    }
    if (!['silver', 'gold', 'platinum'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected.' });
    }

    const request = await SubscriptionRequest.create({
      // No ownerId — this is a pre-signup lead
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      contactPhone: contactPhone.trim(),
      address: address.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      companyName: companyName?.trim() || '',
      plan,
      billingCycle,
      months: parseInt(months) || 1
    });

    res.status(201).json({
      request,
      message: 'Your request has been received. Our team will contact you shortly to discuss your requirements and get you started.'
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payment/my-request ───────────────────────────────
// Owner checks their latest subscription request status
router.get('/my-request', protect, authorize('owner'), async (req, res, next) => {
  try {
    const request = await SubscriptionRequest.findOne({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ request });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payment/requests (superadmin) ────────────────────
// List all pending subscription requests
router.get('/requests', protect, authorize('superadmin'), async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    const requests = await SubscriptionRequest.find(status ? { status } : {})
      .populate('ownerId', 'name phone email businessName subscription')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/payment/requests/:id/activate (superadmin) ─────
// Superadmin activates a subscription request after calling the owner
router.patch('/requests/:id/activate', protect, authorize('superadmin'), async (req, res, next) => {
  try {
    const { adminNotes } = req.body;
    const request = await SubscriptionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found.' });

    // Check if owner account exists
    if (!request.ownerId) {
      return res.status(200).json({ 
        needsOwnerCreation: true, 
        message: 'Owner account needs to be created first.',
        request
      });
    }

    const owner = await User.findById(request.ownerId);
    if (!owner) {
      return res.status(200).json({ 
        needsOwnerCreation: true, 
        message: 'Owner account needs to be created first.',
        request
      });
    }

    // Calculate expiry
    const now = new Date();
    const newExpiry = new Date(now);
    newExpiry.setMonth(newExpiry.getMonth() + request.months);

    // Apply plan features from PlanConfig
    let planFeatures = { whatsapp_alerts: true, pdf_billing: true, advanced_reports: false };
    try {
      const cfg = await PlanConfig.findOne({ plan: request.plan }).lean();
      if (cfg) planFeatures = cfg.features;
    } catch (_) { /* use defaults */ }

    owner.subscription.status = 'active';
    owner.subscription.plan = request.plan;
    owner.subscription.expiresAt = newExpiry;
    owner.features = planFeatures;
    await owner.save();

    request.status = 'activated';
    request.activatedAt = now;
    request.adminNotes = adminNotes || '';
    await request.save();

    res.json({
      message: `Subscription activated for ${owner.name}. Valid until ${newExpiry.toLocaleDateString('en-IN')}.`,
      owner: owner.toJSON(),
      request
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/payment/requests/:id/status (superadmin) ───────
router.patch('/requests/:id/status', protect, authorize('superadmin'), async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const request = await SubscriptionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (status) request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;
    await request.save();
    res.json({ request });
  } catch (err) {
    next(err);
  }
});
router.post('/create-order', protect, authorize('owner'), async (req, res, next) => {
  try {
    const { plan, months = 1 } = req.body;
    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ error: 'Invalid plan.' });
    }

    const price = PLAN_PRICES[plan];
    const isFirstTime = req.user.subscription?.status === 'trial';
    const amount = (price.monthly * months) + (isFirstTime ? price.setup : 0);

    // Simulate Razorpay order ID
    const orderId = `order_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    res.json({
      orderId,
      amount,
      currency: 'INR',
      plan,
      months,
      breakdown: {
        monthly: price.monthly * months,
        setup: isFirstTime ? price.setup : 0,
        total: amount
      },
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_simulation'
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/payment/verify ──────────────────────────────────
// Simulate payment verification and activate subscription
router.post('/verify', protect, authorize('owner'), async (req, res, next) => {
  try {
    const { orderId, paymentId, plan, months = 1 } = req.body;

    // In production: verify Razorpay signature here
    // For simulation: any paymentId starting with 'pay_' is valid
    if (!paymentId || !paymentId.startsWith('pay_')) {
      return res.status(400).json({ error: 'Invalid payment ID. Use pay_test_xxxx for simulation.' });
    }

    const owner = await User.findById(req.user._id);
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    // Calculate new expiry
    const now = new Date();
    const currentExpiry = owner.subscription?.expiresAt;
    const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + parseInt(months));

    owner.subscription.status = 'active';
    owner.subscription.plan = plan;
    owner.subscription.expiresAt = newExpiry;

    // Apply CURRENT plan config features (not hardcoded defaults)
    // This ensures renewed owners get the latest plan feature set
    const planConfig = await PlanConfig.findOne({ plan });
    if (planConfig) {
      owner.features = { ...planConfig.features.toObject() };
    } else {
      // Fallback to hardcoded if PlanConfig not seeded yet
      if (PLAN_FEATURES[plan]) {
        Object.assign(owner.features, PLAN_FEATURES[plan]);
      }
    }

    await owner.save();

    res.json({
      success: true,
      message: `Subscription activated. Valid until ${newExpiry.toLocaleDateString('en-IN')}.`,
      subscription: owner.subscription,
      features: owner.features
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
