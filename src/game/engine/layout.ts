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
 * Bir satirin toplam genisligi.
 *
 * Ekleme gostergeleri MUTLAK konumlandirildigi icin genislik TUKETMEZ;
 * satirin eni yalnizca tile'lar ve aralarindaki bosluklardir.
 * (Ilk tasarimda gostergeler yer kapliyordu ve 9 slotlu satir hicbir
 * telefona sigmiyordu -- layout testi yakaladi.)
 */
export function rowWidth(tileSize: number, slotCount: number): number {
  return slotCount * tileSize + Math.max(0, slotCount - 1) * TILE_UI.GAP;
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

  const gaps = Math.max(0, slotCount - 1) * TILE_UI.GAP;
  const perTile = (availableWidth - gaps) / slotCount;

  return Math.max(TILE_UI.MIN_SIZE, Math.min(TILE_UI.MAX_SIZE, Math.floor(perTile)));
}

/** Hesaplanan boyutla satir verilen genislige sigmiyor mu? */
export function rowOverflows(availableWidth: number, slotCount: number): boolean {
  return rowWidth(computeTileSize(availableWidth, slotCount), slotCount) > availableWidth;
}
