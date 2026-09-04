import { useSyncExternalStore } from 'react';

/**
 * Web'de sunucu render'i sirasinda `server`, hidrasyon bittikten sonra `client`
 * degerini dondurur. Boylece sunucu ve istemci ciktisi uyusur (hydration mismatch yok).
 *
 * Neden useState + useEffect degil?
 * Expo template'i bu hook'u setState-in-effect kalibiyla yaziyor; React 19'un
 * "react-hooks/set-state-in-effect" kurali bunu hakli olarak isaretliyor
 * (fazladan bir render turu tetikler). useSyncExternalStore, "hidrasyonda farkli
 * deger dondur" ihtiyaci icin React'in resmi API'si: getServerSnapshot sunucu
 * render'inda, getSnapshot istemcide kullanilir. Ek render turu yok, lint temiz.
 */

/** Hicbir zaman degismeyen bir kaynak: abonelik gerekmiyor, sadece anlik goruntu. */
const emptySubscribe = () => () => {};

export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(
    emptySubscribe,
    () => client,
    () => server,
  );
}
