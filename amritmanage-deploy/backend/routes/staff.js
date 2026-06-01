const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const DailyLog = require('../models/DailyLog');
const User = require('../models/User');
const DailyCollection = require('../models/DailyCollection');
const MessageTemplate = require('../models/MessageTemplate');
const { protect, authorize, requireActiveSubscription } = require('../middleware/auth');
const { sendDeliveryNotification, getSessionStatusDb } = require('../services/whatsappService');

// Allow both staff and owner to access these delivery endpoints
router.use(protect, authorize('staff', 'owner'), requireActiveSubscription);

// ── GET /api/staff/today ──────────────────────────────────────
// Get today's customer list with delivery status
router.get('/today', async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const staffId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    // Get WhatsApp status of owner
    const wsStatus = await getSessionStatusDb(ownerId);

    // If owner, fetch all active customers. If staff, fetch assigned or unassigned.
    const query = { ownerId, isActive: true };
    if (req.user.role === 'staff') {
      query.$or = [
        { assignedStaffId: staffId },
        { assignedStaffId: null },
        { assignedStaffId: { $exists: false } }
      ];
    }

    const [customers, todayLogs] = await Promise.all([
      Customer.find(query)
        .select('name phone address base_requirement assignedStaffId customerCode showCodeToStaff')
        .sort({ name: 1 })
        .lean(),
      DailyLog.find({ ownerId, date: today, ...(req.user.role === 'staff' ? { staffId } : {}) }).lean()
    ]);

    // Map delivery status onto each customer
    const logMap = {};
    todayLogs.forEach(log => {
      const key = `${log.customerId}_${log.slot}`;
      logMap[key] = log;
    });

    const enriched = customers.map(c => ({
      ...c,
      // Owners always see codes; staff only if flag is enabled
      customerCode: req.user.role === 'owner' ? c.customerCode : (c.showCodeToStaff ? c.customerCode : undefined),
      showCodeToStaff: undefined, // hide flag
      morning: logMap[`${c._id}_morning`] || null,
      evening: logMap[`${c._id}_evening`] || null
    }));

    // Fetch today's quota for staff members only
    let quota = null;
    const totalDelivered = todayLogs.reduce((s, l) => s + l.delivered_qty, 0);

    if (req.user.role === 'staff') {
      const collection = await DailyCollection.findOne({ ownerId, date: today }).lean();
      const staffQuota = collection?.staffQuotas?.find(q => q.staffId.toString() === staffId.toString());
      if (staffQuota) {
        quota = {
          assignedLiters: staffQuota.assignedLiters,
          deliveredLiters: totalDelivered,
          remainingLiters: Math.max(0, staffQuota.assignedLiters - totalDelivered)
        };
      }
    }

    // Fetch owner plan
    const owner = await User.findById(ownerId).select('subscription').lean();

    res.json({
      customers: enriched,
      date: today,
      ownerPlan: owner?.subscription?.plan || 'silver',
      whatsappStatus: wsStatus.status,
      quota
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/staff/deliver ───────────────────────────────────
// Mark a delivery
router.post('/deliver', async (req, res, next) => {
  try {
    const { customerId, slot, extra_qty = 0, notes } = req.body;
    if (!customerId || !slot) {
      return res.status(400).json({ error: 'customerId and slot are required.' });
    }

    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const today = new Date().toISOString().split('T')[0];

    // Verify customer belongs to this owner
    const customer = await Customer.findOne({ _id: customerId, ownerId, isActive: true });
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    // Check for duplicate delivery
    const existing = await DailyLog.findOne({ ownerId, customerId, date: today, slot });
    if (existing) {
      return res.status(409).json({ error: `Already marked delivered for ${slot} today.` });
    }

    const base_qty = customer.base_requirement[slot] || 0;
    const delivered_qty = base_qty + parseFloat(extra_qty);
    const price_per_liter = customer.custom_price !== null ? customer.custom_price : customer.default_price;
    const amount_calculated = delivered_qty * price_per_liter;

    // Quota enforcement (staff only)
    if (req.user.role === 'staff') {
      const collection = await DailyCollection.findOne({ ownerId, date: today }).lean();
      if (collection) {
        const quota = collection.staffQuotas?.find(q => q.staffId.toString() === req.user._id.toString());
        if (quota) {
          const alreadyDelivered = await DailyLog.aggregate([
            { $match: { ownerId, staffId: req.user._id, date: today } },
            { $group: { _id: null, total: { $sum: '$delivered_qty' } } }
          ]);
          const totalSoFar = alreadyDelivered[0]?.total || 0;
          if (totalSoFar + delivered_qty > quota.assignedLiters) {
            return res.status(400).json({
              error: `Quota exceeded. You have ${(quota.assignedLiters - totalSoFar).toFixed(1)}L remaining out of your ${quota.assignedLiters}L quota for today.`,
              quotaExceeded: true,
              remaining: Math.max(0, quota.assignedLiters - totalSoFar)
            });
          }
        }
      }
    }

    const log = await DailyLog.create({
      ownerId,
      customerId,
      staffId: req.user._id,
      date: today,
      slot,
      base_qty,
      extra_qty: parseFloat(extra_qty),
      delivered_qty,
      price_per_liter,
      amount_calculated,
      notes
    });

    // Fetch owner for WhatsApp config
    const owner = await User.findById(ownerId);

    // Fire WhatsApp notification (non-blocking)
    if (owner && owner.features.whatsapp_alerts) {
      sendDeliveryNotification(owner, customer, log).catch(err => {
        console.error('WhatsApp notification failed:', err.message);
      });
    }

    res.status(201).json({ log, message: 'Delivery recorded.' });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/staff/logs/:id — edit log entry
router.patch('/logs/:id', async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const { extra_qty, notes } = req.body;
    const log = await DailyLog.findOne({
      _id: req.params.id,
      ownerId,
      ...(req.user.role === 'staff' ? { staffId: req.user._id } : {})
    });
    if (!log) return res.status(404).json({ error: 'Log entry not found.' });

    if (extra_qty !== undefined) {
      const newExtra = Math.max(0, parseFloat(extra_qty) || 0);
      log.extra_qty = newExtra;
      log.delivered_qty = log.base_qty + newExtra;
      log.amount_calculated = log.delivered_qty * log.price_per_liter;
    }
    if (notes !== undefined) log.notes = notes;
    await log.save();

    const populated = await DailyLog.findById(log._id)
      .populate('customerId', 'name phone language')
      .lean();
    res.json({ log: populated });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/staff/send-whatsapp
router.post('/send-whatsapp', async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const { customerId, message } = req.body;
    if (!customerId || !message) {
      return res.status(400).json({ error: 'customerId and message are required.' });
    }

    const customer = await Customer.findOne({ _id: customerId, ownerId });
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    const { sendMessage } = require('../services/whatsappService');
    await sendMessage(ownerId.toString(), customer.phone, message);

    res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/staff/message-templates
router.get('/message-templates', async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const owner = await User.findById(ownerId).select('features subscription').lean();
    const hasCustomTemplates = owner?.features?.custom_message_templates;

    const query = { ownerId, isActive: true };
    if (req.user.role === 'staff') {
      if (!hasCustomTemplates) {
        query.type = { $in: ['delivery', 'extra_delivery'] };
      } else {
        query.type = { $in: ['delivery', 'extra_delivery', 'custom'] };
      }
    }

    const templates = await MessageTemplate.find(query)
      .sort({ type: 1, isDefault: -1 }).lean();
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/staff/history
router.get('/history', async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const today = new Date().toISOString().split('T')[0];
    const logs = await DailyLog.find({
      ownerId,
      ...(req.user.role === 'staff' ? { staffId: req.user._id } : {}),
      date: today
    })
      .populate('customerId', 'name phone language')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ logs, date: today });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
