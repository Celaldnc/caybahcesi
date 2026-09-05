import { TILE_WEIGHT } from '@/constants/config';

import type { Rng } from './rng';
import type { TileDefinition, TileFamily, TileId, TileShape } from './types';

/**
 * AILE -> FORM bijeksiyonu.
 *
 * 9 aile, 9 form, birebir eslesme. `pickTilePool` aileler arasinda round-robin
 * sectigi ve bir havuzda asla ayni aileden iki tile bulunmadigi icin, bu
 * bijeksiyon havuzdaki HER tile'in farkli formda olmasini MATEMATIKSEL olarak
 * garanti eder.
 *
 * Onceden form tile duzeyindeydi ve "ayni ailede farkli form" kurali test
 * ediliyordu -- oyunda hic gerceklesmeyen bir senaryo. Olculdu: size-9
 * havuzlarin %99.83'unde form cakismasi, %48.8'inde uc tile ayni formda.
 * Bijeksiyonla 15.000 havuzda 0 cakisma.
 */
export const FAMILY_SHAPE = {
  cay: 'ters-ucgen', // ince belli bardagin asagi daralan silueti
  kahve: 'daire', // fincan agzi
  nazar: 'halka', // boncuk / goz
  lokum: 'kare', // kup lokum
  firin: 'yuvarlak', // simit halkasi
  pide: 'elmas', // baklava dilimi
  kedi: 'ucgen', // kulak
  deniz: 'cubuk', // tekne govdesi
  balik: 'capraz', // kilcik
} as const satisfies Record<TileFamily, TileShape>;

/**
 * Tum tile tanimlari.
 *
 * Tasarim kurallari (testlerle zorlanir):
 *  - `shape` AILE ozelligidir (bkz. FAMILY_SHAPE). Aile ici ayrim `pattern`
 *    ile yapilir -- forma dik ikinci kanal, klasik cift kodlama.
 *  - Turkce adlar benzersiz ve GERCEKtir; ekran okuyucu etiketi olarak
 *    kullanilirlar. Uydurma tur adi ("citir simit") ve totoloji
 *    ("cam cay bardagi" -- Turk cay bardaginin tamami camdir) yok.
 *  - `glyph` GECICI yer tutucudur. Gercek asset'ler Sprint 2/3'te gelecek;
 *    o zamana kadar en azindan adiyla CELISMEYEN emoji secildi
 *    (onceden levrek icin olta kamisi, cay icin viski bardagi vardi).
 *  - `weight` config'teki TILE_WEIGHT token'larindan gelir; ciplak sayi yok.
 */
