import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { ThemeProvider, useTheme } from '../hooks/useTheme';
import { initI18n } from '../i18n';
import { getOnboardingDoneLive } from '../store/storage';
import { DEFAULT_THEME_ID, THEMES } from '../constants/colors';

function RootLayoutInner() {
  const { theme, ready: themeReady } = useTheme();
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

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
      const done = await getOnboardingDoneLive();

      const inOnboarding = segments[0] === 'onboarding';

      if (!done && !inOnboarding) {
        router.replace('/onboarding');
      } else if (done && inOnboarding) {
        router.replace('/(tabs)');
      }
    }

    syncRoute();
  }, [ready, segments, pathname, router]);

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

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
