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
const { protect, authorize, checkPermission } = require('../middleware/auth');
const {
  sendLeadEvent,
  sendCompleteRegistrationEvent,
} = require('../services/metaCapiService');

const PLAN_PRICES = {
  silver: { monthly: 99, setup: 499 },
  gold: { monthly: 199, setup: 1499 },
  platinum: { monthly: 399, setup: 1999 }
};

const PLAN_FEATURES = {
  silver: { whatsapp_alerts: false, pdf_billing: false, advanced_reports: false },
  gold: { whatsapp_alerts: true, pdf_billing: true, advanced_reports: false },
  platinum: { whatsapp_alerts: true, pdf_billing: true, advanced_reports: true }
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
          limits: { maxCustomers: 150, maxStaff: 5 },
          description: 'Main plan – full working system', label: 'Amrit Gold',
          recommended: true
        },
        platinum: {
          monthly: 399, setup: 1999,
          features: PLAN_FEATURES.platinum,
          limits: { maxCustomers: 999999, maxStaff: 15 },
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
// Public lead capture — visitor submits their details from /start or /landing
// No auth required. Superadmin will review and call to activate.
// For ads_landing source: fires Meta CAPI Lead event.
router.post('/request-subscription', leadLimiter, async (req, res, next) => {
  try {
    const {
      contactName, contactEmail, contactPhone,
      address, state, pincode, companyName,
      city, district,
      plan, billingCycle = 'monthly', months = 1,
      // Ads attribution
      source = 'organic',
      fbclid, fbc, fbp,
      leadEventId,
      // UTM
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    } = req.body;

    if (!contactName || !contactPhone || !plan) {
      return res.status(400).json({ error: 'Name, phone, and plan are required.' });
    }
    if (!['silver', 'gold', 'platinum'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected.' });
    }

    // Link ownerId if user is authenticated
    let ownerId = null;
    let isRenewal = false;
    let currentPlan = null;
    let changeType = null;

    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ownerId = decoded.id;

        const User = require('../models/User');
        const ownerUser = await User.findById(ownerId);
        if (ownerUser) {
          isRenewal = true;
          currentPlan = ownerUser.subscription?.plan || 'gold';
          
          const planRanks = { silver: 1, gold: 2, platinum: 3 };
          const requestedRank = planRanks[plan] || 2;
          const currentRank = planRanks[currentPlan] || 2;
          
          if (requestedRank > currentRank) changeType = 'upgrade';
          else if (requestedRank < currentRank) changeType = 'downgrade';
          else changeType = 'none';
        }
      }
    } catch (_) { }

    // For ads_landing step 1: address/state/pincode are optional (filled in step 2)
    const isAdsLanding = source === 'ads_landing';

    const requestData = {
      ownerId,
      contactName: contactName.trim(),
      contactEmail: contactEmail?.trim().toLowerCase() || '',
      contactPhone: contactPhone.trim(),
      address: address?.trim() || '',
      state: state?.trim() || '',
      pincode: pincode?.trim() || '',
      companyName: companyName?.trim() || '',
      city: city?.trim() || '',
      district: district?.trim() || '',
      plan,
      billingCycle,
      months: parseInt(months) || 1,
      isRenewal,
      currentPlan,
      changeType,
      source,
      // Attribution
      fbclid: fbclid || null,
      fbc: fbc || null,
      fbp: fbp || null,
      ipAddress: (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
      userAgent: req.headers['user-agent'] || null,
      externalId: contactPhone.trim(), // phone as external ID
      leadEventId: leadEventId || null,
      // UTM
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
    };

    const request = await SubscriptionRequest.create(requestData);

    // Fire CAPI Lead event for ads_landing source only
    if (isAdsLanding && leadEventId) {
      setImmediate(() => {
        sendLeadEvent(request, leadEventId, req).catch(err => {
          console.error('[META CAPI] Lead event failed:', err.message);
        });
      });
    }

    res.status(201).json({
      request,
      leadId: request._id,
      message: 'Your request has been received. Our team will contact you shortly.',
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/payment/update-lead/:id ───────────────────────
// Step 2 of ads_landing form: update existing lead with address details.
// Fires CAPI CompleteRegistration event.
// Does NOT create a duplicate record.
router.patch('/update-lead/:id', leadLimiter, async (req, res, next) => {
  try {
    const {
      address, state, pincode, city, district,
      registrationEventId,
    } = req.body;

    const request = await SubscriptionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Lead not found.' });

    // Only update ads_landing leads
    if (request.source !== 'ads_landing') {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    // Update address fields
    if (address) request.address = address.trim();
    if (state) request.state = state.trim();
    if (pincode) request.pincode = pincode.trim();
    if (city) request.city = city.trim();
    if (district) request.district = district.trim();
    if (registrationEventId) request.registrationEventId = registrationEventId;

    await request.save();

    // Fire CAPI CompleteRegistration event
    if (registrationEventId) {
      setImmediate(() => {
        sendCompleteRegistrationEvent(request, registrationEventId, req).catch(err => {
          console.error('[META CAPI] CompleteRegistration event failed:', err.message);
        });
      });
    }

    res.json({
      request,
      message: 'Lead updated successfully.',
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
router.get('/requests', protect, authorize('superadmin'), checkPermission('requests'), async (req, res, next) => {
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
router.patch('/requests/:id/activate', protect, authorize('superadmin'), checkPermission('requests'), async (req, res, next) => {
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
    if (request.source === 'ads_landing') {
      owner.source = 'ads_landing';
    }
    await owner.save();

    request.status = 'activated';
    request.activatedAt = now;
    request.adminNotes = adminNotes || '';
    await request.save();

    // Fire Meta CAPI Subscribe if this is an ads_landing lead
    if (request.source === 'ads_landing') {
      setImmediate(async () => {
        try {
          if (owner.source === 'ads_landing') {
            const { sendSubscribeEvent } = require('../services/metaCapiService');
            const subscribeEventId = require('crypto').randomUUID();
            const planPrices = { silver: 99, gold: 199, platinum: 399 };
            await SubscriptionRequest.findByIdAndUpdate(request._id, { subscribeEventId });
            await sendSubscribeEvent(request, subscribeEventId, {
              value: planPrices[request.plan] || 199,
              planName: request.plan,
              billingCycle: request.billingCycle || 'monthly',
            });
          }
        } catch (err) {
          console.error('[META CAPI] Subscribe event (activate) failed:', err.message);
        }
      });
    }

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
router.patch('/requests/:id/status', protect, authorize('superadmin'), checkPermission('requests'), async (req, res, next) => {
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

module.exports = router;
