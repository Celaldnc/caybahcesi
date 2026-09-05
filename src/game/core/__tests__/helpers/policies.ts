import { ORDER, SLOTS, TRAY } from '@/constants/config';

import { generateTray, refillTray } from '../../generator';
import {
  createEmptyRow,
  insertPositions,
  insertTile,
  isRowFull,
  resolve,
  tilesOf,
} from '../../matcher';
import {
  applyResolve,
  createCustomer,
  createOrder,
  isCustomerGone,
  isOrderComplete,
  neededTileIds,
  tickPatience,
  totalRequired,
  urgentDemand,
} from '../../orders';
import { createRng, type Rng } from '../../rng';
import { computeScore } from '../../score';
import { pickTilePool } from '../../tiles';
import type { Customer, SlotRow, Tile, TileId } from '../../types';

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

/**
 * `needed`: siparisin bekledigi tipler. Siparis modu OLMAYAN politikalar
 * bu parametreyi gormezden gelir -- eski imza bozulmadan genisletildi.
 */
export type Policy = (
  row: SlotRow,
  tray: readonly Tile[],
  rng: Rng,
  needed?: readonly TileId[],
) => Move | null;

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

/** Siparisi SERVIS EDEN ilk eslesme hamlesi. */
function findServingMove(
  row: SlotRow,
  tray: readonly Tile[],
  needed: readonly TileId[],
): Move | null {
  if (needed.length === 0) return null;

  for (let tileIndex = 0; tileIndex < tray.length; tileIndex++) {
    const tile = tray[tileIndex]!;
    if (!needed.includes(tile.id)) continue;

    for (const position of insertPositions(row)) {
      if (resolve(insertTile(row, position, tile)).removedCount > 0) {
        return { tileIndex, position };
      }
    }
  }
  return null;
}

/** Siparisin bekledigi tipten bitisik cift kuran ilk hamle. */
function findServingPairMove(
  row: SlotRow,
  tray: readonly Tile[],
  needed: readonly TileId[],
): Move | null {
  if (needed.length === 0 || insertPositions(row).length === 0) return null;

  for (let tileIndex = 0; tileIndex < tray.length; tileIndex++) {
    const tile = tray[tileIndex]!;
    if (!needed.includes(tile.id)) continue;

    const tiles = tilesOf(row);
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i]!.id === tile.id) return { tileIndex, position: i };
    }
  }
  return null;
}

/**
 * SIPARIS FARKINDA oyuncu.
 *
 * Oncelik sirasi oyunun asil karar agacini temsil eder:
 *  1. Siparisi servis eden eslesme  -- dogrudan ilerleme
 *  2. Siparis tipinden cift kurma   -- bir sonraki hamleye hazirlik
 *  3. Herhangi bir eslesme          -- tahtayi bosalt, sabir kazan
 *  4. Herhangi bir cift             -- tikanmayi onle
 *  5. Herhangi bir hamle
 *
 * 2'nin 3'ten ONCE gelmesi bilincli: siparis disi eslesme tahtayi
 * rahatlatir ama sabri harcar. Bu tam olarak oyunun sundugu gerilim --
 * "kolay eslesmeyi mi alayim, siparisi mi bekleyeyim".
 */
export const orderAwarePolicy: Policy = (row, tray, _rng, needed = []) =>
  findServingMove(row, tray, needed) ??
  findServingPairMove(row, tray, needed) ??
  findMatchingMove(row, tray) ??
  findPairBuildingMove(row, tray) ??
  findAnyMove(row, tray);

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

// ---------------------------------------------------------------------------
// SIPARIS MODU SIMULASYONU (Sprint 3)
//
// Sprint 2'nin dersi: eglence olculmezse duz kaliyor. Bu harness "dusunen
// oyuncu ne kadar kazaniyor" sorusunu tahminle degil OLCUMLE yanitlar.
// Sabir hamle saydigi icin butun sistem deterministik -- gercek zamanli bir
// sayacla bu dosya yazilamazdi.
// ---------------------------------------------------------------------------

export interface OrderGameOptions {
  readonly seed: number;
  readonly poolSize: number;
  readonly slotCount?: number;
  readonly maxMoves: number;
  readonly policy: Policy;
  /** Kac musteri servis edilirse seviye kazanilir. */
  readonly customerCount: number;
  /** Kac musteri kaybedilirse seviye kaybedilir. */
  readonly maxLost?: number;
  /** Tepsi boyutu (denge suprumu icin). */
  readonly traySize?: number;
  /** Sabir formulunu ezer: birim sayisi -> hamle. Denge suprumu icin. */
  readonly patienceFor?: (units: number) => number;
  /** Ayni anda bekleyen musteri sayisi (masa sayisi). Varsayilan 1. */
  readonly tables?: number;
}

export interface OrderGameResult {
  readonly won: boolean;
  readonly moves: number;
  readonly score: number;
  /** Servis edilen musteri sayisi. */
  readonly served: number;
  /** Sabri tukenip giden musteri sayisi. */
  readonly lost: number;
  /** Puan getiren hamle orani, 0..1. */
  readonly scoringRatio: number;
  /** Siparise katki yapan hamle orani, 0..1. */
  readonly servingRatio: number;
  /** Neden bitti. */
  readonly reason: 'kazandi' | 'musteri-bitti' | 'satir-doldu' | 'hamle-bitti';
}

