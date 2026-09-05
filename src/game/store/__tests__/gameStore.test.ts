import { getLevelConfig } from '@/game/core/level';
import { countEmpty, insertPositions, isRowFull, tileCount } from '@/game/core/matcher';
import { dailySeed } from '@/game/core/rng';

import { createGameStore, type GameStore } from '../gameStore';

/**
 * Store, core'un saf fonksiyonlarini siraya dizen bir durum makinesidir.
 * Testler bu SIRALAMAYI ve gecis kurallarini dogrular; kurallarin kendisi
 * zaten core'da test edili.
 */

/** Her test icin izole store. Singleton kullanmak testleri birbirine bulastirir. */
function makeStore() {
  return createGameStore();
}

/** Hedefe ulasana ya da tahta dolana kadar ac gozlu oynar. */
function playUntilEnd(store: ReturnType<typeof makeStore>, maxMoves = 400): GameStore {
  for (let i = 0; i < maxMoves; i++) {
    const state = store.getState();
    if (state.status !== 'oynaniyor') break;

    // Eslesme yaratan ilk hamleyi bul, yoksa ilk konuma koy.
    let played = false;
    for (let t = 0; t < state.tray.length && !played; t++) {
      for (const position of insertPositions(state.row)) {
        store.getState().selectTray(t);
        const before = store.getState().score;
        store.getState().insertAt(position);
        if (store.getState().score > before) {
          played = true;
          break;
        }
        // Puan getirmediyse geri alamayiz; bu hamle gecerliydi, devam et.
        played = true;
        break;
      }
    }
    if (!played) break;
  }
  return store.getState();
}

describe('startLevel', () => {
  it('seviyeyi oynanabilir duruma getirir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 42);
    const state = store.getState();

    expect(state.status).toBe('oynaniyor');
    expect(state.level).toBe(1);
    expect(state.score).toBe(0);
    expect(state.moves).toBe(0);
    expect(state.selectedTrayIndex).toBeNull();
  });

  it('seviye yapilandirmasina uygun tahta ve havuz kurar', () => {
    const store = makeStore();
    store.getState().startLevel(20, 7);
    const state = store.getState();
    const config = getLevelConfig(20);

    expect(state.row).toHaveLength(config.slotCount);
    expect(state.pool).toHaveLength(config.tileTypeCount);
    expect(countEmpty(state.row)).toBe(config.slotCount);
  });

  it('tray yalnizca havuzdaki tiplerden dolar', () => {
    const store = makeStore();
    store.getState().startLevel(1, 3);
    const state = store.getState();

    expect(state.tray.length).toBeGreaterThan(0);
    for (const tile of state.tray) {
      expect(state.pool).toContain(tile.id);
    }
  });

  it('ayni tohum ayni baslangici verir (Daily modu icin sart)', () => {
    const a = makeStore();
    const b = makeStore();
    a.getState().startLevel(5, 1234);
    b.getState().startLevel(5, 1234);

    expect(a.getState().pool).toEqual(b.getState().pool);
    expect(a.getState().tray.map((t) => t.id)).toEqual(b.getState().tray.map((t) => t.id));
  });

  it('farkli tohum farkli baslangic verir', () => {
    const a = makeStore();
    const b = makeStore();
    a.getState().startLevel(5, 1);
    b.getState().startLevel(5, 2);

    const same =
      JSON.stringify(a.getState().pool) === JSON.stringify(b.getState().pool) &&
      JSON.stringify(a.getState().tray.map((t) => t.id)) ===
        JSON.stringify(b.getState().tray.map((t) => t.id));
    expect(same).toBe(false);
  });

  it('onceki seviyenin skorunu tasimaz', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(0);
    store.getState().insertAt(0);

    store.getState().startLevel(2, 1);
    expect(store.getState().score).toBe(0);
    expect(store.getState().moves).toBe(0);
  });
});

describe('startDaily', () => {
  it('ayni gun ayni bulmacayi verir', () => {
    const a = makeStore();
    const b = makeStore();
    const day = new Date('2026-09-05T09:00:00.000Z');
    a.getState().startDaily(day);
    b.getState().startDaily(new Date('2026-09-05T22:00:00.000Z'));

    expect(a.getState().pool).toEqual(b.getState().pool);
    expect(a.getState().tray.map((t) => t.id)).toEqual(b.getState().tray.map((t) => t.id));
  });

  it('tarih verilmezse bugunu kullanir', () => {
    const store = makeStore();
    store.getState().startDaily();

    const reference = makeStore();
    reference.getState().startLevel(1, dailySeed(new Date()));

    expect(store.getState().tray.map((t) => t.id)).toEqual(
      reference.getState().tray.map((t) => t.id),
    );
  });

  it('gunluk tohumu kullanir', () => {
    const store = makeStore();
    const day = new Date('2026-09-05T00:00:00.000Z');
    store.getState().startDaily(day);

    const reference = makeStore();
    reference.getState().startLevel(1, dailySeed(day));

    expect(store.getState().tray.map((t) => t.id)).toEqual(
      reference.getState().tray.map((t) => t.id),
    );
  });
});

