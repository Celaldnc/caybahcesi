import { TILE_UI } from '@/constants/config';

/**
 * Satir yerlesimi hesaplari.
 *
 * Saf fonksiyonlar: ekran genisligi ve slot sayisindan tile boyutu cikar.
 * Bilesen icinde inline hesaplanabilirdi ama o zaman "9 slotlu seviyede
 * tile'lar tasiyor mu" sorusu ancak cihazda gorulerek yanitlanirdi.
 * Ayri dosya = test edilebilir yerlesim.
 */

/**
 * Bir satirin CIZILEN toplam genisligi.
 *
 * Ekleme gostergeleri MUTLAK konumlandirildigi icin genislik TUKETMEZ;
 * satirin eni tile'lar + aralarindaki bosluklar + `track`'in iki yanindaki
 * `paddingHorizontal: GAP`'tir.
 *
 * SON TERIM SPRINT 2 KALITE KAPISINDA EKLENDI. Onceki hali padding'i
 * saymiyordu, yani `rowOverflows` bilesenin gercek genisligini degil daha
 * darini olcuyordu: test edilen 21 ekran/slot kombinasyonunun 19'unda
 * "sigiyor" diyor, satir gercekte 1-8pt tasiyordu. Olcum dogruydu, OLCULEN
 * SEY yanlisti -- Sprint 1'deki "yanlis olan palet degil metrikti" dersinin
 * ayni ekseni.
 */
export function rowWidth(tileSize: number, slotCount: number): number {
  return slotCount * tileSize + Math.max(0, slotCount - 1) * TILE_UI.GAP + TILE_UI.GAP * 2;
}

/**
 * Verilen genislige sigacak tile boyutu.
 *
 * MIN_SIZE ile MAX_SIZE arasinda kirpilir. MIN_SIZE'in altina dusmesi
 * gerekiyorsa yine MIN_SIZE doner -- o durumda satir tasar ve cagiran taraf
 * kaydirmali bir kapsayici kullanmalidir (bkz. `rowOverflows`).
 */
export function computeTileSize(availableWidth: number, slotCount: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) {
    return TILE_UI.MIN_SIZE;
  }
  if (!Number.isInteger(slotCount) || slotCount <= 0) {
    throw new RangeError(`Slot sayisi pozitif tam sayi olmali, alinan: ${slotCount}`);
  }

  // `rowWidth` ile ayni muhasebe: bosluklar + iki yandaki padding.
  const chrome = Math.max(0, slotCount - 1) * TILE_UI.GAP + TILE_UI.GAP * 2;
  const perTile = (availableWidth - chrome) / slotCount;

  return Math.max(TILE_UI.MIN_SIZE, Math.min(TILE_UI.MAX_SIZE, Math.floor(perTile)));
}

/** Hesaplanan boyutla satir verilen genislige sigmiyor mu? */
export function rowOverflows(availableWidth: number, slotCount: number): boolean {
  return rowWidth(computeTileSize(availableWidth, slotCount), slotCount) > availableWidth;
}
