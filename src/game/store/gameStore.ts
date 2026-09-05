import { create } from 'zustand';

import { ORDER } from '@/constants/config';

import { generateTray, refillTray } from '@/game/core/generator';
import {
  applyResolve,
  createCustomer,
  createOrder,
  isCustomerGone,
  isOrderComplete,
  tickPatience,
  urgentDemand,
} from '@/game/core/orders';
import {
  applySemaver,
  canUseSemaver,
  powersAfterServe,
  startingPowers,
  type Powers,
} from '@/game/core/powerups';
import {
  createEmptyRow,
  insertPositions,
  insertTile,
  isRowFull,
  resolve,
} from '@/game/core/matcher';
import { getLevelConfig, isLevelComplete, nextLevelNumber } from '@/game/core/level';
import { createRng, dailySeed, type Rng } from '@/game/core/rng';
import { computeScore } from '@/game/core/score';
import { pickTilePool } from '@/game/core/tiles';
import type {
  Customer,
  LevelConfig,
  ResolveResult,
  SlotRow,
  TileId,
  Tray,
} from '@/game/core/types';

/**
 * Oyun durumu.
 *
 * Katman kurali: bu dosya `game/core`'u TUKETIR, core bunu goremez. Tum
 * kurallar core'da saf fonksiyonlar olarak duruyor; store yalnizca onlari
 * siraya dizen bir durum makinesi.
 *
 * Rng bilerek state'in DISINDA (closure'da): durum degistiginde React'i
 * yeniden render etmesi gereken bir sey degil, ustelik mutable oldugu icin
 * state'e konsa "ayni referans, farkli deger" tuzagi olusurdu.
 */

export type GameStatus = 'hazir' | 'oynaniyor' | 'seviye-tamam' | 'oyun-bitti';

/**
 * Neden kaybedildi.
 *
 * Sprint 3'te IKI kaybetme yolu var: satirin dolmasi ve cok musteri
 * kaybetmek. "Oyun bitti" demek yetmiyor -- oyuncu NEDEN bittigini
 * bilmeden bir sonraki denemede ayni hatayi yapar.
 */
export type LossReason = 'satir-doldu' | 'musteri-bitti' | null;

export interface GameState {
  status: GameStatus;
  level: number;
  config: LevelConfig;
  pool: readonly TileId[];
  row: SlotRow;
  tray: Tray;
  score: number;
  /** Tray'de secili tile'in indisi; null = secim yok. */
  selectedTrayIndex: number | null;
  /** Son hamlenin cozumlenmesi -- animasyon katmani bunu okur. */
  lastResult: ResolveResult | null;
  /** Son hamlede ulasilan combo carpani (banner icin). 0 = eslesme yok. */
  lastCombo: number;
  /**
   * Son hamlenin kazandirdigi puan.
   *
   * Neden state'te: ekran "eslesme oldu mu" sorusunu daha once render
   * closure'indaki `state.score` ile `getState().score`'u KARSILASTIRARAK
   * cevapliyordu. Iki farkli okuma kaynagi, hizli cift dokunusta bayat
   * deger -> hamle yapilmadigi halde "basari" haptigi. Turetmeyi store
   * yapiyor; ekran yalnizca okuyor.
   */
  lastGain: number;
  /** Bu seviyede ulasilan en yuksek combo. */
  bestCombo: number;
  /** Yapilan hamle sayisi. */
  moves: number;

  // --- SIPARIS KATMANI (Sprint 3) ---
  /** Masalarda bekleyen musteriler. */
  customers: readonly Customer[];
  /** Servis edilen musteri sayisi. Seviye hedefi budur. */
  served: number;
  /** Sabri tukenip giden musteri sayisi. */
  lost: number;
  /** Ozel guc sarjlari. */
  powers: Powers;
  /** Bu seviyede harcanan semaver sarji (kumulatif hesap icin). */
  semaverSpent: number;
  /** Son hamlede siparise katki oldu mu -- kutlama/duyuru icin. */
  lastServedTable: boolean;
  /** Son hamlede kac masa TAMAMLANDI. */
  lastCompleted: number;
  /** Son hamlede kac musteri GITTI. */
  lastLeft: number;
  /** Kaybedildiyse sebebi; kaybedilmediyse null. */
  lossReason: LossReason;
}

