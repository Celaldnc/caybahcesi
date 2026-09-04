import { renderHook } from '@testing-library/react-native';

import { useColorScheme } from '../useColorScheme';

/**
 * react-native'in kok index'i useColorScheme'i tembel getter ile veriyor:
 *   index.js:377  get useColorScheme() { return require('./Libraries/Utilities/useColorScheme').default; }
 *
 * Bu yuzden 'react-native' modulunun tamamini `...jest.requireActual(...)` ile
 * yaymak YANLIS: tum getter'lar (FlatList -> VirtualizedList ...) aninda
 * degerlendirilir ve dairesel require hatasi verir. Bunun yerine dogrudan
 * derin modulu mock'luyoruz; kok getter zaten onu okuyor.
 */
const mockUseColorSchemeCore = jest.fn();

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockUseColorSchemeCore() as unknown,
}));

describe('useColorScheme', () => {
  it("'dark' geldiginde 'dark' dondurur", async () => {
    mockUseColorSchemeCore.mockReturnValue('dark');
    const { result } = await renderHook(() => useColorScheme());
    expect(result.current).toBe('dark');
  });

  it("'light' geldiginde 'light' dondurur", async () => {
    mockUseColorSchemeCore.mockReturnValue('light');
    const { result } = await renderHook(() => useColorScheme());
    expect(result.current).toBe('light');
  });

  it("'unspecified' geldiginde 'light'e duser", async () => {
    mockUseColorSchemeCore.mockReturnValue('unspecified');
    const { result } = await renderHook(() => useColorScheme());
    expect(result.current).toBe('light');
  });

  /**
   * REGRESYON TESTI -- gercek bir cokme hatasini koruyor.
   *
   * Appearance.d.ts:51  useColorScheme(): ColorSchemeName        <- null YOK
   * useColorScheme.js:23 export default function (): ?ColorSchemeName  <- null VAR
   * Appearance.js:76     let colorScheme = null                  <- kaynagi
   *
   * Onceki hali `coreScheme === 'unspecified' ? 'light' : coreScheme` idi;
   * null suzulup geciyor, sonra Themed.tsx'te Colors[null].text -> TypeError.
   * `strict: true` bunu goremez cunku .d.ts yalan soyluyor -- korumasi
   * TEST olmak zorunda.
   */
  it('null geldiginde cokmez, "light"e duser (RN tip beyani yaniltici)', async () => {
    mockUseColorSchemeCore.mockReturnValue(null);
    const { result } = await renderHook(() => useColorScheme());
    expect(result.current).toBe('light');
  });

  it('undefined geldiginde de "light"e duser', async () => {
    mockUseColorSchemeCore.mockReturnValue(undefined);
    const { result } = await renderHook(() => useColorScheme());
    expect(result.current).toBe('light');
  });

  it('donen deger her zaman Colors haritasinda gecerli bir anahtardir', async () => {
    const girdiler = ['dark', 'light', 'unspecified', null, undefined, 'gelecekteki-deger'];
    for (const girdi of girdiler) {
      mockUseColorSchemeCore.mockReturnValue(girdi);
      const { result } = await renderHook(() => useColorScheme());
      expect(['light', 'dark']).toContain(result.current);
    }
  });
});
