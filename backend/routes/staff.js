const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const DailyLog = require('../models/DailyLog');
const User = require('../models/User');
const DailyCollection = require('../models/DailyCollection');
const MessageTemplate = require('../models/MessageTemplate');
const Farmer = require('../models/Farmer');
const FarmerCollection = require('../models/FarmerCollection');
const Bill = require('../models/Bill');
const { protect, authorize, requireActiveSubscription } = require('../middleware/auth');
const { sendDeliveryNotification, getSessionStatusDb } = require('../services/whatsappService');

async function recalculateCustomerBill(ownerId, customerId, dateString) {
  try {
    const parts = dateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    
    const pad = String(month).padStart(2, '0');
    const datePrefix = `${year}-${pad}`;

    const bill = await Bill.findOne({ ownerId, customerId, month, year });
    if (!bill) return;

    const logs = await DailyLog.find({
      ownerId,
      customerId,
      date: { $regex: `^${datePrefix}` }
    }).lean();

    const totalLiters = logs.reduce((sum, l) => sum + (l.delivered_qty || 0), 0);
    const totalAmount = logs.reduce((sum, l) => sum + (l.amount_calculated || 0), 0);

    bill.totalLiters = totalLiters;
    bill.totalAmount = totalAmount;
    bill.grandTotal = totalAmount + (bill.previousBalance || 0);
    bill.balance = bill.grandTotal - (bill.amountPaid || 0);
    bill.status = bill.balance <= 0 ? 'paid' : (bill.amountPaid > 0 ? 'partial' : 'pending');
    bill.logSnapshot = logs.map(l => ({
      date: l.date,
      slot: l.slot,
      delivered_qty: l.delivered_qty,
      extra_qty: l.extra_qty || 0,
      amount_calculated: l.amount_calculated
    }));

    await bill.save();
  } catch (err) {
    console.error('Error recalculating customer bill:', err);
  }
}

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
    const { extra_qty, delivered_qty, price_per_liter, notes } = req.body;
    const log = await DailyLog.findOne({
      _id: req.params.id,
      ownerId,
      ...(req.user.role === 'staff' ? { staffId: req.user._id } : {})
    });
    if (!log) return res.status(404).json({ error: 'Log entry not found.' });

    // Staff can edit same day only
    const today = new Date().toISOString().split('T')[0];
    if (req.user.role === 'staff' && log.date !== today) {
      return res.status(403).json({ error: 'Staff can only edit log entries on the same day.' });
    }

    if (price_per_liter !== undefined) {
      log.price_per_liter = Math.max(0, parseFloat(price_per_liter) || 0);
    }

    if (delivered_qty !== undefined) {
      const newDelivered = Math.max(0, parseFloat(delivered_qty) || 0);
      log.delivered_qty = newDelivered;
      log.extra_qty = Math.max(0, newDelivered - log.base_qty);
    } else if (extra_qty !== undefined) {
      const newExtra = Math.max(0, parseFloat(extra_qty) || 0);
      log.extra_qty = newExtra;
      log.delivered_qty = log.base_qty + newExtra;
    }

    log.amount_calculated = log.delivered_qty * log.price_per_liter;

    if (notes !== undefined) log.notes = notes;

    log.isEdited = true;
    log.editedBy = req.user.name;

    await log.save();

    // Recalculate customer bill for this month/year
    await recalculateCustomerBill(ownerId, log.customerId, log.date);

    const populated = await DailyLog.findById(log._id)
      .populate('customerId', 'name phone language')
      .lean();
    res.json({ log: populated, message: 'Log entry updated.' });
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


// ── GET /api/staff/farmers ─────────────────────────────────────
router.get('/farmers', async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const staffId = req.user._id;
    const { active, search } = req.query;

    const query = { ownerId };
    if (active !== undefined) query.isActive = active === 'true';
    if (req.user.role === 'staff') {
      query.$or = [
        { assignedStaffId: staffId },
        { assignedStaffId: null },
        { assignedStaffId: { $exists: false } }
      ];
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { customerCode: { $regex: escaped, $options: 'i' } }
      ];
    }

    const farmers = await Farmer.find(query).sort({ name: 1 }).lean();
    res.json({ customers: farmers });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/staff/dairy-default-rates ──────────────────────────
