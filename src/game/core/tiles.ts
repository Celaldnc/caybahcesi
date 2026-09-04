import type { Rng } from './rng';
import type { TileDefinition, TileId } from './types';

/**
 * Tum tile tanimlari.
 *
 * Tasarim kurallari (testlerle zorlanir):
 *  - Ayni ailedeki tile'lar FARKLI form ve FARKLI renk yuvasi kullanir.
 *    Sebep: WCAG 1.4.1. Uc cay bardagi yalnizca renkle ayrilirsa renk koru
 *    oyuncu icin oyun oynanamaz hale gelir (paletteki bazi ciftler
 *    protanopide 1.04:1 kontrasta dusuyor).
 *  - Turkce adlar benzersizdir; ekran okuyucu etiketi olarak kullanilir.
 *  - `weight` uretim sikligidir. Cay/simit gibi tema merkezindeki nesneler
 *    daha sik, vapur/kayik gibi "ozel" nesneler daha seyrek cikar.
 */
export const TILE_DEFINITIONS = {
  // --- Cay ---
  'cay-ince-belli': {
    id: 'cay-ince-belli',
    family: 'cay',
    nameTr: 'İnce belli çay bardağı',
    glyph: '🫖',
    colorToken: 'cayKoyu',
    shape: 'damla',
    weight: 10,
  },
  'cay-kalin': {
    id: 'cay-kalin',
    family: 'cay',
    nameTr: 'Kalın çay bardağı',
    glyph: '🍵',
    colorToken: 'cayOrta',
    shape: 'kare',
    weight: 10,
  },
  'cay-cam': {
    id: 'cay-cam',
    family: 'cay',
    nameTr: 'Cam çay bardağı',
    glyph: '🥃',
    colorToken: 'cayAcik',
    shape: 'altigen',
    weight: 9,
  },

  // --- Kahve ---
  'kahve-fincan': {
    id: 'kahve-fincan',
    family: 'kahve',
    nameTr: 'Türk kahvesi fincanı',
    glyph: '☕',
    colorToken: 'kahveKoyu',
    shape: 'daire',
    weight: 9,
  },
  'kahve-cezve': {
    id: 'kahve-cezve',
    family: 'kahve',
    nameTr: 'Cezve',
    glyph: '🫗',
    colorToken: 'kahveAcik',
    shape: 'ucgen',
    weight: 7,
  },

  // --- Nazar ---
  'nazar-mavi': {
    id: 'nazar-mavi',
    family: 'nazar',
    nameTr: 'Mavi nazar boncuğu',
    glyph: '🧿',
    colorToken: 'nazarMavi',
    shape: 'daire',
    weight: 9,
  },
  'nazar-yesil': {
    id: 'nazar-yesil',
    family: 'nazar',
    nameTr: 'Yeşil nazar boncuğu',
    glyph: '🟢',
    colorToken: 'nazarYesil',
    shape: 'elmas',
    weight: 7,
  },
  'nazar-siyah': {
    id: 'nazar-siyah',
    family: 'nazar',
    nameTr: 'Siyah nazar boncuğu',
    glyph: '⚫',
    colorToken: 'nazarSiyah',
    shape: 'altigen',
    weight: 6,
  },

  // --- Lokum ---
  'lokum-fistikli': {
    id: 'lokum-fistikli',
    family: 'lokum',
    nameTr: 'Fıstıklı lokum',
    glyph: '🟩',
    colorToken: 'lokumFistik',
    shape: 'kare',
    weight: 8,
  },
  'lokum-gullu': {
    id: 'lokum-gullu',
    family: 'lokum',
    nameTr: 'Güllü lokum',
    glyph: '🌸',
    colorToken: 'lokumGul',
    shape: 'kalp',
    weight: 8,
  },
  'lokum-sade': {
    id: 'lokum-sade',
    family: 'lokum',
    nameTr: 'Sade lokum',
    glyph: '⬜',
    colorToken: 'lokumSade',
    shape: 'daire',
    weight: 8,
  },

  // --- Simit ---
  'simit-susamli': {
    id: 'simit-susamli',
    family: 'simit',
    nameTr: 'Susamlı simit',
    glyph: '🥯',
    colorToken: 'simitSusam',
    shape: 'daire',
    weight: 10,
  },
  'simit-peynirli': {
    id: 'simit-peynirli',
    family: 'simit',
    nameTr: 'Peynirli simit',
    glyph: '🧀',
    colorToken: 'simitPeynir',
    shape: 'altigen',
    weight: 7,
  },
  'simit-citir': {
    id: 'simit-citir',
    family: 'simit',
    nameTr: 'Çıtır simit',
    glyph: '🥨',
    colorToken: 'simitCitir',
    shape: 'yildiz',
    weight: 6,
  },

  // --- Pide ---
  'pide-kiymali': {
    id: 'pide-kiymali',
    family: 'pide',
    nameTr: 'Kıymalı pide',
    glyph: '🥙',
    colorToken: 'pideKiyma',
    shape: 'elmas',
    weight: 7,
  },
  'pide-peynirli': {
    id: 'pide-peynirli',
    family: 'pide',
    nameTr: 'Peynirli pide',
    glyph: '🫓',
    colorToken: 'pidePeynir',
    shape: 'ucgen',
    weight: 7,
  },
  'pide-kusbasi': {
    id: 'pide-kusbasi',
    family: 'pide',
    nameTr: 'Kuşbaşılı pide',
    glyph: '🍖',
    colorToken: 'pideKusbasi',
    shape: 'kare',
    weight: 6,
  },

  // --- Kedi ---
  'kedi-sari': {
    id: 'kedi-sari',
    family: 'kedi',
    nameTr: 'Sarı kedi',
    glyph: '🐱',
    colorToken: 'kediSari',
    shape: 'ucgen',
    weight: 6,
  },
  'kedi-siyah': {
    id: 'kedi-siyah',
    family: 'kedi',
    nameTr: 'Siyah kedi',
    glyph: '🐈‍⬛',
    colorToken: 'kediSiyah',
    shape: 'kalp',
    weight: 6,
  },
  'kedi-beyaz': {
    id: 'kedi-beyaz',
    family: 'kedi',
    nameTr: 'Beyaz kedi',
    glyph: '🐈',
    colorToken: 'kediBeyaz',
    shape: 'daire',
    weight: 6,
  },

  // --- Deniz ---
  vapur: {
    id: 'vapur',
    family: 'deniz',
    nameTr: 'Vapur',
    glyph: '⛴️',
    colorToken: 'denizVapur',
    shape: 'kare',
    weight: 5,
  },
  kayik: {
    id: 'kayik',
    family: 'deniz',
    nameTr: 'Kayık',
    glyph: '🛶',
    colorToken: 'denizKayik',
    shape: 'hilal',
    weight: 5,
  },

  // --- Balik ---
  'balik-lufer': {
    id: 'balik-lufer',
    family: 'balik',
    nameTr: 'Lüfer',
    glyph: '🐟',
    colorToken: 'balikLufer',
    shape: 'damla',
    weight: 5,
  },
  'balik-hamsi': {
    id: 'balik-hamsi',
    family: 'balik',
    nameTr: 'Hamsi',
    glyph: '🐠',
    colorToken: 'balikHamsi',
    shape: 'hilal',
    weight: 5,
  },
  'balik-levrek': {
    id: 'balik-levrek',
    family: 'balik',
    nameTr: 'Levrek',
    glyph: '🎣',
    colorToken: 'balikLevrek',
    shape: 'elmas',
    weight: 5,
  },
} as const satisfies Record<TileId, TileDefinition>;

