const { initSession } = require('./sessionManager');
const sessionStore = require('../utils/sessionStore');

const pairingInProgress = new Map();

// Helper to generate a random job ID
function generateJobId() {
  return Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(4);
}

/**
 * Initiates the pairing process in the background.
 */
async function initiatePairing(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const jobId = generateJobId();
  const now = Date.now();

  // Initialize status entry
  pairingInProgress.set(cleanPhone, {
    jobId,
    phone: cleanPhone,
    timestamp: now,
    code: null,
    status: 'pending',
    error: null
  });

  // Run the Baileys request asynchronously
  (async () => {
    try {
      console.log(`[PAIRING] Requesting pairing socket for ${cleanPhone}...`);
      
      // Initialize the Baileys session (which will trigger QR event and generate the pairing code automatically)
      await initSession(cleanPhone, pairingInProgress);
    } catch (err) {
      console.error(`[PAIRING] Failed to request pairing code for ${cleanPhone}:`, err.message);
      
      pairingInProgress.set(cleanPhone, {
        jobId,
        phone: cleanPhone,
        timestamp: Date.now(),
        code: null,
        status: 'failed',
        error: err.message
      });
    }
  })();

  return { jobId, status: 'pending', message: 'Pairing code request initiated.' };
}

// Clean up pairingInProgress entries older than 5 minutes (300,000 ms)
setInterval(() => {
  const now = Date.now();
  for (const [phone, info] of pairingInProgress.entries()) {
    if (now - info.timestamp > 300000) {
      console.log(`[PAIRING] Cleaning up old pairing progress for ${phone}`);
      pairingInProgress.delete(phone);
    }
  }
}, 60000);

module.exports = {
  pairingInProgress,
  initiatePairing
};
