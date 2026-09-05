import type { TileColorToken, TileFamily } from '@/game/core/types';

/**
 * Tile renkleri.
 *
 * Neden `constants/colors.ts` degil de burada: orasi UYGULAMA temasi
 * (arka plan, metin, sekme). Burasi OYUN VERISI -- tile kimligine bagli.
 *
 * ---------------------------------------------------------------------------
 * ERISILEBILIRLIK MODELI
 *
 * Renk IKINCIL kanaldir, tek kanal degil. Sebep yapisal: `pickTilePool`
 * aileler arasinda round-robin secer ve aile sayisi (9) ile
 * LEVEL.MAX_TILE_TYPES (9) esit oldugu icin bir havuzda her aileden EN FAZLA
 * BIR tile bulunur. FAMILY_SHAPE bijeksiyonu geregi de ekranda ayni anda
 * bulunan her tile FARKLI FORMDADIR -- bu matematiksel bir garanti.
 *
 * Renk korlugu olan oyuncu tile'lari formdan ayirt eder; renk okumayi
 * hizlandiran bir yardimcidir.
 * ---------------------------------------------------------------------------
 */

/**
 * Her ailenin temel rengi -- ACIKLIK MERDIVENININ basamaklari.
 *
 * DIKKAT: bunlar ekranda gorunen renkler DEGILDIR. Havuz her aileden
 * rastgele bir VARYANT secer (bkz. TILE_COLOR), tabani degil. Bu dosya
 * Sprint 2'ye kadar "ekranda ayni anda bulunabilen 9 renk" diyordu ve
 * renk korlugu testi de bu tabloyu olcuyordu -- yani GARANTI, RENDER
 * EDILMEYEN BIR TABLOYU koruyordu. Gercek olcum TILE_COLOR uzerinde
 * yapilir; asagida.
 *
 * ACIKLIK MERDIVENI (koyudan aciga): kahve, nazar, cay, deniz, pide, kedi,
 * lokum, firin, balik.
 *
 * Neden ton degil aciklik: ton farki renk korlugunde COKEBILIR, aciklik farki
 * korunur. Ilk deneme ton bazliydi ve olcum reddetti -- lokum (gul) ile deniz
 * (turkuaz) protanopide dE=0.6'ya dusuyordu, yani pratikte ayni renkti.
 *
 * Siralamada `cay` (kiremit) bilerek `nazar` ile `deniz` ARASINA kondu:
 * ikisi de mavi-yesil bolgede oldugu icin komsu olduklarinda dE=8.1'e
 * dusuyorlardi.
 *
 * OLCUM (protanopi/doteranopi/tritanopi simulasyonu, CIELAB dE76, en kotu
 * durum): en yakin cift 10.0, medyan 31.6, 10'un altinda cift YOK.
 *
 * Neden daha yuksek degil: rastgele arama ile denendi -- dE'yi maksimize
 * eden palet renkleri doygunluk uclarina itiyor (#ff8cc2 fusya, #e5c024 asit
 * sarisi) ve cay bahcesi estetigini yok ediyor. Mat/sicak kisitlar altinda
 * ulasilabilir tavan dE ~11-12 olarak olculdu. Form birincil kanal oldugu
 * icin 10 yeterli: CIELAB'da dE>10 "bakar bakmaz fark edilir" esigidir.
 */
export const FAMILY_COLOR = {
  kahve: '#3B2C24', // Turk kahvesi telvesi   L=0.029
  nazar: '#264A72', // Bogaz mavisi           L=0.065
  cay: '#9C4526', // demli cay / kiremit      L=0.115
  deniz: '#2F7F78', // deniz yesili           L=0.171
  pide: '#7A9A55', // fistik yesili           L=0.279
  kedi: '#AC9C8C', // sicak gri               L=0.344
  lokum: '#E39BAE', // gul pembesi            L=0.428
  firin: '#E3BE62', // firin altini           L=0.540
  balik: '#C3D8E4', // gumus mavi             L=0.663
} as const satisfies Record<TileFamily, string>;