export interface GameActions {
  /** Seviyeyi baslatir. `seed` verilmezse rastgele; Daily mod icin dailySeed kullan. */
  startLevel: (level: number, seed?: number) => void;
  /** Gunun bulmacasini baslatir (herkes icin ayni). */
  startDaily: (date?: Date) => void;
  /** Tray'den tile secer; ayni indise tekrar basmak secimi kaldirir. */
  selectTray: (index: number | null) => void;
  /** Secili tile'i verilen konuma ekler. Secim yoksa hicbir sey yapmaz. */
  insertAt: (position: number) => void;
  /** Seviye tamamlandiysa sonrakine gecer. */
  advanceLevel: () => void;
  /**
   * Combo banner'ini gizler.
   *
   * `ANIM.COMBO_BANNER_MS` "ekranda kalma suresi" diye belgelenmisti ama
   * hicbir zamanlayici yoktu: banner bir sonraki hamleye kadar duruyordu --
   * ustelik `pointerEvents` de olmadigi icin o hamlenin dokunusunu
   * bloklayarak. Ekran bu eylemi sure sonunda cagirir.
   */
  clearCombo: () => void;
  /** Mevcut seviyeyi bastan baslatir. */
  retry: () => void;
  /**
   * Tepsideki tile'i istenen tipe cevirir (semaver).
   *
   * Sarj yoksa, oyun bitmisse ya da hedef havuzda degilse sessizce
   * hicbir sey yapmaz -- cagiran taraf (ekran) zaten butonu devre disi
   * birakir; bu ikinci savunma hatti.
   */
  spendSemaver: (trayIndex: number, targetId: TileId) => void;
}

export type GameStore = GameState & GameActions;

/** Bir hamlenin masalara yansimasi. `null` = masa bosaldi, yenisi oturmali. */
interface TableTurn {
  readonly customers: readonly (Customer | null)[];
  /** Bu hamlede tamamlanan siparis sayisi. */
  readonly completed: number;
  /** Bu hamlede sabri tukenen musteri sayisi. */
  readonly left: number;
  /** Herhangi bir masaya katki oldu mu (kutlama/duyuru icin). */
  readonly servedAny: boolean;
}

/**
 * Hamleyi butun masalara yansitir ve sabri bir azaltir.
 *
 * Bir eslesme, o tipi bekleyen HER masaya sayilir. Alternatifi (tek masaya
 * sayip oyuncuya sordurmak) fazladan bir karar ekler ama "ayni anda iki
 * masayi memnun etme" anini yok ederdi -- oyunun en iyi hissettiren ani.
 */
function serveTables(customers: readonly Customer[], result: ResolveResult): TableTurn {
  let completed = 0;
  let left = 0;
  let servedAny = false;

  const next = customers.map((customer) => {
    const order = applyResolve(customer.order, result);
    if (order !== customer.order) servedAny = true;

    // Sabir HER hamlede azalir -- katki yapan masalarda bile. Aksi halde
    // oyuncu bedava zaman kazanir ve baski tumden kaybolur.
    const ticked = tickPatience({ ...customer, order });

    if (isOrderComplete(ticked.order)) {
      completed++;
      return null;
    }
    if (isCustomerGone(ticked)) {
      left++;
      return null;
    }
    return ticked;
  });

  return { customers: next, completed, left, servedAny };
}

/**
 * Kaybetme sebebi; henuz kaybedilmediyse null.
 *
 * MUSTERI KAYBI ONCE KONTROL EDILIR: ayni hamlede hem esik asilip hem
 * satir dolduysa oyuncuya daha bilgilendirici olani soylenir -- satir
 * dolmasi genellikle musteri kaybinin SONUCUDUR, sebebi degil.
 */
function findLossReason(lost: number, row: SlotRow): LossReason {
  if (lost >= ORDER.MAX_LOST) return 'musteri-bitti';
  if (isRowFull(row)) return 'satir-doldu';
  return null;
}

/** Butun masalarin acil talebi -- uretici hepsini birden kollar. */
function allUrgentDemand(customers: readonly Customer[]): readonly TileId[] {
  return [...new Set(customers.flatMap((customer) => urgentDemand(customer)))];
}

/** Seviyeye ozgu rastgelelik. State'te degil, closure'da tutulur (bkz. dosya basi). */
interface Session {
  rng: Rng;
  seed: number;
}

const FIRST_LEVEL = 1;

function emptyState(level: number): GameState {
  const config = getLevelConfig(level);
  return {
    status: 'hazir',
    level,
    config,
    pool: [],
    row: createEmptyRow(config.slotCount),
    tray: [],
    score: 0,
    selectedTrayIndex: null,
    lastResult: null,
    lastCombo: 0,
    lastGain: 0,
    bestCombo: 0,
    moves: 0,
    customers: [],
    served: 0,
    lost: 0,
    powers: startingPowers(),
    semaverSpent: 0,
    lastServedTable: false,
    lastCompleted: 0,
    lastLeft: 0,
    lossReason: null,
  };
}

/** Masalari doldurur. Musteri sayisi `ORDER.TABLES`. */
function seatCustomers(
  pool: readonly TileId[],
  rng: Rng,
  tileTypeCount: number,
  startId: number,
): readonly Customer[] {
  return Array.from({ length: ORDER.TABLES }, (_, i) =>
    createCustomer(`m${startId + i}`, createOrder(pool, rng), tileTypeCount),
  );
}

/**
 * Store fabrikasi.
 *
 * Fabrika olarak yaziliyor cunku testler izole ornekler ister; tek bir
 * singleton kullanilsaydi testler birbirinin durumunu kirletirdi.
 */
