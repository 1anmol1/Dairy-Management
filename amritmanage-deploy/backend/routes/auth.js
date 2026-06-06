/**
 * Auth Routes — /api/auth
 *
 * All login OTPs and superadmin credentials are stored in MongoDB.
 * Nothing sensitive is read from process.env here except JWT_SECRET.
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuthLog = require('../models/AuthLog');
const SystemConfig = require('../models/SystemConfig');
const { protect } = require('../middleware/auth');

// ── Auth event logger ─────────────────────────────────────────
const logAuth = (event, opts = {}) => {
  setImmediate(async () => {
    try {
      await AuthLog.create({
        event,
        role:      opts.role      || 'unknown',
        userId:    opts.userId    || null,
        userName:  opts.userName  || null,
        userPhone: opts.userPhone || null,
        ownerId:   opts.ownerId   || null,
        detail:    opts.detail    || null,
        success:   opts.success !== false,
        ip:        opts.req ? (opts.req.headers['x-forwarded-for'] || opts.req.ip || null) : null,
        userAgent: opts.req ? (opts.req.headers['user-agent'] || null) : null,
      });
    } catch (_) { /* never block auth on log failure */ }
  });
};

// ── Sign JWT ──────────────────────────────────────────────────
const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

// ── Verify login OTP from DB (never from env) ─────────────────
const verifyLoginOtp = async (role, code) => {
  if (!code) return false;
  const cfg = await SystemConfig.getSingleton();
  return cfg.verifyOtp(role, code.trim());
};

// ── Require system initialized ────────────────────────────────
const requireInitialized = async (res) => {
  const cfg = await SystemConfig.findOne({ key: 'system' });
  if (!cfg?.isInitialized) {
    res.status(503).json({
      error: 'System not configured. Please run the setup tool first.',
      code: 'NOT_INITIALIZED'
    });
    return false;
  }
  return true;
};

// ── Build safe user payload for JWT response ──────────────────
const userPayload = async (user) => {
  let features = user.features;

  if (user.role === 'owner') {
    if (user.subscription?.status === 'active' && user.subscription?.expiresAt) {
      if (new Date() > new Date(user.subscription.expiresAt)) {
        User.findByIdAndUpdate(user._id, { 'subscription.status': 'expired' }).catch(() => {});
        user.subscription.status = 'expired';
      }
    }
    if (user.subscription?.status === 'trial' && user.subscription?.trialEndsAt) {
      if (new Date() > new Date(user.subscription.trialEndsAt)) {
        User.findByIdAndUpdate(user._id, { 'subscription.status': 'expired' }).catch(() => {});
        user.subscription.status = 'expired';
      }
    }
  }

  if (user.role === 'owner' && user.subscription?.status === 'trial') {
    try {
      const PlanConfig = require('../models/PlanConfig');
      // Trial users get features of their actual plan (platinum trial → platinum features)
      // Fall back to gold if plan is unset or not found
      const planName = user.subscription?.plan || 'gold';
      const planCfg = await PlanConfig.findOne({ plan: planName }).lean();
      if (planCfg) features = planCfg.features;
      else {
        const goldCfg = await PlanConfig.findOne({ plan: 'gold' }).lean();
        if (goldCfg) features = goldCfg.features;
      }
    } catch (_) { /* use stored features as fallback */ }
  }

  const payload = {
    _id:             user._id,
    name:            user.name,
    phone:           user.phone,
    role:            user.role,
    ownerId:         user.ownerId,
    businessName:    user.businessName,
    subscription:    user.subscription,
    ownerRole:       user.ownerRole,
    features,
    onboardingDone:  user.onboardingDone || false,
  };

  // email and username only for owner/superadmin — staff don't need them
  if (user.role === 'owner' || user.role === 'superadmin') {
    payload.email    = user.email;
    payload.username = user.username;
  }

  if (user.role === 'superadmin') {
    payload.parentAdminId = user.parentAdminId;
    payload.roleName      = user.roleName;
    payload.permissions   = user.permissions;
  }

  if (user.role === 'staff') {
    payload.permissions = user.permissions || ['milk_delivery'];
  }

  return payload;
};

