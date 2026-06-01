/**
 * WhatsApp Service — Baileys-based (No Puppeteer/Chrome required)
 * Optimised for shared web hosting environments.
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const User = require('../models/User');

const logger = pino({ level: 'silent' });
const AUTH_DIR = path.join(__dirname, '..', '.baileys_auth');

// Symmetric Encryption Helpers for sensitive metadata
const ENCRYPTION_KEY = (process.env.JWT_SECRET || 'fallback-secret-key-32-chars-long-12345').padEnd(32, '0').slice(0, 32);
const IV_LENGTH = 16;

const encrypt = (text) => {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  if (!text || !text.includes(':')) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    return text;
  }
};

// Audit logging helper
const logAudit = (ownerId, event, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] [${timestamp}] WhatsApp Event: ${event} | User: ${ownerId} | Details: ${JSON.stringify(details)}`);
};

// In-memory map: ownerId → { client, status, pairingCode, phoneNumber, error }
const sessions = new Map();
const reconnectAttempts = new Map();

const SESSION_STATUS = {
  INITIALIZING:      'pending',
  PAIRING_REQUESTED: 'pairing_requested',
  CONNECTED:         'authenticated',
  DISCONNECTED:      'disconnected',
  ERROR:             'failed'
};

// Helper to remove folder recursively
function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

// ── startSession ──────────────────────────────────────────────
// Restores existing authenticated session or initializes a socket for ownerId
const startSession = async (ownerId, isPairing = false) => {
  if (sessions.has(ownerId)) {
    const s = sessions.get(ownerId);
    if (s.status === SESSION_STATUS.CONNECTED) {
      return s;
    }
    // Bug 6 Fix: Cleanly close existing socket connection before opening a new one
    if (s.client) {
      try {
        console.log(`[SESSION] Closing existing socket for owner ${ownerId} before starting a new one...`);
        s.client.ev.removeAllListeners();
        s.client.end();
      } catch (err) {
        console.warn(`[SESSION] Error ending existing socket for owner ${ownerId}:`, err.message);
      }
    }
  }

  const WhatsappConnection = require('../models/WhatsappConnection');
  const conn = await WhatsappConnection.findOne({ user_id: ownerId });
  if (!conn) {
    throw new Error('No WhatsApp connection config found for this user.');
  }

  const decryptedPhone = decrypt(conn.phone_number);
  const sessionPath = path.join(AUTH_DIR, `session-${ownerId}`);

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    getMessage: async () => undefined,
    connectTimeoutMs: 30000,
    keepAliveIntervalMs: 10000,
    retryRequestDelayMs: 2000
  });

  const session = {
    client: sock,
    status: SESSION_STATUS.INITIALIZING,
    pairingCode: null,
    phoneNumber: decryptedPhone,
    error: null
  };

  sessions.set(ownerId, session);

  sock.ev.on('creds.update', saveCreds);

  // Bug 1 Fix: Request pairing code immediately after socket creation if not registered and isPairing is true
  if (!state.creds.registered && isPairing) {
    // Small delay to let socket setup settle
    setTimeout(async () => {
      try {
        console.log(`[PAIRING] Socket ready. Requesting pairing code for owner ${ownerId}...`);
        const code = await sock.requestPairingCode(decryptedPhone);
        console.log(`[PAIRING] Successfully generated pairing code for owner ${ownerId}: ${code}`);
        
        session.pairingCode = code;
        session.status = SESSION_STATUS.PAIRING_REQUESTED;
      } catch (err) {
        console.error(`[PAIRING] Failed to get pairing code for owner ${ownerId}:`, err.message);
        session.status = SESSION_STATUS.ERROR;
        session.error = err.message || 'Failed to request pairing code from WhatsApp.';
      }
    }, 2000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      session.status = SESSION_STATUS.INITIALIZING;
      console.log(`[SESSION] Owner ${ownerId} is connecting...`);
    }

    if (connection === 'open') {
      console.log(`[SESSION] Owner ${ownerId} is connected successfully!`);
      session.status = SESSION_STATUS.CONNECTED;
      session.pairingCode = null;
      session.error = null;
      reconnectAttempts.delete(ownerId);

      logAudit(ownerId, 'authentication completed', { phone: decryptedPhone });

      try {
        await WhatsappConnection.findOneAndUpdate({ user_id: ownerId }, {
          status: 'authenticated',
          connected_at: new Date(),
          last_activity: new Date()
        });
        await User.findByIdAndUpdate(ownerId, {
          'whatsappConfig.sessionActive': true,
          'whatsappConfig.method': 'pairing_code'
        });
      } catch {}
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode || error?.code;
      
      // Deleting credentials on status code 401 (loggedOut) is only valid if we were previously authenticated.
      // During the initial pairing request, 401 is normal and shouldn't trigger folder deletion.
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const wasConnected = session.status === SESSION_STATUS.CONNECTED;
      const shouldDelete = isLoggedOut && wasConnected;
      const shouldReconnect = !shouldDelete;

      console.warn(`[SESSION] Owner ${ownerId} connection closed. Status Code: ${statusCode}. Should Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        // Handle reconnection limits
        const attempts = reconnectAttempts.get(ownerId) || 0;
        if (attempts < 5) {
          const nextAttempt = attempts + 1;
          reconnectAttempts.set(ownerId, nextAttempt);
          const delay = 5000;
          console.log(`[SESSION] Reconnecting owner ${ownerId} in ${delay / 1000}s (Attempt ${nextAttempt}/5)`);
          
          session.status = SESSION_STATUS.INITIALIZING;

          setTimeout(() => {
            startSession(ownerId).catch((err) => {
              console.error(`[SESSION] Reconnection error for owner ${ownerId}:`, err.message);
            });
          }, delay);
        } else {
          console.error(`[SESSION] Reconnection failed 5 times for owner ${ownerId}. Marking as disconnected.`);
          session.status = SESSION_STATUS.ERROR;
          session.error = 'Reconnection failed. Please check WhatsApp connection status.';
          try {
            await WhatsappConnection.findOneAndUpdate({ user_id: ownerId }, { status: 'disconnected' });
            await User.findByIdAndUpdate(ownerId, { 'whatsappConfig.sessionActive': false });
          } catch {}
        }
      } else {
        // Logged out / explicit credentials destruction
        console.warn(`[SESSION] Owner ${ownerId} logged out or session terminated. Cleaning up.`);
        session.status = SESSION_STATUS.DISCONNECTED;
        session.pairingCode = null;
        logAudit(ownerId, 'disconnect event', { reason: 'Logged out' });

        try {
          await WhatsappConnection.findOneAndUpdate({ user_id: ownerId }, { status: 'disconnected' });
          await User.findByIdAndUpdate(ownerId, { 'whatsappConfig.sessionActive': false });
        } catch {}

        // Remove auth folder
        sessions.delete(ownerId);
        reconnectAttempts.delete(ownerId);
        if (fs.existsSync(sessionPath)) {
          try {
            deleteFolderRecursive(sessionPath);
          } catch (e) {
            console.warn(`[CLEANUP] Failed to delete session path:`, e.message);
          }
        }
      }
    }
  });

  return session;
};

// ── startPairingFlow ──────────────────────────────────────────
// Starts pairing code authentication for a new phone number
const startPairingFlow = async (ownerId, phoneNumber) => {
  // Clear any existing connection/session
  if (sessions.has(ownerId)) {
    const s = sessions.get(ownerId);
    if (s.client) {
      try {
        await s.client.logout();
      } catch {}
    }
    sessions.delete(ownerId);
  }

  const sessionPath = path.join(AUTH_DIR, `session-${ownerId}`);
  if (fs.existsSync(sessionPath)) {
    try {
      deleteFolderRecursive(sessionPath);
    } catch (e) {
      console.warn(`[CLEANUP] Failed to delete old session path before pairing:`, e.message);
    }
  }

  const WhatsappConnection = require('../models/WhatsappConnection');

  // Initialize DB entry
  await WhatsappConnection.findOneAndUpdate(
    { user_id: ownerId },
    {
      phone_number: encrypt(phoneNumber),
      status: 'pairing_requested',
      connected_at: null,
      last_activity: new Date()
    },
    { upsert: true, new: true }
  );

  // Initialize session in background
  setImmediate(async () => {
    try {
      await startSession(ownerId, true);
    } catch (err) {
      console.error(`[PAIRING] Failed to start session in background:`, err.message);
      if (sessions.has(ownerId)) {
        const session = sessions.get(ownerId);
        session.status = SESSION_STATUS.ERROR;
        session.error = err.message || 'Failed to request pairing code from WhatsApp.';
      }
      try {
        await WhatsappConnection.findOneAndUpdate(
          { user_id: ownerId },
          { status: 'disconnected' }
        );
      } catch {}
    }
  });

  return { success: true };
};

// ── getQRCode ─────────────────────────────────────────────────
const getQRCode = () => {
  return { status: 'disabled', error: 'QR Code authentication is disabled. Please use Phone Number Pairing.' };
};

// ── getSessionStatus ──────────────────────────────────────────
const getSessionStatus = (ownerId) => {
  if (!sessions.has(ownerId)) {
    return { connected: false, status: 'disconnected' };
  }
  const session = sessions.get(ownerId);
  const connected = session.status === SESSION_STATUS.CONNECTED;
  return {
    connected,
    status: session.status,
    pairingCode: session.pairingCode,
    phoneNumber: session.phoneNumber,
    error: session.error
  };
};

const getSessionStatusDb = async (ownerId) => {
  const inMem = getSessionStatus(ownerId);
  if (inMem.status !== 'disconnected') {
    return inMem;
  }
  const WhatsappConnection = require('../models/WhatsappConnection');
  const conn = await WhatsappConnection.findOne({ user_id: ownerId });
  if (conn) {
    return {
      connected: conn.status === 'authenticated',
      status: conn.status,
      phoneNumber: decrypt(conn.phone_number)
    };
  }
  return { connected: false, status: 'disconnected' };
};

// ── disconnectSession ─────────────────────────────────────────
const disconnectSession = async (ownerId) => {
  logAudit(ownerId, 'session destruction');
  if (sessions.has(ownerId)) {
    const session = sessions.get(ownerId);
    try {
      await session.client.logout();
    } catch {}
    sessions.delete(ownerId);
  }

  const WhatsappConnection = require('../models/WhatsappConnection');
  await WhatsappConnection.findOneAndUpdate({ user_id: ownerId }, {
    status: 'disconnected',
    connected_at: null
  });

  try {
    await User.findByIdAndUpdate(ownerId, {
      'whatsappConfig.sessionActive': false,
      'whatsappConfig.method': 'none'
    });
  } catch {}

  // Remove local authentication folder
  const sessionPath = path.join(AUTH_DIR, `session-${ownerId}`);
  if (fs.existsSync(sessionPath)) {
    try {
      deleteFolderRecursive(sessionPath);
    } catch (err) {
      console.warn(`[CLEANUP] Failed to remove session dir for owner ${ownerId}:`, err.message);
    }
  }
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

  const jid = `${clean}@s.whatsapp.net`;
  await session.client.sendMessage(jid, { text: message });
};

// ── sendDocument ──────────────────────────────────────────────
const sendDocument = async (ownerId, phone, base64Data, filename, caption = '') => {
  const session = sessions.get(ownerId);
  if (!session || session.status !== SESSION_STATUS.CONNECTED) {
    throw new Error('WhatsApp not connected for this owner.');
  }

  let clean = phone.replace(/\D/g, '');
  if (clean.length === 10)        clean = '91' + clean;
  else if (clean.startsWith('0')) clean = '91' + clean.slice(1);
  if (clean.length < 11) throw new Error(`Invalid phone number: ${phone}`);

  const jid = `${clean}@s.whatsapp.net`;
  const buffer = Buffer.from(base64Data, 'base64');
  
  await session.client.sendMessage(jid, {
    document: buffer,
    fileName: filename,
    caption: caption,
    mimetype: 'application/pdf'
  });
};

// ── sendDeliveryNotification ──────────────────────────────────
const sendDeliveryNotification = async (owner, customer, log) => {
  const ownerId = owner._id.toString();
  if (!sessions.has(ownerId) || sessions.get(ownerId).status !== SESSION_STATUS.CONNECTED) {
    return;
  }

  const isMr = customer.language === 'mr';
  const businessName = owner.businessName || owner.name;
  const slotLabel = isMr
    ? (log.slot === 'morning' ? 'सकाळ' : 'संध्याकाळ')
    : (log.slot === 'morning' ? 'Morning' : 'Evening');

  const unit = isMr ? 'लीटर' : 'L';
  const extraText = log.extra_qty > 0
    ? (isMr
        ? ` (${log.base_qty} ${unit} नियमित + ${log.extra_qty} ${unit} अतिरिक्त)`
        : ` (${log.base_qty}L Regular + ${log.extra_qty}L Extra)`)
    : '';

  const message = isMr
    ? `✅ *दूध वितरण पूर्ण* — ${log.date}\n` +
      `${slotLabel}: *${log.delivered_qty} ${unit}*${extraText}\n` +
      `रक्कम: ₹${log.amount_calculated.toFixed(2)}\n` +
      `— ${businessName}`
    : `✅ *Milk Delivered* — ${log.date}\n` +
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
    await new Promise(r => setTimeout(r, 1500));
  }
  return results;
};

// ── reconnectActiveSessions ───────────────────────────────────
const reconnectActiveSessions = async () => {
  try {
    const WhatsappConnection = require('../models/WhatsappConnection');
    const activeConns = await WhatsappConnection.find({ status: 'authenticated' });
    console.log(`[RECOVERY] Found ${activeConns.length} active WhatsApp connections to restore.`);
    for (const conn of activeConns) {
      const ownerId = conn.user_id.toString();
      const phone = decrypt(conn.phone_number);
      console.log(`[RECOVERY] Reconnecting session for owner ${ownerId} (${phone})...`);
      startSession(ownerId).catch(err => {
        console.error(`[RECOVERY] Failed to restore session for owner ${ownerId}:`, err.message);
      });
    }
  } catch (err) {
    console.error('[RECOVERY] Failed to run WhatsApp connection recovery:', err.message);
  }
};

module.exports = {
  startSession,
  startPairingFlow,
  getQRCode,
  getSessionStatus,
  getSessionStatusDb,
  disconnectSession,
  sendMessage,
  sendDocument,
  sendDeliveryNotification,
  sendBulkMessage,
  reconnectActiveSessions,
  SESSION_STATUS
};
