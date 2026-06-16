import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../hooks/useTheme';
import { initI18n } from '../i18n';
import { seedAprilMay2026TestExpenses } from '../store/seedTestExpenses';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutInner() {
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    initI18n().catch(() => {});
    SplashScreen.hideAsync().catch(() => {});
    if (__DEV__) {
      seedAprilMay2026TestExpenses().catch(() => {});
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const done = await AsyncStorage.getItem('snapomat_onboarding_done');
        if (done === 'true') {
          router.replace('/(tabs)/');
        } else {
          router.replace('/onboarding');
        }
      } catch (e) {
        router.replace('/onboarding');
      }
    }
    init();
  }, []);

  return (
    <>
      <StatusBar style={theme.id === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
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