/** Tum tile id'leri, tanim sirasinda. */
export const ALL_TILE_IDS = Object.keys(TILE_DEFINITIONS) as readonly TileId[];

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
 * Benzersiz tile anahtari sayaci.
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
  return { id, key: `${id}#${keyCounter}` };
}

/**
 * Bir seviye icin tile havuzu secer.
 *
 * Aileye yayarak secer (round-robin): once aileler karistirilir, sonra her
 * aileden sirayla birer tile alinir. Sebep gorsel ayirt edilebilirlik --
 * havuz duz rastgele secilseydi "uc cay bardagi + iki lokum" gibi birbirine
 * benzeyen bir set cikabilir ve tahta okunamaz hale gelirdi.
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

  // Aileye gore grupla.
  const byFamily = new Map<string, TileId[]>();
  for (const id of ALL_TILE_IDS) {
    const { family } = getTileDefinition(id);
    const bucket = byFamily.get(family);
    if (bucket === undefined) {
      byFamily.set(family, [id]);
    } else {
      bucket.push(id);
    }
  }

  // Aile sirasini ve aile ici sirayi karistir.
  // Anahtarlar ayni Map'ten geldigi icin get() asla undefined donmez.
  const families = rng
    .shuffle([...byFamily.keys()])
    .map((family) => rng.shuffle(byFamily.get(family)!));

  // Round-robin: her turda her aileden bir tane.
  const pool: TileId[] = [];
  for (let round = 0; pool.length < size; round++) {
    for (const family of families) {
      if (pool.length >= size) break;
      const candidate = family[round];
      if (candidate !== undefined) pool.push(candidate);
    }
  }

  return pool;
}
