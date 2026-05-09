const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Customer = require('../models/Customer');
const DailyLog = require('../models/DailyLog');
const Bill = require('../models/Bill');
const DefaultRate = require('../models/DefaultRate');
const DailyCollection = require('../models/DailyCollection');
const MessageTemplate = require('../models/MessageTemplate');
const SystemConfig = require('../models/SystemConfig');
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
    const { name, phone, address, base_requirement, default_price, custom_price, notes, assignedStaffId } = req.body;
    if (!name || !phone || default_price === undefined) {
      return res.status(400).json({ error: 'Name, phone, and price are required.' });
    }

    const customer = await Customer.create({
      ownerId: req.user._id,
      name, phone, address, notes,
      base_requirement: base_requirement || { morning: 0, evening: 0 },
      default_price,
      custom_price: custom_price || null,
      assignedStaffId: assignedStaffId || null,
      customerCode: req.body.customerCode?.trim() || null,
      showCodeToStaff: req.body.showCodeToStaff === true || req.body.showCodeToStaff === 'true'
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

    const allowed = ['name', 'phone', 'address', 'base_requirement', 'default_price', 'custom_price', 'notes', 'isActive', 'assignedStaffId', 'customerCode', 'showCodeToStaff'];
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

// ═══════════════════════════════════════════════════════════════
//  STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/owner/staff
router.get('/staff', async (req, res, next) => {
  try {
    // Only return fields staff management UI needs — never return password hash
    const staff = await User.find({ ownerId: req.user._id, role: 'staff' })
      .select('_id name phone isActive createdAt')
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
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required.' });
    }

    const existing = await User.findOne({ phone: phone.trim() });
    if (existing) return res.status(400).json({ error: 'Phone already registered.' });

    const staff = await User.create({
      name, phone: phone.trim(), password,
      role: 'staff',
      ownerId: req.user._id
    });

    res.status(201).json({ staff });
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

// PATCH /api/owner/staff/:id/password — owner resets a staff password
router.patch('/staff/:id/password', async (req, res, next) => {
  try {
    const { newPassword, verificationCode } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Require owner verification code from DB
    if (!(await verifyOwnerOtp(verificationCode))) {
      return res.status(401).json({ error: 'Invalid verification code.' });
    }

    const staff = await User.findOne({ _id: req.params.id, ownerId: req.user._id, role: 'staff' });
    if (!staff) return res.status(404).json({ error: 'Staff not found.' });

    staff.password = newPassword;
    await staff.save();
    res.json({ message: 'Staff password updated.' });
  } catch (err) {
    next(err);
  }
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
      .populate('customerId', 'name phone')
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

    await log.save();

    // Re-populate for response
    const populated = await DailyLog.findById(log._id)
      .populate('customerId', 'name phone')
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
      .populate('customerId', 'name phone')
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
      .populate('customerId', 'name phone').lean();
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
    const { name, type, body, isDefault } = req.body;
    if (!name || !body) return res.status(400).json({ error: 'name and body are required.' });

    // If setting as default for a type, unset others
    if (isDefault && type) {
      await MessageTemplate.updateMany(
        { ownerId: req.user._id, type, isDefault: true },
        { isDefault: false }
      );
    }

    const template = await MessageTemplate.create({
      ownerId: req.user._id, name, type: type || 'custom', body, isDefault: !!isDefault
    });
    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/owner/message-templates/:id
router.patch('/message-templates/:id', async (req, res, next) => {
  try {
    const { name, type, body, isDefault, isActive } = req.body;
    const template = await MessageTemplate.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!template) return res.status(404).json({ error: 'Template not found.' });

    if (isDefault && type) {
      await MessageTemplate.updateMany(
        { ownerId: req.user._id, type, isDefault: true, _id: { $ne: template._id } },
        { isDefault: false }
      );
    }

    if (name !== undefined) template.name = name;
    if (type !== undefined) template.type = type;
    if (body !== undefined) template.body = body;
    if (isDefault !== undefined) template.isDefault = isDefault;
    if (isActive !== undefined) template.isActive = isActive;
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
// Seeds the 3 default templates if none exist
router.post('/message-templates/seed-defaults', async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const existing = await MessageTemplate.countDocuments({ ownerId });
    if (existing > 0) {
      // Check if payment_reminder template exists; if not, create it
      const hasPaymentReminder = await MessageTemplate.exists({ ownerId, type: 'payment_reminder', isActive: true });
      if (!hasPaymentReminder) {
        await MessageTemplate.create({
          ownerId,
          name: 'Pending Payment Reminder',
          type: 'payment_reminder',
          body: 'Dear {{customerName}}, your milk bill for {{monthName}} is ₹{{grandTotal}}. Paid: ₹{{totalPaid}}. Balance due: ₹{{balance}}. Please pay at your earliest. — {{businessName}}',
          isDefault: true
        });
      }
      const templates = await MessageTemplate.find({ ownerId, isActive: true }).lean();
      return res.json({ templates });
    }

    const defaults = [
      {
        name: 'Regular Delivery',
        type: 'delivery',
        body: 'Hi {{customerName}}, {{quantity}}L of milk has been delivered to you today. Any queries? Contact: {{ownerPhone}}',
        isDefault: true
      },
      {
        name: 'Extra Delivery',
        type: 'extra_delivery',
        body: 'Hi {{customerName}}, {{quantity}}L of milk (including {{extraQty}}L extra) has been delivered to you today. Any queries? Contact: {{ownerPhone}}',
        isDefault: true
      },
      {
        name: 'No Delivery Today',
        type: 'no_delivery',
        body: 'Hi {{customerName}}, no milk delivery is scheduled for you today. Any queries? Contact: {{ownerPhone}}',
        isDefault: true
      },
      {
        name: 'Pending Payment Reminder',
        type: 'payment_reminder',
        body: 'Dear {{customerName}}, your milk bill for {{monthName}} is ₹{{grandTotal}}. Paid: ₹{{totalPaid}}. Balance due: ₹{{balance}}. Please pay at your earliest. — {{businessName}}',
        isDefault: true
      },
      {
        name: 'Monthly Bill Statement',
        type: 'monthly_bill',
        body: 'Hi {{customerName}}, your milk statement for {{monthName}}:\nTotal: ₹{{grandTotal}}\nPaid: ₹{{totalPaid}}\nBalance: ₹{{balance}}\nContact: {{ownerPhone}}',
        isDefault: true
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

module.exports = router;
