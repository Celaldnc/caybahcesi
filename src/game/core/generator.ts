import { TRAY } from '@/constants/config';

import { countEmpty, findRuns, insertPositions, insertTile, tilesOf } from './matcher';
import type { Rng } from './rng';
import { createTile, getTileDefinition } from './tiles';
import type { SlotRow, Tile, TileId, Tray } from './types';

/**
 * Tray uretici -- "no-stuck-state" garantisinin sahibi.
 *
 * Dort katmanli davranis:
 *  1. SATIR GUVENLIGI (zorunlu): bos slot sayisi SAFETY_THRESHOLD'a
 *     dustugunde tray, ya uclu tamamlayan ya da bitisik cift kuran bir tile
 *     ICERMEK ZORUNDA. Oyuncu kendi hatasi olmadan, sirf sansizlik yuzunden
 *     kaybetmemeli.
 *  2. SIPARIS ADALETI (Sprint 3): musterinin sabri tukenmek uzereyken,
 *     siparisin bekledigi tiplerden biri tepsiye konur. Ayni gerekce, farkli
 *     kaybetme yolu: oyuncu istedigi tip HIC gelmedigi icin musteri
 *     kaybetmemeli.
 *  3. TAHTA YANLILIGI: tile'larin bir kismi tahtada ZATEN bulunan tiplerden
 *     secilir. Duz agirlikli rastgele uretim, 9 tipli bir havuzda eslesmeyi
 *     neredeyse imkansiz kilar.
 *  4. AGIRLIKLI RASTGELE: geri kalani tile tanimlarindaki `weight` ile secilir.
 *
 * ONCELIK 1 > 2 KESINDIR: seviyeyi tumden kaybetmek (satir dolmasi), bir
 * musteriyi kaybetmekten kotudur. Satir baskisi altinda tepsi ilerleme
 * tile'ini tasimiyorsa siparis beklemek zorunda.
 */

/** Bir tile'i belirli bir konuma EKLEMENIN eslesme yaratip yaratmadigi. */
function createsMatch(row: SlotRow, position: number, tileId: TileId): boolean {
  const probe = insertTile(row, position, { id: tileId, key: 'probe' });
  return findRuns(probe).length > 0;
}

