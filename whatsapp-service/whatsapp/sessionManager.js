const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const sessionStore = require('../utils/sessionStore');

const logger = pino({ level: 'silent' });
const SESSIONS_DIR = path.join(__dirname, '../sessions');

// Keep track of reconnection attempts: { phone -> count }
const reconnectAttempts = new Map();

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

/**
 * Initialize a Baileys session for a phone number
 */
async function initSession(phone, pairingInProgress = null) {
  const cleanPhone = phone.replace(/\D/g, '');
  const sessionPath = path.join(SESSIONS_DIR, cleanPhone);

  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  // Bug 6 Fix: Clean up existing socket connection before opening a new one
  const existing = sessionStore.getSession(cleanPhone);
  if (existing && existing.socket) {
    try {
      console.log(`[SESSION] Closing existing socket for ${cleanPhone} before starting a new one...`);
      existing.socket.ev.removeAllListeners();
      existing.socket.end();
    } catch (err) {
      console.warn(`[SESSION] Error ending existing socket for ${cleanPhone}:`, err.message);
    }
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

  // Track socket and initial state in the in-memory map
  sessionStore.setSession(cleanPhone, {
    socket: sock,
    status: 'connecting',
    lastSeen: new Date().toISOString()
  });

  // Save credentials on updates
  sock.ev.on('creds.update', saveCreds);

  // Bug 1 Fix: Request pairing code immediately after socket creation if not registered
  if (!state.creds.registered && pairingInProgress) {
    const job = pairingInProgress.get(cleanPhone);
    if (job && job.status === 'pending') {
      // Small delay to let the socket setup settle
      setTimeout(async () => {
        try {
          console.log(`[PAIRING] Socket ready. Requesting pairing code for ${cleanPhone}...`);
          const code = await sock.requestPairingCode(cleanPhone);
          console.log(`[PAIRING] Successfully generated pairing code: ${code}`);

          // Bug 3 Fix: Only write code if job is still pending
          const currentJob = pairingInProgress.get(cleanPhone);
          if (currentJob && currentJob.status === 'pending' && currentJob.jobId === job.jobId) {
            currentJob.code = code;
            currentJob.status = 'code_ready';
            currentJob.timestamp = Date.now();
            pairingInProgress.set(cleanPhone, currentJob);

            // Expiration timer (expire after 65 seconds)
            setTimeout(() => {
              const checkJob = pairingInProgress.get(cleanPhone);
              if (checkJob && checkJob.jobId === job.jobId && checkJob.status === 'code_ready') {
                console.log(`[PAIRING] Pairing code expired for ${cleanPhone}`);
                checkJob.status = 'expired';
                pairingInProgress.set(cleanPhone, checkJob);
              }
            }, 65000);
          }
        } catch (err) {
          console.error(`[PAIRING] Failed to get pairing code:`, err.message);
          const currentJob = pairingInProgress.get(cleanPhone);
          if (currentJob && currentJob.status === 'pending' && currentJob.jobId === job.jobId) {
            currentJob.status = 'failed';
            currentJob.error = err.message || 'Failed to request pairing code from WhatsApp.';
            pairingInProgress.set(cleanPhone, currentJob);
          }
        }
      }, 2000);
    }
  }

  // Monitor connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      sessionStore.setSession(cleanPhone, { status: 'connecting' });
      console.log(`[SESSION] ${cleanPhone} is connecting...`);
    }

    if (connection === 'open') {
      console.log(`[SESSION] ${cleanPhone} is connected successfully!`);
      sessionStore.setSession(cleanPhone, { status: 'connected', lastSeen: new Date().toISOString() });
      reconnectAttempts.delete(cleanPhone);
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode || error?.code;
      
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const session = sessionStore.getSession(cleanPhone);
      const wasConnected = session && session.status === 'connected';
      
      // Delete session files ONLY if it was actually logged out AND was previously connected successfully.
      // If it is 401 during the pairing phase, do NOT delete the credentials.
      const shouldDelete = isLoggedOut && wasConnected;
      const shouldReconnect = !shouldDelete;

      console.warn(`[SESSION] ${cleanPhone} connection closed. Status Code: ${statusCode}. Should Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        // Attempt reconnect with backoff
        const attempts = reconnectAttempts.get(cleanPhone) || 0;
        if (attempts < 5) {
          const nextAttempt = attempts + 1;
          reconnectAttempts.set(cleanPhone, nextAttempt);
          const delay = 5000;
          console.log(`[SESSION] Reconnecting ${cleanPhone} in ${delay / 1000}s (Attempt ${nextAttempt}/5)`);
          
          sessionStore.setSession(cleanPhone, { status: 'reconnecting' });

          setTimeout(() => {
            initSession(cleanPhone, pairingInProgress).catch((err) => {
              console.error(`[SESSION] Reconnection error for ${cleanPhone}:`, err.message);
            });
          }, delay);
        } else {
          console.error(`[SESSION] Reconnection failed 5 times for ${cleanPhone}. Marking as disconnected.`);
          sessionStore.setSession(cleanPhone, { status: 'disconnected' });
        }
      } else {
        // Clean up session if logged out
        console.warn(`[SESSION] ${cleanPhone} logged out or session terminated. Deleting session files.`);
        deleteSessionFiles(cleanPhone);
      }
    }
  });

  // Handle incoming messages (webhook / logs)
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        if (!msg.key.fromMe) {
          console.log(`[MSG] Incoming message on session ${cleanPhone} from ${msg.key.remoteJid}: ${msg.message?.conversation || ''}`);
        }
      }
    }
  });

  return sock;
}

/**
 * Cleanly logs out and deletes a session
 */
async function logoutSession(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const session = sessionStore.getSession(cleanPhone);

  if (session && session.socket) {
    try {
      await session.socket.logout();
    } catch (e) {
      console.warn(`[SESSION] Error during socket logout call for ${cleanPhone}:`, e.message);
    }
  }

  deleteSessionFiles(cleanPhone);
}

/**
 * Helper to delete files from disk and memory
 */
function deleteSessionFiles(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const sessionPath = path.join(SESSIONS_DIR, cleanPhone);

  // Remove from map
  sessionStore.deleteSession(cleanPhone);
  reconnectAttempts.delete(cleanPhone);

  // Remove from disk
  if (fs.existsSync(sessionPath)) {
    try {
      deleteFolderRecursive(sessionPath);
      console.log(`[SESSION] Cleaned up session files for ${cleanPhone}`);
    } catch (err) {
      console.error(`[SESSION] Error cleaning up session folder for ${cleanPhone}:`, err.message);
    }
  }
}

/**
 * Scan sessions folder and auto-reload saved sessions
 */
async function loadSavedSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    return;
  }

  const folders = fs.readdirSync(SESSIONS_DIR).filter((file) => {
    return fs.statSync(path.join(SESSIONS_DIR, file)).isDirectory();
  });

  console.log(`[SESSION] Found ${folders.length} saved sessions on disk. Restoring...`);

  for (const phone of folders) {
    try {
      await initSession(phone);
    } catch (err) {
      console.error(`[SESSION] Failed to restore session ${phone}:`, err.message);
    }
  }
}

module.exports = {
  initSession,
  logoutSession,
  loadSavedSessions,
  deleteSessionFiles
};
