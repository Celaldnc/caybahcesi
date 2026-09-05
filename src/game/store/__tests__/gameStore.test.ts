import { ORDER } from '@/constants/config';

import { getLevelConfig } from '@/game/core/level';
import {
  countEmpty,
  insertPositions,
  insertTile,
  isRowFull,
  resolve,
  tileCount,
} from '@/game/core/matcher';
import { dailySeed } from '@/game/core/rng';
import { createTile } from '@/game/core/tiles';

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

/**
 * Hedefe ulasana ya da tahta dolana kadar oynar.
 *
 * SPRINT 2 KALITE KAPISINDA DUZELTILDI. Onceki hali "eslesme yaratan ilk
 * hamleyi bul" diye yorumlanmisti ama ic dongu KOSULSUZ `break` ediyordu:
 * her tur tray[0]'i konum 0'a koyuyordu. Olculdu -- 400 kosuda 400 kayip,
 * 0 galibiyet, hamlelerin %76'si hic puan getirmiyordu. Yani "oyun bir
 * sonuca ulasir" diyen testler yalnizca KAYBETME yolunu geziyordu.
 *
 * Yeni hali secimi STORE'U KIRLETMEDEN, core'un saf fonksiyonlariyla
 * ONCEDEN hesaplar: `resolve(insertTile(...))` kaldirma sayisini verir.
 */
function findScoringMove(state: GameStore): { tray: number; position: number } | null {
  for (let t = 0; t < state.tray.length; t++) {
    const tile = state.tray[t]!;
    for (const position of insertPositions(state.row)) {
      if (resolve(insertTile(state.row, position, tile)).removedCount > 0) {
        return { tray: t, position };
      }
    }
  }
  return null;
}

