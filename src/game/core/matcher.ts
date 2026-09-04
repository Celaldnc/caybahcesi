import { MATCH } from '@/constants/config';

import type { CascadeStep, MatchRun, ResolveResult, Slot, SlotRow, Tile } from './types';

/**
 * Eslesme motoru.
 *
 * Model: sabit slotlar + delik. Iki tile "yanyana" sayilmak icin ARDISIK
 * indislerde ve IKISI DE DOLU olmali. [A, null, A, A] eslesme DEGILDIR --
 * bosluk komsulugu kirar. Bu kural oyunun karakterini belirler ve
 * matcher.test.ts icinde acikca sabitlenmistir.
 *
 * Tum fonksiyonlar saf: girdi satirini asla degistirmez, yeni satir dondurur.
 */

/** Kapasitesi verilen bos bir satir uretir. */
export function createEmptyRow(slotCount: number): SlotRow {
  if (!Number.isInteger(slotCount) || slotCount <= 0) {
    throw new RangeError(`Slot sayisi pozitif tam sayi olmali, alinan: ${slotCount}`);
  }
  return Array.from({ length: slotCount }, () => null);
}

/** Bos slotlarin indisleri, kucukten buyuge. */
export function emptyIndices(row: SlotRow): readonly number[] {
  const result: number[] = [];
  for (let i = 0; i < row.length; i++) {
    if (row[i] === null) result.push(i);
  }
  return result;
}

/** Bos slot sayisi. */
export function countEmpty(row: SlotRow): number {
  let count = 0;
  for (const slot of row) {
    if (slot === null) count++;
  }
  return count;
}

/** Satirda hic bos slot kalmadi mi? Oyun sonu kosulu. */
export function isRowFull(row: SlotRow): boolean {
  return countEmpty(row) === 0;
}

/**
 * Tile'i belirtilen bos slota koyar ve YENI satir dondurur.
 * Gecersiz indis veya dolu slot sessizce yutulmaz -- hata firlatir.
 */
export function placeTile(row: SlotRow, index: number, tile: Tile): SlotRow {
  if (!Number.isInteger(index) || index < 0 || index >= row.length) {
    throw new RangeError(`Slot indisi 0..${row.length - 1} araliginda olmali, alinan: ${index}`);
  }
  if (row[index] !== null) {
    throw new Error(`Slot ${index} zaten dolu.`);
  }

  const next: Slot[] = [...row];
  next[index] = tile;
  return next;
}

/**
 * Satirdaki tum eslesmeleri bulur.
 * Uzunlugu MATCH.LENGTH veya daha fazla olan, ardisik ayni tipteki gruplar.
 */
export function findRuns(row: SlotRow): readonly MatchRun[] {
  const runs: MatchRun[] = [];

  let index = 0;
  while (index < row.length) {
    const slot = row[index];

    if (slot === undefined || slot === null) {
      index++;
      continue;
    }

    // Ayni tipteki ardisik tile'lari say.
    let end = index + 1;
    while (end < row.length) {
      const next = row[end];
      if (next === undefined || next === null || next.id !== slot.id) break;
      end++;
    }

    const length = end - index;
    if (length >= MATCH.LENGTH) {
      runs.push({ startIndex: index, length, tileId: slot.id });
    }

    index = end;
  }

  return runs;
}

/**
 * Tile'lari sola yaslar, bosluklari sona toplar. Kapasite korunur.
 * Eslesme kaldirildiktan sonra cagrilir; zincirleri (cascade) bu yaratir.
 */
export function collapse(row: SlotRow): SlotRow {
  const tiles = row.filter((slot): slot is Tile => slot !== null);
  const padding: Slot[] = Array.from({ length: row.length - tiles.length }, () => null);
  return [...tiles, ...padding];
}

/**
 * Eslesmeleri tekrar tekrar kaldirir; her tur bir zincir adimidir.
 *
 * Dongu her adimda en az MATCH.LENGTH tile kaldirdigi icin sonludur:
 * satirdaki tile sayisi kesin olarak azalir, dolayisiyla sonsuz dongu
 * yapisal olarak imkansizdir.
 */
export function resolve(row: SlotRow): ResolveResult {
  const steps: CascadeStep[] = [];
  let current = row;
  let removedCount = 0;

  for (;;) {
    const runs = findRuns(current);
    if (runs.length === 0) break;

    const removed: Tile[] = [];
    const next: Slot[] = [...current];

    for (const run of runs) {
      for (let i = run.startIndex; i < run.startIndex + run.length; i++) {
        // findRuns yalnizca DOLU ve ardisik slotlardan run uretir, dolayisiyla
        // bu indisler tanim geregi doludur. noUncheckedIndexedAccess yuzunden
        // TS yine de undefined gorur; ulasilamaz bir dal eklemek yerine
        // imkansizligi burada acikca ifade ediyoruz.
        removed.push(next[i]!);
        next[i] = null;
      }
    }

    steps.push({ runs, removed });
    removedCount += removed.length;
    current = collapse(next);
  }

  return { row: current, steps, removedCount };
}
