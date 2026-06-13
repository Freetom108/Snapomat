import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { initI18n } from '../i18n';
import { getOnboardingDone } from '../store/storage';
import { DEFAULT_THEME_ID, THEMES } from '../constants/colors';

export default function RootLayout() {
  const { theme, ready: themeReady } = useTheme();
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function init() {
      await initI18n();
      setReady(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (!ready) return;

    async function syncRoute() {
      const done = await getOnboardingDone();

      const inOnboarding = segments[0] === 'onboarding';

      if (!done && !inOnboarding) {
        router.replace('/onboarding');
      } else if (done && inOnboarding) {
        router.replace('/(tabs)');
      }
    }

    syncRoute();
  }, [ready, segments, router]);

  if (!ready || !themeReady) {
    const fallback = THEMES[DEFAULT_THEME_ID];
    return (
      <View style={{ flex: 1, backgroundColor: fallback.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={fallback.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.id === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
    </>
  );
}
