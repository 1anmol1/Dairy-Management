const mongoose = require('mongoose');

const dairyDefaultRateSchema = new mongoose.Schema({
  dairyOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  milkType: {
    type: String,
    enum: ['Cow', 'Buffalo', 'Mixed'],
    required: true
  },
  baseRate: {
    type: Number,
    required: true,
    min: 0
  },
  fatMultiplier: {
    type: Number,
    required: true,
    min: 0
  },
  snfMultiplier: {
    type: Number,
    required: true,
    min: 0
  },
  bonusPerLiter: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  deductionPerLiter: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  effectiveFrom: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for query optimization
dairyDefaultRateSchema.index({ dairyOwnerId: 1, milkType: 1, effectiveFrom: -1 });

module.exports = mongoose.model('DairyDefaultRate', dairyDefaultRateSchema);
