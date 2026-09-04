import { useColorScheme as useColorSchemeCore } from 'react-native';

/**
 * Tema secimini HER ZAMAN 'light' | 'dark' olarak dondurur.
 *
 * NEDEN izin listesi (whitelist), blok listesi degil:
 * React Native'in tip beyani yalan soyluyor. Appearance.d.ts:51
 *   useColorScheme(): ColorSchemeName            // 'light' | 'dark' | 'unspecified'
 * diyor, ama gercek implementasyon
 *   Libraries/Utilities/useColorScheme.js:23     ?ColorSchemeName
 *   Libraries/Utilities/Appearance.js:76         let colorScheme = null
 * yani NativeAppearance hazir degilken (ilk boya, web, test ortami) `null` doner.
 *
 * Onceki hali sadece 'unspecified' yakaliyordu; null suzulup geciyordu ve
 * Colors[null].text -> TypeError ile uygulama coküyordu. `strict: true` ve
 * `noUncheckedIndexedAccess` bunu goremez, cunku .d.ts null'i hic ilan etmiyor.
 *
 * Acik donus tipi bilerek yazildi: tip sistemi artik bu sozlesmeyi zorluyor.
 */
export const useColorScheme = (): 'light' | 'dark' => {
  return useColorSchemeCore() === 'dark' ? 'dark' : 'light';
};
