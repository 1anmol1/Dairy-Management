const express = require('express');
const router = express.Router();
const { protect, authorize, requireActiveSubscription, requireFeature } = require('../middleware/auth');
const {
  startPairingFlow,
  getSessionStatus,
  getSessionStatusDb,
  disconnectSession,
  sendBulkMessage
} = require('../services/whatsappService');

// ── GET /api/whatsapp/status/stream — SSE for real-time status ─
router.get('/status/stream', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const token = req.query.token;
    if (!token) { res.status(401).end(); return; }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role features subscription').lean();
    if (!user || user.role !== 'owner') { res.status(403).end(); return; }

    const status = user.subscription?.status;
    const expiresAt = user.subscription?.expiresAt;
    const trialEndsAt = user.subscription?.trialEndsAt;
    let isActive = false;
    if (status === 'trial') {
      isActive = !trialEndsAt || new Date(trialEndsAt) > new Date();
    } else if (status === 'active') {
      isActive = !expiresAt || new Date(expiresAt) > new Date();
    }
    if (!isActive) { res.status(403).end(); return; }

    const plan = user.subscription?.plan || 'silver';
    const hasFeature = user.features?.whatsapp_alerts || plan === 'gold' || plan === 'platinum' || status === 'trial';
    if (!hasFeature) { res.status(403).end(); return; }

    const ownerId = user._id.toString();

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();

    const sendStatus = async () => {
      try {
        const currentStatus = await getSessionStatusDb(ownerId);
        res.write(`data: ${JSON.stringify(currentStatus)}\n\n`);
      } catch { /* ignore */ }
    };

    await sendStatus();
    const interval = setInterval(sendStatus, 3000);
    const heartbeat = setInterval(() => { res.write(': ping\n\n'); }, 25000);

    req.on('close', () => { clearInterval(interval); clearInterval(heartbeat); });
  } catch {
    res.status(401).end();
  }
});

// All WhatsApp routes require owner role + active subscription + feature flag
router.use(protect, authorize('owner'), requireActiveSubscription, requireFeature('whatsapp_alerts'));

// Disable caching for all WhatsApp routes
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ── GET /api/whatsapp/status ──────────────────────────────────
router.get('/status', async (req, res, next) => {
  try {
    const ownerId = req.user._id.toString();
    const status = await getSessionStatusDb(ownerId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/whatsapp/request-pairing ────────────────────────
router.post('/request-pairing', async (req, res, next) => {
  try {
    const ownerId = req.user._id.toString();
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    // Sanitize phone number: strip spaces, dashes, brackets, plus signs
    const sanitized = phoneNumber.replace(/[\s\-\(\)\+]/g, '');

    // Reject non-numeric values
    if (!/^\d+$/.test(sanitized)) {
      return res.status(400).json({ error: 'Invalid phone number format. Only numbers are allowed.' });
    }

    // Require country code and validate length (11 to 15 digits)
    if (sanitized.length < 11 || sanitized.length > 15) {
      return res.status(400).json({ error: 'Phone number must include country code and be between 11 and 15 digits.' });
    }

    // Rate Limiting Logic:
    const WhatsappConnection = require('../models/WhatsappConnection');
    let conn = await WhatsappConnection.findOne({ user_id: ownerId });
    if (!conn) {
      conn = new WhatsappConnection({ user_id: ownerId, phone_number: sanitized, status: 'pending' });
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Keep only attempts in the last 24 hours
    conn.pairing_attempts_timestamps = conn.pairing_attempts_timestamps.filter(t => t > oneDayAgo);

    const attemptsLastHour = conn.pairing_attempts_timestamps.filter(t => t > oneHourAgo);

    // Check hourly limit (5 attempts)
    if (attemptsLastHour.length >= 5) {
      return res.status(429).json({ error: 'Too many pairing requests. Maximum 5 attempts per hour.' });
    }

    // Check daily limit (10 attempts)
    if (conn.pairing_attempts_timestamps.length >= 10) {
      return res.status(429).json({ error: 'Too many pairing requests. Maximum 10 attempts per day.' });
    }

    // Check cooldown (90 seconds between requests)
    if (conn.pairing_attempts_timestamps.length > 0) {
      const lastAttempt = conn.pairing_attempts_timestamps[conn.pairing_attempts_timestamps.length - 1];
      const elapsed = now.getTime() - lastAttempt.getTime();
      if (elapsed < 90 * 1000) {
        const remaining = Math.ceil((90 * 1000 - elapsed) / 1000);
        return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new code.` });
      }
    }

    // Save timestamp
    conn.pairing_attempts_timestamps.push(now);
    await conn.save();

    // Start pairing flow in background
    await startPairingFlow(ownerId, sanitized);
    res.json({ success: true, status: 'pairing_requested' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unable to initiate pairing code generation.' });
  }
});

// ── POST /api/whatsapp/disconnect ─────────────────────────────
router.post('/disconnect', async (req, res, next) => {
  try {
    await disconnectSession(req.user._id.toString());
    res.json({ message: 'WhatsApp session disconnected.' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/whatsapp/send-bulk ──────────────────────────────
router.post('/send-bulk', async (req, res, next) => {
  try {
    const { numbers, message } = req.body;
    if (!numbers || !Array.isArray(numbers) || !message) {
      return res.status(400).json({ error: 'numbers (array) and message are required.' });
    }
    if (numbers.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 numbers per batch.' });
    }
    const results = await sendBulkMessage(req.user._id.toString(), numbers, message);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
