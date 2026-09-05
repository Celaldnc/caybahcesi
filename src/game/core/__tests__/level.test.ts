import { LEVEL, ORDER, SLOTS } from '@/constants/config';

import {
  ALL_LEVELS,
  getLevelConfig,
  isLevelComplete,
  nextLevelNumber,
  progressRatio,
} from '../level';

import { orderAwarePolicy, playOrderGame, promptSemaver } from './helpers/policies';

describe('getLevelConfig', () => {
  it('gecerli level icin yapilandirma dondurur', () => {
    expect(getLevelConfig(1).number).toBe(1);
  });

  it('level 1 baslangic slot sayisiyla baslar', () => {
    expect(getLevelConfig(1).slotCount).toBe(SLOTS.INITIAL);
  });

  it('level 1 en az tile tipiyle baslar', () => {
    expect(getLevelConfig(1).tileTypeCount).toBe(LEVEL.MIN_TILE_TYPES);
  });

  /**
   * MUTLAK egri testleri. Onceden yalnizca "monoton artiyor" ve "tam sayi"
   * test ediliyordu; mutasyon denetimi gosterdi ki formulu
   * `BASE + STEP*(L-1)` yerine `BASE + STEP*L` yapmak hicbir testi kirmiyor,
   * yani tum egri bir basamak kaydirilabiliyordu.
   */
  it('level 1 in hedefi tam olarak taban skordur', () => {
    expect(getLevelConfig(1).customerCount).toBe(ORDER.BASE_CUSTOMERS);
  });

  it('ardisik seviyeler arasindaki fark tam olarak adim degeridir', () => {
    for (let n = 1; n < LEVEL.TOTAL; n++) {
      expect(getLevelConfig(n + 1).customerCount).toBeGreaterThanOrEqual(
        getLevelConfig(n).customerCount,
      );
    }
  });

  it('son levelin hedefi formulle birebir uyusur', () => {
    expect(getLevelConfig(LEVEL.TOTAL).customerCount).toBe(ORDER.MAX_CUSTOMERS);
  });

  it('son level tavan degerlere ulasir', () => {
    const last = getLevelConfig(LEVEL.TOTAL);
    expect(last.slotCount).toBe(SLOTS.MAX);
    expect(last.tileTypeCount).toBe(LEVEL.MAX_TILE_TYPES);
  });

  it('gecersiz level numarasini reddeder', () => {
    expect(() => getLevelConfig(0)).toThrow(RangeError);
    expect(() => getLevelConfig(-1)).toThrow(RangeError);
    expect(() => getLevelConfig(LEVEL.TOTAL + 1)).toThrow(RangeError);
    expect(() => getLevelConfig(1.5)).toThrow(RangeError);
  });

  it('ayni level her zaman ayni yapilandirmayi verir (deterministik)', () => {
    expect(getLevelConfig(17)).toEqual(getLevelConfig(17));
  });
});

describe('ALL_LEVELS', () => {
  it('spec in istedigi sayida level uretir', () => {
    expect(ALL_LEVELS).toHaveLength(LEVEL.TOTAL);
    expect(LEVEL.TOTAL).toBeGreaterThanOrEqual(30);
  });

  it('level numaralari 1 den baslayip kesintisiz artar', () => {
    ALL_LEVELS.forEach((config, index) => {
      expect(config.number).toBe(index + 1);
    });
  });

  describe('zorluk egrisi monoton artar', () => {
    it('slot sayisi hicbir zaman azalmaz', () => {
      for (let i = 1; i < ALL_LEVELS.length; i++) {
        expect(ALL_LEVELS[i]!.slotCount).toBeGreaterThanOrEqual(ALL_LEVELS[i - 1]!.slotCount);
      }
    });

    it('tile tipi sayisi hicbir zaman azalmaz', () => {
      for (let i = 1; i < ALL_LEVELS.length; i++) {
        expect(ALL_LEVELS[i]!.tileTypeCount).toBeGreaterThanOrEqual(
          ALL_LEVELS[i - 1]!.tileTypeCount,
        );
      }
    });

    it('hedef skor her levelde artar', () => {
      for (let i = 1; i < ALL_LEVELS.length; i++) {
        expect(ALL_LEVELS[i]!.customerCount).toBeGreaterThanOrEqual(
          ALL_LEVELS[i - 1]!.customerCount,
        );
      }
    });
  });

  describe('yapilandirma sinirlari', () => {
    it('slot sayisi izin verilen aralikta kalir', () => {
      for (const config of ALL_LEVELS) {
        expect(config.slotCount).toBeGreaterThanOrEqual(SLOTS.INITIAL);
        expect(config.slotCount).toBeLessThanOrEqual(SLOTS.MAX);
      }
    });

    it('tile tipi sayisi izin verilen aralikta kalir', () => {
      for (const config of ALL_LEVELS) {
        expect(config.tileTypeCount).toBeGreaterThanOrEqual(LEVEL.MIN_TILE_TYPES);
        expect(config.tileTypeCount).toBeLessThanOrEqual(LEVEL.MAX_TILE_TYPES);
      }
    });

    it('tile tipi sayisi slot sayisini asmaz (tahta cozulebilir kalsin)', () => {
      for (const config of ALL_LEVELS) {
        expect(config.tileTypeCount).toBeLessThanOrEqual(config.slotCount);
      }
    });

    it('hedef skorlar tam sayidir', () => {
      for (const config of ALL_LEVELS) {
        expect(Number.isInteger(config.customerCount)).toBe(true);
      }
    });
  });
});

