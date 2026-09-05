import { renderHook } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useHaptics, type HapticKind } from '../useHaptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Error: 'error', Success: 'success' },
}));

const mocked = jest.mocked(Haptics);

/** Hook'u calistirip tetikleyici fonksiyonu doner. */
async function setup(enabled?: boolean) {
  const { result } = await renderHook(() => useHaptics(enabled === undefined ? {} : { enabled }));
  return result.current;
}

describe('useHaptics', () => {
  it('secim geri bildirimini tetikler', async () => {
    (await setup())('sec');
    expect(mocked.selectionAsync).toHaveBeenCalled();
  });

  it('yerlestirme icin hafif darbe verir', async () => {
    (await setup())('yerlestir');
    expect(mocked.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('eslesme icin orta darbe verir', async () => {
    (await setup())('eslesme');
    expect(mocked.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('hata bildirimi verir', async () => {
    (await setup())('hata');
    expect(mocked.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });

  it('basari bildirimi verir', async () => {
    (await setup())('basari');
    expect(mocked.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });

  it('enabled false iken hicbir sey tetiklemez', async () => {
    const haptic = await setup(false);
    for (const kind of ['sec', 'yerlestir', 'eslesme', 'hata', 'basari'] as HapticKind[]) {
      haptic(kind);
    }

    expect(mocked.selectionAsync).not.toHaveBeenCalled();
    expect(mocked.impactAsync).not.toHaveBeenCalled();
    expect(mocked.notificationAsync).not.toHaveBeenCalled();
  });

  /**
   * Titresim KOZMETIKTIR. Cihaz desteklemiyorsa ya da izin yoksa oyun
   * akisi durmamali -- hata yutulur, cagiran taraf hicbir sey fark etmez.
   */
  it('haptik API i hata verirse oyunu etkilemez', async () => {
    mocked.selectionAsync.mockRejectedValueOnce(new Error('cihaz desteklemiyor'));

    const haptic = await setup();
    expect(() => haptic('sec')).not.toThrow();

    // Reddedilen promise'in yakalandigini dogrula (unhandled rejection olmasin).
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('cagri senkron doner (titresim gorsel geri bildirimi bekletmez)', async () => {
    const haptic = await setup();
    expect(haptic('eslesme')).toBeUndefined();
  });

  describe('web', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    });

    /**
     * Web'de haptik API'si yok; dogrudan cagirmak konsolu uyariyla doldurur.
     * Bu testin GERCEK olmasi icin `isSupported()` cagri aninda okunuyor --
     * modul seviyesinde sabit olsaydi platformu degistirmek imkansizdi ve
     * test yalnizca "fonksiyon var mi" diye bakabilirdi (yani hicbir sey).
     */
    it('web platformunda hicbir sey tetiklemez', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const haptic = await setup();
      for (const kind of ['sec', 'yerlestir', 'eslesme', 'hata', 'basari'] as HapticKind[]) {
        haptic(kind);
      }

      expect(mocked.selectionAsync).not.toHaveBeenCalled();
      expect(mocked.impactAsync).not.toHaveBeenCalled();
      expect(mocked.notificationAsync).not.toHaveBeenCalled();
    });

    it('native platformda tetikler (web testinin karsiti)', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      (await setup())('sec');
      expect(mocked.selectionAsync).toHaveBeenCalled();
    });
  });
});