export const TILE_DEFINITIONS = {
  // --- Cay: ucu de gercek bardak turu ---
  'cay-ince-belli': {
    id: 'cay-ince-belli',
    family: 'cay',
    nameTr: 'İnce belli bardak',
    glyph: '🍵',
    colorToken: 'cayInceBelli',
    shape: 'ters-ucgen',
    pattern: 'dolu',
    weight: TILE_WEIGHT.HERO,
  },
  'cay-ayvalik': {
    id: 'cay-ayvalik',
    family: 'cay',
    nameTr: 'Ayvalık bardağı',
    glyph: '🥛',
    colorToken: 'cayAyvalik',
    shape: 'ters-ucgen',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.HERO,
  },
  'cay-kulplu': {
    id: 'cay-kulplu',
    family: 'cay',
    nameTr: 'Kulplu bardak',
    glyph: '🧋',
    colorToken: 'cayKulplu',
    shape: 'ters-ucgen',
    pattern: 'noktali',
    weight: TILE_WEIGHT.COMMON,
  },

  // --- Kahve ---
  'kahve-fincan': {
    id: 'kahve-fincan',
    family: 'kahve',
    nameTr: 'Türk kahvesi fincanı',
    glyph: '☕',
    colorToken: 'kahveFincan',
    shape: 'daire',
    pattern: 'dolu',
    weight: TILE_WEIGHT.COMMON,
  },
  'kahve-cezve': {
    id: 'kahve-cezve',
    family: 'kahve',
    nameTr: 'Cezve',
    glyph: '🫖',
    colorToken: 'kahveCezve',
    shape: 'daire',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.NORMAL,
  },

  // --- Nazar ---
  'nazar-mavi': {
    id: 'nazar-mavi',
    family: 'nazar',
    nameTr: 'Mavi nazar',
    glyph: '🧿',
    colorToken: 'nazarMavi',
    shape: 'halka',
    pattern: 'dolu',
    weight: TILE_WEIGHT.COMMON,
  },
  'nazar-yesil': {
    id: 'nazar-yesil',
    family: 'nazar',
    nameTr: 'Yeşil nazar',
    glyph: '🟢',
    colorToken: 'nazarYesil',
    shape: 'halka',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.NORMAL,
  },
  'nazar-siyah': {
    id: 'nazar-siyah',
    family: 'nazar',
    nameTr: 'Siyah nazar',
    glyph: '⚫',
    colorToken: 'nazarSiyah',
    shape: 'halka',
    pattern: 'noktali',
    weight: TILE_WEIGHT.NORMAL,
  },

  // --- Lokum ---
  'lokum-fistikli': {
    id: 'lokum-fistikli',
    family: 'lokum',
    nameTr: 'Fıstıklı lokum',
    glyph: '🥜',
    colorToken: 'lokumFistik',
    shape: 'kare',
    pattern: 'dolu',
    weight: TILE_WEIGHT.NORMAL,
  },
  'lokum-gul': {
    id: 'lokum-gul',
    family: 'lokum',
    nameTr: 'Gül lokumu',
    glyph: '🌹',
    colorToken: 'lokumGul',
    shape: 'kare',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.NORMAL,
  },
  'lokum-sade': {
    id: 'lokum-sade',
    family: 'lokum',
    nameTr: 'Sade lokum',
    glyph: '🍬',
    colorToken: 'lokumSade',
    shape: 'kare',
    pattern: 'noktali',
    weight: TILE_WEIGHT.NORMAL,
  },

  // --- Firin: ucu de ayri, gercek firin urunu ---
  'firin-simit': {
    id: 'firin-simit',
    family: 'firin',
    nameTr: 'Simit',
    glyph: '🥯',
    colorToken: 'firinSimit',
    shape: 'yuvarlak',
    pattern: 'dolu',
    weight: TILE_WEIGHT.HERO,
  },
  'firin-acma': {
    id: 'firin-acma',
    family: 'firin',
    nameTr: 'Açma',
    glyph: '🥐',
    colorToken: 'firinAcma',
    shape: 'yuvarlak',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.NORMAL,
  },
  'firin-pogaca': {
    id: 'firin-pogaca',
    family: 'firin',
    nameTr: 'Poğaça',
    glyph: '🍞',
    colorToken: 'firinPogaca',
    shape: 'yuvarlak',
    pattern: 'noktali',
    weight: TILE_WEIGHT.NORMAL,
  },

  // --- Pide ---
  'pide-kiymali': {
    id: 'pide-kiymali',
    family: 'pide',
    nameTr: 'Kıymalı pide',
    glyph: '🥙',
    colorToken: 'pideKiyma',
    shape: 'elmas',
    pattern: 'dolu',
    weight: TILE_WEIGHT.NORMAL,
  },
  'pide-peynirli': {
    id: 'pide-peynirli',
    family: 'pide',
    nameTr: 'Peynirli pide',
    glyph: '🫓',
    colorToken: 'pidePeynir',
    shape: 'elmas',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.NORMAL,
  },
  'pide-kusbasi': {
    id: 'pide-kusbasi',
    family: 'pide',
    nameTr: 'Kuşbaşılı pide',
    glyph: '🍕',
    colorToken: 'pideKusbasi',
    shape: 'elmas',
    pattern: 'noktali',
    weight: TILE_WEIGHT.NORMAL,
  },

  // --- Kedi: Turkce deyimsel adlar ---
  'kedi-tekir': {
    id: 'kedi-tekir',
    family: 'kedi',
    nameTr: 'Sarı tekir',
    glyph: '🐈',
    colorToken: 'kediTekir',
    shape: 'ucgen',
    pattern: 'dolu',
    weight: TILE_WEIGHT.NORMAL,
  },
  'kedi-kara': {
    id: 'kedi-kara',
    family: 'kedi',
    nameTr: 'Kara kedi',
    // ZWJ dizisi (🐈‍⬛) bilerek KULLANILMADI: eski Android'de iki glife
    // bolunuyor veya tofu cikiyor.
    glyph: '🐾',
    colorToken: 'kediKara',
    shape: 'ucgen',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.NORMAL,
  },
  'kedi-van': {
    id: 'kedi-van',
    family: 'kedi',
    nameTr: 'Van kedisi',
    glyph: '🐱',
    colorToken: 'kediVan',
    shape: 'ucgen',
    pattern: 'noktali',
    weight: TILE_WEIGHT.NORMAL,
  },

  // --- Deniz ---
  'deniz-vapur': {
    id: 'deniz-vapur',
    family: 'deniz',
    nameTr: 'Vapur',
    glyph: '⛴️',
    colorToken: 'denizVapur',
    shape: 'cubuk',
    pattern: 'dolu',
    weight: TILE_WEIGHT.RARE,
  },
  'deniz-kayik': {
    id: 'deniz-kayik',
    family: 'deniz',
    nameTr: 'Kayık',
    glyph: '🛶',
    colorToken: 'denizKayik',
    shape: 'cubuk',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.RARE,
  },

  // --- Balik: ucu de gercekten balik ---
  'balik-lufer': {
    id: 'balik-lufer',
    family: 'balik',
    nameTr: 'Lüfer',
    glyph: '🐟',
    colorToken: 'balikLufer',
    shape: 'capraz',
    pattern: 'dolu',
    weight: TILE_WEIGHT.RARE,
  },
  'balik-hamsi': {
    id: 'balik-hamsi',
    family: 'balik',
    nameTr: 'Hamsi',
    glyph: '🐠',
    colorToken: 'balikHamsi',
    shape: 'capraz',
    pattern: 'cizgili',
    weight: TILE_WEIGHT.RARE,
  },
  'balik-levrek': {
    id: 'balik-levrek',
    family: 'balik',
    nameTr: 'Levrek',
    glyph: '🐡',
    colorToken: 'balikLevrek',
    shape: 'capraz',
    pattern: 'noktali',
    weight: TILE_WEIGHT.RARE,
  },
} as const satisfies Record<TileId, TileDefinition>;

