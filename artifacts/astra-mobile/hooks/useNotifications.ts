import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { customFetch } from '@workspace/api-client-react';

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

    // Get the Expo push token and register it with the server
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_REPL_ID ?? undefined,
    }).catch(() => null);

    if (tokenData?.data) {
      try {
        await customFetch('/api/push-tokens', {
          method: 'POST',
          body: JSON.stringify({ token: tokenData.data }),
        });
        console.log('[Notifications] Expo push token registered with server');
      } catch (err) {
        // Token registration is non-critical — log and continue
        console.log('[Notifications] Failed to register token:', err);
      }
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
