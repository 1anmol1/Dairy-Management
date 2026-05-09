const mongoose = require('mongoose');

/**
 * Tracks the history of default milk rate changes per owner.
 * Each entry = one rate change event.
 */
const defaultRateSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rate: {
    type: Number,
    required: true,
    min: [0, 'Rate cannot be negative']
  },
  effectiveFrom: {
    type: String, // YYYY-MM-DD
    required: true
  },
  note: {
    type: String,
    maxlength: 200
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

defaultRateSchema.index({ ownerId: 1, effectiveFrom: -1 });

module.exports = mongoose.model('DefaultRate', defaultRateSchema);
