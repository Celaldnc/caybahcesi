import { MATCH, SCORE } from '@/constants/config';

import type { ResolveResult } from './types';

/**
 * Skor hesaplama.
 *
 * Kapsam karari: combo carpani TEK BIR yerlestirmenin zinciri boyunca artar,
 * yerlestirmeler arasinda tasinmaz. Sebep: oyuncunun odulu "tek hamlede
 * zincir kurma" becerisi olmali; hamleler arasi tasinan bir carpan, oyunun
 * geri kalanini otomatik olarak sisirir ve seviye hedeflerini anlamsizlastirir.
 */

export interface ScoreBreakdown {
  /** Eslesmelerden gelen puan (combo carpani dahil). */
  readonly base: number;
  /** Satir tamamen bosaldiysa verilen bonus. */
  readonly perfectSortBonus: number;
  /** base + perfectSortBonus. */
  readonly total: number;
  /** Bu zincirde ulasilan en yuksek carpan. 0 = hic eslesme olmadi. */
  readonly maxCombo: number;
}

/**
 * Zincirin `stepIndex`. adimindaki combo carpani.
 * Ilk adim 1, sonraki her adim COMBO_STEP kadar artar, COMBO_MAX ile sinirli.
 */
export function comboMultiplier(stepIndex: number): number {
  if (!Number.isInteger(stepIndex) || stepIndex < 0) {
    throw new RangeError(`Adim indisi negatif olmayan tam sayi olmali, alinan: ${stepIndex}`);
  }
  return Math.min(1 + stepIndex * SCORE.COMBO_STEP, SCORE.COMBO_MAX);
}

/**
 * Tek bir eslesmenin puani.
 * Taban puan + MATCH.LENGTH'i asan her tile icin ekstra bonus, carpanla carpilir.
 */
export function runPoints(runLength: number, multiplier: number): number {
  if (!Number.isInteger(runLength) || runLength < MATCH.LENGTH) {
    throw new RangeError(
      `Eslesme uzunlugu en az ${MATCH.LENGTH} tam sayi olmali, alinan: ${runLength}`,
    );
  }
  if (!Number.isInteger(multiplier) || multiplier < 1) {
    throw new RangeError(`Carpan en az 1 tam sayi olmali, alinan: ${multiplier}`);
  }

  const extraTiles = runLength - MATCH.LENGTH;
  return (SCORE.BASE_PER_MATCH + extraTiles * SCORE.EXTRA_TILE_BONUS) * multiplier;
}

/** Bir yerlestirmenin cozumlenmesinden elde edilen puan dokumu. */
export function computeScore(result: ResolveResult): ScoreBreakdown {
  let base = 0;
  let maxCombo = 0;

  result.steps.forEach((step, stepIndex) => {
    const multiplier = comboMultiplier(stepIndex);
    maxCombo = Math.max(maxCombo, multiplier);
    for (const run of step.runs) {
      base += runPoints(run.length, multiplier);
    }
  });

  // Bonus yalnizca GERCEK bir eslesme sonucunda bosalan satir icin verilir.
  // Aksi halde zaten bos bir tahtada bedava puan uretilirdi.
  const clearedByPlay = result.steps.length > 0 && result.row.every((slot) => slot === null);
  const perfectSortBonus = clearedByPlay ? SCORE.PERFECT_SORT_BONUS : 0;

  return {
    base,
    perfectSortBonus,
    total: base + perfectSortBonus,
    maxCombo,
  };
}
