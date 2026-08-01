import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request push notification permission and store the Expo push token.
 * Call this hook once from the Dashboard screen.
 */
export function useNotifications() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    registerForNotifications();
  }, []);
}

async function registerForNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return;
    }

    // Get the Expo push token — this is for future native push integration.
    // The token can be sent to the server to enable Expo Push Notifications.
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_REPL_ID ?? undefined,
    }).catch(() => null);

    if (tokenData) {
      // Token is available for native push notification support.
      // Future: POST to /api/push/expo-token to register with server.
      console.log('[Notifications] Expo push token obtained');
    }

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch (err) {
    // Notification setup is non-critical — log and continue
    console.log('[Notifications] Setup error:', err);
  }
}