router.get('/dairy-default-rates', async (req, res, next) => {
  try {
    const dairyOwnerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const DairyDefaultRate = require('../models/DairyDefaultRate');
    const activeRates = await DairyDefaultRate.find({ dairyOwnerId, isActive: true }).sort({ effectiveFrom: -1 }).lean();
    
    const defaultConfigs = {
      Cow: { milkType: 'Cow', baseRate: 40, fatMultiplier: 0.12, snfMultiplier: 0.08, standardFat: 4.0, standardSNF: 8.5, bonusPerLiter: 0, deductionPerLiter: 0, standardCLR: 28, clrDeductionPerUnit: 0, effectiveFrom: new Date(), isActive: true },
      Buffalo: { milkType: 'Buffalo', baseRate: 50, fatMultiplier: 0.15, snfMultiplier: 0.10, standardFat: 6.0, standardSNF: 9.0, bonusPerLiter: 0, deductionPerLiter: 0, standardCLR: 28, clrDeductionPerUnit: 0, effectiveFrom: new Date(), isActive: true },
      Mixed: { milkType: 'Mixed', baseRate: 45, fatMultiplier: 0.13, snfMultiplier: 0.09, standardFat: 4.5, standardSNF: 8.7, bonusPerLiter: 0, deductionPerLiter: 0, standardCLR: 28, clrDeductionPerUnit: 0, effectiveFrom: new Date(), isActive: true }
    };

    activeRates.forEach(r => {
      defaultConfigs[r.milkType] = r;
    });

    res.json({ configs: Object.values(defaultConfigs) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/staff/farmer-collections ──────────────────────────
router.get('/farmer-collections', async (req, res, next) => {
  try {
    const { farmerId } = req.query;
    if (!farmerId) {
      return res.status(400).json({ error: 'farmerId is required.' });
    }
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const collections = await FarmerCollection.find({ ownerId, farmerId })
      .sort({ date: -1, time: -1 })
      .limit(10)
      .lean();
    res.json({ collections });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/staff/farmer-collections/next-number ───────────────
router.get('/farmer-collections/next-number', async (req, res, next) => {
  try {
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
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

// ── POST /api/staff/farmer-collections ─────────────────────────
router.post('/farmer-collections', async (req, res, next) => {

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
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const collectedBy = req.user._id;
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
      collectedBy
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

// ── POST /api/staff/farmer-collections/send-whatsapp ───────────
router.post('/farmer-collections/send-whatsapp', async (req, res, next) => {
  try {
    const { collectionId } = req.body;
    if (!collectionId) {
      return res.status(400).json({ error: 'collectionId is required.' });
    }
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const coll = await FarmerCollection.findOne({ _id: collectionId, ownerId }).populate('farmerId');
    if (!coll) {
      return res.status(404).json({ error: 'Collection record not found.' });
    }

    const { sendMessage } = require('../services/whatsappService');
    const farmer = coll.farmerId;
    
    const msg = `*Dairy Management Milk Collection Receipt*\n\n` +
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

// ── PATCH /api/staff/farmer-collections/:id ─────────────────────
// Edit a farmer collection log entry
router.patch('/farmer-collections/:id', async (req, res, next) => {

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
    const ownerId = req.user.role === 'owner' ? req.user._id : req.user.ownerId;
    const today = new Date().toISOString().split('T')[0];

    const coll = await FarmerCollection.findOne({ _id: req.params.id, ownerId })
      .session(useTransaction ? session : null);

    if (!coll) {
      if (useTransaction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ error: 'Farmer collection record not found.' });
    }

    // Role checks: Staff can only edit logs on the same day (today)
    if (req.user.role === 'staff' && coll.date !== today) {
      if (useTransaction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(403).json({ error: 'Staff can only edit collection entries on the same day.' });
    }

    const oldNetAmount = coll.netAmount;

    // Fields that can be updated
    const fields = [
      'quantity', 'fat', 'snf', 'clr', 'ratePerLiter', 'baseRate', 
      'fatValue', 'snfValue', 'grossAmount', 'bonusAmount', 'deductionAmount', 'netAmount', 'notes'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'notes') {
          coll[field] = req.body[field];
        } else {
          coll[field] = parseFloat(req.body[field]);
        }
      }
    });

    coll.isEdited = true;
    coll.editedBy = req.user.name;

    const opt = useTransaction ? { session } : {};
    await coll.save(opt);

    // If netAmount has changed, adjust farmer balance
    const diff = coll.netAmount - oldNetAmount;
    if (diff !== 0) {
      await Farmer.updateOne(
        { _id: coll.farmerId, ownerId },
        { $inc: { balance: diff } },
        opt
      );
    }

    if (useTransaction) {
      await session.commitTransaction();
      session.endSession();
    }

    res.json({ success: true, collection: coll, message: 'Collection entry updated.' });
  } catch (err) {
    if (useTransaction && session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(err);
  }
});

module.exports = router;
