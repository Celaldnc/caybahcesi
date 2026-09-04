import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
// GestureHandlerRootView'i import etmek modulu zaten yukler; ayrica bir
// `import 'react-native-gesture-handler'` yan-etki satiri gereksizdir
// (import/no-duplicates uyarisi verir).
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Expo Router, navigasyon agacindaki hatalari bu sinir ile yakalar.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash zaten gizlenmisse (hizli yeniden yukleme) sessizce gec.
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Sprint 3'te ses/asset onyukleme buraya girecek; simdilik hemen ac.
    SplashScreen.hideAsync().catch(() => {
      // Splash yoksa yok say.
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
