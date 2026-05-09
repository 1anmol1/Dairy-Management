const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
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
  // Billing period
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  // Summary
  totalLiters: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  previousBalance: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  // Payments
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  // Snapshot of daily logs for this bill
  logSnapshot: [{
    date: String,
    slot: String,
    delivered_qty: Number,
    extra_qty: { type: Number, default: 0 },
    amount_calculated: Number
  }],
  payments: [{
    amount: Number,
    method: { type: String, enum: ['cash', 'upi', 'bank', 'other'], default: 'cash' },
    note: String,
    paidAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

billSchema.index({ ownerId: 1, customerId: 1, month: 1, year: 1 }, { unique: true });
billSchema.index({ ownerId: 1, month: 1, year: 1 });
billSchema.index({ status: 1 });

module.exports = mongoose.model('Bill', billSchema);
