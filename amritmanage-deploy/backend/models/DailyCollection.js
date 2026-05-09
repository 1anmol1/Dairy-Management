/**
 * DailyCollection — owner's daily milk intake log.
 * Records how much milk the owner collected/procured today,
 * and how much quota is assigned to each staff member.
 * Staff cannot deliver more than their assigned quota.
 */
const mongoose = require('mongoose');

const staffQuotaSchema = new mongoose.Schema({
  staffId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffName:     { type: String },
  assignedLiters: { type: Number, required: true, min: 0 },
  deliveredLiters: { type: Number, default: 0, min: 0 } // updated as staff delivers
}, { _id: false });

const dailyCollectionSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD']
  },
  // Total milk collected/procured by owner today (in liters)
  totalLiters: {
    type: Number,
    required: true,
    min: [0, 'Total liters cannot be negative']
  },
  // Source / supplier info (optional)
  source: { type: String, trim: true, maxlength: 200 },
  // Rate paid per liter to supplier (optional, for cost tracking)
  procurementRate: { type: Number, min: 0, default: null },
  // Per-staff quota allocations
  staffQuotas: [staffQuotaSchema],
  // Unallocated liters (totalLiters - sum of staffQuotas)
  unallocatedLiters: { type: Number, default: 0 },
  notes: { type: String, maxlength: 500 }
}, { timestamps: true });

// Unique: one collection entry per owner per day
dailyCollectionSchema.index({ ownerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyCollection', dailyCollectionSchema);
