import { SLOTS } from '@/constants/config';

import { generateTray, refillTray } from '../../generator';
import { createEmptyRow, insertPositions, insertTile, resolve, tilesOf } from '../../matcher';
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
  /** Ekleme konumu: 0..tileCount (dahil). */
  readonly position: number;
}

export type Policy = (row: SlotRow, tray: readonly Tile[], rng: Rng) => Move | null;

/** Hemen eslesme yaratan ilk hamle. */
function findMatchingMove(row: SlotRow, tray: readonly Tile[]): Move | null {
  for (let tileIndex = 0; tileIndex < tray.length; tileIndex++) {
    // tileIndex < tray.length -> undefined imkansiz (bkz. CLAUDE.md konvansiyonu).
    const tile = tray[tileIndex]!;

    for (const position of insertPositions(row)) {
      if (resolve(insertTile(row, position, tile)).removedCount > 0) {
        return { tileIndex, position };
      }
    }
  }
  return null;
}

/** Ayni tipin bitisigine ekleyerek cift kuran ilk hamle. */
function findPairBuildingMove(row: SlotRow, tray: readonly Tile[]): Move | null {
  // Dolu satirda hicbir ekleme mumkun degil.
  if (insertPositions(row).length === 0) return null;

  for (let tileIndex = 0; tileIndex < tray.length; tileIndex++) {
    const tile = tray[tileIndex]!;

    // Ekleme modelinde ayni tipin hemen yanina eklemek her zaman mumkun.
    const tiles = tilesOf(row);
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i]!.id === tile.id) {
        return { tileIndex, position: i };
      }
    }
  }
  return null;
}

/** Herhangi bir gecerli hamle; hicbiri yoksa null (tahta dolu). */
function findAnyMove(row: SlotRow, tray: readonly Tile[]): Move | null {
  const positions = insertPositions(row);
  const position = positions[0];
  if (position === undefined || tray.length === 0) return null;
  return { tileIndex: 0, position };
}

/**
 * Yerlestirmesini DUSUNEN oyuncu: once eslesme, sonra cift kurma,
 * son care herhangi bir yer. Optimal degil ama makul bir insan temsili.
 */
export const thoughtfulPolicy: Policy = (row, tray) =>
  findMatchingMove(row, tray) ?? findPairBuildingMove(row, tray) ?? findAnyMove(row, tray);

/** Dikkatsiz oyuncu: tamamen rastgele gecerli hamle. Beceri tabani olcumu. */
export const carelessPolicy: Policy = (row, tray, rng) => {
  const positions = insertPositions(row);
  if (positions.length === 0 || tray.length === 0) return null;
  return { tileIndex: rng.int(tray.length), position: rng.pick(positions) };
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

    // Politika yalnizca gecerli bir tileIndex dondurmelidir; sozlesme
    // helpers.test.ts'te dogrulaniyor.
    const tile = tray[move.tileIndex]!;

    const result = resolve(insertTile(row, move.position, tile));
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