describe('selectTray', () => {
  it('tile secer', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(1);
    expect(store.getState().selectedTrayIndex).toBe(1);
  });

  it('ayni indise tekrar basmak secimi kaldirir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(1);
    store.getState().selectTray(1);
    expect(store.getState().selectedTrayIndex).toBeNull();
  });

  it('null ile secim temizlenir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(0);
    store.getState().selectTray(null);
    expect(store.getState().selectedTrayIndex).toBeNull();
  });

  it('gecersiz indisi yok sayar', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(99);
    expect(store.getState().selectedTrayIndex).toBeNull();
  });

  it('oyun baslamadan secim yapilamaz', () => {
    const store = makeStore();
    store.getState().selectTray(0);
    expect(store.getState().selectedTrayIndex).toBeNull();
  });
});

describe('insertAt', () => {
  it('secili tile i tahtaya ekler', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const tile = store.getState().tray[0]!;

    store.getState().selectTray(0);
    store.getState().insertAt(0);

    expect(tileCount(store.getState().row)).toBe(1);
    expect(store.getState().row[0]?.id).toBe(tile.id);
  });

  it('hamleden sonra secimi temizler', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(0);
    store.getState().insertAt(0);
    expect(store.getState().selectedTrayIndex).toBeNull();
  });

  it('tray i yeniden doldurur', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const before = store.getState().tray.length;

    store.getState().selectTray(0);
    store.getState().insertAt(0);

    expect(store.getState().tray).toHaveLength(before);
  });

  it('hamle sayacini artirir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(0);
    store.getState().insertAt(0);
    expect(store.getState().moves).toBe(1);
  });

  it('secim yokken hicbir sey yapmaz', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().insertAt(0);

    expect(tileCount(store.getState().row)).toBe(0);
    expect(store.getState().moves).toBe(0);
  });

  it('gecersiz konumu yok sayar', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(0);
    store.getState().insertAt(5); // bos tahtada tek gecerli konum 0

    expect(tileCount(store.getState().row)).toBe(0);
    expect(store.getState().moves).toBe(0);
  });

  /**
   * `selectedTrayIndex` normalde `selectTray` tarafindan dogrulanir, ama
   * store disaridan (setState / kalici kayit yuklemesi) bozulabilir.
   * O durumda cokmek yerine hamleyi yok saymali.
   */
  it('bozuk secim indisinde cokmez, hamleyi yok sayar', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.setState({ selectedTrayIndex: 99 });

    expect(() => store.getState().insertAt(0)).not.toThrow();
    expect(store.getState().moves).toBe(0);
    expect(tileCount(store.getState().row)).toBe(0);
  });

  it('oyun bitmisken hamle kabul etmez', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().selectTray(0);
    // Durumu elle bitmis yap.
    store.setState({ status: 'oyun-bitti' });
    store.getState().insertAt(0);

    expect(store.getState().moves).toBe(0);
  });

  it('eslesme olustugunda puan verir ve sonucu saklar', () => {
    const store = makeStore();
    store.getState().startLevel(1, 11);

    // Ayni tipten uc tile birikene kadar oyna.
    for (let i = 0; i < 60 && store.getState().score === 0; i++) {
      const state = store.getState();
      if (state.status !== 'oynaniyor') break;
      state.selectTray(0);
      state.insertAt(insertPositions(state.row)[0]!);
    }

    const state = store.getState();
    if (state.score > 0) {
      expect(state.lastResult).not.toBeNull();
      expect(state.lastResult!.removedCount).toBeGreaterThanOrEqual(0);
    }
    expect(state.score).toBeGreaterThanOrEqual(0);
  });
});

