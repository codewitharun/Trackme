const { messaging } = require('./firebase');

/**
 * Send push notifications via Firebase Admin SDK.
 * Tokens must be native FCM tokens from getDevicePushTokenAsync().
 */
const sendPushNotifications = async (tokens, title, body, data = {}) => {
  const valid = tokens.filter(Boolean);
  if (!valid.length) { console.log('[PUSH] No tokens'); return 0; }

  // Convert all data values to strings (FCM requirement)
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: valid,
      notification: { title, body },
      data: stringData,
      android: { priority: 'high', notification: { channelId: 'default', sound: 'default' } },
    });
    console.log(`[PUSH] Sent ${response.successCount}/${valid.length} — ${response.failureCount} failed`);
    return response.successCount;
  } catch (err) {
    console.error('[PUSH] Failed:', err.message);
    return 0;
  }
};

module.exports = { sendPushNotifications };
