import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { updateFcmToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      console.log('[NOTIF] Skipping — not a physical device');
      return null;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[NOTIF] Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TrackMe Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    // Native FCM token — required by Firebase Admin SDK
    // Works only in development builds (not Expo Go from SDK 53+)
    const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();
    console.log('[NOTIF] FCM token type: native, length:', fcmToken?.length);

    await updateFcmToken(fcmToken).catch(err =>
      console.warn('[NOTIF] Failed to save FCM token:', err.message)
    );
    return fcmToken;
  } catch (err: any) {
    console.warn('[NOTIF] registerForPushNotifications failed:', err.message);
    return null;
  }
};

export const addNotificationListener = (handler: (n: Notifications.Notification) => void) =>
  Notifications.addNotificationReceivedListener(handler);

export const addResponseListener = (handler: (r: Notifications.NotificationResponse) => void) =>
  Notifications.addNotificationResponseReceivedListener(handler);
