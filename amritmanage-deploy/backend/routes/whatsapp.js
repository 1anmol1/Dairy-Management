const express = require('express');
const router = express.Router();
const { protect, authorize, requireActiveSubscription, requireFeature } = require('../middleware/auth');
const {
  startSession,
  getQRCode,
  getSessionStatus,
  disconnectSession,
  sendBulkMessage
} = require('../services/whatsappService');

// All WhatsApp routes require owner role + active subscription + feature flag
router.use(protect, authorize('owner'), requireActiveSubscription, requireFeature('whatsapp_alerts'));

// ── Disable caching for all WhatsApp routes ───────────────────
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// ── GET /api/whatsapp/status ──────────────────────────────────
// Read-only — NEVER launches Chrome.
// Returns current in-memory session state.
// If no session in memory but DB says was active → needs_reconnect.
// Owner must click "Connect" to start Chrome.
router.get('/status', async (req, res, next) => {
  try {
    const ownerId = req.user._id.toString();
    const status = getSessionStatus(ownerId);

    if (status.status === 'disconnected') {
      const User = require('../models/User');
      const owner = await User.findById(ownerId).select('whatsappConfig').lean();
      if (owner?.whatsappConfig?.sessionActive) {
        return res.json({ status: 'needs_reconnect' });
      }
    }

    res.json(status);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/whatsapp/connect ────────────────────────────────
// Explicitly starts the Chrome/WhatsApp session.
// Called ONLY when the owner clicks "Connect WhatsApp" or "Load QR".
// This is the ONLY place Chrome is launched.
router.post('/connect', async (req, res, next) => {
  try {
    const ownerId = req.user._id.toString();
    const session = startSession(ownerId);

    // If already connected, return immediately
    if (session.status === 'connected') {
      return res.json({ status: 'connected' });
    }

    res.json({ status: session.status });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/whatsapp/qr ──────────────────────────────────────
// Returns QR code if session is initializing and QR is ready.
// Does NOT start Chrome — owner must call /connect first.
router.get('/qr', async (req, res, next) => {
  try {
    const ownerId = req.user._id.toString();
    const result = getQRCode(ownerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/whatsapp/status/stream — SSE for real-time status ─
// Replaces polling: client connects once, server pushes updates.
// Token passed as query param since EventSource doesn't support headers.
router.get('/status/stream', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const token = req.query.token;
    if (!token) { res.status(401).end(); return; }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role features subscription').lean();
    if (!user || user.role !== 'owner') { res.status(403).end(); return; }

    const ownerId = user._id.toString();

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.flushHeaders();

    const sendStatus = () => {
      try {
        const status = getSessionStatus(ownerId);
        res.write(`data: ${JSON.stringify(status)}\n\n`);
      } catch { /* ignore */ }
    };

    sendStatus();
    const interval = setInterval(sendStatus, 3000);
    const heartbeat = setInterval(() => { res.write(': ping\n\n'); }, 25000);

    req.on('close', () => { clearInterval(interval); clearInterval(heartbeat); });
  } catch {
    res.status(401).end();
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
