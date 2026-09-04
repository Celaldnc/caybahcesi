/**
 * Oyunun TUM ayarlanabilir sayilari burada.
 *
 * DoD kurali: kodda cıplak sayi (magic number) birakma. Bir sayiyi degistirmek
 * istedigimde tek dosyaya bakmam yeterli olmali; denge ayari (balancing) boyle yapilir.
 */

/** Slot satiri: baslangic ve tavan degerleri. Level ilerledikce slot sayisi artar. */
export const SLOTS = {
  /** Level 1'de ekranda kac slot var. */
  INITIAL: 7,
  /** Level ilerlemesiyle ulasilabilecek en fazla slot. */
  MAX: 9,
} as const;

/** Tray (alt secim seridi): oyuncuya ayni anda kac tile gosterilir. */
export const TRAY = {
  /** Ekranin altinda es zamanli gorunen tile sayisi. */
  VISIBLE: 3,
} as const;

/** Eslesme kurali: kac ayni tile yanyana gelince patlar. */
export const MATCH = {
  /** Triple-match turu: 3'lu. */
  LENGTH: 3,
} as const;

/** Skor formulu: puan = BASE * combo carpani. */
export const SCORE = {
  /** Tek bir 3'lu eslesmenin taban puani. */
  BASE_PER_MATCH: 10,
  /** Zincirleme eslesmede her adimda carpanin artisi. */
  COMBO_STEP: 1,
  /** Combo carpaninin ust siniri (sonsuz buyumeyi engeller). */
  COMBO_MAX: 5,
  /** Level bitiminde satir tamamen bossa verilen bonus. */
  PERFECT_SORT_BONUS: 50,
} as const;

/** Level ilerlemesi: zorluk egrisinin sinirlari. */
export const LEVEL = {
  /** Toplam level sayisi (Sprint 3 hedefi). */
  TOTAL: 30,
  /** Level 1'de kac farkli tile tipi havuzda. */
  MIN_TILE_TYPES: 5,
  /** Son levelde kac farkli tile tipi havuzda. */
  MAX_TILE_TYPES: 9,
} as const;

/** Animasyon sureleri (ms). UI thread'de Reanimated ile calisirlar. */
export const ANIM = {
  /** Tile'in tray'den slot'a ucus suresi. */
  PLACE_MS: 220,
  /** Eslesen uclunun kaybolma suresi. */
  MATCH_BURST_MS: 320,
  /** Slot'lar bosluk kapatirken kayma suresi. */
  COLLAPSE_MS: 180,
  /** Combo banner'inin ekranda kalma suresi. */
  COMBO_BANNER_MS: 900,
} as const;

/** Dokunma hedefi olculeri (pt/dp). iOS HIG >= 44, Material >= 48. */
export const TOUCH = {
  MIN_TARGET: 48,
} as const;

/** Kalici depolama anahtarlari. Tek yerde durmali ki yazim hatasi sessizce veri kaybettirmesin. */
export const STORAGE_KEYS = {
  HIGH_SCORE: 'cb.highScore',
  CURRENT_LEVEL: 'cb.currentLevel',
  UNLOCKED_LEVELS: 'cb.unlockedLevels',
  SOUND_ENABLED: 'cb.soundEnabled',
  HAPTICS_ENABLED: 'cb.hapticsEnabled',
} as const;
