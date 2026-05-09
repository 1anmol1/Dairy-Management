/**
 * WhatsApp Service — whatsapp-web.js based
 *
 * Chrome is NEVER launched automatically.
 * The only entry point that starts Chrome is startSession().
 * Everything else (getSessionStatus, getQRCode) is read-only.
 *
 * Flow:
 *   1. Owner opens WhatsApp page → frontend calls GET /api/whatsapp/status
 *      → read-only, no Chrome
 *   2. Owner clicks "Connect WhatsApp" → frontend calls POST /api/whatsapp/connect
 *      → startSession() launches Chrome
 *   3. Frontend polls GET /api/whatsapp/qr until QR is ready
 *   4. Owner scans QR → session becomes 'connected'
 *   5. LocalAuth persists session to disk — no re-scan on server restart
 *      unless owner explicitly disconnects
 */

// Lazy-load whatsapp-web.js so a missing Chrome doesn't crash the server
let Client, LocalAuth;
try {
  const wwebjs = require('whatsapp-web.js');
  Client = wwebjs.Client;
  LocalAuth = wwebjs.LocalAuth;
} catch (err) {
  // Silently unavailable — all methods will return graceful errors
}

const qrcode = require('qrcode');
const path   = require('path');
const fs     = require('fs');
const User   = require('../models/User');

// In-memory map: ownerId → { client, status, qrData, error }
const sessions = new Map();

const SESSION_STATUS = {
  INITIALIZING: 'initializing',
  QR_READY:     'qr_ready',
  CONNECTED:    'connected',
  DISCONNECTED: 'disconnected',
  ERROR:        'error'
};

// ── Clear stale Chrome lock files ─────────────────────────────
// Puppeteer refuses to start if SingletonLock exists from a prior crash.
// Silent — no logs unless something actually fails.
const clearStaleLock = (ownerId) => {
  try {
    const sessionDir = path.join(__dirname, '..', '.wwebjs_auth', `session-${ownerId}`);
    const candidates = [
      path.join(sessionDir, 'SingletonLock'),
      path.join(sessionDir, 'SingletonCookie'),
      path.join(sessionDir, 'SingletonSocket'),
      path.join(sessionDir, 'Default', 'SingletonLock'),
    ];
    candidates.forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  } catch {
    // Non-fatal, ignore silently
  }
};

// ── startSession ──────────────────────────────────────────────
// The ONLY function that launches Chrome.
// Called exclusively from POST /api/whatsapp/connect.
// If a session already exists in memory, returns it as-is.
const startSession = (ownerId) => {
  if (!Client || !LocalAuth) {
    return { status: SESSION_STATUS.ERROR, error: 'WhatsApp is not available on this server.' };
  }

  // Already have a live session — return it
  if (sessions.has(ownerId)) {
    return sessions.get(ownerId);
  }

  const session = {
    client: null,
    status: SESSION_STATUS.INITIALIZING,
    qrData: null,
    error:  null
  };

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: ownerId }),
    puppeteer: {
      executablePath: '/home/u947024924/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
      headless: true,
      protocolTimeout: 120000,
      timeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-features=site-per-process'
      ]
    }
  });

  client.on('qr', async (qr) => {
    try {
      session.qrData  = await qrcode.toDataURL(qr);
      session.status  = SESSION_STATUS.QR_READY;
    } catch {
      // QR generation failed silently — next poll will retry
    }
  });

  client.on('ready', async () => {
    session.status = SESSION_STATUS.CONNECTED;
    session.qrData = null;
    console.log(`✅ WhatsApp connected for owner ${ownerId}`);
    try {
      await User.findByIdAndUpdate(ownerId, {
        'whatsappConfig.sessionActive': true,
        'whatsappConfig.method': 'web_session'
      });
    } catch { /* DB update failure is non-fatal */ }
  });

  client.on('disconnected', async (reason) => {
    session.status = SESSION_STATUS.DISCONNECTED;
    session.qrData = null;
    console.log(`❌ WhatsApp disconnected for owner ${ownerId}: ${reason}`);
    try {
      await User.findByIdAndUpdate(ownerId, {
        'whatsappConfig.sessionActive': false
      });
    } catch { /* non-fatal */ }
    sessions.delete(ownerId);
  });

  client.on('auth_failure', () => {
    session.status = SESSION_STATUS.ERROR;
    session.error  = 'Authentication failed. Please reconnect.';
    sessions.delete(ownerId);
  });

  session.client = client;
  sessions.set(ownerId, session);

  // Clear stale locks silently before starting
  clearStaleLock(ownerId);

  client.initialize().catch(async err => {
    // Lock conflict — clear and retry once
    if (err.message.includes('already running') || err.message.includes('userDataDir')) {
      clearStaleLock(ownerId);
      try {
        await client.initialize();
        return;
      } catch { /* fall through to error state */ }
    }
    session.status = SESSION_STATUS.ERROR;
    session.error  = err.message;
    console.error(`WhatsApp init failed for owner ${ownerId}:`, err.message);
  });

  return session;
};