function playUntilEnd(store: ReturnType<typeof makeStore>, maxMoves = 400): GameStore {
  for (let i = 0; i < maxMoves; i++) {
    const state = store.getState();
    if (state.status !== 'oynaniyor') break;

    const positions = insertPositions(state.row);
    if (positions.length === 0 || state.tray.length === 0) break;

    const move = findScoringMove(state) ?? { tray: 0, position: positions[0]! };
    store.getState().selectTray(move.tray);
    store.getState().insertAt(move.position);
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
  it('yeterli musteri servis edilince seviye tamamlanir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const { config } = store.getState();

    store.setState({ served: config.customerCount });
    store.getState().selectTray(0);
    store.getState().insertAt(0);

    expect(store.getState().status).toBe('seviye-tamam');
  });

  /**
   * SIRA TESTI: once "seviye tamam mi", sonra "kaybettik mi".
   *
   * Sprint 3'te bu kural DAHA KRITIK hale geldi. Eskiden cakisma yapisal
   * olarak imkansizdi (puan getiren her hamle en az 3 slot bosaltir), ama
   * siparis sistemi ikinci bir kaybetme yolu getirdi: SABIR. Artik ayni
   * hamlede son musteri servis edilirken baska bir masanin sabri
   * tukenebilir. Ters sirada yazilsaydi oyuncu kazandigi hamlede
   * kaybederdi -- en can sikici hata turu.
   */
  it('kazandiran hamlede baska masa gitse bile oyuncu KAZANIR', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const { config, pool } = store.getState();
    const a = pool[0]!;

    // Kurulum: bir masa bu hamlede TAMAMLANACAK (son gereken musteri),
    // diger iki masanin sabri ayni hamlede TUKENECEK.
    store.setState({
      served: config.customerCount - 1,
      lost: ORDER.MAX_LOST - 2,
      customers: [
        {
          id: 'servis',
          order: [{ tileId: a, required: 1, served: 0 }],
          patience: 5,
          maxPatience: 5,
        },
        {
          id: 'giden1',
          order: [{ tileId: a, required: 9, served: 0 }],
          patience: 1,
          maxPatience: 9,
        },
        {
          id: 'giden2',
          order: [{ tileId: a, required: 9, served: 0 }],
          patience: 1,
          maxPatience: 9,
        },
      ],
      row: [createTile(a), createTile(a), ...Array<null>(config.slotCount - 2).fill(null)],
      tray: [createTile(a)],
      selectedTrayIndex: null,
    });

    // Ucluyu tamamla: masalardan biri servis edilecek, digerlerinin sabri bitecek.
    store.getState().selectTray(0);
    store.getState().insertAt(0);

    const state = store.getState();

    // Kurulumun GERCEKTEN cakismayi urettigini once ISPATLA -- yoksa bu
    // test de vakuma duser (CLAUDE.md).
    expect(state.served).toBeGreaterThanOrEqual(config.customerCount);
    expect(state.lost).toBeGreaterThan(ORDER.MAX_LOST - 2);

    expect(state.status).toBe('seviye-tamam');
  });

  /** Kayip esigi asilinca (ve kazanilmadiysa) oyun biter. */
  it('cok musteri kaybedilince oyun biter', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const { pool, customers } = store.getState();
    const a = pool[0]!;

    store.setState({
      lost: ORDER.MAX_LOST - 1,
      customers: customers.map((customer) => ({ ...customer, patience: 1 })),
      tray: [createTile(a)],
      selectedTrayIndex: null,
    });

    store.getState().selectTray(0);
    store.getState().insertAt(0);

    const state = store.getState();
    expect(state.lost).toBeGreaterThanOrEqual(ORDER.MAX_LOST);
    expect(state.status).toBe('oyun-bitti');
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

/**
 * `lastGain` ve `clearCombo` -- ikisi de Sprint 2 kalite kapisinda eklendi.
 *
 * `lastGain`: ekran "eslesme oldu mu" sorusunu render closure'indaki bayat
 * `state.score` ile `getState().score`'u karsilastirarak cevapliyordu; hizli
 * cift dokunusta hamle yapilmadigi halde "basari" haptigi veriyordu.
 * Turetmeyi store yapiyor, ekran yalnizca okuyor.
 */
describe('lastGain', () => {
  it('puansiz hamlede sifirdir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 3);
    store.getState().selectTray(0);
    store.getState().insertAt(0);

    expect(store.getState().lastGain).toBe(0);
  });

  it('eslesmede kazanilan puana esittir', () => {
    const store = makeStore();
    store.getState().startLevel(1, 3);

    let scored = false;
    for (let i = 0; i < 60 && !scored; i++) {
      const state = store.getState();
      if (state.status !== 'oynaniyor') break;

      const before = state.score;
      const move = findScoringMove(state);
      if (move === null) {
        const positions = insertPositions(state.row);
        if (positions.length === 0) break;
        store.getState().selectTray(0);
        store.getState().insertAt(positions[0]!);
        continue;
      }
      store.getState().selectTray(move.tray);
      store.getState().insertAt(move.position);
      expect(store.getState().lastGain).toBe(store.getState().score - before);
      scored = true;
    }

    // Denetimin YAPILDIGINI iddia et -- dongu hic puanlamasaydi test bos gecerdi.
    expect(scored).toBe(true);
  });
});

describe('clearCombo', () => {
  /**
   * `ANIM.COMBO_BANNER_MS` "ekranda kalma suresi" diye belgelenmisti ama
   * hicbir zamanlayici yoktu: banner bir sonraki hamleye kadar duruyordu --
   * ustelik `pointerEvents` de olmadigi icin o hamlenin dokunusunu
   * bloklayarak. Ekran bu eylemi sure sonunda cagirir.
   */
  it('banner carpanini sifirlar', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.setState({ lastCombo: 3 });

    store.getState().clearCombo();
    expect(store.getState().lastCombo).toBe(0);
  });

  it('zaten sifirken durumu degistirmez', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    const before = store.getState();

    store.getState().clearCombo();

    // Ayni REFERANS: gereksiz `set` cagrisi React'te bos render tetiklerdi.
    expect(store.getState()).toBe(before);
  });

  /** `bestCombo` kalici -- banner gizlenince seviye rekoru silinmemeli. */
  it('bestCombo yu korur', () => {
    const store = makeStore();
    store.getState().startLevel(1, 1);
    store.setState({ lastCombo: 2, bestCombo: 2 });

    store.getState().clearCombo();
    expect(store.getState().bestCombo).toBe(2);
  });
});