/** Tek hamlede eslesme yaratan (tile tipi, ekleme konumu) ciftleri. */
export function findRescuePlacements(
  row: SlotRow,
  pool: readonly TileId[],
): readonly { readonly tileId: TileId; readonly position: number }[] {
  const placements: { tileId: TileId; position: number }[] = [];

  for (const position of insertPositions(row)) {
    for (const tileId of pool) {
      if (createsMatch(row, position, tileId)) {
        placements.push({ tileId, position });
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
 * Tahtadaki bir tile'in yanina EKLENIP bitisik cift olusturabilecek tipler.
 *
 * Neden ayri bir kavram: kurtarma (uclu tamamlama) ancak zaten bir cift ya da
 * X_X kalibi varsa mumkundur. Tahta tamamen farkli tiplerden olusuyorsa
 * kurtarma esigine gelindiginde yapacak bir sey kalmaz. Cift kurma, oyuncunun
 * bir sonraki hamlede kurtarilabilir bir tahtaya sahip olmasini saglar.
 *
 * Ekleme modelinde bu basittir: satirda yer varsa, tahtadaki HER tipin
 * yanina ayni tipten bir tile eklenebilir.
 */
export function findPairBuildingTileIds(row: SlotRow, pool: readonly TileId[]): readonly TileId[] {
  if (insertPositions(row).length === 0) return [];

  const ids = new Set<TileId>();
  for (const tile of tilesOf(row)) {
    if (pool.includes(tile.id)) ids.add(tile.id);
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

/**
 * En az bir eleman iceren havuz.
 *
 * Bos-havuz sorununu CALISMA ZAMANI kontrolu yerine TIPE tasiyoruz. Boylece
 * ne ulasilamaz bir `throw` (test edilemez olu kod) ne de sessiz bozulma
 * (`pool[0]` undefined donup TileId gibi davranmasi) kaliyor: derleyici
 * bos havuzla cagrilmayi engelliyor.
 */
type NonEmptyPool = readonly [TileId, ...TileId[]];

/** Havuzun bos olmadigini hem calisma zamaninda hem TIPTE garanti eder. */
function assertNonEmptyPool(pool: readonly TileId[]): asserts pool is NonEmptyPool {
  if (pool.length === 0) {
    throw new RangeError('Tile havuzu bos olamaz.');
  }
}

/** Tanimlardaki `weight` degerlerine gore havuzdan bir tip secer. */
function pickWeighted(pool: NonEmptyPool, rng: Rng): TileId {
  const totalWeight = pool.reduce((sum, id) => sum + getTileDefinition(id).weight, 0);
  let threshold = rng.next() * totalWeight;

  // `chosen` dongu icinde her adimda guncellenir; boylece kayan nokta
  // yuvarlamasi esigi hic sifirlamasa bile son eleman secilmis olur.
  // (Ulasilamaz bir `return` satiri birakmak yerine bu kalip tercih edildi:
  // olu kod test edilemez ve coverage'i yaniltir.)
  // pool[0] tip geregi mevcut -- NonEmptyPool, assertion gerekmiyor.
  let chosen: TileId = pool[0];
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
function pickTileId(row: SlotRow, pool: NonEmptyPool, rng: Rng): TileId {
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
 * TEK esik, iki oncelik: `findProgressTileIds` once kurtarma (uclu tamamlama)
 * tiplerini dondurur, kurtarma imkansizsa cift kurma tiplerine duser.
 *
 * Neden cift kurma katmani sart: kurtarma ancak tahtada uygun bir kalip
 * (bitisik cift ya da X_X) varsa mumkun. Tahta tamamen farkli tiplerden
 * olusuyorsa kurtarma esigine gelindiginde is isten gecmis olur -- olculdu:
 * bu katman olmadan oyuncu bazi tohumlarda 7 hamlede, kendi hatasi olmadan
 * kaybediyordu.
 *
 * TARIHCE: burada once ayri bir RESCUE_THRESHOLD (=2) esigi vardi. Iki
 * bagimsiz denge olcumu onun DAVRANISSAL OLARAK OLU oldugunu gosterdi:
 * SAFETY >= RESCUE oldugu ve `findProgressTileIds` zaten kurtarmayi
 * onceledigi icin ayri dal hicbir zaman farkli sonuc uretmiyordu
 * (300 oyunda esige 561 kez gelindi, iki kume 561/561 esitti).
 * Yalanci ayar dugmesi birakmamak icin kaldirildi.
 */
function chooseForcedTileId(
  row: SlotRow,
  tray: readonly Tile[],
  pool: readonly TileId[],
  rng: Rng,
  demand: readonly TileId[],
): TileId | null {
  // --- 1. SATIR GUVENLIGI (en oncelikli) ---
  if (countEmpty(row) <= TRAY.SAFETY_THRESHOLD) {
    const progressIds = findProgressTileIds(row, pool);
    if (progressIds.length > 0 && !trayCovers(tray, progressIds)) {
      return rng.pick(progressIds);
    }
    // Tepsi ilerlemeyi zaten tasiyorsa siparis katmanina DUSULUR: guvenlik
    // saglandi, zorlanacak yuva hala siparise ayrilabilir.
  }

  // --- 2. SIPARIS ADALETI ---
  // Havuz disi talep gormezden gelinir: siparis havuzdan uretildigi icin
  // normalde olmaz, ama uretici cagiran tarafa guvenmemeli.
  const wanted = demand.filter((id) => pool.includes(id));
  if (wanted.length === 0 || trayCovers(tray, wanted)) return null;

  return rng.pick(wanted);
}

/**
 * Tray'i hedef boyuta tamamlar.
 *
 * Mevcut tile'lar korunur ve sirasi bozulmaz (ekranda yerleri sabit kalsin).
 *
 * Zorunluluk MEVCUT tray uzerinden degerlendirilir (doldurmadan ONCE), yeni
 * eklenenler uzerinden degil. Bu muhafazakar yon: rastgele doldurmanin zaten
 * uretecegi bir tile'i bazen gereksiz yere zorlar, ama garantiyi asla
 * zayiflatmaz. Ters sira (doldurup sonra bakmak) cesitliligi korurdu fakat
 * no-stuck-state garantisini olasiliga baglardi -- kabul edilemez.
 */
export interface RefillOptions {
  /** Hedef tepsi boyutu. */
  readonly size?: number;
  /**
   * ACILEN gereken tile tipleri (siparis adaleti katmani).
   *
   * Uretici siparis kavramini bilmez; yalnizca bu listeyi alir. Listeyi
   * kimin, hangi esikle urettigi `orders.urgentDemand`'in isi -- kural
   * tek yerde yasasin diye.
   */
  readonly demand?: readonly TileId[];
}

export function refillTray(
  row: SlotRow,
  current: readonly Tile[],
  pool: readonly TileId[],
  rng: Rng,
  options: RefillOptions = {},
): Tray {
  const { size = TRAY.VISIBLE, demand = [] } = options;

  assertNonEmptyPool(pool);
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(`Tray boyutu pozitif tam sayi olmali, alinan: ${size}`);
  }

  const tray: Tile[] = [...current];
  const missing = size - tray.length;
  if (missing <= 0) return tray;

  const forced = chooseForcedTileId(row, tray, pool, rng, demand);

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
  options: RefillOptions = {},
): Tray {
  return refillTray(row, [], pool, rng, options);
}
