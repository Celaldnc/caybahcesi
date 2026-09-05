import { ORDER, SLOTS, TRAY } from '@/constants/config';

import { findRescueTileIds, generateTray, refillTray } from '../../generator';
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
import {
  applySemaver,
  canUseSemaver,
  powersAfterServe,
  startingPowers,
  type Powers,
} from '../../powerups';
import { createRng, type Rng } from '../../rng';
import { computeScore } from '../../score';
import { pickTilePool } from '../../tiles';
import type { Customer, ResolveResult, SlotRow, Tile, TileId, Tray } from '../../types';

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
  /** Ayni anda bekleyen musteri sayisi (masa sayisi). Varsayilan ORDER.TABLES. */
  readonly tables?: number;
  /** Ozel guc politikasi. Verilmezse guc hic kullanilmaz. */
  readonly powerPolicy?: PowerPolicy;
}

/** Semaver karari icin gereken goruntu. */
export interface PowerContext {
  readonly row: SlotRow;
  readonly tray: Tray;
  readonly customers: readonly Customer[];
  readonly pool: readonly TileId[];
}

/** Semaver kullanim karari; null = kullanma. */
export type PowerPolicy = (
  ctx: PowerContext,
) => { readonly trayIndex: number; readonly targetId: TileId } | null;

/** Sirali masalar arasinda, tepside olmayan ve kosulu saglayan ilk tipi bulur. */
function findTarget(
  waiting: readonly Customer[],
  trayIds: readonly TileId[],
  accept: (id: TileId) => boolean,
): TileId | null {
  for (const customer of waiting) {
    for (const targetId of neededTileIds(customer.order)) {
      if (trayIds.includes(targetId)) continue;
      if (accept(targetId)) return targetId;
    }
  }
  return null;
}

/**
 * SABIRLI SEMAVER: en degerli ani bekler.
 *
 * "Hemen eslesme yaratacaksa harca, yoksa sakla" sezgisi. Yazarken bunun
 * akillica olacagini varsaydim -- OLCUM REDDETTI (bkz. `promptSemaver`).
 * Karsilastirma referansi olarak duruyor.
 */
export const patientSemaver: PowerPolicy = ({ row, tray, customers }) => {
  const waiting = customers
    .filter((c) => neededTileIds(c.order).length > 0)
    .sort((a, b) => a.patience - b.patience);

  const trayIds = tray.map((t) => t.id);
  const allNeeded = new Set(customers.flatMap((c) => neededTileIds(c.order)));
  // Baska masanin bekledigi tile'i feda etme.
  const sacrificial = trayIds.findIndex((id) => !allNeeded.has(id));
  const trayIndex = sacrificial === -1 ? 0 : sacrificial;

  const targetId =
    // 1. ONCELIK: hemen eslesme yaratan donusum -- en degerli kullanim.
    findTarget(waiting, trayIds, (id) => findRescueTileIds(row, [id]).includes(id)) ??
    // 2. ONCELIK: tahtada ornegi olan tipe cevir (cift kurar), yalnizca
    //    sabri azalmis masalar icin.
    findTarget(
      waiting.filter((c) => c.patience <= ORDER.DEMAND_PRESSURE),
      trayIds,
      (id) => new Set(tilesOf(row).map((t) => t.id)).has(id),
    );

  return targetId === null ? null : { trayIndex, targetId };
};

/**
 * ISTEKLI SEMAVER: sarji gorur gormez, beklenen bir tipe harcar.
 *
 * "Savurgan" diye yazilmisti; OLCUM TERSINI GOSTERDI -- her seviyede
 * sabirli politikayi YENIYOR (L30: %94.0 vs %90.3). Sebep anlasilir:
 * cevrilen tile eninde sonunda ise yariyor, ama BEKLEMEK musteriyi
 * kaybetme riskini tasiyor. Yani bu oyunda BIRIKTIRMEK KAYBETTIRIR.
 *
 * Ders: bir gucun "dogru kullanimi" tasarimcinin sezgisiyle degil olcumle
 * belirlenir. Adi da ona gore duzeltildi.
 */
export const promptSemaver: PowerPolicy = ({ tray, customers }) => {
  const needed = [...new Set(customers.flatMap((c) => neededTileIds(c.order)))];
  if (needed.length === 0 || tray.length === 0) return null;
  return { trayIndex: 0, targetId: needed[0]! };
};

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
  /** Kac kez semaver kullanildi. */
  readonly semaverUsed: number;
  /** Neden bitti. */
  readonly reason: 'kazandi' | 'musteri-bitti' | 'satir-doldu' | 'hamle-bitti';
}

