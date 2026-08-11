const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  // Optional username (superadmin can have one for easy login)
  username: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Username cannot exceed 50 characters'],
    match: [/^[a-z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, dashes, underscores']
  },
  phone: {
    type: String,
    required: [true, 'Phone is required'],
    trim: true,
    match: [/^\d{10}$/, 'Enter a valid 10-digit phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['superadmin', 'owner', 'staff'],
    required: true
  },
  // For staff: links to their owner. For owner/superadmin: null
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ownerRole: {
    type: String,
    enum: ['dairy_owner', 'milk_supplier'],
    default: 'milk_supplier'
  },
  // Owner-specific fields
  businessName: {
    type: String,
    trim: true,
    maxlength: [150, 'Business name cannot exceed 150 characters']
  },
  maxCustomers: {
    type: Number,
    default: 150
  },
  maxStaff: {
    type: Number,
    default: 5
  },
  // Subscription (managed by superadmin)
  subscription: {
    status: {
      type: String,
      enum: ['trial', 'active', 'inactive', 'expired'],
      default: 'trial'
    },
    plan: {
      type: String,
      enum: ['silver', 'gold', 'platinum'],
      default: 'gold'
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  // Feature flags (toggled by superadmin per owner)
  features: {
    whatsapp_alerts: { type: Boolean, default: true },
    pdf_billing: { type: Boolean, default: true },
    advanced_reports: { type: Boolean, default: false }
  },
  // WhatsApp credentials (per owner) — all fields hidden from default responses
  whatsappConfig: {
    accessToken:   { type: String, select: false },
    phoneNumberId: { type: String, select: false },
    sessionActive: { type: Boolean, default: false },
    method: {
      type: String,
      enum: ['cloud_api', 'web_session', 'pairing_code', 'none'],
      default: 'none'
    }
  },
  // OTP for password reset
  // In production replace with real email/SMS delivery.
  // For now OTP is always 000000 (hardcoded in auth route).
  otp: {
    code: { type: String, select: false },
    expiresAt: { type: Date, select: false },
    attempts: { type: Number, default: 0, select: false }
  },
  ownerVerificationCode: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Set to true after owner completes the 2-page onboarding flow.
  // Tracked server-side so it persists across devices and browsers.
  onboardingDone: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    default: 'organic',
    index: true
  },
  parentAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  roleName: {
    type: String,
    default: ''
  },
  permissions: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// ── Indexes ───────────────────────────────────────────────────
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ username: 1 }, { sparse: true, unique: true });
userSchema.index({ ownerId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'subscription.status': 1 });

// ── Hash password before save ─────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Compare password ──────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Strip sensitive fields from JSON output ───────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.__v;
  // Never expose WhatsApp credentials or internal config
  if (obj.whatsappConfig) {
    delete obj.whatsappConfig.accessToken;
    delete obj.whatsappConfig.phoneNumberId;
  }
  return obj;
};

module.exports = mongoose.model('User', userSchema);
