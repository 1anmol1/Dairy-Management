/**
 * MessageTemplate — owner-defined WhatsApp message templates.
 * Variables supported: {{customerName}}, {{quantity}}, {{extraQty}},
 * {{ownerPhone}}, {{slot}}, {{date}}, {{balance}}
 */
const mongoose = require('mongoose');

const messageTemplateSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  // Template type for quick selection
  type: {
    type: String,
    enum: ['delivery', 'extra_delivery', 'no_delivery', 'payment_reminder', 'monthly_bill', 'custom'],
    default: 'custom'
  },
  // The message body with {{variable}} placeholders
  body: {
    type: String,
    required: true,
    maxlength: 1000
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

messageTemplateSchema.index({ ownerId: 1, type: 1 });

module.exports = mongoose.model('MessageTemplate', messageTemplateSchema);