/** Tum tile id'leri, tanim sirasinda. */
export const ALL_TILE_IDS = Object.keys(TILE_DEFINITIONS) as readonly TileId[];

/** Tanimlarda gecen tum aileler (tekrarsiz, tanim sirasinda). */
export const ALL_FAMILIES = Object.keys(FAMILY_SHAPE) as readonly TileFamily[];

/**
 * Bir tile tipinin tanimini dondurur.
 * Bilinmeyen id'de sessizce undefined donmez, hata firlatir: veri hatasinin
 * kaynagi belli olsun diye.
 */
export function getTileDefinition(id: TileId): TileDefinition {
  const definition = TILE_DEFINITIONS[id] as TileDefinition | undefined;
  if (definition === undefined) {
    throw new RangeError(`Bilinmeyen tile id: ${id}`);
  }
  return definition;
}

/**
 * Benzersiz tile anahtari icin modul-yukleme tabani.
 *
 * Neden sadece artan sayac yetmiyor: Fast Refresh bu modulu yeniden
 * degerlendirdiginde sayac 0'a doner, ama store'daki mevcut tile'lar eski
 * anahtarlari tasir. Sonuc: ayni listede iki `cay-ayvalik#1` -> React
 * "duplicate key" uyarisi ve Reanimated layout gecislerinde tile'larin
 * isinlanmasi. Modul yuklemesi basina benzersiz bir taban bunu onler.
 * Yalnizca gelistirme deneyimini ilgilendirir; uretimde modul bir kez yuklenir.
 */
