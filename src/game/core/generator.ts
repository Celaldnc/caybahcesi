import { TRAY } from '@/constants/config';

import { countEmpty, emptyIndices, findRuns, placeTile } from './matcher';
import type { Rng } from './rng';
import { createTile, getTileDefinition } from './tiles';
import type { SlotRow, Tile, TileId, Tray } from './types';

/**
 * Tray uretici -- "no-stuck-state" garantisinin sahibi.
 *
 * Uc katmanli davranis:
 *  1. KURTARMA (zorunlu): bos slot sayisi RESCUE_THRESHOLD'a dustugunde ve
 *     bir eslesme tamamlamak MUMKUNSE, tray o tile'i icermek zorundadir.
 *     Oyuncu kendi hatasi olmadan, sirf sansizlik yuzunden kaybetmemeli.
 *  2. TAHTA YANLILIGI: tile'larin bir kismi tahtada ZATEN bulunan tiplerden
 *     secilir. Duz agirlikli rastgele uretim, 9 tipli bir havuzda eslesmeyi
 *     neredeyse imkansiz kilar.
 *  3. AGIRLIKLI RASTGELE: geri kalani tile tanimlarindaki `weight` ile secilir.
 */

/** Bir tile'i belirli bir bos slota koymanin eslesme yaratip yaratmadigi. */
function createsMatch(row: SlotRow, index: number, tileId: TileId): boolean {
  const probe = placeTile(row, index, { id: tileId, key: 'probe' });
  return findRuns(probe).length > 0;
}

/** Tek hamlede eslesme yaratan (tile tipi, slot indisi) ciftleri. */
export function findRescuePlacements(
  row: SlotRow,
  pool: readonly TileId[],
): readonly { readonly tileId: TileId; readonly index: number }[] {
  const placements: { tileId: TileId; index: number }[] = [];

  for (const index of emptyIndices(row)) {
    for (const tileId of pool) {
      if (createsMatch(row, index, tileId)) {
        placements.push({ tileId, index });
      }
    }
  }

  return placements;
}

/** Tek hamlede eslesme yaratabilen tile tipleri (benzersiz). */
export function findRescueTileIds(row: SlotRow, pool: readonly TileId[]): readonly TileId[] {
  const ids = new Set<TileId>();
  for (const { tileId } of findRescuePlacements(row, pool)) {
    ids.add(tileId);
  }
  return [...ids];
}

/**
 * Tahtadaki bir tile'in yanina konup BITISIK CIFT olusturabilecek tipler.
 *
 * Neden ayri bir kavram: kurtarma (uclu tamamlama) ancak zaten bir cift ya da
 * X_X kalibi varsa mumkundur. Tahta tamamen farkli tiplerden olusuyorsa
 * kurtarma esigine gelindiginde yapacak bir sey kalmaz. Cift kurma, oyuncunun
 * bir sonraki hamlede kurtarilabilir bir tahtaya sahip olmasini saglar.
 */
export function findPairBuildingTileIds(row: SlotRow, pool: readonly TileId[]): readonly TileId[] {
  const ids = new Set<TileId>();

  for (const index of emptyIndices(row)) {
    for (const neighbour of [row[index - 1], row[index + 1]]) {
      if (neighbour !== undefined && neighbour !== null && pool.includes(neighbour.id)) {
        ids.add(neighbour.id);
      }
    }
  }

  return [...ids];
}

/**
 * "Ilerleme" saglayan tipler: once kurtarma, yoksa cift kurma.
 * Uretici baski altindayken tray'e bunlardan en az birini koymak zorundadir.
 */
export function findProgressTileIds(row: SlotRow, pool: readonly TileId[]): readonly TileId[] {
  const rescue = findRescueTileIds(row, pool);
  return rescue.length > 0 ? rescue : findPairBuildingTileIds(row, pool);
}

/** Tanimlardaki `weight` degerlerine gore havuzdan bir tip secer. */
function pickWeighted(pool: readonly TileId[], rng: Rng): TileId {
  const totalWeight = pool.reduce((sum, id) => sum + getTileDefinition(id).weight, 0);
  let threshold = rng.next() * totalWeight;

  // `chosen` dongu icinde her adimda guncellenir; boylece kayan nokta
  // yuvarlamasi esigi hic sifirlamasa bile son eleman secilmis olur.
  // (Ulasilamaz bir `return` satiri birakmak yerine bu kalip tercih edildi:
  // olu kod test edilemez ve coverage'i yaniltir.)
  let chosen = pool[0]!;
  for (const id of pool) {
    chosen = id;
    threshold -= getTileDefinition(id).weight;
    if (threshold <= 0) break;
  }
  return chosen;
}