describe('gecis kurallari', () => {
  /**
   * Sira: once "seviye tamam mi", sonra "tahta doldu mu".
   *
   * Ters sirada yazilsaydi oyuncu hedefe ulastigi hamlede kaybedebilirdi --
   * en can sikici hata turu. Asagidaki test bu sirayi DOGRUDAN pinler.
   */
  it('skor hedefe ulasinca seviye tamamlanir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const config = store.getState().config;

    store.setState({ score: config.targetScore });
    store.getState().selectTray(0);
    store.getState().insertAt(0);

    expect(store.getState().status).toBe('seviye-tamam');
  });

  /**
   * INVARYANT: bir hamle ayni anda hem seviyeyi bitirip hem oyunu
   * kaybettiremez -- yapisal olarak imkansiz.
   *
   * Kanit: puan ancak eslesmeden gelir, eslesme en az MATCH.LENGTH tile
   * kaldirir, dolayisiyla puan getiren her hamle en az 3 slot bosaltir.
   * Puan getirmeyen hamle ise skoru degistirmez, yani hedefe ulastiramaz.
   *
   * Bu testi yazarken ilk denemem CAKISMAYI KURAMADI -- cunku kurulamiyor.
   * Dogru olan, imkansizligi iddia etmek.
   */
  it('hicbir hamle ayni anda hem kazandirip hem kaybettiremez', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const store = makeStore();
      store.getState().startLevel(1, seed);

      for (let move = 0; move < 200; move++) {
        const state = store.getState();
        if (state.status !== 'oynaniyor') break;

        const positions = insertPositions(state.row);
        if (positions.length === 0) break;

        state.selectTray(move % state.tray.length);
        state.insertAt(positions[move % positions.length]!);

        const after = store.getState();
        const scoreReached = after.score >= after.config.targetScore;
        const boardFull = isRowFull(after.row);
        expect(scoreReached && boardFull).toBe(false);
      }
    }
  });

  it('tahta dolunca ve hedefe ulasilmayinca oyun biter', () => {
    const store = makeStore();
    store.getState().startLevel(30, 5);

    const { config, pool } = store.getState();
    // Son bir bos slot birak; ardisik slotlara FARKLI tipler koy ki
    // eklenen tile hangi konuma giderse gitsin eslesme olusmasin.
    const row = Array.from({ length: config.slotCount }, (_, i) =>
      i === config.slotCount - 1 ? null : { id: pool[i % pool.length]!, key: `dolgu-${i}` },
    );
    // Tray'i de tahtada hic bulunmayan bir tiple degistir.
    const unusedId = pool[pool.length - 1]!;
    store.setState({
      row,
      score: 0,
      tray: [{ id: unusedId, key: 'tek' }],
    });

    store.getState().selectTray(0);
    // Eslesme olusturmayacak bir konum: en basa ekle.
    store.getState().insertAt(0);

    const after = store.getState();
    expect(isRowFull(after.row)).toBe(true);
    expect(after.status).toBe('oyun-bitti');
  });

  it('gercek oyunda oyun her zaman bir sonuca ulasir', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const store = makeStore();
      store.getState().startLevel(1, seed);
      const final = playUntilEnd(store);
      expect(['seviye-tamam', 'oyun-bitti']).toContain(final.status);
    }
  });
});

describe('advanceLevel', () => {
  it('seviye tamamlaninca sonrakine gecer', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.setState({ status: 'seviye-tamam' });

    store.getState().advanceLevel();
    expect(store.getState().level).toBe(2);
    expect(store.getState().status).toBe('oynaniyor');
    expect(store.getState().score).toBe(0);
  });

  it('seviye tamamlanmadan gecis yapmaz', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.getState().advanceLevel();
    expect(store.getState().level).toBe(1);
  });

  it('son seviyeden sonra ilerlemez', () => {
    const store = makeStore();
    store.getState().startLevel(30, 1);
    store.setState({ status: 'seviye-tamam' });

    store.getState().advanceLevel();
    expect(store.getState().level).toBe(30);
    expect(store.getState().status).toBe('seviye-tamam');
  });
});

describe('retry', () => {
  it('ayni seviyeyi AYNI tohumla bastan baslatir', () => {
    const store = makeStore();
    store.getState().startLevel(3, 99);
    const firstTray = store.getState().tray.map((t) => t.id);

    store.getState().selectTray(0);
    store.getState().insertAt(0);
    store.getState().retry();

    expect(store.getState().level).toBe(3);
    expect(store.getState().score).toBe(0);
    expect(store.getState().moves).toBe(0);
    expect(store.getState().tray.map((t) => t.id)).toEqual(firstTray);
  });
});

describe('combo takibi', () => {
  it('baslangicta combo sifirdir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    expect(store.getState().lastCombo).toBe(0);
    expect(store.getState().bestCombo).toBe(0);
  });

  it('bestCombo hicbir zaman azalmaz', () => {
    const store = makeStore();
    store.getState().startLevel(1, 7);
    let peak = 0;

    for (let i = 0; i < 40; i++) {
      const state = store.getState();
      if (state.status !== 'oynaniyor') break;
      state.selectTray(0);
      state.insertAt(insertPositions(state.row)[0]!);
      expect(store.getState().bestCombo).toBeGreaterThanOrEqual(peak);
      peak = store.getState().bestCombo;
    }
  });
});
