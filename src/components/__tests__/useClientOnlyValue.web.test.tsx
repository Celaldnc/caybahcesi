import { renderHook } from '@testing-library/react-native';

// Web varyantini ACIK YOLLA import ediyoruz. jest-expo'nun native preset'i
// normalde .web.ts dosyalarini hic secmez; dogrudan yol vererek modulu yine de
// yukleyip mantigini dogrulayabiliyoruz. Bu, "web dosyalari test edilemez"
// varsayimini gecersiz kiliyor.
import { useClientOnlyValue } from '../useClientOnlyValue.web';

describe('useClientOnlyValue (web)', () => {
  it('hidrasyondan sonra client degerini dondurur', async () => {
    const { result } = await renderHook(() => useClientOnlyValue('sunucu', 'istemci'));
    expect(result.current).toBe('istemci');
  });

  it('farkli tiplerde de client degerini korur', async () => {
    const { result } = await renderHook(() => useClientOnlyValue(false, true));
    expect(result.current).toBe(true);
  });

  /**
   * Regresyon korumasi: getSnapshot her render'da YENI bir obje dondurseydi
   * (`() => client` kalibi), useSyncExternalStore Object.is karsilastirmasini
   * hep basarisiz bulur, forceStoreRerender cagirir ve SONSUZ DONGUYE girerdi.
   * Ustelik React'in "getSnapshot should be cached" DEV uyarisi bu durumda
   * atesLENMEZ -- sessiz donma olurdu.
   *
   * Anlik goruntu boolean oldugu icin obje argumanlari guvenli.
   */
  it('obje argumanlarinda sonsuz donguye girmez', async () => {
    const server = { taraf: 'sunucu' };
    const client = { taraf: 'istemci' };

    const { result, rerender } = await renderHook(() => useClientOnlyValue(server, client));

    expect(result.current).toBe(client);
    await rerender({});
    await rerender({});
    expect(result.current).toBe(client);
  });

  it('yeniden render sonrasi ayni referansi korur', async () => {
    const client = { a: 1 };
    const { result, rerender } = await renderHook(() => useClientOnlyValue(null, client));
    const first = result.current;
    await rerender({});
    expect(result.current).toBe(first);
  });
});
