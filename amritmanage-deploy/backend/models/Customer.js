const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
    match: [/^\d{10}$/, 'Enter a valid 10-digit phone number']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [300, 'Address cannot exceed 300 characters']
  },
  // Base daily requirement in liters
  base_requirement: {
    morning: { type: Number, default: 0, min: 0 },
    evening: { type: Number, default: 0, min: 0 }
  },
  // Pricing
  default_price: {
    type: Number,
    required: [true, 'Price per liter is required'],
    min: [0, 'Price cannot be negative']
  },
  // Override price (if different from default)
  custom_price: {
    type: Number,
    default: null,
    min: [0, 'Price cannot be negative']
  },
  // Running balance (negative = customer owes money)
  balance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  // Optional: assign a specific staff member to this customer
  // If set, only this staff member sees the customer in their delivery list
  // If null, all staff under this owner can deliver to this customer
  assignedStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Optional short code for easy identification (e.g. C001, PATIL, etc.)
  customerCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Customer code cannot exceed 20 characters'],
    default: null
  },
  // Whether to show the customer code to staff on their delivery page
  showCodeToStaff: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ── Compound index for tenant isolation ───────────────────────
customerSchema.index({ ownerId: 1, isActive: 1 });
customerSchema.index({ ownerId: 1, phone: 1 });
// Index for staff delivery list filtering by assignedStaffId
customerSchema.index({ ownerId: 1, assignedStaffId: 1, isActive: 1 });
// Index for customer code search
customerSchema.index({ ownerId: 1, customerCode: 1 }, { sparse: true });

// ── Virtual: effective price ──────────────────────────────────
customerSchema.virtual('effectivePrice').get(function () {
  return this.custom_price !== null ? this.custom_price : this.default_price;
});

module.exports = mongoose.model('Customer', customerSchema);
