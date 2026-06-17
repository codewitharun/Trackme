const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send push notifications via Expo Push Service.
 * Tokens must be Expo push tokens (ExponentPushToken[xxx]).
 */
const sendPushNotifications = async (tokens, title, body, data = {}) => {
  // Filter valid Expo tokens only
  const validTokens = tokens.filter(t => Expo.isExpoPushToken(t));
  if (!validTokens.length) {
    console.log('[PUSH] No valid Expo tokens to send to');
    return 0;
  }

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          console.warn('[PUSH] Ticket error for token', validTokens[i], ':', ticket.message);
        }
      });
    } catch (err) {
      console.error('[PUSH] Chunk send error:', err.message);
    }
  }

  console.log(`[PUSH] Sent ${sent}/${validTokens.length} notifications`);
  return sent;
};

module.exports = { sendPushNotifications };
