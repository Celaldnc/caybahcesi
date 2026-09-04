import { createTile } from '../../tiles';
import type { SlotRow, TileId } from '../../types';

/**
 * Test icin satir kurma sozdizimi.
 *
 * `policies.ts`'ten AYRI bir dosya: orasi oyuncu davranisi simulasyonu
 * (rng + oyun dongusu), burasi saf satir kurma. Farkli degisme sebepleri.
 *
 * Bu dosya bir TEST DEGILDIR (adi *.test.ts degil) -- Jest kosmaz,
 * coverage'a girmez.
 */

/**
 * Testlerde okunabilirlik icin kisa tile adlari.
 *
 * `as const satisfies` iki is birden yapar: degerler TileId'ye karsi
 * dogrulanir VE erisim `TileId | undefined` degil dogrudan `TileId` doner,
 * yani cagiran taraf non-null assertion (`!`) yazmak zorunda kalmaz.
 */
export const SHORT = {
  A: 'cay-ince-belli',
  B: 'kahve-fincan',
  C: 'nazar-mavi',
  D: 'lokum-sade',
  E: 'firin-simit',
} as const satisfies Record<string, TileId>;

export type ShortCode = keyof typeof SHORT;

/**
 * Kisa gosterimden satir kurar. '.' bos slot demektir.
 *
 * Bilinmeyen harfte HATA FIRLATIR. Onceden `SHORT[cell] ?? 'vapur'` yaziyordu
 * ve bu SESSIZ bir tuzakti: bir testte harf hatasi yapinca test basarisiz
 * olmuyor, gecerli ama YANLIS bir tahta uretiyordu. (Yasandi: score.test.ts'in
 * kendi SHORT haritasinda 'D' yoktu, oradaki row('D', ...) sessizce vapur
 * uretirdi.)
 */
export function row(...cells: (ShortCode | '.')[]): SlotRow {
  return cells.map((cell) => {
    if (cell === '.') return null;
    const id = SHORT[cell];
    if (id === undefined) {
      throw new RangeError(`Bilinmeyen kisa kod: ${String(cell)}`);
    }
    return createTile(id);
  });
}

/** Satiri kisa gosterime cevirir; iddialar okunur olsun diye. */
export function show(slots: SlotRow): string {
  const reverse = new Map<TileId, string>(
    Object.entries(SHORT).map(([short, id]) => [id as TileId, short]),
  );
  return slots.map((slot) => (slot === null ? '.' : (reverse.get(slot.id) ?? '?'))).join('');
}
