const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications via Expo Push API (no SDK — avoids ESM conflicts).
 * Tokens must be Expo push tokens: ExponentPushToken[xxx]
 */
const sendPushNotifications = async (tokens, title, body, data = {}) => {
  const valid = tokens.filter(t => t && t.startsWith('ExponentPushToken'));
  if (!valid.length) {
    console.log('[PUSH] No valid Expo tokens');
    return 0;
  }

  const messages = valid.map(to => ({
    to, sound: 'default', title, body, data, priority: 'high', channelId: 'default',
  }));

  try {
    const { data: result } = await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    const tickets = result.data || [];
    const sent = tickets.filter(t => t.status === 'ok').length;
    const errors = tickets.filter(t => t.status !== 'ok');
    if (errors.length) console.warn('[PUSH] Errors:', JSON.stringify(errors));
    console.log(`[PUSH] Sent ${sent}/${valid.length}`);
    return sent;
  } catch (err) {
    console.error('[PUSH] Failed:', err.message);
    return 0;
  }
};

module.exports = { sendPushNotifications };
