import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
// GestureHandlerRootView'i import etmek modulu zaten yukler; ayrica bir
// `import 'react-native-gesture-handler'` yan-etki satiri gereksizdir
// (import/no-duplicates uyarisi verir).
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/components/useColorScheme';

export {
  // Expo Router, navigasyon agacindaki hatalari bu sinir ile yakalar.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

/**
 * Splash hatalarini yutmak yerine iz birakir.
 *
 * Beklenen durum "splash zaten gizli" (hizli yeniden yukleme), ama native
 * modul hazir degilse de buraya duseriz -- ve o zaman splash sonsuza kadar
 * acik kalir. Log olmadan teshisi imkansiz bir hata sinifi.
 *
 * Ayri bir fonksiyon olarak disa aciliyor cunku asagidaki cagri MODUL
 * SEVIYESINDE; testte modulu yeniden yuklemeden bu dali kapsamanin baska
 * yolu yok (jest.resetModules React kimligini bozuyor).
 */
export function warnSplashFailure(step: string) {
  return (error: unknown): void => {
    console.warn(`[splash] ${step} basarisiz:`, error);
  };
}

SplashScreen.preventAutoHideAsync().catch(warnSplashFailure('preventAutoHideAsync'));

export default function RootLayout(): ReactElement {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // TODO(sprint-3): ses/asset onyukleme bitince gizle; su an ilk commit'ten
    // hemen sonra gizleniyor ve yavas cihazda 1-3 bos kare gorulebilir.
    SplashScreen.hideAsync().catch(warnSplashFailure('hideAsync'));
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