const KEY_EPOCH = Date.now().toString(36);

/**
 * Anahtar sayaci.
 *
 * Neden tohumlu rastgelelik degil: tile anahtari oyun mantiginin parcasi
 * degil, sunum katmaninin (Reanimated layout gecisleri) ihtiyacidir.
 * Rng'ye baglasaydik ayni tohumla oynanan iki oyun farkli anahtarlar uretir
 * ve determinizm testleri kirilirdi.
 */
let keyCounter = 0;

/** Verilen tipten yeni bir tile ornegi uretir. */
export function createTile(id: TileId): { readonly id: TileId; readonly key: string } {
  getTileDefinition(id); // gecerlilik kontrolu; bilinmeyen id burada patlar
  keyCounter += 1;
  return { id, key: `${id}#${KEY_EPOCH}-${keyCounter}` };
}

/** Tile id'lerini ailelerine gore gruplar. Grup sirasi tanim sirasidir. */
function groupByFamily(ids: readonly TileId[]): TileId[][] {
  const byFamily = new Map<TileFamily, TileId[]>();

  for (const id of ids) {
    const { family } = getTileDefinition(id);
    const bucket = byFamily.get(family);
    if (bucket === undefined) {
      byFamily.set(family, [id]);
    } else {
      bucket.push(id);
    }
  }

  return [...byFamily.values()];
}

/**
 * Gruplardan sirayla birer eleman alarak `size` uzunlugunda liste kurar.
 *
 * Dongu sinirli: en fazla en buyuk grubun uzunlugu kadar tur doner. Bu
 * YAPISAL sinir onemli -- onceden yalnizca `pool.length < size` kosuluna
 * dayaniyordu ve cagiran taraf `size`'i toplam eleman sayisindan buyuk
 * verirse SONSUZ DONGUYE giriyordu. Jest senkron bir donguyu testTimeout ile
 * kesemez, yani CI kirmizi olmaz -- ASILIR.
 */
function roundRobin<T>(groups: readonly T[][], size: number): T[] {
  const result: T[] = [];
  const maxRounds = Math.max(0, ...groups.map((group) => group.length));

  for (let round = 0; round < maxRounds && result.length < size; round++) {
    for (const group of groups) {
      if (result.length >= size) break;
      const candidate = group[round];
      if (candidate !== undefined) result.push(candidate);
    }
  }

  return result;
}

/**
 * Bir seviye icin tile havuzu secer.
 *
 * Aileye yayarak secer (round-robin): once aileler ve aile ici sira
 * karistirilir, sonra her aileden sirayla birer tile alinir.
 *
 * Iki sebep:
 *  1. GORSEL AYIRT EDILEBILIRLIK -- her aile farkli bir forma sahip
 *     (FAMILY_SHAPE bijeksiyonu), dolayisiyla aileye yayilan bir havuzda
 *     her tile farkli formda olur. Duz rastgele secim bu garantiyi yok eder.
 *  2. TEMATIK CESITLILIK -- "uc cay bardagi + iki lokum" gibi birbirine
 *     benzeyen bir set cikmaz.
 */
export function pickTilePool(size: number, rng: Rng): readonly TileId[] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(`Havuz boyutu pozitif tam sayi olmali, alinan: ${size}`);
  }
  if (size > ALL_TILE_IDS.length) {
    throw new RangeError(
      `Havuz boyutu mevcut tile tipi sayisini asamaz (${ALL_TILE_IDS.length}), istenen: ${size}`,
    );
  }

  const shuffledGroups = rng
    .shuffle(groupByFamily(ALL_TILE_IDS))
    .map((group) => rng.shuffle(group));

  return roundRobin(shuffledGroups, size);
}