describe('isLevelComplete', () => {
  const config = getLevelConfig(1);

  it('hedefin altinda tamamlanmis saymaz', () => {
    expect(isLevelComplete(config.customerCount - 1, config)).toBe(false);
  });

  it('hedefe tam ulasinca tamamlanmis sayar', () => {
    expect(isLevelComplete(config.customerCount, config)).toBe(true);
  });

  it('hedefi asinca tamamlanmis sayar', () => {
    expect(isLevelComplete(config.customerCount + 5, config)).toBe(true);
  });

  it('sifir skoru tamamlanmis saymaz', () => {
    expect(isLevelComplete(0, config)).toBe(false);
  });

  it('negatif veya sonlu olmayan skoru reddeder', () => {
    expect(() => isLevelComplete(-1, config)).toThrow(RangeError);
    expect(() => isLevelComplete(NaN, config)).toThrow(RangeError);
    expect(() => isLevelComplete(1.5, config)).toThrow(RangeError);
  });
});

describe('progressRatio', () => {
  const config = getLevelConfig(1);

  it('sifir skorda 0 dondurur', () => {
    expect(progressRatio(0, config)).toBe(0);
  });

  it('hedefte 1 dondurur', () => {
    expect(progressRatio(config.customerCount, config)).toBe(1);
  });

  it('hedefi asinca 1 de sinirlanir (ilerleme cubugu tasmasin)', () => {
    expect(progressRatio(config.customerCount * 3, config)).toBe(1);
  });

  it('arada orantili deger dondurur', () => {
    expect(progressRatio(config.customerCount, config)).toBe(1);
    expect(progressRatio(0, config)).toBe(0);
  });

  it('negatif veya sonlu olmayan skoru reddeder', () => {
    expect(() => progressRatio(-1, config)).toThrow(RangeError);
    expect(() => progressRatio(NaN, config)).toThrow(RangeError);
    expect(() => progressRatio(Infinity, config)).toThrow(RangeError);
    expect(() => progressRatio(1.5, config)).toThrow(RangeError);
  });
});

describe('nextLevelNumber', () => {
  it('sonraki level numarasini verir', () => {
    expect(nextLevelNumber(1)).toBe(2);
  });

  it('son levelden sonra null doner (oyun bitti)', () => {
    expect(nextLevelNumber(LEVEL.TOTAL)).toBeNull();
  });

  it('gecersiz numarayi reddeder', () => {
    expect(() => nextLevelNumber(0)).toThrow(RangeError);
    expect(() => nextLevelNumber(LEVEL.TOTAL + 1)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// Property: her seviye gercekten gecilebilir mi?
// ---------------------------------------------------------------------------

/**
 * Bir seviyeyi oynar; hedefe kac hamlede ulasildigini doner.
 * null = butce doldu ya da tahta doldu (seviye gecilemedi).
 */
/**
 * Bir seviyeyi SIPARIS MODUNDA oynar; kazanildiysa hamle sayisini doner.
 *
 * Sprint 3'te skor hedefi kaldirildi (olculdu: hedefi yukseltmek seviyeyi
 * zorlastirmiyor, UZATIYORDU). Seviye artik musteri servis ederek gecilir,
 * dolayisiyla gecilebilirlik olcumu de siparis simulatoruyle yapilir.
 */
function movesToClear(levelNumber: number, seed: number, maxMoves: number): number | null {
  const config = getLevelConfig(levelNumber);
  const result = playOrderGame({
    seed,
    poolSize: config.tileTypeCount,
    slotCount: config.slotCount,
    maxMoves,
    policy: orderAwarePolicy,
    customerCount: config.customerCount,
    powerPolicy: promptSemaver,
  });
  return result.won ? result.moves : null;
}

describe('property: her seviye gecilebilir', () => {
  const MOVE_BUDGET = 200;
  // Siparis simulasyonu skor simulasyonundan agir; tohum sayisi buna gore.
  const SEEDS = 10;

  /**
   * Elle yazilmis 30 tablo yerine olculmus bir egri kullaniyoruz. Bu test
   * egrinin GERCEKTEN gecilebilir oldugunu dogrular -- aksi halde oyuncu
   * asla asamayacagi bir seviyede takilir ve oyunu birakir.
   *
   * ESIK %100 DEGIL: siparis sistemi bilerek kaybedilebilir yapildi
   * (Sprint 2'de dusunen oyuncu %100 kazaniyordu, yani gerilim yoktu).
   * Burada aranan sey her seviyenin DUZENLI OLARAK gecilebilmesi.
   */
  it('30 seviyenin tamami duzenli olarak gecilir', () => {
    const weak: string[] = [];
    let attempts = 0;

    for (const config of ALL_LEVELS) {
      let wins = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        attempts++;
        if (movesToClear(config.number, seed, MOVE_BUDGET) !== null) wins++;
      }
      if (wins / SEEDS < 0.6) weak.push(`seviye ${config.number} (${wins}/${SEEDS})`);
    }

    // Denetimin YAPILDIGINI once iddia et (CLAUDE.md vakum kurali).
    expect(attempts).toBe(LEVEL.TOTAL * SEEDS);
    expect(weak).toEqual([]);
  });

  it('ilk seviye hizli gecilir (oyuncuyu ilk oturumda kaybetme)', () => {
    let cleared = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      const moves = movesToClear(1, seed, MOVE_BUDGET);
      if (moves === null) continue;
      cleared++;
      expect(moves).toBeLessThanOrEqual(45);
    }

    expect(cleared).toBeGreaterThanOrEqual(SEEDS - 1);
  });

  it('son seviye ilk seviyeden belirgin sekilde uzundur', () => {
    const first = movesToClear(1, 1, MOVE_BUDGET) ?? 0;
    const last = movesToClear(LEVEL.TOTAL, 1, MOVE_BUDGET) ?? 0;
    expect(last).toBeGreaterThan(first);
  });
});
