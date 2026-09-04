import { MATCH } from '@/constants/config';

import type { CascadeStep, MatchRun, ResolveResult, Slot, SlotRow, Tile } from './types';

/**
 * Eslesme motoru.
 *
 * MODEL: EKLEME (insertion). Satir her zaman SOLA PAKETLIDIR; oyuncu tile'i
 * bos bir slota koymaz, mevcut tile'larin ARASINA ekler ve sagdaki her sey
 * bir kayar. Kapasite sabittir (seviyeye gore 7-9); satir dolunca oyun biter.
 *
 * NEDEN sabit-slot degil de ekleme (olcume dayali karar):
 * Sabit slot + her eslesmeden sonra sola sikistirma modelinde tahta bir
 * YIGINA donusuyordu -- dolu blogun sagindaki tek slot "komsusu olan" slot
 * oldugu icin dusunen oyuncu hamlelerinin %100'unde oraya koyuyordu.
 * Eslesme hep blogun sonunda olusuyor, kaldirinca birlesecek bir sey
 * kalmiyordu: 80.000 hamlede TEK BIR ZINCIR olusmadi. Yani combo mekanigi
 * (spec'in "Combo x3!" banner'i) yapisal olarak imkansizdi ve "istedigin
 * yere koy" vaadi karsiliksizdi.
 *
 * Ekleme modelinde iki grubun ARASINA girmek onlari birlestirebilir:
 *   [A A B B A A] + araya B  ->  [A A B B B A A]
 *   BBB gider -> sikis -> [A A A A] -> AAAA gider. Zincir x2.
 *
 * Iki tile "yanyana" sayilmak icin ardisik indislerde ve ikisi de dolu
 * olmali. Satir paketli oldugu icin bu kural pratikte her zaman saglanir;
 * bosluk yalnizca `resolve` icinde, kaldirma ile sikistirma ARASINDA
 * gecici olarak olusur.
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

/** Satirdaki dolu tile sayisi. */
export function tileCount(row: SlotRow): number {
  return row.length - countEmpty(row);
}

/** Satirdaki tile'lar, paketli sirayla. */
export function tilesOf(row: SlotRow): readonly Tile[] {
  return row.filter((slot): slot is Tile => slot !== null);
}

/**
 * Gecerli ekleme konumlari: 0..tileCount (dahil).
 *
 * n tile varsa n+1 konum vardir -- her tile'in soluna ve en saga. Bos
 * satirda tek konum (0), dolu satirda hicbiri (oyun sonu).
 */
export function insertPositions(row: SlotRow): readonly number[] {
  if (isRowFull(row)) return [];
  return Array.from({ length: tileCount(row) + 1 }, (_, i) => i);
}

/**
 * Tile'i verilen konuma EKLER; sagdaki tile'lar bir kayar. Kapasite korunur.
 *
 * Gecersiz konum veya dolu satir sessizce yutulmaz -- hata firlatir.
 */
export function insertTile(row: SlotRow, position: number, tile: Tile): SlotRow {
  if (isRowFull(row)) {
    throw new Error('Satir dolu, tile eklenemez.');
  }

  const count = tileCount(row);
  if (!Number.isInteger(position) || position < 0 || position > count) {
    throw new RangeError(`Ekleme konumu 0..${count} araliginda olmali, alinan: ${position}`);
  }

  const tiles = tilesOf(row);
  const next: Slot[] = [...tiles.slice(0, position), tile, ...tiles.slice(position)];
  while (next.length < row.length) next.push(null);
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
    // KONVANSIYON: indis kanitlanabilir sekilde sinir icindeyse `!` kullan.
    // `index < row.length` oldugu icin undefined imkansiz; yalnizca null
    // anlamli. Ulasilamaz bir `undefined` dali eklemek test edilemez olu kod
    // uretir ve branch coverage'i yaniltir (bkz. CLAUDE.md).
    const slot = row[index]!;

    if (slot === null) {
      index++;
      continue;
    }

    // Ayni tipteki ardisik tile'lari say.
    let end = index + 1;
    while (end < row.length) {
      const next = row[end]!;
      if (next === null || next.id !== slot.id) break;
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
