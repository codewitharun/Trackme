import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
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

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

    // Expo Push Token — works with Expo Push Service on backend
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[NOTIF] Expo push token:', token);

    await updateFcmToken(token).catch(err =>
      console.warn('[NOTIF] Failed to save token:', err.message)
    );
    return token;
  } catch (err: any) {
    console.warn('[NOTIF] registerForPushNotifications failed:', err.message);
    return null;
  }
};

export const addNotificationListener = (handler: (n: Notifications.Notification) => void) =>
  Notifications.addNotificationReceivedListener(handler);

export const addResponseListener = (handler: (r: Notifications.NotificationResponse) => void) =>
  Notifications.addNotificationResponseReceivedListener(handler);
