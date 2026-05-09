/**
 * SystemConfig — stores system-level secrets in MongoDB.
 *
 * OTPs are stored as bcrypt hashes (never plaintext).
 * Superadmin credentials are stored in the User collection (not here).
 *
 * Only one document exists (singleton pattern via key='system').
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const systemConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'system', unique: true },

  // Login verification codes — stored as bcrypt hashes
  otpOwnerHash:      { type: String, select: false },
  otpStaffHash:      { type: String, select: false },
  otpSuperadminHash: { type: String, select: false },

  // Track when credentials were last set
  configuredAt: { type: Date, default: null },
  configuredBy: { type: String, default: 'setup' }, // 'setup' | 'admin'

  isInitialized: { type: Boolean, default: false },
}, { timestamps: true });

// ── Hash and store an OTP ─────────────────────────────────────
systemConfigSchema.methods.setOtp = async function (role, plainCode) {
  const hash = await bcrypt.hash(plainCode, 10);
  if (role === 'owner')      this.otpOwnerHash      = hash;
  if (role === 'staff')      this.otpStaffHash      = hash;
  if (role === 'superadmin') this.otpSuperadminHash = hash;
};

// ── Verify an OTP against its stored hash ────────────────────
systemConfigSchema.methods.verifyOtp = async function (role, plainCode) {
  let hash;
  if (role === 'owner')      hash = this.otpOwnerHash;
  if (role === 'staff')      hash = this.otpStaffHash;
  if (role === 'superadmin') hash = this.otpSuperadminHash;
  if (!hash || !plainCode) return false;
  return bcrypt.compare(plainCode, hash);
};

// ── Get singleton config (creates if missing) ─────────────────
systemConfigSchema.statics.getSingleton = async function () {
  let cfg = await this.findOne({ key: 'system' })
    .select('+otpOwnerHash +otpStaffHash +otpSuperadminHash');
  if (!cfg) {
    cfg = await this.create({ key: 'system' });
    // Re-fetch with select fields
    cfg = await this.findOne({ key: 'system' })
      .select('+otpOwnerHash +otpStaffHash +otpSuperadminHash');
  }
  return cfg;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
