const mongoose = require('mongoose');

const farmerCollectionSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  collectionNumber: {
    type: String,
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer', // In our DB, farmers are stored in Customer collection
    required: true,
    index: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true
  },
  dairyOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  collectionDate: {
    type: String,
    index: true
  },
  time: {
    type: String, // HH:MM
    required: true
  },
  collectionTime: {
    type: String
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening'],
    required: true
  },
  milkType: {
    type: String,
    enum: ['Cow', 'Buffalo', 'Mixed'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  fat: {
    type: Number,
    required: true,
    min: 0
  },
  snf: {
    type: Number,
    required: true,
    min: 0
  },
  clr: {
    type: Number,
    default: null
  },
  ratePerLiter: {
    type: Number,
    required: true,
    min: 0
  },
  baseRate: {
    type: Number,
    default: 0
  },
  fatValue: {
    type: Number,
    default: 0
  },
  snfValue: {
    type: Number,
    default: 0
  },
  grossAmount: {
    type: Number,
    required: true,
    min: 0
  },
  bonusAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  deductionAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isCancelled: {
    type: Boolean,
    default: false
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for sorting & duplicate prevention
farmerCollectionSchema.index({ ownerId: 1, date: -1, shift: 1 });
farmerCollectionSchema.index({ ownerId: 1, collectionNumber: 1 }, { unique: true });

module.exports = mongoose.model('FarmerCollection', farmerCollectionSchema);
