/**
 * Oyunun cekirdek veri modeli.
 *
 * Bu dosya (ve game/core/* tumu) SAF TypeScript'tir: React/React Native/Expo
 * import etmez. ESLint bunu zorlar. Amac, kurallarin emulatorsuz ve mock'suz,
 * milisaniyeler icinde test edilebilmesi.
 */

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

/** Tile ailesi -- gorsel gruplama ve seviye havuzu secimi icin. */
export type TileFamily =
  'cay' | 'kahve' | 'nazar' | 'lokum' | 'firin' | 'pide' | 'kedi' | 'deniz' | 'balik';

/**
 * Tile'in ayirt edici FORMU -- AILE duzeyinde bir ozelliktir.
 *
 * Neden var: paletteki bazi renkler renk korlugu altinda ayirt edilemiyor
 * (lokumPembe <-> fistikYesil protanopide 1.04:1). WCAG 1.4.1 geregi her
 * tile'in renkten BAGIMSIZ bir isareti olmali.
 *
 * Neden AILE duzeyinde (tile duzeyinde degil): `pickTilePool` aileler
 * arasinda round-robin secim yapar ve 9 aile / MAX_TILE_TYPES 9 oldugu icin
 * bir havuzda ASLA ayni aileden iki tile bulunmaz. Yani "ayni ailede farkli
 * form" kurali oyunda hic gerceklesmeyen bir senaryoyu koruyordu; her zaman
 * gerceklesen senaryo -- 9 farkli aileden 9 tile ayni anda tahtada -- hic
 * korunmuyordu. OLCULDU: size-9 havuzlarin %99.83'unde en az bir form
 * cakismasi, %48.8'inde uc tile ayni formda.
 *
 * 9 aile <-> 9 form bijeksiyonu bunu MATEMATIKSEL olarak cozer: havuzdaki
 * her tile farkli aileden geldigi icin her tile farkli formda olur.
 * (Olculdu: 15.000 havuzda 0 cakisma.) Alternatifler denendi ve yetersiz:
 * form-farkindali acgozlu secim cakismayi ancak %83.8'e indiriyor;
 * geri izlemeli secim 8748 olasi havuzu 15'e dusurup cesitliligi olduruyor.
 */
export type TileShape =
  'daire' | 'kare' | 'ucgen' | 'elmas' | 'yildiz' | 'altigen' | 'kalp' | 'hilal' | 'damla';

/**
 * Aile ICI ayrim icin ikinci, forma DIK kanal.
 *
 * `shape` aile boyunca sabit oldugu icin ayni ailenin uyeleri onunla
 * ayrilamaz. Bugun bu bir sorun degil (ayni aileden iki tile havuza
 * giremiyor), ama bu garanti "aile sayisi >= MAX_TILE_TYPES" esitligine
 * bagli kirilgan bir kosula dayaniyor. Klasik cift kodlama (form + doku)
 * ile guvence altina aliyoruz.
 */
export type TilePattern = 'dolu' | 'cizgili' | 'noktali';

/** Tile tipinin kimligi. tiles.ts icindeki tanimlarla birebir esletir. */
export type TileId =
  // cay -- ucu de gercek Turk cay bardagi turu
  | 'cay-ince-belli'
  | 'cay-ayvalik'
  | 'cay-kulplu'
  // kahve
  | 'kahve-fincan'
  | 'kahve-cezve'
  // nazar
  | 'nazar-mavi'
  | 'nazar-yesil'
  | 'nazar-siyah'
  // lokum
  | 'lokum-fistikli'
  | 'lokum-gul'
  | 'lokum-sade'
  // firin
  | 'firin-simit'
  | 'firin-acma'
  | 'firin-pogaca'
  // pide
  | 'pide-kiymali'
  | 'pide-peynirli'
  | 'pide-kusbasi'
  // kedi
  | 'kedi-tekir'
  | 'kedi-kara'
  | 'kedi-van'
  // deniz
  | 'deniz-vapur'
  | 'deniz-kayik'
  // balik
  | 'balik-lufer'
  | 'balik-hamsi'
  | 'balik-levrek';

/**
 * Tile'in renk YUVASI -- deger degil, kimlik.
 *
 * core saf mantik katmani oldugu icin somut hex degerlerini bilmez; onlar
 * gorsel bir karardir ve Sprint 2'de constants/colors.ts'e baglanacak.
 * Buradaki union, "hangi renk yuvalari doldurulmali" sozlesmesini tasir.
 */
