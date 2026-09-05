import { create } from 'zustand';

import { generateTray, refillTray } from '@/game/core/generator';
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
import type { LevelConfig, ResolveResult, SlotRow, TileId, Tray } from '@/game/core/types';

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
  /** Bu seviyede ulasilan en yuksek combo. */
  bestCombo: number;
  /** Yapilan hamle sayisi. */
  moves: number;
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
  /** Mevcut seviyeyi bastan baslatir. */
  retry: () => void;
}

export type GameStore = GameState & GameActions;

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
    bestCombo: 0,
    moves: 0,
  };
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

      set({
        ...emptyState(level),
        status: 'oynaniyor',
        config,
        pool,
        row,
        tray: generateTray(row, pool, rng),
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

      const nextTray = refillTray(
        result.row,
        tray.filter((_, index) => index !== selectedTrayIndex),
        pool,
        session.rng,
      );

      // Sira onemli: once seviye tamam mi, sonra tahta doldu mu.
      // Hedefe ulastiran hamle tahtayi doldurmus olsa bile oyuncu kazanir.
      const status: GameStatus = isLevelComplete(score, config)
        ? 'seviye-tamam'
        : isRowFull(result.row)
          ? 'oyun-bitti'
          : 'oynaniyor';

      set({
        status,
        row: result.row,
        tray: nextTray,
        score,
        selectedTrayIndex: null,
        lastResult: result,
        lastCombo: breakdown.maxCombo,
        bestCombo: Math.max(state.bestCombo, breakdown.maxCombo),
        moves: state.moves + 1,
      });
    },

    advanceLevel: () => {
      const { status, level } = get();
      if (status !== 'seviye-tamam') return;

      const next = nextLevelNumber(level);
      if (next === null) return; // son seviye; oyun tamamlandi

      get().startLevel(next);
    },

    retry: () => {
      get().startLevel(get().level, session?.seed);
    },
  }));
}

/** Uygulamanin tek store'u. */
export const useGameStore = createGameStore();
