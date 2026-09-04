import { useSyncExternalStore } from 'react';

/**
 * Web'de sunucu render'i sirasinda `server`, hidrasyondan sonra `client` doner.
 *
 * Neden useState + useEffect degil?
 * Expo template'i setState-in-effect kalibi kullaniyor; React 19'un
 * "react-hooks/set-state-in-effect" kurali bunu hakli olarak isaretliyor
 * (fazladan render turu). useSyncExternalStore bu ihtiyac icin React'in resmi API'si.
 *
 * Neden anlik goruntu olarak `client` degil de bir boolean?
 * useSyncExternalStore getSnapshot'i HER render'da cagirir ve sonucu Object.is ile
 * karsilastirir. `() => client` yazarsak ve cagiran taraf obje/dizi verirse
 * (`useClientOnlyValue({}, {})`) her karsilastirma farkli referans gorur ->
 * forceStoreRerender -> sonsuz dongu. Ustelik React'in "getSnapshot should be
 * cached" DEV uyarisi bu durumda ATESLENMEZ (ayni render icindeki iki cagri ayni
 * referansi doner), yani sessiz donma olur.
 *
 * Uc fonksiyonu da modul seviyesinde sabit tutup boolean dondurerek bu sinif
 * hatayi yapisal olarak imkansiz kiliyoruz: anlik goruntu her zaman true/false.
 */
const emptySubscribe = () => () => {};
const getIsHydrated = (): boolean => true;
const getIsServer = (): boolean => false;

export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore(emptySubscribe, getIsHydrated, getIsServer) ? client : server;
}
