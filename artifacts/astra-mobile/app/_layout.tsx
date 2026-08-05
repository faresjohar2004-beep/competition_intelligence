import React, { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { setBaseUrl, setAuthTokenGetter, useGetMe, useUpdateMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { AppState, AppStateStatus, View } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Configure API client — must run at module level before any component mounts
// EXPO_PUBLIC_DOMAIN is injected by the dev script and by Expo Launch at build time
const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) {
  setBaseUrl(`https://${domain}`);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// Clerk token cache using SecureStore for persistence
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {}
  },
  async clearToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

/** Wires Clerk token into API client and enforces auth routing. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const updateMe = useUpdateMe();
  const lastSyncedTz = useRef<string | null>(null);

  // Register the bearer token getter so every API call is authenticated
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  // Fetch user profile to check onboarding status
  const { data: me, isLoading: meLoading, error: meError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!isSignedIn && isLoaded,
      retry: false, // 404 = not onboarded, don't retry
    },
  });

  // Silently sync timezone whenever the stored value differs from the device.
  // Called on first load and again on every foreground resume.
  const syncTimezone = useRef(() => {});
  syncTimezone.current = () => {
    if (!me?.onboarded) return;
    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!deviceTz) return;
    // Skip if we already synced this value in the current session
    if (lastSyncedTz.current === deviceTz) return;
    if ((me as any).timezone === deviceTz) {
      lastSyncedTz.current = deviceTz;
      return;
    }
    lastSyncedTz.current = deviceTz;
    updateMe.mutate({ data: { timezone: deviceTz } } as any);
  };

  // Sync on initial load (once me is resolved)
  useEffect(() => {
    if (me) syncTimezone.current();
  }, [me]);

  // Sync again every time the app comes back to the foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        syncTimezone.current();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isSignedIn) {
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
      return;
    }

    // Signed in — check onboarding status (wait for me to resolve)
    if (meLoading) return;

    // 404 means no user record = not onboarded
    if (meError || !me?.onboarded) {
      if (segments.join('/') !== '(auth)/onboard') {
        router.replace('/(auth)/onboard');
      }
      return;
    }

    // Fully authenticated + onboarded — go to tabs
    if (!inTabsGroup) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, isLoaded, me, meLoading, meError, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AuthGate>
                    <RootLayoutNav />
                  </AuthGate>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