/** Tahtada bulunan tiplerden birini secer; tahta bossa null doner. */
function pickFromBoard(row: SlotRow, pool: readonly TileId[], rng: Rng): TileId | null {
  const onBoard = row
    .filter((slot): slot is Tile => slot !== null)
    .map((tile) => tile.id)
    .filter((id) => pool.includes(id));

  return onBoard.length === 0 ? null : rng.pick(onBoard);
}

/** Tek bir tile tipi secer: once tahta yanliligi, sonra agirlikli rastgele. */
function pickTileId(row: SlotRow, pool: readonly TileId[], rng: Rng): TileId {
  if (rng.next() < TRAY.BOARD_BIAS) {
    const fromBoard = pickFromBoard(row, pool, rng);
    if (fromBoard !== null) return fromBoard;
  }
  return pickWeighted(pool, rng);
}

/** Verilen adaylardan biri tray'de zaten var mi? */
function trayCovers(tray: readonly Tile[], candidates: readonly TileId[]): boolean {
  return tray.some((tile) => candidates.includes(tile.id));
}

/**
 * Tray'e ZORUNLU olarak konmasi gereken tile tipini secer; gerek yoksa null.
 *
 * Iki asamali:
 *  1. Kurtarma esigi -- uclu tamamlayabilen bir tile varsa onu ver.
 *  2. Guvenlik esigi -- kurtarma imkansizsa, en azindan bitisik cift
 *     kurabilen bir tile ver.
 *
 * Ikinci asama sart: kurtarma ancak tahtada uygun bir kalip varsa mumkun.
 * Tahta tamamen farkli tiplerden olusuyorsa kurtarma esigine gelindiginde
 * is isten gecmis olur (olculdu: bu katman olmadan bazi tohumlarda oyuncu
 * 7 hamlede, kendi hatasi olmadan kaybediyordu).
 */
function chooseForcedTileId(
  row: SlotRow,
  tray: readonly Tile[],
  pool: readonly TileId[],
  rng: Rng,
): TileId | null {
  const empty = countEmpty(row);

  if (empty <= TRAY.RESCUE_THRESHOLD) {
    const rescueIds = findRescueTileIds(row, pool);
    if (rescueIds.length > 0 && !trayCovers(tray, rescueIds)) {
      return rng.pick(rescueIds);
    }
  }

  if (empty <= TRAY.SAFETY_THRESHOLD) {
    const progressIds = findProgressTileIds(row, pool);
    if (progressIds.length > 0 && !trayCovers(tray, progressIds)) {
      return rng.pick(progressIds);
    }
  }

  return null;
}

/**
 * Tray'i hedef boyuta tamamlar.
 *
 * Mevcut tile'lar korunur ve sirasi bozulmaz (ekranda yerleri sabit kalsin).
 * Zorunluluk, tamamlanmis tray'in TAMAMI uzerinden degerlendirilir: elde
 * zaten uygun bir tile varsa yenisini zorlamaya gerek yok.
 */
export function refillTray(
  row: SlotRow,
  current: readonly Tile[],
  pool: readonly TileId[],
  rng: Rng,
  size: number = TRAY.VISIBLE,
): Tray {
  if (pool.length === 0) {
    throw new RangeError('Tile havuzu bos olamaz.');
  }
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(`Tray boyutu pozitif tam sayi olmali, alinan: ${size}`);
  }

  const tray: Tile[] = [...current];
  const missing = size - tray.length;
  if (missing <= 0) return tray;

  const forced = chooseForcedTileId(row, tray, pool, rng);

  for (let i = 0; i < missing; i++) {
    tray.push(createTile(pickTileId(row, pool, rng)));
  }

  // Zorunlu tile'i rastgele bir YENI yuvaya koy: her zaman ayni konumda
  // cikarsa oyuncu icin okunabilir bir kalip olusur ve uretici tahmin
  // edilebilir hale gelir.
  if (forced !== null) {
    tray[tray.length - missing + rng.int(missing)] = createTile(forced);
  }

  return tray;
}

/** Sifirdan tam bir tray uretir. */
export function generateTray(
  row: SlotRow,
  pool: readonly TileId[],
  rng: Rng,
  size: number = TRAY.VISIBLE,
): Tray {
  return refillTray(row, [], pool, rng, size);
}
