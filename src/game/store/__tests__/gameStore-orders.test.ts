import { ORDER } from '@/constants/config';

import { ALL_TILE_IDS, createTile } from '@/game/core/tiles';

import { createGameStore } from '../gameStore';

/**
 * Store'un SIPARIS katmani.
 *
 * Ayri dosya: `gameStore.test.ts` 500 satir sinirini asti. Bolme ekseni
 * rastgele degil -- burasi Sprint 3'te eklenen masalar/semaver davranisi,
 * digeri cekirdek durum makinesi.
 */

/** Her test icin izole store. Singleton kullanmak testleri birbirine bulastirir. */
function makeStore() {
  return createGameStore();
}

/**
 * SEMAVER -- ajans katmani.
 *
 * Sprint 3a'nin durust bulgusu: siparis sistemi baski getirdi ama oyuncu
 * hangi ailenin eslesecegine karar veremiyordu, ARZ karar veriyordu.
 * Semaver bu zinciri kirar; store tarafi burada pinleniyor.
 */
describe('spendSemaver', () => {
  function armed() {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    return store;
  }

  it('secilen tepsi tile ini hedef tipe cevirir', () => {
    const store = armed();
    const { pool, tray } = store.getState();
    // Tepside olmayan bir hedef sec ki donusum gorulebilsin.
    const target = pool.find((id) => !tray.some((tile) => tile.id === id))!;

    store.getState().spendSemaver(0, target);

    expect(store.getState().tray[0]!.id).toBe(target);
  });

  it('sarji duser', () => {
    const store = armed();
    const before = store.getState().powers.semaver;

    store.getState().spendSemaver(0, store.getState().pool[0]!);

    expect(store.getState().powers.semaver).toBe(before - 1);
    expect(store.getState().semaverSpent).toBe(1);
  });

  /**
   * SECIM SIFIRLANIR: donusen tile'i oyuncu BILEREK secsin. Aksi halde
   * eski secimle yanlislikla yerlestirir ve "ben bunu istememistim" der.
   */
  it('donusum sonrasi secimi kaldirir', () => {
    const store = armed();
    store.getState().selectTray(0);

    store.getState().spendSemaver(0, store.getState().pool[0]!);

    expect(store.getState().selectedTrayIndex).toBeNull();
  });

  it('sarj yokken hicbir sey yapmaz', () => {
    const store = armed();
    const target = store.getState().pool[0]!;
    store.setState({ powers: { semaver: 0 } });
    const before = store.getState().tray;

    store.getState().spendSemaver(0, target);

    expect(store.getState().tray).toBe(before);
  });

  it('oyun bitmisse hicbir sey yapmaz', () => {
    const store = armed();
    const target = store.getState().pool[0]!;
    store.setState({ status: 'oyun-bitti' });
    const before = store.getState().tray;

    store.getState().spendSemaver(0, target);

    expect(store.getState().tray).toBe(before);
  });

  /** Havuz disi hedef reddedilir: oyuncu kendi eslesme sansini yok edemesin. */
  it('havuzda olmayan hedefi reddeder', () => {
    const store = armed();
    const outsider = ALL_TILE_IDS.find((id) => !store.getState().pool.includes(id))!;
    const before = store.getState().tray;

    store.getState().spendSemaver(0, outsider);

    expect(store.getState().tray).toBe(before);
    expect(store.getState().semaverSpent).toBe(0);
  });

  it('gecersiz tepsi indisini reddeder', () => {
    const store = armed();
    const target = store.getState().pool[0]!;
    const before = store.getState().tray;

    store.getState().spendSemaver(-1, target);
    store.getState().spendSemaver(99, target);

    expect(store.getState().tray).toBe(before);
  });
});

describe('masalar', () => {
  it('seviye basinda masalar dolar', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);

    expect(store.getState().customers).toHaveLength(ORDER.TABLES);
    for (const customer of store.getState().customers) {
      expect(customer.order.length).toBeGreaterThan(0);
      expect(customer.patience).toBeGreaterThan(0);
    }
  });

  /** Her hamlede sabir azalir -- siparise katki yapan hamlelerde bile. */
  it('her hamlede sabir azalir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const before = store.getState().customers.map((c) => c.patience);

    store.getState().selectTray(0);
    store.getState().insertAt(0);

    const after = store.getState().customers.map((c) => c.patience);
    // Masa degismediyse sabir bir azalmis olmali.
    expect(after.some((p, i) => p === before[i]! - 1)).toBe(true);
  });

  it('bosalan masaya yeni musteri oturur', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const { pool } = store.getState();
    const a = pool[0]!;

    store.setState({
      customers: [
        { id: 'x', order: [{ tileId: a, required: 1, served: 0 }], patience: 5, maxPatience: 5 },
        ...store.getState().customers.slice(1),
      ],
      row: [createTile(a), createTile(a), ...Array<null>(5).fill(null)],
      tray: [createTile(a)],
      selectedTrayIndex: null,
    });

    store.getState().selectTray(0);
    store.getState().insertAt(0);

    const state = store.getState();
    expect(state.served).toBe(1);
    expect(state.customers).toHaveLength(ORDER.TABLES);
    expect(state.customers.some((c) => c.id === 'x')).toBe(false);
  });
});
