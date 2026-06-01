const mongoose = require('mongoose');

const farmerSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Farmer name is required'],
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
  default_price: {
    type: Number,
    required: [true, 'Price per liter is required'],
    min: [0, 'Price cannot be negative']
  },
  custom_price: {
    type: Number,
    default: null,
    min: [0, 'Price cannot be negative']
  },
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
  assignedStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customerCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Code cannot exceed 20 characters'],
    default: null
  },
  showCodeToStaff: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    enum: ['en', 'mr'],
    default: 'en'
  }
}, {
  timestamps: true
});

farmerSchema.index({ ownerId: 1, isActive: 1 });
farmerSchema.index({ ownerId: 1, phone: 1 });
farmerSchema.index({ ownerId: 1, customerCode: 1 }, { sparse: true });

module.exports = mongoose.model('Farmer', farmerSchema);
