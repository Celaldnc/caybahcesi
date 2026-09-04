import { MATCH, SCORE } from '@/constants/config';

import { createEmptyRow, resolve } from '../matcher';
import { comboMultiplier, computeScore, runPoints } from '../score';
import { createTile } from '../tiles';
import type { ResolveResult, SlotRow, TileId } from '../types';

const SHORT: Record<string, TileId> = {
  A: 'cay-ince-belli',
  B: 'kahve-fincan',
  C: 'nazar-mavi',
};

function row(...cells: string[]): SlotRow {
  return cells.map((cell) => (cell === '.' ? null : createTile(SHORT[cell] ?? 'vapur')));
}

/** Eslesmesiz bos sonuc; kenar durum testlerinde kullanilir. */
const EMPTY_RESULT: ResolveResult = {
  row: createEmptyRow(7),
  steps: [],
  removedCount: 0,
};

describe('comboMultiplier', () => {
  it('ilk zincir adiminda carpan 1 dir', () => {
    expect(comboMultiplier(0)).toBe(1);
  });

  it('her adimda COMBO_STEP kadar artar', () => {
    expect(comboMultiplier(1)).toBe(1 + SCORE.COMBO_STEP);
    expect(comboMultiplier(2)).toBe(1 + 2 * SCORE.COMBO_STEP);
  });

  it('COMBO_MAX tavanini asmaz', () => {
    expect(comboMultiplier(50)).toBe(SCORE.COMBO_MAX);
    expect(comboMultiplier(1000)).toBe(SCORE.COMBO_MAX);
  });

  it('negatif veya tam sayi olmayan adim indisini reddeder', () => {
    expect(() => comboMultiplier(-1)).toThrow(RangeError);
    expect(() => comboMultiplier(1.5)).toThrow(RangeError);
  });
});

describe('runPoints', () => {
  it('tam uzunluktaki eslesme taban puani verir', () => {
    expect(runPoints(MATCH.LENGTH, 1)).toBe(SCORE.BASE_PER_MATCH);
  });

  it('daha uzun eslesme her ekstra tile icin bonus ekler', () => {
    expect(runPoints(MATCH.LENGTH + 1, 1)).toBe(SCORE.BASE_PER_MATCH + SCORE.EXTRA_TILE_BONUS);
    expect(runPoints(MATCH.LENGTH + 2, 1)).toBe(SCORE.BASE_PER_MATCH + 2 * SCORE.EXTRA_TILE_BONUS);
  });

  it('combo carpani ile carpilir', () => {
    expect(runPoints(MATCH.LENGTH, 3)).toBe(SCORE.BASE_PER_MATCH * 3);
  });

  it('her zaman tam sayi dondurur (kesirli puan yok)', () => {
    for (let length = MATCH.LENGTH; length <= 9; length++) {
      for (let multiplier = 1; multiplier <= SCORE.COMBO_MAX; multiplier++) {
        expect(Number.isInteger(runPoints(length, multiplier))).toBe(true);
      }
    }
  });

  it('gecersiz uzunlugu reddeder', () => {
    expect(() => runPoints(MATCH.LENGTH - 1, 1)).toThrow(RangeError);
    expect(() => runPoints(0, 1)).toThrow(RangeError);
  });

  it('gecersiz carpani reddeder', () => {
    expect(() => runPoints(MATCH.LENGTH, 0)).toThrow(RangeError);
    expect(() => runPoints(MATCH.LENGTH, -2)).toThrow(RangeError);
  });
});

describe('computeScore', () => {
  it('eslesme yoksa sifir puan verir', () => {
    const breakdown = computeScore(EMPTY_RESULT);
    expect(breakdown.total).toBe(0);
    expect(breakdown.base).toBe(0);
    expect(breakdown.perfectSortBonus).toBe(0);
    expect(breakdown.maxCombo).toBe(0);
  });

  it('tek eslesme taban puani verir', () => {
    const result = resolve(row('B', 'A', 'A', 'A', 'C', '.', '.'));
    const breakdown = computeScore(result);
    expect(breakdown.base).toBe(SCORE.BASE_PER_MATCH);
    expect(breakdown.maxCombo).toBe(1);
    expect(breakdown.perfectSortBonus).toBe(0);
    expect(breakdown.total).toBe(SCORE.BASE_PER_MATCH);
  });

  it('ayni adimdaki iki eslesme ayni carpanla puanlanir', () => {
    // [A A A B B B] -> tek adimda iki eslesme, ikisi de carpan 1.
    const result = resolve(row('A', 'A', 'A', 'B', 'B', 'B'));
    expect(result.steps).toHaveLength(1);
    expect(computeScore(result).base).toBe(2 * SCORE.BASE_PER_MATCH);
  });

  /**
   * Zincirin ikinci adimi daha degerlidir -- combo mekanigi budur.
   * [B A A A B B .] -> AAA (carpan 1) -> sikis -> BBB (carpan 2)
   */
  it('zincirin sonraki adimlari artan carpanla puanlanir', () => {
    const result = resolve(row('B', 'A', 'A', 'A', 'B', 'B', '.'));
    expect(result.steps).toHaveLength(2);

    const breakdown = computeScore(result);
    const expectedBase =
      SCORE.BASE_PER_MATCH * comboMultiplier(0) + SCORE.BASE_PER_MATCH * comboMultiplier(1);
    expect(breakdown.base).toBe(expectedBase);
    expect(breakdown.maxCombo).toBe(comboMultiplier(1));
  });

  it('ucten uzun eslesme ekstra puan getirir', () => {
    const result = resolve(row('A', 'A', 'A', 'A', 'B'));
    expect(computeScore(result).base).toBe(SCORE.BASE_PER_MATCH + SCORE.EXTRA_TILE_BONUS);
  });

  describe('perfect-sort bonusu', () => {
    it('satir tamamen bosaldiysa bonus eklenir', () => {
      const result = resolve(row('A', 'A', 'A', '.', '.'));
      expect(result.row.every((slot) => slot === null)).toBe(true);
      expect(computeScore(result).perfectSortBonus).toBe(SCORE.PERFECT_SORT_BONUS);
    });

    it('satirda tile kaldiysa bonus verilmez', () => {
      const result = resolve(row('B', 'A', 'A', 'A', '.'));
      expect(computeScore(result).perfectSortBonus).toBe(0);
    });

    /**
     * Onemli sinir durumu: zaten bos olan bir satirda hicbir sey yapmadan
     * bonus kazanilmamali, yoksa oyuncu bos tahtada bedava puan toplar.
     */
    it('hic eslesme olmadiysa bos satir bonus vermez', () => {
      expect(computeScore(EMPTY_RESULT).perfectSortBonus).toBe(0);
    });

    it('bonus toplama dahil edilir', () => {
      const result = resolve(row('A', 'A', 'A', '.', '.'));
      const breakdown = computeScore(result);
      expect(breakdown.total).toBe(breakdown.base + breakdown.perfectSortBonus);
    });
  });

  it('toplam her zaman base + bonus tur', () => {
    const cases = [
      row('A', 'A', 'A', 'B', 'B', 'B'),
      row('B', 'A', 'A', 'A', 'B', 'B', '.'),
      row('A', 'B', 'C', '.', '.'),
      row('A', 'A', 'A', 'A', 'A', 'A', 'A'),
    ];
    for (const testRow of cases) {
      const breakdown = computeScore(resolve(testRow));
      expect(breakdown.total).toBe(breakdown.base + breakdown.perfectSortBonus);
      expect(Number.isInteger(breakdown.total)).toBe(true);
      expect(breakdown.total).toBeGreaterThanOrEqual(0);
    }
  });
});