// ── Mask helpers ──────────────────────────────────────────────
function maskEmail(email) {
  const [local, domain] = email.split('@');
  return local.slice(0, 2) + '***@' + domain;
}
function maskPhone(phone) {
  return phone.slice(0, 2) + '******' + phone.slice(-2);
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/login  (owner / staff)
// ═══════════════════════════════════════════════════════════════
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password, verificationCode } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifier (phone) is required.' });
    }

    if (!await requireInitialized(res)) return;

    const user = await User.findOne({ phone: identifier.trim() }).select('+password +ownerVerificationCode');
    if (!user) {
      logAuth('login_failure', { success: false, detail: `Failed login for unknown: ${identifier?.slice(0,4)}***`, req });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      logAuth('account_disabled', { role: user.role, userId: user._id, userName: user.name, userPhone: user.phone, ownerId: user.ownerId, success: false, req });
      return res.status(403).json({ error: 'Account disabled. Contact support.' });
    }

    let isValid = false;

    if (user.role === 'owner') {
      const passwordMatch = password && await user.comparePassword(password);
      const codeMatch = verificationCode && verificationCode === user.ownerVerificationCode;
      isValid = passwordMatch && codeMatch;
    } else if (user.role === 'staff') {
      // Staff logs in using password (no verification code).
      isValid = password && await user.comparePassword(password);

      if (isValid) {
        // Check if owner's plan is expired or inactive
        const owner = await User.findById(user.ownerId);
        if (owner) {
          const { status, trialEndsAt, expiresAt } = owner.subscription || {};
          const isTrialExpired = status === 'trial' && trialEndsAt && new Date() > new Date(trialEndsAt);
          const isSubExpired = status === 'expired' || (expiresAt && new Date() > new Date(expiresAt));
          if (isTrialExpired || isSubExpired || status === 'inactive') {
            logAuth('login_failure', { role: user.role, userId: user._id, userName: user.name, userPhone: user.phone, ownerId: user.ownerId, success: false, detail: 'Owner plan expired', req });
            return res.status(403).json({ error: 'Plan expired contact owner' });
          }
        }
      }
    }

    if (!isValid) {
      logAuth('login_failure', { role: user.role, userId: user._id, userName: user.name, userPhone: user.phone, ownerId: user.ownerId, success: false, detail: 'Authentication failed', req });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    logAuth('login_success', { role: user.role, userId: user._id, userName: user.name, userPhone: user.phone, ownerId: user.ownerId, success: true, req });

    res.json({ token: signToken(user._id, user.role), user: await userPayload(user) });
  } catch (err) {
    next(err);
  }
});// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/validate-credentials  (step 1 — no OTP yet)
// ═══════════════════════════════════════════════════════════════
router.post('/validate-credentials', async (req, res, next) => {
  try {
    const { phone, password, role } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password are required.' });
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = await User.findOne({ phone: phone.trim() }).select('+password');

    // Constant-time: always run bcrypt even if user not found
    const dummyHash = '$2a$12$invalidhashpaddingtomatchbcryptlength000000000000000000000';
    const passwordMatch = user
      ? await user.comparePassword(password)
      : await require('bcryptjs').compare(password, dummyHash).catch(() => false);

    if (!user || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account disabled. Contact support.' });
    }


    if (role && user.role !== role) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    res.json({ valid: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/admin-validate  (superadmin step 1 — no OTP yet)
// ═══════════════════════════════════════════════════════════════
router.post('/admin-validate', async (req, res, next) => {
  try {
    const { phone, email, username, password } = req.body;
    if (!phone || !email || !username || !password) {
      return res.status(400).json({ error: 'All credential fields are required.' });
    }

    if (!await requireInitialized(res)) return;

    // Look up by phone + role only — then verify email/username in code
    // (avoids sparse-field query returning null when email is stored differently)
    const user = await User.findOne({
      phone: phone.trim(),
      role:  'superadmin'
    }).select('+password');

    const emailMatch    = user && user.email    === email.trim().toLowerCase();
    const usernameMatch = user && user.username === username.trim().toLowerCase();

    if (!user || !emailMatch || !usernameMatch || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account disabled.' });
    }

    res.json({ valid: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/admin-login  (superadmin full login with OTP)
// ═══════════════════════════════════════════════════════════════
router.post('/admin-login', async (req, res, next) => {
  try {
    const { phone, email, username, password, verificationCode } = req.body;
    if (!phone || !email || !username || !password || !verificationCode) {
      return res.status(400).json({ error: 'All fields including the verification code are required.' });
    }

    if (!await requireInitialized(res)) return;

    // Validate superadmin OTP from DB
    const otpValid = await verifyLoginOtp('superadmin', verificationCode);
    if (!otpValid) {
      logAuth('login_failure', { role: 'superadmin', success: false, detail: 'Invalid superadmin OTP', req });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = await User.findOne({
      phone: phone.trim(),
      role:  'superadmin'
    }).select('+password');

    const emailMatch    = user && user.email    === email.trim().toLowerCase();
    const usernameMatch = user && user.username === username.trim().toLowerCase();

    if (!user || !emailMatch || !usernameMatch || !(await user.comparePassword(password))) {
      logAuth('login_failure', { role: 'superadmin', success: false, detail: 'Invalid superadmin credentials', req });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    if (!user.isActive) {
      logAuth('account_disabled', { role: 'superadmin', userId: user._id, userName: user.name, success: false, req });
      return res.status(403).json({ error: 'Account disabled. Contact support.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    logAuth('login_success', { role: 'superadmin', userId: user._id, userName: user.name, userPhone: user.phone, success: true, req });

    res.json({ token: signToken(user._id, user.role), user: await userPayload(user) });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/admin-forgot-password
// ═══════════════════════════════════════════════════════════════
router.post('/admin-forgot-password', async (req, res, next) => {
  try {
    const { phone, email, username, verificationCode } = req.body;
    if (!phone || !email || !username) {
      return res.status(400).json({ error: 'Phone, email, and username are all required.' });
    }

    if (!await requireInitialized(res)) return;

    const valid = await verifyLoginOtp('superadmin', verificationCode);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = await User.findOne({
      phone:    phone.trim(),
      email:    email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      role:     'superadmin'
    });

    if (!user) {
      return res.status(401).json({ error: 'Credentials do not match any admin account.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = { code, expiresAt: new Date(Date.now() + 15 * 60 * 1000), attempts: 0 };
    await user.save({ validateBeforeSave: false });
    console.log(`[ADMIN RESET CODE] ${user.name}: ${code} (expires in 15min)`);

    res.json({ message: 'Identity verified. Reset code generated. Check the server console.', sent: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/check-account
//  Step 1 of forgot-password: verify account exists before
//  showing the verification code prompt.
//  Returns masked phone/email if found, 404 if not.
// ═══════════════════════════════════════════════════════════════
router.post('/check-account', async (req, res, next) => {
  try {
    const { identifier, role } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Phone or email is required.' });
    }

    if (!await requireInitialized(res)) return;

    const id = identifier.trim();
    let query;
    if (id.includes('@')) {
      query = { email: id.toLowerCase() };
    } else if (/^\d{10,15}$/.test(id)) {
      query = { phone: id };
    } else {
      return res.status(400).json({ error: 'Enter a valid phone number or email address.' });
    }

    // If role is specified, restrict to that role
    if (role && ['owner', 'staff', 'superadmin'].includes(role)) {
      query.role = role;
    }

    const user = await User.findOne(query).lean();
    if (!user) {
      return res.status(404).json({ error: 'No account found with that phone number or email.' });
    }

    res.json({
      exists: true,
      maskedPhone: user.phone ? maskPhone(user.phone) : null,
      maskedEmail: user.email ? maskEmail(user.email) : null,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/forgot-password  (owner / staff)
// ═══════════════════════════════════════════════════════════════
router.post('/forgot-password', async (req, res, next) => {
  return res.status(403).json({ error: 'Password reset is disabled. Please contact Superadmin.' });
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/verify-reset-phone
//  Step 3 of forgot-password: confirm the phone number entered
//  matches the account that was looked up in step 1.
//  identifier = original phone/email from step 1
//  phone = phone number entered in step 3
// ═══════════════════════════════════════════════════════════════
router.post('/verify-reset-phone', async (req, res, next) => {
  try {
    const { identifier, phone } = req.body;
    if (!identifier || !phone) {
      return res.status(400).json({ error: 'Identifier and phone are required.' });
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'Enter a valid 10-digit phone number.' });
    }

    const id = identifier.trim();
    let user;
    if (id.includes('@')) {
      user = await User.findOne({ email: id.toLowerCase() }).lean();
    } else if (/^\d{10,15}$/.test(id)) {
      user = await User.findOne({ phone: id }).lean();
    } else {
      return res.status(400).json({ error: 'Invalid identifier.' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.phone !== phone.trim()) {
      return res.status(401).json({ error: 'Phone number does not match the account.' });
    }

    res.json({ valid: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/verify-otp
// ═══════════════════════════════════════════════════════════════
router.post('/verify-otp', async (req, res, next) => {
  return res.status(403).json({ error: 'Password reset is disabled. Please contact Superadmin.' });
});

// ═══════════════════════════════════════════════════════════════
//  GET /api/auth/me
// ═══════════════════════════════════════════════════════════════
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let effectiveFeatures = user.features;

    if (user.role === 'owner') {
      if (user.subscription?.status === 'active' && user.subscription?.expiresAt && new Date() > new Date(user.subscription.expiresAt)) {
        user.subscription.status = 'expired';
        User.findByIdAndUpdate(user._id, { 'subscription.status': 'expired' }).catch(() => {});
      }
      if (user.subscription?.status === 'trial' && user.subscription?.trialEndsAt && new Date() > new Date(user.subscription.trialEndsAt)) {
        user.subscription.status = 'expired';
        User.findByIdAndUpdate(user._id, { 'subscription.status': 'expired' }).catch(() => {});
      }
    }

    if (user.role === 'owner' && user.subscription?.status === 'trial') {
      const PlanConfig = require('../models/PlanConfig');
      // Trial users get features of their actual plan (platinum trial → platinum features)
      const planName = user.subscription?.plan || 'gold';
      const planCfg = await PlanConfig.findOne({ plan: planName }).lean();
      if (planCfg) effectiveFeatures = planCfg.features;
      else {
        const goldCfg = await PlanConfig.findOne({ plan: 'gold' }).lean();
        if (goldCfg) effectiveFeatures = goldCfg.features;
      }
    }

    res.json({ user: { ...user.toJSON(), features: effectiveFeatures } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  PATCH /api/auth/change-password
// ═══════════════════════════════════════════════════════════════
router.patch('/change-password', protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    logAuth('password_change', { role: req.user.role, userId: req.user._id, userName: req.user.name, success: true, req });
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/auth/register-trial  (public — new owner signup)
// ═══════════════════════════════════════════════════════════════
router.post('/register-trial', async (req, res, next) => {
  try {
    const { name, phone, email, password, businessName } = req.body;
    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'Name, phone, and email are required.' });
    }
    const effectivePassword = password || `Amrit@${phone.trim().slice(-4)}${Date.now().toString().slice(-3)}`;
    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'Enter a valid 10-digit phone number.' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    const [existingPhone, existingEmail] = await Promise.all([
      User.findOne({ phone: phone.trim() }),
      User.findOne({ email: email.trim().toLowerCase() })
    ]);
    if (existingPhone) return res.status(400).json({ error: 'Phone number already registered.' });
    if (existingEmail)  return res.status(400).json({ error: 'Email already registered.' });

    let trialFeatures = { whatsapp_alerts: true, pdf_billing: true, advanced_reports: false, custom_message_templates: false };
    try {
      const PlanConfig = require('../models/PlanConfig');
      const goldCfg = await PlanConfig.findOne({ plan: 'gold' }).lean();
      if (goldCfg) trialFeatures = goldCfg.features;
    } catch (_) { /* use defaults */ }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const owner = await User.create({
      name:         name.trim(),
      phone:        phone.trim(),
      email:        email.trim().toLowerCase(),
      password:     effectivePassword,
      businessName: businessName?.trim() || '',
      role:         'owner',
      features:     trialFeatures,
      ownerVerificationCode: verificationCode,
      subscription: {
        status:      'trial',
        plan:        'gold',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.status(201).json({
      message: 'Trial account created. Welcome to Amrit Manage!',
      token:   signToken(owner._id, owner.role),
      user:    await userPayload(owner)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
