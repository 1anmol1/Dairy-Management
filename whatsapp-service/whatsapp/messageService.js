const sessionStore = require('../utils/sessionStore');

/**
 * Send a message using an active session
 */
async function sendMessage(senderPhone, recipientPhone, messageText) {
  const cleanSender = senderPhone.replace(/\D/g, '');
  const cleanRecipient = recipientPhone.replace(/\D/g, '');

  const session = sessionStore.getSession(cleanSender);

  if (!session || session.status !== 'connected' || !session.socket) {
    throw new Error(`No active connected session found for sender: ${cleanSender}`);
  }

  const jid = `${cleanRecipient}@s.whatsapp.net`;
  
  console.log(`[MESSAGE] Sending message from ${cleanSender} to ${cleanRecipient}...`);
  const response = await session.socket.sendMessage(jid, { text: messageText });
  
  return {
    success: true,
    messageId: response.key.id
  };
}

module.exports = {
  sendMessage
};
