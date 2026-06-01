const mongoose = require('mongoose');

const WhatsappConnectionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  phone_number: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'pairing_requested', 'authenticated', 'disconnected', 'failed'],
    default: 'pending'
  },
  connected_at: {
    type: Date
  },
  last_activity: {
    type: Date,
    default: Date.now
  },
  device_name: {
    type: String
  },
  session_identifier: {
    type: String
  },
  pairing_attempts_timestamps: {
    type: [Date],
    default: []
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('WhatsappConnection', WhatsappConnectionSchema);
