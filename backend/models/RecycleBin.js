const mongoose = require('mongoose');

const recycleBinSchema = new mongoose.Schema({
  modelType: {
    type: String,
    enum: ['User', 'Customer', 'DailyLog', 'Bill', 'DailyCollection', 'Farmer', 'FarmerCollection', 'WhatsappConnection', 'MessageTemplate'],
    required: true
  },
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deletedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // MongoDB TTL index to auto-delete after 90 days
  },
  cascadedFrom: {
    modelType: { type: String, default: null },
    originalId: { type: mongoose.Schema.Types.ObjectId, default: null }
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for fast lookup
recycleBinSchema.index({ modelType: 1, originalId: 1 });
recycleBinSchema.index({ 'cascadedFrom.modelType': 1, 'cascadedFrom.originalId': 1 });
recycleBinSchema.index({ ownerId: 1 });

module.exports = mongoose.model('RecycleBin', recycleBinSchema);
