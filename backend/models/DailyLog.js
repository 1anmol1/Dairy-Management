const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Date stored as YYYY-MM-DD string for easy querying
  date: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format']
  },
  slot: {
    type: String,
    enum: ['morning', 'evening'],
    required: true
  },
  // Base quantity from customer profile at time of delivery
  base_qty: {
    type: Number,
    required: true,
    min: 0
  },
  // Extra liters added by staff
  extra_qty: {
    type: Number,
    default: 0,
    min: 0
  },
  // Total = base + extra
  delivered_qty: {
    type: Number,
    required: true,
    min: 0
  },
  // Price per liter locked at time of delivery
  price_per_liter: {
    type: Number,
    required: true,
    min: 0
  },
  // Amount = delivered_qty * price_per_liter (locked in)
  amount_calculated: {
    type: Number,
    required: true,
    min: 0
  },
  // WhatsApp notification status
  whatsappSent: {
    type: Boolean,
    default: false
  },
  whatsappError: {
    type: String,
    default: null
  },
  // Delivery notes
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// ── Indexes for performance ───────────────────────────────────
dailyLogSchema.index({ ownerId: 1, date: 1 });
dailyLogSchema.index({ ownerId: 1, customerId: 1, date: 1, slot: 1 }, { unique: true });
dailyLogSchema.index({ customerId: 1, date: 1 });
dailyLogSchema.index({ staffId: 1, date: 1 });
// Additional indexes for quota checks and staff delivery queries
dailyLogSchema.index({ ownerId: 1, staffId: 1, date: 1 });
dailyLogSchema.index({ ownerId: 1, date: 1, slot: 1 });

module.exports = mongoose.model('DailyLog', dailyLogSchema);
