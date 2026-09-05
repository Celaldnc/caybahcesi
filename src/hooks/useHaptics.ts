import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Dokunsal geri bildirim.
 *
 * Neden sarmalayici: (1) web'de `expo-haptics` yok, dogrudan cagirmak
 * konsolu uyariyla doldurur; (2) Sprint 3'te ayarlardan kapatilabilir
 * olacak ve tek bir yerden susturmak gerekecek; (3) hata YUTULUR --
 * titresim kozmetiktir, cihaz desteklemiyorsa oyun durmamali.
 */

export type HapticKind = 'sec' | 'yerlestir' | 'eslesme' | 'hata' | 'basari';

/**
 * Web'de haptik API'si yok; sessizce devre disi.
 *
 * Modul seviyesinde SABIT degil FONKSIYON: `Platform.OS` calisma zamaninda
 * degismez, ama sabit olarak yazildiginda test edilemez hale geliyordu
 * (modulu yeniden yuklemeden platformu degistiremezsiniz). Cagri aninda
 * okumanin maliyeti bir ozellik erisimi; testin gercek olmasi buna deger.
 */
function isSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function fire(kind: HapticKind): Promise<void> {
  switch (kind) {
    case 'sec':
      return Haptics.selectionAsync();
    case 'yerlestir':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'eslesme':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'hata':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    case 'basari':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

export interface UseHapticsOptions {
  /** Sprint 3'te ayarlar ekranindan gelecek. */
  enabled?: boolean;
}

export function useHaptics({ enabled = true }: UseHapticsOptions = {}) {
  return useCallback(
    (kind: HapticKind): void => {
      if (!enabled || !isSupported()) return;

      // Bilerek await edilmiyor: titresim gorsel geri bildirimi bekletmemeli.
      void fire(kind).catch(() => {
        // Cihaz desteklemiyor ya da izin yok -- oyun akisi etkilenmemeli.
      });
    },
    [enabled],
  );
}