/**
 * Guc politikasini danisir ve gecerliyse donusumu uygular.
 * Kullanilmadiysa `null` -- cagiran taraf sayaci artirmaz.
 */
function maybeUseSemaver(
  policy: PowerPolicy | undefined,
  powers: Powers,
  ctx: PowerContext,
): Tray | null {
  if (policy === undefined || !canUseSemaver(powers)) return null;

  const action = policy(ctx);
  if (action === null) return null;

  return applySemaver(ctx.tray, action.trayIndex, action.targetId, ctx.pool);
}

/**
 * Hamleyi butun masalara yansitir ve sabri bir azaltir.
 *
 * Bir eslesme, o tipi bekleyen HER masaya sayilir. Alternatif (tek masaya
 * sayma) oyuncuya ek bir secim verirdi ama "ayni anda iki masayi memnun
 * etme" anini da yok ederdi.
 */
function serveTables(
  customers: readonly Customer[],
  result: ResolveResult,
): { readonly customers: readonly Customer[]; readonly servedAny: boolean } {
  let servedAny = false;
  const next = customers.map((c) => {
    const nextOrder = applyResolve(c.order, result);
    if (nextOrder !== c.order) servedAny = true;
    // Sabir HER hamlede azalir -- katki yapan masalarda bile.
    return tickPatience({ ...c, order: nextOrder });
  });
  return { customers: next, servedAny };
}

/** Varsayilanlari tek yerde coz -- `playOrderGame`'in dallanmasi dusuk kalsin. */
interface ResolvedOptions {
  readonly maxLost: number;
  readonly size: number;
  readonly tables: number;
  readonly slotCount: number;
}

function resolveOptions(options: OrderGameOptions): ResolvedOptions {
  return {
    maxLost: options.maxLost ?? ORDER.MAX_LOST,
    size: options.traySize ?? TRAY.VISIBLE,
    tables: options.tables ?? ORDER.TABLES,
    slotCount: options.slotCount ?? SLOTS.INITIAL,
  };
}

/** Denge supurmesi icin sabir formulunu ezer; ezme yoksa musteriyi aynen doner. */
function withPatienceOverride(
  customer: Customer,
  patienceFor: ((units: number) => number) | undefined,
): Customer {
  if (patienceFor === undefined) return customer;
  const patience = patienceFor(totalRequired(customer.order));
  return { ...customer, patience, maxPatience: patience };
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
  semaverUsed: number;
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
    semaverUsed: tally.semaverUsed,
    reason,
  };
}

/** Siparis modunda bir seviyeyi bastan sona oynar. */
export function playOrderGame(options: OrderGameOptions): OrderGameResult {
  const { maxLost, size, tables, slotCount } = resolveOptions(options);
  const rng = createRng(options.seed);
  const pool = pickTilePool(options.poolSize, rng);

  const makeCustomer = (id: string): Customer =>
    withPatienceOverride(
      createCustomer(id, createOrder(pool, rng), options.poolSize),
      options.patienceFor,
    );

  let row = createEmptyRow(slotCount);
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
    semaverUsed: 0,
  };

  let powers: Powers = startingPowers();
  let spent = 0;

  while (tally.moves < options.maxMoves) {
    // GUC ONCE: donusum yerlestirmeden ONCE olur, matcher hicbir sey bilmez.
    const powered = maybeUseSemaver(options.powerPolicy, powers, {
      row,
      tray,
      customers,
      pool,
    });
    if (powered !== null) {
      tray = powered;
      spent++;
      powers = powersAfterServe(spent, tally.served);
      tally.semaverUsed++;
    }

    const move = options.policy(row, tray, rng, allNeeded());
    if (move === null) return toResult(tally, 'satir-doldu');

    const tile = tray[move.tileIndex]!;
    const result = resolve(insertTile(row, move.position, tile));

    tally.score += computeScore(result).total;
    if (result.removedCount > 0) tally.scoringMoves++;

    const turn = serveTables(customers, result);
    customers = [...turn.customers];
    if (turn.servedAny) tally.servingMoves++;

    row = result.row;
    tally.moves++;

    // Masalari degerlendir: servis edilen ve giden yerine yenisi oturur.
    customers = customers.map((c) => {
      const outcome = customerOutcome(c);
      recordOutcome(tally, outcome);
      return outcome === 'devam' ? c : makeCustomer(`m${nextId++}`);
    });

    powers = powersAfterServe(spent, tally.served);

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
