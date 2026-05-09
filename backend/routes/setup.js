/**
 * Setup Route — /api/setup
 *
 * LOCALHOST ONLY. Blocked from all external IPs in production.
 * Used once (or whenever you need to update credentials) via the
 * local setup-credentials.html page.
 *
 * Stores:
 *   - Superadmin account in User collection
 *   - Login OTPs as bcrypt hashes in SystemConfig collection
 *
 * No .env credentials needed — everything goes to MongoDB.
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');

// ── Localhost-only IP guard ───────────────────────────────────
// Blocks ALL requests that don't come from 127.0.0.1 / ::1
// (CORS is handled in server.js before this route)
// On Hostinger, the reverse proxy makes all requests appear local,
// so we also require a SETUP_TOKEN in production as a second factor.
router.use((req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  const isLocal =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost';

  if (!isLocal) {
    return res.status(404).json({ error: 'Route not found.' });
  }

  // On shared hosting, reverse proxy makes all IPs appear local.
  // Require a SETUP_TOKEN env var in production as a second guard.
  if (process.env.NODE_ENV === 'production') {
    const token = req.headers['x-setup-token'] || req.query.token;
    const expected = process.env.SETUP_TOKEN;
    if (!expected || token !== expected) {
      return res.status(404).json({ error: 'Route not found.' });
    }
  }

  next();
});

// ── GET /api/setup/status ─────────────────────────────────────
router.get('/status', async (req, res, next) => {
  try {
    const cfg = await SystemConfig.findOne({ key: 'system' });
    const admin = await User.findOne({ role: 'superadmin' }).select('name phone email username').lean();

    res.json({
      isInitialized: cfg?.isInitialized || false,
      configuredAt:  cfg?.configuredAt  || null,
      superadmin: admin ? {
        name:     admin.name,
        phone:    admin.phone,
        email:    admin.email,
        username: admin.username,
      } : null
    });
  } catch (err) {
    // Give a clear message if MongoDB is unreachable
    const isDbError = err.name === 'MongoNetworkError' ||
      err.message?.includes('timed out') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('connect');
    if (isDbError) {
      return res.status(503).json({
        error: 'Cannot reach MongoDB. Add your IP to MongoDB Atlas → Network Access, then restart the server.',
        code: 'DB_UNREACHABLE'
      });
    }
    next(err);
  }
});

// ── GET /api/setup/debug ──────────────────────────────────────
// Shows exactly what is stored for the superadmin — use this to
// confirm what credentials to enter on the login page.
// LOCALHOST ONLY (already guarded by the IP middleware above).
router.get('/debug', async (req, res, next) => {
  try {
    const admin = await User.findOne({ role: 'superadmin' })
      .select('name phone email username isActive role createdAt updatedAt')
      .lean();
    const cfg = await SystemConfig.findOne({ key: 'system' })
      .select('isInitialized configuredAt otpOwnerHash otpStaffHash otpSuperadminHash')
      .lean();

    res.json({
      superadmin: admin || null,
      systemConfig: {
        isInitialized:       cfg?.isInitialized || false,
        configuredAt:        cfg?.configuredAt  || null,
        hasOwnerOtp:         !!cfg?.otpOwnerHash,
        hasStaffOtp:         !!cfg?.otpStaffHash,
        hasSuperadminOtp:    !!cfg?.otpSuperadminHash,
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/setup/initialize ────────────────────────────────
// Sets superadmin credentials and login OTPs.
// Can be called multiple times to update credentials.
router.post('/initialize', async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      username,
      password,
      otpSuperadmin,
      otpOwner,
      otpStaff,
    } = req.body;

    // ── Validate all fields ───────────────────────────────────
    if (!name || !phone || !email || !username || !password) {
      return res.status(400).json({ error: 'All superadmin fields are required.' });
    }
    if (!otpSuperadmin || !otpOwner || !otpStaff) {
      return res.status(400).json({ error: 'All three verification codes are required.' });
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ error: 'Phone must be exactly 10 digits.' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (!/^\d{6}$/.test(otpSuperadmin) || !/^\d{6}$/.test(otpOwner) || !/^\d{6}$/.test(otpStaff)) {
      return res.status(400).json({ error: 'Each verification code must be exactly 6 digits.' });
    }
    if (new Set([otpSuperadmin, otpOwner, otpStaff]).size !== 3) {
      return res.status(400).json({ error: 'All three verification codes must be different.' });
    }

    // ── Upsert superadmin in User collection ──────────────────
    const cleanPhone    = phone.trim();
    const cleanEmail    = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    let admin = await User.findOne({ role: 'superadmin' });

    if (admin) {
      // Update existing superadmin
      admin.name     = name.trim();
      admin.phone    = cleanPhone;
      admin.email    = cleanEmail;
      admin.username = cleanUsername;
      admin.password = password; // pre-save hook hashes it
      await admin.save();
    } else {
      // Create new superadmin
      admin = await User.create({
        name:     name.trim(),
        phone:    cleanPhone,
        email:    cleanEmail,
        username: cleanUsername,
        password,
        role:     'superadmin',
      });
    }

    // ── Store OTPs as bcrypt hashes in SystemConfig ───────────
    const cfg = await SystemConfig.getSingleton();
    await cfg.setOtp('superadmin', otpSuperadmin);
    await cfg.setOtp('owner',      otpOwner);
    await cfg.setOtp('staff',      otpStaff);
    cfg.isInitialized = true;
    cfg.configuredAt  = new Date();
    cfg.configuredBy  = 'setup-page';
    await cfg.save();

    console.log(`[SETUP] Credentials configured for superadmin: ${cleanPhone}`);

    res.json({
      success: true,
      message: 'Credentials saved to database. You can now log in.',
      superadmin: {
        name:     admin.name,
        phone:    admin.phone,
        email:    admin.email,
        username: admin.username,
      }
    });
  } catch (err) {
    console.error('[SETUP ERROR]', err.message, err.code || '');
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ error: `${field} is already in use by another account.` });
    }
    return res.status(500).json({ error: err.message || 'Failed to save credentials.' });
  }
});

module.exports = router;
