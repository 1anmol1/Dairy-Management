const express = require('express');
const router = express.Router();
const sessionStore = require('../utils/sessionStore');
const { initiatePairing, pairingInProgress } = require('../whatsapp/pairingService');
const { logoutSession } = require('../whatsapp/sessionManager');
const { sendMessage } = require('../whatsapp/messageService');
const { pairingRateLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/whatsapp/request-pairing
 * Initiates the async pairing process
 */
router.post('/request-pairing', pairingRateLimiter, async (req, res) => {
  try {
    const { cleanPhone, clientIp } = req;

    // Check if there is already an active session
    const existingSession = sessionStore.getSession(cleanPhone);
    if (existingSession && existingSession.status === 'connected') {
      return res.status(200).json({
        status: 'connected',
        phone: cleanPhone,
        message: 'This phone number is already connected.'
      });
    }

    // Call async pairing service
    const result = await initiatePairing(cleanPhone);

    // Save timestamps ONLY on successful async initiation
    const { ipLimits, phoneLimits } = require('../middleware/rateLimiter');
    const now = Date.now();
    phoneLimits.set(cleanPhone, now);
    if (clientIp) {
      ipLimits.set(clientIp, now);
    }

    return res.status(202).json(result);
  } catch (err) {
    console.error('[ROUTE ERROR] request-pairing:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/whatsapp/pairing-status/:jobId
 * Checked by frontend polling
 */
router.get('/pairing-status/:jobId', (req, res) => {
  const { jobId } = req.params;

  // Search in pairingInProgress Map
  let found = null;
  let foundPhone = null;

  for (const [phone, info] of pairingInProgress.entries()) {
    if (info.jobId === jobId) {
      found = info;
      foundPhone = phone;
      break;
    }
  }

  if (!found) {
    return res.status(404).json({ error: 'Not Found', message: 'Pairing job not found or expired.' });
  }

  // Check if session status has changed to connected in sessionStore
  const activeSession = sessionStore.getSession(foundPhone);
  if (activeSession && activeSession.status === 'connected') {
    found.status = 'connected';
  }

  return res.json({
    status: found.status,
    code: found.code,
    error: found.error
  });
});

/**
 * GET /api/whatsapp/session-status/:phone
 * Check if a phone session is connected
 */
router.get('/session-status/:phone', (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  const session = sessionStore.getSession(cleanPhone);

  if (session && session.status === 'connected') {
    return res.json({ connected: true, phone: cleanPhone, status: session.status });
  }

  return res.json({ connected: false, phone: cleanPhone, status: session ? session.status : 'disconnected' });
});

/**
 * POST /api/whatsapp/send-message
 * Sends a text message to a specific number
 */
router.post('/send-message', async (req, res) => {
  try {
    const { phone, message, sender } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Bad Request', message: 'phone and message are required.' });
    }

    const cleanRecipient = phone.replace(/\D/g, '');
    let cleanSender = sender ? sender.replace(/\D/g, '') : null;

    // If sender is not specified, check if we have any active connected session
    if (!cleanSender) {
      const allSessions = sessionStore.getAllSessions();
      const connected = allSessions.find(s => s.status === 'connected');
      if (connected) {
        cleanSender = connected.phone;
      }
    }

    if (!cleanSender) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No sender specified and no active connected sessions found.'
      });
    }

    const result = await sendMessage(cleanSender, cleanRecipient, message);
    return res.json(result);
  } catch (err) {
    console.error('[ROUTE ERROR] send-message:', err.message);
    return res.status(500).json({ error: 'Failed to send message', message: err.message });
  }
});

/**
 * DELETE /api/whatsapp/logout/:phone
 * Logout and clear session
 */
router.delete('/logout/:phone', async (req, res) => {
  try {
    const cleanPhone = req.params.phone.replace(/\D/g, '');
    await logoutSession(cleanPhone);
    return res.json({ success: true, message: `Session for ${cleanPhone} logged out.` });
  } catch (err) {
    console.error('[ROUTE ERROR] logout:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/whatsapp/health
 * Returns list of active sessions and statuses
 */
router.get('/health', (req, res) => {
  const sessions = sessionStore.getAllSessions();
  return res.json({
    status: 'healthy',
    uptime: process.uptime(),
    activeSessionsCount: sessions.length,
    sessions
  });
});

module.exports = router;