/** Bir hamle sonrasi musterinin akibeti. */
type CustomerOutcome = 'devam' | 'servis-edildi' | 'gitti';

function customerOutcome(customer: Customer): CustomerOutcome {
  if (isOrderComplete(customer.order)) return 'servis-edildi';
  if (isCustomerGone(customer)) return 'gitti';
  return 'devam';
}

/** Simulasyon boyunca biriken sayaclar. */
interface Tally {
  moves: number;
  score: number;
  served: number;
  lost: number;
  scoringMoves: number;
  servingMoves: number;
}

/** Musteri akibetini sayaclara isler. */
function recordOutcome(tally: Tally, outcome: CustomerOutcome): void {
  if (outcome === 'servis-edildi') tally.served++;
  else if (outcome === 'gitti') tally.lost++;
}

/** Seviye bitti mi, bittiyse neden? */
function endReason(
  tally: Tally,
  row: SlotRow,
  customerCount: number,
  maxLost: number,
): OrderGameResult['reason'] | null {
  if (tally.served >= customerCount) return 'kazandi';
  if (tally.lost >= maxLost) return 'musteri-bitti';
  if (isRowFull(row)) return 'satir-doldu';
  return null;
}

function toResult(tally: Tally, reason: OrderGameResult['reason']): OrderGameResult {
  const ratio = (count: number): number => (tally.moves === 0 ? 0 : count / tally.moves);
  return {
    won: reason === 'kazandi',
    moves: tally.moves,
    score: tally.score,
    served: tally.served,
    lost: tally.lost,
    scoringRatio: ratio(tally.scoringMoves),
    servingRatio: ratio(tally.servingMoves),
    reason,
  };
}

/** Siparis modunda bir seviyeyi bastan sona oynar. */
export function playOrderGame(options: OrderGameOptions): OrderGameResult {
  const maxLost = options.maxLost ?? ORDER.MAX_LOST;
  const size = options.traySize ?? TRAY.VISIBLE;
  const rng = createRng(options.seed);
  const pool = pickTilePool(options.poolSize, rng);

  const makeCustomer = (id: string): Customer => {
    const base = createCustomer(id, createOrder(pool, rng), options.poolSize);
    if (options.patienceFor === undefined) return base;
    const patience = options.patienceFor(totalRequired(base.order));
    return { ...base, patience, maxPatience: patience };
  };

  const tables = options.tables ?? ORDER.TABLES;
  let row = createEmptyRow(options.slotCount ?? SLOTS.INITIAL);
  let nextId = 0;
  let customers: Customer[] = Array.from({ length: tables }, () => makeCustomer(`m${nextId++}`));

  /** Butun masalarin acil talebi birlesir -- uretici hepsini kollar. */
  const allDemand = (): readonly TileId[] => [
    ...new Set(customers.flatMap((c) => urgentDemand(c))),
  ];
  /** Butun masalarin bekledigi tipler -- politika bunlardan secer. */
  const allNeeded = (): readonly TileId[] => [
    ...new Set(customers.flatMap((c) => neededTileIds(c.order))),
  ];

  let tray = generateTray(row, pool, rng, { size, demand: allDemand() });

  const tally: Tally = {
    moves: 0,
    score: 0,
    served: 0,
    lost: 0,
    scoringMoves: 0,
    servingMoves: 0,
  };

  while (tally.moves < options.maxMoves) {
    const move = options.policy(row, tray, rng, allNeeded());
    if (move === null) return toResult(tally, 'satir-doldu');

    const tile = tray[move.tileIndex]!;
    const result = resolve(insertTile(row, move.position, tile));

    tally.score += computeScore(result).total;
    if (result.removedCount > 0) tally.scoringMoves++;

    // Bir eslesme, o tipi bekleyen HER masaya sayilir. Alternatif (tek
    // masaya sayma) oyuncuya ek bir secim verirdi ama ayni anda iki masayi
    // memnun etme anini da yok ederdi -- olculup karsilastirilacak.
    let servedSomething = false;
    customers = customers.map((c) => {
      const nextOrder = applyResolve(c.order, result);
      if (nextOrder !== c.order) servedSomething = true;
      // Sabir HER hamlede azalir -- katki yapan masalarda bile.
      return tickPatience({ ...c, order: nextOrder });
    });
    if (servedSomething) tally.servingMoves++;

    row = result.row;
    tally.moves++;

    // Masalari degerlendir: servis edilen ve giden yerine yenisi oturur.
    customers = customers.map((c) => {
      const outcome = customerOutcome(c);
      recordOutcome(tally, outcome);
      return outcome === 'devam' ? c : makeCustomer(`m${nextId++}`);
    });

    const reason = endReason(tally, row, options.customerCount, maxLost);
    if (reason !== null) return toResult(tally, reason);

    tray = refillTray(
      row,
      tray.filter((_, index) => index !== move.tileIndex),
      pool,
      rng,
      { size, demand: allDemand() },
    );
  }

  return toResult(tally, 'hamle-bitti');
}
