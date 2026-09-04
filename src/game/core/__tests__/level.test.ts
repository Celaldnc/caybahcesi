import { LEVEL, SLOTS } from '@/constants/config';

import {
  ALL_LEVELS,
  getLevelConfig,
  isLevelComplete,
  nextLevelNumber,
  progressRatio,
} from '../level';

import { playGame, thoughtfulPolicy } from './helpers/policies';

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
        expect(ALL_LEVELS[i]!.targetScore).toBeGreaterThan(ALL_LEVELS[i - 1]!.targetScore);
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
        expect(Number.isInteger(config.targetScore)).toBe(true);
      }
    });
  });
});

describe('isLevelComplete', () => {
  const config = getLevelConfig(1);

  it('hedefin altinda tamamlanmis saymaz', () => {
    expect(isLevelComplete(config.targetScore - 1, config)).toBe(false);
  });

  it('hedefe tam ulasinca tamamlanmis sayar', () => {
    expect(isLevelComplete(config.targetScore, config)).toBe(true);
  });

  it('hedefi asinca tamamlanmis sayar', () => {
    expect(isLevelComplete(config.targetScore + 500, config)).toBe(true);
  });

  it('sifir skoru tamamlanmis saymaz', () => {
    expect(isLevelComplete(0, config)).toBe(false);
  });

  it('negatif veya sonlu olmayan skoru reddeder', () => {
    expect(() => isLevelComplete(-1, config)).toThrow(RangeError);
    expect(() => isLevelComplete(NaN, config)).toThrow(RangeError);
  });
});

describe('progressRatio', () => {
  const config = getLevelConfig(1);

  it('sifir skorda 0 dondurur', () => {
    expect(progressRatio(0, config)).toBe(0);
  });

  it('hedefte 1 dondurur', () => {
    expect(progressRatio(config.targetScore, config)).toBe(1);
  });

  it('hedefi asinca 1 de sinirlanir (ilerleme cubugu tasmasin)', () => {
    expect(progressRatio(config.targetScore * 3, config)).toBe(1);
  });

  it('arada orantili deger dondurur', () => {
    expect(progressRatio(config.targetScore / 2, config)).toBeCloseTo(0.5);
  });

  it('negatif veya sonlu olmayan skoru reddeder', () => {
    expect(() => progressRatio(-1, config)).toThrow(RangeError);
    expect(() => progressRatio(NaN, config)).toThrow(RangeError);
    expect(() => progressRatio(Infinity, config)).toThrow(RangeError);
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
function movesToClear(levelNumber: number, seed: number, maxMoves: number): number | null {
  const config = getLevelConfig(levelNumber);
  const result = playGame({
    seed,
    poolSize: config.tileTypeCount,
    slotCount: config.slotCount,
    maxMoves,
    policy: thoughtfulPolicy,
    targetScore: config.targetScore,
  });
  return result.reachedTarget ? result.moves : null;
}

describe('property: her seviye gecilebilir', () => {
  const MOVE_BUDGET = 150;
  const SEEDS = 8;

  /**
   * Elle yazilmis 30 hedef skor yerine olculmus bir egri kullaniyoruz.
   * Bu test egrinin GERCEKTEN gecilebilir oldugunu dogrular -- aksi halde
   * oyuncu asla asamayacagi bir seviyede takilir ve oyunu birakir.
   */
  it('30 seviyenin tamami makul hamle butcesinde gecilir', () => {
    const failures: string[] = [];

    for (const config of ALL_LEVELS) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        if (movesToClear(config.number, seed, MOVE_BUDGET) === null) {
          failures.push(`seviye ${config.number} (tohum ${seed})`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('ilk seviye hizli gecilir (oyuncuyu ilk oturumda kaybetme)', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const moves = movesToClear(1, seed, MOVE_BUDGET);
      expect(moves).not.toBeNull();
      // ~30 hamle x ~1.5 sn = spec'teki 30-90 saniyelik oturum hedefi.
      expect(moves).toBeLessThanOrEqual(30);
    }
  });

  it('son seviye ilk seviyeden belirgin sekilde zordur', () => {
    const first = movesToClear(1, 1, MOVE_BUDGET) ?? 0;
    const last = movesToClear(LEVEL.TOTAL, 1, MOVE_BUDGET) ?? 0;
    expect(last).toBeGreaterThan(first);
  });
});
