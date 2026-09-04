import { SLOTS } from '@/constants/config';

import { generateTray, refillTray } from '../../generator';
import { createEmptyRow, emptyIndices, placeTile, resolve } from '../../matcher';
import { createRng, type Rng } from '../../rng';
import { computeScore } from '../../score';
import { pickTilePool } from '../../tiles';
import type { SlotRow, Tile, TileId } from '../../types';

/**
 * Test oyuncu politikalari ve oyun simulatoru.
 *
 * Bu dosya bir TEST DEGILDIR (adi *.test.ts degil), dolayisiyla Jest onu
 * kosmaz ve coverage'a girmez. Amaci generator.test.ts ile level.test.ts
 * arasindaki kopyayi ortadan kaldirmak.
 */

export interface Move {
  readonly tileIndex: number;
  readonly slotIndex: number;
}

export type Policy = (row: SlotRow, tray: readonly Tile[], rng: Rng) => Move | null;

/** Hemen eslesme yaratan ilk hamle. */
function findMatchingMove(row: SlotRow, tray: readonly Tile[]): Move | null {
  for (let tileIndex = 0; tileIndex < tray.length; tileIndex++) {
    const tile = tray[tileIndex];
    if (tile === undefined) continue;

    for (const slotIndex of emptyIndices(row)) {
      if (resolve(placeTile(row, slotIndex, tile)).removedCount > 0) {
        return { tileIndex, slotIndex };
      }
    }
  }
  return null;
}

/** Ayni tipin bitisigine koyarak cift kuran ilk hamle. */
function findPairBuildingMove(row: SlotRow, tray: readonly Tile[]): Move | null {
  for (let tileIndex = 0; tileIndex < tray.length; tileIndex++) {
    const tile = tray[tileIndex];
    if (tile === undefined) continue;

    for (const slotIndex of emptyIndices(row)) {
      const left = row[slotIndex - 1];
      const right = row[slotIndex + 1];
      if ((left != null && left.id === tile.id) || (right != null && right.id === tile.id)) {
        return { tileIndex, slotIndex };
      }
    }
  }
  return null;
}

/** Herhangi bir gecerli hamle; hicbiri yoksa null (tahta dolu). */
function findAnyMove(row: SlotRow, tray: readonly Tile[]): Move | null {
  const slots = emptyIndices(row);
  const slotIndex = slots[0];
  if (slotIndex === undefined || tray.length === 0) return null;
  return { tileIndex: 0, slotIndex };
}

/**
 * Yerlestirmesini DUSUNEN oyuncu: once eslesme, sonra cift kurma,
 * son care herhangi bir yer. Optimal degil ama makul bir insan temsili.
 */
export const thoughtfulPolicy: Policy = (row, tray) =>
  findMatchingMove(row, tray) ?? findPairBuildingMove(row, tray) ?? findAnyMove(row, tray);

/** Dikkatsiz oyuncu: tamamen rastgele gecerli hamle. Beceri tabani olcumu. */
export const carelessPolicy: Policy = (row, tray, rng) => {
  const slots = emptyIndices(row);
  if (slots.length === 0 || tray.length === 0) return null;
  return { tileIndex: rng.int(tray.length), slotIndex: rng.pick(slots) };
};

export interface GameOptions {
  readonly seed: number;
  readonly poolSize: number;
  readonly slotCount?: number;
  readonly maxMoves: number;
  readonly policy: Policy;
  /** Her hamleden ONCE cagrilir; sozlesme denetimi icin. */
  readonly onBeforeMove?: (row: SlotRow, tray: readonly Tile[], pool: readonly TileId[]) => void;
  /** Skor bu esige ulasinca oyun basariyla biter. */
  readonly targetScore?: number;
}

export interface GameResult {
  /** Yapilan hamle sayisi. */
  readonly moves: number;
  /** Toplanan toplam skor. */
  readonly score: number;
  /** Hedef skora ulasildi mi (targetScore verildiyse). */
  readonly reachedTarget: boolean;
}

/** Bir oyunu verilen politikayla bastan sona oynar. */
export function playGame(options: GameOptions): GameResult {
  const rng = createRng(options.seed);
  const pool = pickTilePool(options.poolSize, rng);

  let row = createEmptyRow(options.slotCount ?? SLOTS.INITIAL);
  let tray = generateTray(row, pool, rng);
  let score = 0;
  let moves = 0;

  while (moves < options.maxMoves) {
    options.onBeforeMove?.(row, tray, pool);

    const move = options.policy(row, tray, rng);
    if (move === null) break;

    const tile = tray[move.tileIndex];
    if (tile === undefined) break;

    const result = resolve(placeTile(row, move.slotIndex, tile));
    score += computeScore(result).total;
    row = result.row;
    tray = refillTray(
      row,
      tray.filter((_, index) => index !== move.tileIndex),
      pool,
      rng,
    );
    moves++;

    if (options.targetScore !== undefined && score >= options.targetScore) {
      return { moves, score, reachedTarget: true };
    }
  }

  return { moves, score, reachedTarget: false };
}