/**
 * Tile basina somut renk -- aile taban renginin aciklik varyantlari.
 *
 * Ayni aileden iki tile hicbir zaman birlikte gorunmedigi icin bu tonlarin
 * birbirinden cok uzak olmasi gerekmez; amac oyuncunun "bu bir cay bardagi"
 * diye tanimasi.
 *
 * Hepsi MUREKKEP OLU BOLGESININ disinda (bkz. INK_THRESHOLD).
 *
 * ---------------------------------------------------------------------------
 * AILE-CAPRAZI OLCUM (Sprint 2 kalite kapisi)
 *
 * Ekranda ayni anda gorunen renkler BUNLARDIR, FAMILY_COLOR degil. 277
 * aile-caprazi ciftte olculdu (CIELAB dE76, uc renk korlugu simulasyonunun
 * en kotusu):
 *
 *   once:  en yakin cift 1.66 (denizKayik <-> lokumGul) -- pratikte AYNI renk
 *   simdi: en yakin cift 5.60 (kediVan <-> lokumFistik)
 *
 * Duzeltme kisitli bir optimizasyonla bulundu: her varyant aile tabanindan
 * CIELAB L* ekseninde en fazla 14 uzaklasabilir (aile kimligi korunsun),
 * aile ici ayrim gerilemesin (>= 6.12) ve murekkep olu bolgesine girmesin.
 *
 * KISITSIZ optimizasyon 9.38'e cikiyordu ama denizKayik'i #0D2422'ye,
 * firinAcma'yi #231B06'ya itiyordu -- yani rengi "deniz" ve "firin" olmaktan
 * cikariyordu. Taban paleti tasarlarken olculen ayni basarisizlik modu.
 *
 * TAVAN 5.60'TIR, esik 10 DEGIL. Sebep yapisal: 9 basamakli aciklik
 * merdivenine 25 renk sigdirilinca varyantlar komsu basamaklara tasiyor.
 * 10'un uzerine cikmak varyant sayisini azaltmayi gerektirir -- Sprint 3
 * karari. Bugun kabul edilebilir olmasinin sebebi FORMUN birincil kanal
 * olmasi ve bunun MATEMATIKSEL garanti olmasi (9 aile <-> 9 form
 * bijeksiyonu + havuzda aile basina en fazla bir tile).
 * ---------------------------------------------------------------------------
 */
export const TILE_COLOR = {
  // kahve
  kahveFincan: '#3B2C24',
  kahveCezve: '#4A382D',

  // nazar
  nazarMavi: '#264A72',
  nazarYesil: '#1F3D5E',
  nazarSiyah: '#162B42',

  // cay
  cayInceBelli: '#9C4526',
  cayAyvalik: '#823920',
  cayKulplu: '#BA522D',

  // deniz
  denizVapur: '#2F7F78',
  denizKayik: '#296E69',

  // pide
  pideKiyma: '#7A9A55',
  pidePeynir: '#627C45',
  pideKusbasi: '#97B476',

  // kedi
  kediTekir: '#AC9C8C',
  kediKara: '#96816D',
  kediVan: '#CCC3B8',

  // lokum
  lokumFistik: '#E39BAE',
  lokumGul: '#DE889F',
  lokumSade: '#EEC4CF',

  // firin
  firinSimit: '#E3BE62',
  firinAcma: '#C59723',
  firinPogaca: '#F3E4BF',

  // balik
  balikLufer: '#C3D8E4',
  balikHamsi: '#92B8CE',
  balikLevrek: '#E6EFF4',
} as const satisfies Record<TileColorToken, string>;

/** Tile uzerindeki glif/isaret rengi. */
export const TILE_INK = {
  light: '#FFFFFF',
  dark: '#1A1412',
} as const;

/**
 * Tile KENARLIGI -- pazarlik edilemez.
 *
 * Aciklik merdiveninin iki ucu kendi renginde bir zemine karisir: en acik
 * tile'lar acik temada, en koyu tile'lar koyu temada neredeyse gorunmez olur.
 *
 * Cozum renkleri sikistirmak DEGIL (o zaman aileler birbirine yaklasir ve
 * renk korlugu ayrimi bozulur), her tile'a temanin metin renginde bir
 * kenarlik vermektir. Silueti zeminden ayirir, dolgu rengi ozgur kalir.
 */
export const TILE_BORDER_WIDTH = 2;

/**
 * Murekkep secim esigi -- tahmin degil, TUREVI alinmis deger.
 *
 * Beyaz murekkeple 4.5:1 icin dolgu luminansi L <= 0.1833 olmali;
 * koyu murekkeple (#1A1412) 4.5:1 icin L >= 0.2232. Aradaki bant
 * OLU BOLGEDIR -- hicbir murekkep AA'yi saglamaz. Iki kontrastin
 * esitlendigi nokta sqrt(1.05 * 0.0607) - 0.05 = 0.2025.
 *
 * Ilk deneme 0.4 yaziyordu ve 25 tile'in 10'unda yanlis murekkep seciyordu.
 * Tile renkleri de olu bolgenin disina tasindi; test bunu zorluyor.
 */
const INK_THRESHOLD = 0.2025;

/** Verilen sRGB hex renginin bagil luminansi (WCAG 2.1). */
export function relativeLuminance(color: string): number {
  const toLinear = (channel: number): number => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(parseInt(color.slice(1, 3), 16));
  const g = toLinear(parseInt(color.slice(3, 5), 16));
  const b = toLinear(parseInt(color.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Her tile icin okunabilir murekkep rengi. */
export function inkFor(color: string): string {
  return relativeLuminance(color) > INK_THRESHOLD ? TILE_INK.dark : TILE_INK.light;
}