export function createGameStore() {
  let session: Session | null = null;

  return create<GameStore>()((set, get) => ({
    ...emptyState(FIRST_LEVEL),

    startLevel: (level, seed) => {
      const config = getLevelConfig(level);
      const actualSeed = seed ?? Math.floor(Math.random() * 0xffffffff);
      const rng = createRng(actualSeed);

      session = { rng, seed: actualSeed };

      const pool = pickTilePool(config.tileTypeCount, rng);
      const row = createEmptyRow(config.slotCount);

      const customers = seatCustomers(pool, rng, config.tileTypeCount, 0);

      set({
        ...emptyState(level),
        status: 'oynaniyor',
        config,
        pool,
        row,
        customers,
        tray: generateTray(row, pool, rng, { demand: allUrgentDemand(customers) }),
      });
    },

    startDaily: (date = new Date()) => {
      get().startLevel(FIRST_LEVEL, dailySeed(date));
    },

    selectTray: (index) => {
      const { status, tray, selectedTrayIndex } = get();
      if (status !== 'oynaniyor') return;
      if (index !== null && (index < 0 || index >= tray.length)) return;

      // Ayni tile'a tekrar basmak secimi kaldirir -- dokunmatikte yanlislikla
      // secilen tile'i iptal etmenin en dogal yolu.
      set({ selectedTrayIndex: index === selectedTrayIndex ? null : index });
    },

    insertAt: (position) => {
      const state = get();
      if (state.status !== 'oynaniyor' || session === null) return;

      const { selectedTrayIndex, tray, row, pool, config } = state;
      if (selectedTrayIndex === null) return;

      const tile = tray[selectedTrayIndex];
      if (tile === undefined) return;
      if (!insertPositions(row).includes(position)) return;

      const result = resolve(insertTile(row, position, tile));
      const breakdown = computeScore(result);
      const score = state.score + breakdown.total;

      // --- SIPARIS: hamleyi butun masalara yansit, sabri bir azalt ---
      const table = serveTables(state.customers, result);
      const served = state.served + table.completed;
      const lost = state.lost + table.left;

      // Bosalan masalara yeni musteri oturur.
      const customers = table.customers.map((customer, index) =>
        customer === null
          ? createCustomer(
              `m${ORDER.TABLES + served + lost + index}`,
              createOrder(pool, session!.rng),
              config.tileTypeCount,
            )
          : customer,
      );

      const powers = powersAfterServe(state.semaverSpent, served);

      const nextTray = refillTray(
        result.row,
        tray.filter((_, index) => index !== selectedTrayIndex),
        pool,
        session.rng,
        { demand: allUrgentDemand(customers) },
      );

      // Sira onemli: once seviye tamam mi, sonra kaybettik mi.
      // Hedefe ulastiran hamle tahtayi doldurmus olsa bile oyuncu kazanir.
      // Sira onemli: once "kazandik mi", sonra "kaybettik mi".
      const won = isLevelComplete(served, config);
      const lossReason = won ? null : findLossReason(lost, result.row);
      const status: GameStatus = won
        ? 'seviye-tamam'
        : lossReason === null
          ? 'oynaniyor'
          : 'oyun-bitti';

      set({
        status,
        row: result.row,
        tray: nextTray,
        score,
        selectedTrayIndex: null,
        lastResult: result,
        lastCombo: breakdown.maxCombo,
        lastGain: breakdown.total,
        bestCombo: Math.max(state.bestCombo, breakdown.maxCombo),
        moves: state.moves + 1,
        customers,
        served,
        lost,
        powers,
        lastServedTable: table.servedAny,
        lastCompleted: table.completed,
        lastLeft: table.left,
        lossReason,
      });
    },

    spendSemaver: (trayIndex, targetId) => {
      const state = get();
      if (state.status !== 'oynaniyor' || !canUseSemaver(state.powers)) return;
      if (trayIndex < 0 || trayIndex >= state.tray.length) return;
      if (!state.pool.includes(targetId)) return;

      const semaverSpent = state.semaverSpent + 1;

      set({
        tray: applySemaver(state.tray, trayIndex, targetId, state.pool),
        semaverSpent,
        powers: powersAfterServe(semaverSpent, state.served),
        // Donusen tile SECILI KALMAZ: oyuncu yeni tile'i bilerek secsin,
        // yanlislikla eski secimle yerlestirmesin.
        selectedTrayIndex: null,
      });
    },

    advanceLevel: () => {
      const { status, level } = get();
      if (status !== 'seviye-tamam') return;

      const next = nextLevelNumber(level);
      if (next === null) return; // son seviye; oyun tamamlandi

      get().startLevel(next);
    },

    clearCombo: () => {
      if (get().lastCombo === 0) return;
      set({ lastCombo: 0 });
    },

    retry: () => {
      get().startLevel(get().level, session?.seed);
    },
  }));
}

/** Uygulamanin tek store'u. */
export const useGameStore = createGameStore();
