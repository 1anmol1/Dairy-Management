const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const DailyLog = require('../models/DailyLog');
const User = require('../models/User');
const DailyCollection = require('../models/DailyCollection');
const MessageTemplate = require('../models/MessageTemplate');
const { protect, authorize, requireActiveSubscription } = require('../middleware/auth');
const { sendDeliveryNotification } = require('../services/whatsappService');

router.use(protect, authorize('staff'), requireActiveSubscription);

// ── GET /api/staff/today ──────────────────────────────────────
// Get today's customer list with delivery status
// Shows customers assigned to this staff member, OR all customers if unassigned
router.get('/today', async (req, res, next) => {
  try {
    const ownerId = req.user.ownerId;
    const staffId = req.user._id;
    const today = new Date().toISOString().split('T')[0];

    // Customers assigned to this staff OR unassigned (assignedStaffId is null/undefined)
    const [customers, todayLogs] = await Promise.all([
      Customer.find({
        ownerId,
        isActive: true,
        $or: [
          { assignedStaffId: staffId },
          { assignedStaffId: null },
          { assignedStaffId: { $exists: false } }
        ]
      })
        .select('name phone address base_requirement assignedStaffId customerCode showCodeToStaff')
        .sort({ name: 1 })
        .lean(),
      DailyLog.find({ ownerId, date: today, staffId }).lean()
    ]);

    // Map delivery status onto each customer
    const logMap = {};
    todayLogs.forEach(log => {
      const key = `${log.customerId}_${log.slot}`;
      logMap[key] = log;
    });

    const enriched = customers.map(c => ({
      ...c,
      // Only expose customerCode to staff if owner has enabled it
      customerCode: c.showCodeToStaff ? c.customerCode : undefined,
      showCodeToStaff: undefined, // don't leak this flag to staff
      morning: logMap[`${c._id}_morning`] || null,
      evening: logMap[`${c._id}_evening`] || null
    }));

    // Fetch today's quota for this staff member
    const collection = await DailyCollection.findOne({ ownerId, date: today }).lean();
    const quota = collection?.staffQuotas?.find(q => q.staffId.toString() === staffId.toString());
    const totalDelivered = todayLogs.reduce((s, l) => s + l.delivered_qty, 0);

    // Fetch owner plan to pass minimal info to staff (plan tier only, no phone/features)
    const owner = await User.findById(ownerId).select('subscription').lean();

    res.json({
      customers: enriched,
      date: today,
      ownerPlan: owner?.subscription?.plan || 'silver',
      quota: quota ? {
        assignedLiters: quota.assignedLiters,
        deliveredLiters: totalDelivered,
        remainingLiters: Math.max(0, quota.assignedLiters - totalDelivered)
      } : null
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/staff/deliver ───────────────────────────────────
// Mark a delivery (the core staff action)
router.post('/deliver', async (req, res, next) => {
  try {
    const { customerId, slot, extra_qty = 0, notes } = req.body;
    if (!customerId || !slot) {
      return res.status(400).json({ error: 'customerId and slot are required.' });
    }

    const ownerId = req.user.ownerId;
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

    // ── Quota enforcement ─────────────────────────────────────
    // If owner has set a daily quota for this staff, enforce it
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

// ── PATCH /api/staff/logs/:id — staff can edit their own log entry
router.patch('/logs/:id', async (req, res, next) => {
  try {
    const { extra_qty, notes } = req.body;
    const log = await DailyLog.findOne({
      _id: req.params.id,
      ownerId: req.user.ownerId,
      staffId: req.user._id  // staff can only edit their own logs
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
      .populate('customerId', 'name phone')
      .lean();
    res.json({ log: populated });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/staff/send-whatsapp — staff sends WhatsApp message to customer
router.post('/send-whatsapp', async (req, res, next) => {
  try {
    const { customerId, message } = req.body;
    if (!customerId || !message) {
      return res.status(400).json({ error: 'customerId and message are required.' });
    }

    const customer = await Customer.findOne({ _id: customerId, ownerId: req.user.ownerId });
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const owner = await User.findById(req.user.ownerId);
    if (!owner) return res.status(404).json({ error: 'Owner not found.' });

    const { sendMessage } = require('../services/whatsappService');
    await sendMessage(req.user.ownerId.toString(), customer.phone, message);

    res.json({ success: true, message: 'Message sent.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/staff/message-templates — get owner's templates for staff use
// Gold plan: delivery + extra_delivery templates only (no no_delivery, no custom)
// Platinum plan: all templates
router.get('/message-templates', async (req, res, next) => {
  try {
    const owner = await User.findById(req.user.ownerId).select('features subscription').lean();
    const hasCustomTemplates = owner?.features?.custom_message_templates;

    const query = { ownerId: req.user.ownerId, isActive: true };
    if (!hasCustomTemplates) {
      // Gold plan: only delivery-related templates — no 'no_delivery', no 'custom'
      // Staff should be able to send regular + extra delivery messages
      query.type = { $in: ['delivery', 'extra_delivery'] };
    } else {
      // Platinum: all except 'no_delivery' — that's owner-only
      query.type = { $in: ['delivery', 'extra_delivery', 'custom'] };
    }

    const templates = await MessageTemplate.find(query)
      .sort({ type: 1, isDefault: -1 }).lean();
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});
router.get('/history', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logs = await DailyLog.find({
      ownerId: req.user.ownerId,
      staffId: req.user._id,
      date: today
    })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ logs, date: today });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