export type TileColorToken =
  | 'cayInceBelli'
  | 'cayAyvalik'
  | 'cayKulplu'
  | 'kahveFincan'
  | 'kahveCezve'
  | 'nazarMavi'
  | 'nazarYesil'
  | 'nazarSiyah'
  | 'lokumFistik'
  | 'lokumGul'
  | 'lokumSade'
  | 'firinSimit'
  | 'firinAcma'
  | 'firinPogaca'
  | 'pideKiyma'
  | 'pidePeynir'
  | 'pideKusbasi'
  | 'kediTekir'
  | 'kediKara'
  | 'kediVan'
  | 'denizVapur'
  | 'denizKayik'
  | 'balikLufer'
  | 'balikHamsi'
  | 'balikLevrek';

/** Bir tile tipinin degismez tanimi. Calisma zamaninda uretilmez, sabittir. */
export interface TileDefinition {
  readonly id: TileId;
  readonly family: TileFamily;
  /** Kullaniciya gorunen Turkce ad; erisilebilirlik etiketi olarak da kullanilir. */
  readonly nameTr: string;
  /** Gorsel yer tutucu (gercek asset gelene kadar). */
  readonly glyph: string;
  /** Renk yuvasi kimligi; somut deger Sprint 2'de baglanacak. */
  readonly colorToken: TileColorToken;
  /** Renkten bagimsiz ayirt edici form. AILE duzeyinde sabittir (WCAG 1.4.1). */
  readonly shape: TileShape;
  /** Aile ici ayrim icin forma dik ikinci kanal. */
  readonly pattern: TilePattern;
  /** Uretim agirligi. Buyuk deger = daha sik cikar. */
  readonly weight: number;
}

/**
 * Tahtadaki somut bir tile ornegi.
 *
 * `key` neden var: ayni tipten iki tile birbirinden ayirt edilemezse
 * Reanimated'in layout gecisleri hangi View'in nereye gittigini bilemez ve
 * tile'lar animasyon sirasinda "isinlanir". Her ornege benzersiz, kararli
 * bir kimlik veriyoruz.
 */
export interface Tile {
  readonly id: TileId;
  readonly key: string;
}

// ---------------------------------------------------------------------------
// Tahta
// ---------------------------------------------------------------------------

/**
 * Tek bir slot: dolu ya da bos.
 *
 * Model karari (fixed slots + delik): Oyuncu tile'i ISTEDIGI bos slota koyar,
 * dolayisiyla arada bosluk kalabilir. Iki tile "yanyana" sayilmak icin
 * ardisik indislerde ve IKISI DE DOLU olmali; [A, null, A, A] eslesme DEGILDIR.
 *
 * Alternatif model (listeye araya ekleme) daha basit olurdu ama spec acikca
 * "Ekranda 7 bos slot var / tile'i slota tikla / 7 slot doluysa game over"
 * diyor -- yani sabit slotlar.
 */
export type Slot = Tile | null;

/** Slot satiri. Uzunlugu seviyeye gore 7-9. */
export type SlotRow = readonly Slot[];

/** Oyuncunun secebilecegi, ekranin altindaki tile'lar. */
export type Tray = readonly Tile[];

// ---------------------------------------------------------------------------
// Seviye
// ---------------------------------------------------------------------------

export type GameMode = 'classic' | 'daily' | 'relax';

export interface LevelConfig {
  /** 1'den baslar. */
  readonly number: number;
  /** Bu seviyede kac slot var. */
  readonly slotCount: number;
  /** Bu seviyede havuzda kac farkli tile tipi var. */
  readonly tileTypeCount: number;
  /** Seviyeyi bitirmek icin gereken skor. */
  readonly targetScore: number;
}

// ---------------------------------------------------------------------------
// Eslesme sonucu
// ---------------------------------------------------------------------------

/** Ardisik ayni tile'lardan olusan bir grup (uzunluk >= MATCH.LENGTH). */
export interface MatchRun {
  /** Satirdaki baslangic indisi (kaldirma oncesi). */
  readonly startIndex: number;
  /** Gruptaki tile sayisi. */
  readonly length: number;
  readonly tileId: TileId;
}

/** Tek bir zincir adiminin sonucu. */
export interface CascadeStep {
  readonly runs: readonly MatchRun[];
  /** Bu adimda kaldirilan tile'lar (animasyon icin). */
  readonly removed: readonly Tile[];
}

/** matcher.resolve() ciktisi. */
export interface ResolveResult {
  /** Eslesmeler kaldirilip bosluklar kapatildiktan sonraki satir. */
  readonly row: SlotRow;
  /** Zincirin her adimi. Bos dizi = hic eslesme olmadi. */
  readonly steps: readonly CascadeStep[];
  /** Toplam kaldirilan tile sayisi. */
  readonly removedCount: number;
}
