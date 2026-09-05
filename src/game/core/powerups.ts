import { POWER } from '@/constants/config';

import { createTile } from './tiles';
import type { Tray, TileId } from './types';

/**
 * Ozel gucler -- oyunun AJANS katmani.
 *
 * Sprint 3a'nin olcumu netti: siparis sistemi baski ve tempo getirdi ama
 * beceri ifadesi getirmedi. Siparis-farkinda politika ile siparisi
 * umursamayan politika ayni kazaniyordu, cunku oyuncu hangi ailenin
 * eslesecegine KARAR VEREMIYORDU -- arz karar veriyordu.
 *
 * Semaver bu zinciri kirar: kit bir sarj karsiliginda oyuncu tepsideki bir
 * tile'i istedigi aileye cevirir. Karar iki eksende gercek:
 *  - HANGI aile (hangi masayi kurtarayim)
 *  - NE ZAMAN (simdi mi, sabri daha az olan icin saklayayim mi)
 *
 * Saf: platform API'si yok, rastgelelik yok. Butun davranis simule edilebilir.
 */

export interface Powers {
  /** Kalan semaver sarji. */
  readonly semaver: number;
}

export const NO_POWERS: Powers = { semaver: 0 };

/** Seviye basi guc durumu. */
export function startingPowers(): Powers {
  return { semaver: POWER.SEMAVER_START };
}

/**
 * Servis edilen musteri sayisina gore kazanilan toplam sarj.
 *
 * Formul KUMULATIF olarak yazildi (servis sayisindan turetilir), artimli
 * degil: artimli sayac tutmak "iki kez kazandirma" hatasina acik olurdu ve
 * yeniden yukleme/geri alma durumlarinda sessizce kayardi.
 */
export function earnedSemaver(servedCount: number): number {
  if (!Number.isInteger(servedCount) || servedCount < 0) {
    throw new RangeError(`Servis sayisi negatif olmayan tam sayi olmali, alinan: ${servedCount}`);
  }
  return Math.floor(servedCount / POWER.SEMAVER_PER_CUSTOMERS);
}

/** Servis sonrasi guc durumu. Tavanla sinirlidir. */
export function powersAfterServe(spent: number, servedCount: number): Powers {
  const total = POWER.SEMAVER_START + earnedSemaver(servedCount);
  return { semaver: Math.max(0, Math.min(POWER.SEMAVER_MAX, total - spent)) };
}

/** Semaver kullanilabilir mi? */
export function canUseSemaver(powers: Powers): boolean {
  return powers.semaver > 0;
}

/**
 * Tepsideki bir tile'i baska bir tipe cevirir.
 *
 * Yeni bir `Tile` URETIR (yeni `key` ile) -- mevcut tile'in id'sini
 * degistirmek yerine. Sebep Reanimated: kararli `key` layout animasyonunun
 * tasiyicisi; ayni anahtarla tip degistirmek "ayni nesne bambaska bir sey
 * oldu" demek olurdu ve gecis animasyonu yanlis View'i takip ederdi.
 *
 * Havuz disi hedef REDDEDILIR: aksi halde oyuncu seviyede hic bulunmayan
 * bir tile uretip eslesme sansini tumden yok edebilirdi.
 */
export function applySemaver(
  tray: Tray,
  trayIndex: number,
  targetId: TileId,
  pool: readonly TileId[],
): Tray {
  if (!Number.isInteger(trayIndex) || trayIndex < 0 || trayIndex >= tray.length) {
    throw new RangeError(
      `Tepsi indisi 0..${tray.length - 1} araliginda olmali, alinan: ${trayIndex}`,
    );
  }
  if (!pool.includes(targetId)) {
    throw new RangeError(`Hedef tip havuzda yok: ${targetId}`);
  }

  return tray.map((tile, index) => (index === trayIndex ? createTile(targetId) : tile));
}