// ── getQRCode ─────────────────────────────────────────────────
// Read-only. Returns QR if session is in qr_ready state.
// Does NOT start Chrome — owner must call startSession() first.
const getQRCode = (ownerId) => {
  if (!sessions.has(ownerId)) {
    return { status: SESSION_STATUS.DISCONNECTED };
  }
  const session = sessions.get(ownerId);
  if (session.status === SESSION_STATUS.CONNECTED) {
    return { status: 'connected' };
  }
  if (session.status === SESSION_STATUS.QR_READY && session.qrData) {
    return { status: 'qr_ready', qr: session.qrData };
  }
  return { status: session.status };
};

// ── getSessionStatus ──────────────────────────────────────────
// Read-only. Never launches Chrome.
const getSessionStatus = (ownerId) => {
  if (!sessions.has(ownerId)) {
    return { status: SESSION_STATUS.DISCONNECTED };
  }
  const session = sessions.get(ownerId);
  return { status: session.status, error: session.error };
};

// ── disconnectSession ─────────────────────────────────────────
const disconnectSession = async (ownerId) => {
  if (!sessions.has(ownerId)) return;
  const session = sessions.get(ownerId);
  try { await session.client.destroy(); } catch { /* ignore */ }
  sessions.delete(ownerId);
  try {
    await User.findByIdAndUpdate(ownerId, {
      'whatsappConfig.sessionActive': false
    });
  } catch { /* non-fatal */ }
};

// ── sendMessage ───────────────────────────────────────────────
const sendMessage = async (ownerId, phone, message) => {
  const session = sessions.get(ownerId);
  if (!session || session.status !== SESSION_STATUS.CONNECTED) {
    throw new Error('WhatsApp not connected for this owner.');
  }

  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10)          clean = '91' + clean;
  else if (clean.startsWith('0'))   clean = '91' + clean.slice(1);
  if (clean.length < 11) throw new Error(`Invalid phone number: ${phone}`);

  const chatId = `${clean}@c.us`;

  try {
    const isRegistered = await session.client.isRegisteredUser(chatId);
    if (!isRegistered) throw new Error(`${phone} is not registered on WhatsApp.`);
  } catch (checkErr) {
    if (checkErr.message.includes('not registered')) throw checkErr;
    // isRegisteredUser unavailable on older wwebjs — proceed anyway
  }

  await session.client.sendMessage(chatId, message);
};

// ── sendDocument ──────────────────────────────────────────────
const sendDocument = async (ownerId, phone, base64Data, filename, caption = '') => {
  let wwebjs;
  try { wwebjs = require('whatsapp-web.js'); } catch { throw new Error('whatsapp-web.js not available'); }
  const { MessageMedia } = wwebjs;
  const session = sessions.get(ownerId);
  if (!session || session.status !== SESSION_STATUS.CONNECTED) {
    throw new Error('WhatsApp not connected for this owner.');
  }
  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10)        clean = '91' + clean;
  else if (clean.startsWith('0')) clean = '91' + clean.slice(1);
  if (clean.length < 11) throw new Error(`Invalid phone number: ${phone}`);
  const chatId = `${clean}@c.us`;
  const media = new MessageMedia('application/pdf', base64Data, filename);
  await session.client.sendMessage(chatId, media, { caption });
};

// ── sendDeliveryNotification ──────────────────────────────────
const sendDeliveryNotification = async (owner, customer, log) => {
  const ownerId = owner._id.toString();
  if (!sessions.has(ownerId) || sessions.get(ownerId).status !== SESSION_STATUS.CONNECTED) {
    return; // Not connected — skip silently, no log noise
  }

  const businessName = owner.businessName || owner.name;
  const slotLabel    = log.slot === 'morning' ? 'Morning' : 'Evening';
  const extraText    = log.extra_qty > 0
    ? ` (${log.base_qty}L Regular + ${log.extra_qty}L Extra)` : '';

  const message =
    `✅ *Milk Delivered* — ${log.date}\n` +
    `${slotLabel}: *${log.delivered_qty}L*${extraText}\n` +
    `Amount: ₹${log.amount_calculated.toFixed(2)}\n` +
    `— ${businessName}`;

  try {
    await sendMessage(ownerId, customer.phone, message);
    const DailyLog = require('../models/DailyLog');
    await DailyLog.findByIdAndUpdate(log._id, { whatsappSent: true });
  } catch (err) {
    const DailyLog = require('../models/DailyLog');
    await DailyLog.findByIdAndUpdate(log._id, { whatsappError: err.message });
    throw err;
  }
};

// ── sendBulkMessage ───────────────────────────────────────────
const sendBulkMessage = async (ownerId, numbers, message) => {
  const results = [];
  for (const number of numbers) {
    try {
      await sendMessage(ownerId, number, message);
      results.push({ number, status: 'sent' });
    } catch (err) {
      results.push({ number, status: 'failed', error: err.message });
    }
    await new Promise(r => setTimeout(r, 1500)); // avoid spam detection
  }
  return results;
};

module.exports = {
  startSession,
  getQRCode,
  getSessionStatus,
  disconnectSession,
  sendMessage,
  sendDocument,
  sendDeliveryNotification,
  sendBulkMessage,
  SESSION_STATUS
};
