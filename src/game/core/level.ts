import { LEVEL, ORDER, SLOTS } from '@/constants/config';

import type { LevelConfig } from './types';

/**
 * Seviye yapilandirmasi ve ilerleme kontrolu.
 *
 * Neden formul, elle yazilmis 30 kayit degil:
 *  - Elle yazilan bir tablo sessizce tutarsizlasir (slot sayisi geriler,
 *    hedef skor duser, tip sayisi slot sayisini asar). Formul + invariant
 *    testleri bu sinifi tumden ortadan kaldirir.
 *  - Denge ayari tek yerden yapilir: constants/config.ts.
 *  - Elle ince ayar gerekirse `data/levels.ts` bu ciktiyi ezebilir (Sprint 3).
 *
 * Egrinin dayandigi OLCUM (yerlestirmesini dusunen politika, 80 tohum;
 * uzun vadeli hiz -- acilis hamleleri puan getirmez):
 *   7 slot / 5 tip -> ~11 puan/hamle
 *   7 slot / 7 tip -> ~9
 *   8 slot / 7 tip -> ~7
 *   9 slot / 9 tip -> ~4
 * Yani asil zorluk hedefin yukselmesinden degil, puan HIZININ dusmesinden
 * geliyor; hedef skor bu yuzden yavas artar.
 */

/** Verilen level numarasinin gecerliligini dogrular. */
function assertValidLevelNumber(levelNumber: number): void {
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > LEVEL.TOTAL) {
    throw new RangeError(
      `Level numarasi 1..${LEVEL.TOTAL} araliginda tam sayi olmali, alinan: ${levelNumber}`,
    );
  }
}

/** Level numarasindan slot sayisi: her LEVELS_PER_SLOT_INCREASE levelde bir artar. */
function slotCountFor(levelNumber: number): number {
  const increases = Math.floor((levelNumber - 1) / LEVEL.LEVELS_PER_SLOT_INCREASE);
  return Math.min(SLOTS.INITIAL + increases, SLOTS.MAX);
}

/**
 * Level numarasindan tile tipi sayisi: MIN'den MAX'a dogrusal artis.
 *
 * Burada bir zamanlar `Math.min(count, slotCountFor(...))` clamp'i vardi.
 * Kaldirildi, iki sebeple:
 *  1. OLU: 30 seviyenin hicbirinde devreye girmiyordu (ham deger slot
 *     sayisini hicbir zaman asmiyor; L20'de 8=8, L27-30'da 9=9).
 *  2. GEREKCESI YANLISTI: "tip sayisi slot sayisini asarsa uclu kurmak
 *     imkansizlasir" diyordu. Pigeonhole matematigi bunu desteklemiyor --
 *     T tip / S slot icin bir CIFT garantisi T < S, bir UCLU garantisi
 *     S > 2T gerektirir. L30'da T = S = 9, yani 9 slotun tamami farkli
 *     tiple dolabilir; clamp bunu zaten engellemiyordu.
 * Gercek emniyet agi generator'un SAFETY (ilerleme) katmani; sinir ise
 * level.test.ts'teki `tileTypeCount <= slotCount` invariant'i ile korunuyor.
 */
function tileTypeCountFor(levelNumber: number): number {
  const span = LEVEL.MAX_TILE_TYPES - LEVEL.MIN_TILE_TYPES;
  const progress = (levelNumber - 1) / (LEVEL.TOTAL - 1);
  return LEVEL.MIN_TILE_TYPES + Math.round(span * progress);
}

/**
 * Level numarasindan servis edilecek musteri sayisi: BASE'den MAX'a dogrusal.
 *
 * ZORLUK ARTIK BURADAN GELIYOR, hedef skordan degil. Sprint 2'nin olcumu
 * netti: eslesme orani 1/3'e civili oldugu icin hedef skoru yukseltmek
 * seviyeyi zorlastirmiyor, yalnizca UZATIYORDU. Musteri sayisi ise sabir
 * kisitiyla birlikte calisir -- her musteri ayri bir zaman baskisi getirir.
 */
function customerCountFor(levelNumber: number): number {
  const span = ORDER.MAX_CUSTOMERS - ORDER.BASE_CUSTOMERS;
  const progress = (levelNumber - 1) / (LEVEL.TOTAL - 1);
  return ORDER.BASE_CUSTOMERS + Math.round(span * progress);
}

/** Tek bir seviyenin yapilandirmasi. */
export function getLevelConfig(levelNumber: number): LevelConfig {
  assertValidLevelNumber(levelNumber);
  return {
    number: levelNumber,
    slotCount: slotCountFor(levelNumber),
    tileTypeCount: tileTypeCountFor(levelNumber),
    customerCount: customerCountFor(levelNumber),
  };
}

/** Tum seviyeler, 1'den LEVEL.TOTAL'a. */
export const ALL_LEVELS: readonly LevelConfig[] = Array.from({ length: LEVEL.TOTAL }, (_, index) =>
  getLevelConfig(index + 1),
);

/**
 * Seviye tamamlandi mi?
 *
 * OLCUT SERVIS EDILEN MUSTERI, SKOR DEGIL. Skor hedefi Sprint 3'te
 * kaldirildi: eslesme orani 1/3'e civili oldugu icin hedef skoru
 * yukseltmek seviyeyi zorlastirmiyor, yalnizca UZATIYORDU (olculdu).
 * Zorluk artik sabir sikligindan geliyor.
 */
export function isLevelComplete(servedCustomers: number, config: LevelConfig): boolean {
  if (!Number.isInteger(servedCustomers) || servedCustomers < 0) {
    throw new RangeError(
      `Servis sayisi negatif olmayan tam sayi olmali, alinan: ${servedCustomers}`,
    );
  }
  return servedCustomers >= config.customerCount;
}

/**
 * Hedefe ilerleme orani, 0..1 arasi.
 * Ilerleme cubugu tasmasin diye 1'de sinirlanir.
 */
export function progressRatio(servedCustomers: number, config: LevelConfig): number {
  if (!Number.isInteger(servedCustomers) || servedCustomers < 0) {
    throw new RangeError(
      `Servis sayisi negatif olmayan tam sayi olmali, alinan: ${servedCustomers}`,
    );
  }
  return Math.min(servedCustomers / config.customerCount, 1);
}

/** Sonraki level numarasi; son levelden sonra null (oyun tamamlandi). */
export function nextLevelNumber(levelNumber: number): number | null {
  assertValidLevelNumber(levelNumber);
  return levelNumber === LEVEL.TOTAL ? null : levelNumber + 1;
}
