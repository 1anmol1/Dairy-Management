const mongoose = require('mongoose');

const termRateSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number, // 1 - 12
    required: true
  },
  term1Rate: {
    type: Number,
    required: true,
    min: 0
  },
  term2Rate: {
    type: Number,
    required: true,
    min: 0
  },
  term3Rate: {
    type: Number,
    required: true,
    min: 0
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

termRateSchema.index({ ownerId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('TermRate', termRateSchema);
