const mongoose = require('mongoose');

/**
 * AuthLog — records security-relevant auth events.
 * Events: login_success, login_failure, logout, password_reset_request,
 *         password_reset_success, password_change, account_disabled
 */
const authLogSchema = new mongoose.Schema({
  event: {
    type: String,
    enum: [
      'login_success',
      'login_failure',
      'logout',
      'password_reset_request',
      'password_reset_success',
      'password_change',
      'account_disabled',
      'invalid_verification_code',
    ],
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['owner', 'staff', 'superadmin', 'unknown'],
    default: 'unknown',
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  userName: { type: String, default: null },   // snapshot at time of event
  userPhone: { type: String, default: null },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  detail: { type: String, default: null },     // extra context (e.g. "wrong password")
  success: { type: Boolean, default: true },
}, {
  timestamps: true
});

authLogSchema.index({ createdAt: -1 });
authLogSchema.index({ event: 1, createdAt: -1 });
authLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AuthLog', authLogSchema);
