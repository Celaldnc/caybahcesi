/**
 * Oyunun TUM ayarlanabilir sayilari burada.
 *
 * DoD kurali: kodda cıplak sayi (magic number) birakma. Bir sayiyi degistirmek
 * istedigimde tek dosyaya bakmam yeterli olmali; denge ayari (balancing) boyle yapilir.
 */

/** Slot satiri: baslangic ve tavan degerleri. Level ilerledikce slot sayisi artar. */
export const SLOTS = {
  /** Level 1'de ekranda kac slot var. */
  INITIAL: 7,
  /** Level ilerlemesiyle ulasilabilecek en fazla slot. */
  MAX: 9,
} as const;

/** Tray (alt secim seridi): oyuncuya ayni anda kac tile gosterilir. */
export const TRAY = {
  /** Ekranin altinda es zamanli gorunen tile sayisi. */
  VISIBLE: 3,

  /**
   * "Guvenlik" esigi: bu kadar veya daha az bos slot kaldiginda uretici,
   * tray'e ILERLEME saglayan bir tile koymak ZORUNDADIR.
   * Ilerleme = ya uclu tamamlar (kurtarma) ya da tahtadaki bir tile'in
   * yanina konup bitisik CIFT olusturur.
   *
   * Bu, spec'teki "no-stuck-state" garantisinin somut hali ve OLCUME GORE
   * oyunun tek tasiyici sabiti: kapatildiginda kusursuz oyuncu bile %100
   * kaybediyor. Neden yalnizca "kurtarma" yetmiyor: kurtarma ancak tahtada
   * uygun bir kalip (bitisik cift ya da X_X) varsa mumkundur; tahta tamamen
   * farkli tiplerden olusuyorsa is isten gecmis olur -- olculdu, oyuncu bazi
   * tohumlarda 7 hamlede, kendi hatasi olmadan kaybediyordu.
   *
   * Deger olcumle secildi (400 tohum, hata orani p ile parametrize oyuncu):
   *   esik 3 -> %10 hatali oyuncunun kaybi %62.8 (7/5) / %88.5 (9/9)
   *   esik 5 -> %9.3 / %9.8
   * Kusursuz oyuncu her iki degerde de %0 kaybediyor; fark tamamen yeni
   * oyuncunun lehine.
   */
  SAFETY_THRESHOLD: 5,

  /**
   * Tahtada zaten bulunan bir tipin tekrar uretilme olasiligi.
   *
   * Neden gerekli: havuzda 9 tip varken duz agirlikli rastgele uretim
   * eslesmeyi neredeyse imkansiz kilar; oyuncu birkac hamlede kaybeder.
   * Gercek oyunlar da bu yanliligi uygular. Deger oyun hissini belirleyen
   * ana ayar dugmesidir -- generator'un property testleri bunu olcuyor.
   */
  BOARD_BIAS: 0.55,
} as const;

/** Eslesme kurali: kac ayni tile yanyana gelince patlar. */
export const MATCH = {
  /** Triple-match turu: 3'lu. */
  LENGTH: 3,
} as const;

/** Skor formulu: puan = BASE * combo carpani. */
export const SCORE = {
  /** Tek bir 3'lu eslesmenin taban puani. */
  BASE_PER_MATCH: 10,
  /**
   * 3'un uzerindeki her ekstra tile'in getirdigi puan.
   * Ayri bir sabit: "4'lu eslesme 3'luden daha degerli olmali" kurali
   * kesirli aritmetige (10 * 4/3 = 13.33) kacmadan ifade edilsin diye.
   *
   * COMBO ile ayni kaderi paylasir: 4+ uzunlukta eslesme yalnizca zincirle
   * (iki grup birlesince) olusur, acgozlu oyunda gorulmez. Ikisi de beceri
   * tavani odulu; sifir olmadiklari surece "olu" degil, "nadir"dirler.
   */
  EXTRA_TILE_BONUS: 5,
  /** Zincirleme eslesmede her adimda carpanin artisi. */
  COMBO_STEP: 1,
  /**
   * Combo carpaninin ust siniri.
   *
   * 5 -> 3: 5 ULASILAMAZ bir degerdi. Zincirin her adimi en az MATCH.LENGTH
   * tile kaldirir ve satir kapasitesi en fazla SLOTS.MAX'tir, dolayisiyla
   * yapisal ust sinir floor(SLOTS.MAX / MATCH.LENGTH) = 3 adimdir.
   * config.test.ts bu sinirI artik zorluyor -- "hedefi olmayan tavan"
   * birakmiyoruz.
   *
   * Not: zincir EKLEME modelinde mumkun ama nadir. Acgozlu oyun ucluyu
   * aninda aldigi icin ayni tipten iki grup nadiren ayni anda tahtada
   * bulunur; zincir, grubu bilerek BOLEN bir oyuncunun odulu -- yani
   * beceri tavani. Olculdu: elle kurulmus [A A B B A A] + araya B ->
   * 2 adim, 7 tile, tahta temizlenir.
   */
  COMBO_MAX: 3,
  /**
   * Satiri TAMAMEN bosaltan her eslesme icin verilen bonus.
   *
   * DIKKAT -- bu "level sonu" bonusu DEGIL, her tam temizlemede verilir ve
   * oyun basina 1.8-2.4 kez tetiklenir. Bir donem yorumu "level bitiminde"
   * diyordu; kod hep boyle davraniyordu, yorum yanlisti.
   *
   * Bu sabit oyunun ZORLUK EGRISININ TA KENDISI. Olculdu: eslesme orani
   * korunum geregi 1/3'e cividir (hamle basina 1 tile girer, eslesme basina
   * 3 cikar) ve slot/tip sayisindan BAGIMSIZDIR. Dolayisiyla
   *   puan/hamle = BASE_PER_MATCH x (1/3) + PERFECT_SORT_BONUS x temizleme_orani
   * ve seviyeler arasi tek degisken temizleme oranidir. Bonus 0 yapilirsa
   * puan hizi her seviyede sabit 3.3 olur ve zorluk egrisi tamamen kaybolur.
   *
   * 50 -> 25 dusuruldu: 50'de skorun %69.8'ini tek basina uretiyordu ve
   * oturum suresi varyansini (p90/p50) 2.56'ya cikariyordu. 25'te pay ~%53,
   * varyans ~1.4.
   */
  PERFECT_SORT_BONUS: 25,
} as const;

/** Level ilerlemesi: zorluk egrisinin sinirlari. */
export const LEVEL = {
  /** Toplam level sayisi (Sprint 3 hedefi). */
  TOTAL: 30,
  /** Level 1'de kac farkli tile tipi havuzda. */
  MIN_TILE_TYPES: 5,
  /** Son levelde kac farkli tile tipi havuzda. */
  MAX_TILE_TYPES: 9,

  /** Kac levelde bir slot sayisi artar (7 -> 8 -> 9). */
  LEVELS_PER_SLOT_INCREASE: 10,

  /**
   * Level 1'in hedef skoru.
   *
   * PERFECT_SORT_BONUS 25'e ve SAFETY_THRESHOLD 5'e gore YENIDEN TURETILDI.
   * Onceki 120 degeri, bonusun 50 oldugu (ve skorun %70'ini urettigi) bir
   * dunyada olculmustu; o dunyada level 1 medyan 13.5 saniyede bitiyordu --
   * spec'in 30-90 sn hedef bandinin yarisi kadar.
   *
   * Yeni set (bonus 25 / safety 5 / taban 190 / adim 4) ile olculen sonuc:
   *   lvl  1  p50 31.5 sn   lvl 10  p50 36.0 sn
   *   lvl 20  p50 58.5 sn   lvl 30  p50 87.0 sn
   * 30 seviyenin 30'u da p50 olarak 30-90 sn bandinda (onceki set: 20/30).
   */
  BASE_TARGET_SCORE: 190,

  /**
   * Her levelde hedef skorun artisi.
   *
   * Bilerek KUCUK: asil zorluk hedefin yukselmesinden degil, puan HIZININ
   * dusmesinden geliyor. Olculdu: 9 slot + 9 tip yapilandirmasinda hiz
   * hamle basina ~4 puana iniyor, yani ayni hedef cok daha uzun suruyor.
   * Buyuk bir artis, son seviyeleri dakikalarca surecek hale getirirdi.
   */
  TARGET_SCORE_STEP: 4,
} as const;

/**
 * SIPARIS SISTEMI -- Sprint 3'un cekirdegi.
 *
 * NEDEN VAR: Sprint 2 sonunda oyun olculebilir bicimde DUZDU. Dusunen
 * oyuncu L1, L10 ve L30'u %100 kazaniyordu; hamlelerin %66.8'i hicbir sey
 * getirmiyordu; seviye 30 seviye 1'den zor degil, yalnizca UZUNDU
 * (21 -> 49 hamle).
 *
 * Kok sebep yapisal: eslesme orani 1/3'e CIVILI (hamle basina 1 tile girer,
 * eslesme basina 3 cikar) ve hicbir ayar bunu degistiremez. Yani zorluk
 * HIZDAN gelemez, KISITTAN gelmek zorunda. Siparis tam olarak bu: artik
 * butun eslesmeler esdeger degil, DOGRU eslesme onemli.
 *
 * SABIR HAMLE SAYAR, GERCEK ZAMAN DEGIL. Bu bir erisilebilirlik karari:
 * gercek zamanli sayac, ekran okuyucu kullanicisini etiketleri dinlerken
 * cezalandirirdi ve Sprint 2'de kurulan duyuru katmanini anlamsizlastirirdi.
 * Ek fayda: hamle bazli sabir DETERMINISTIK, yani simule edilip
 * ayarlanabilir -- bu dosyadaki her sayi gibi.
 *
 * ASAGIDAKI DEGERLER BASLANGIC TAHMINIDIR, olculup ayarlanacak.
 */
export const ORDER = {
  /** Bir siparisteki en az farkli tile turu. */
  MIN_LINES: 1,
  /** Bir siparisteki en fazla farkli tile turu. */
  MAX_LINES: 2,
  /**
   * Bir satirda istenebilecek en fazla eslesme adedi.
   *
   * 1'DE TUTULUYOR. Olcum: her birim ~3*T hamlelik ARZ gerektiriyor (asagi
   * bak), yani 2'ye cikarmak oturumu %40 uzatiyor ama zorlastirmiyor --
   * hedef skor dersinin aynisi.
   */
  MAX_PER_LINE: 1,
  /**
   * Her musteriye taban sabir (hamle) -- siparis buyuklugunden bagimsiz pay.
   */
  BASE_PATIENCE: 4,
  /**
   * Birim basina sabir = PATIENCE_PER_TYPE * tileTypeCount.
   *
   * TIP SAYISINI GORMEK ZORUNDA. Olculmus arz yasasi: belirli bir aileden
   * uclu kurmak icin o aileden 3 tile gerekir; tepsi hamle basina 1 tile
   * verir ve o tilein aranan aile olma olasiligi ~1/T. Yani BIR birim
   * ~3*T hamlelik arz demek.
   *
   * Sabit bir sabirla ne oldu (olculdu, 300 tohum): dusunen oyuncunun
   * kazanma orani L1'de %79.7 iken L30'da %1'e cokuyordu -- oyuncu
   * kotulestigi icin degil, formul tip sayisini gormedigi icin.
   * 2.4 degeri supurmeyle secildi: L1 %96 -> L30 %83.
   */
  PATIENCE_PER_TYPE: 2.4,
  /**
   * Ayni anda bekleyen musteri sayisi (masa).
   *
   * TEK MASA CALISMIYOR. Olculdu: tek masada oturum 72-104 hamle suruyor
   * ve hamlelerin yalnizca %11'i siparise dokunuyordu -- yani oyuncu
   * zamaninin %89'unda hedefiyle ilgisiz is yapiyordu. Uc masa bunu
   * %22'ye cikarip oturumu 37 hamleye indiriyor.
   */
  TABLES: 3,
  /** Seviye 1'de servis edilmesi gereken musteri sayisi. */
  BASE_CUSTOMERS: 4,
  /**
   * Son seviyede servis edilmesi gereken musteri sayisi.
   *
   * 8 DEGIL 6: musteri sayisini artirmak oturumu UZATIYOR, zorlastirmiyor
   * (L30'da 8 musteri = 147-185 hamle olculdu). Zorluk sabir sikiligindan
   * gelmeli, nicelikten degil.
   */
  MAX_CUSTOMERS: 6,
  /**
   * Kac musteri kaybedilince seviye biter.
   *
   * Satirin dolmasi HALA kaybettirir; bu IKINCI bir kaybetme yolu.
   * Sprint 2'de tek kaybetme yolu vardi ve dusunen oyuncu ona hic
   * dusmuyordu -- yani pratikte kaybetme yolu YOKTU.
   */
  MAX_LOST: 3,
  /**
   * Sabir bu esigin altina dustugunde uretici siparisi KOLLAMAYA baslar.
   *
   * Gerekce, satir guvenligiyle ayni: oyuncu kendi hatasi olmadan, sirf
   * istedigi tip tepsiye hic gelmedigi icin musteri kaybetmemeli.
   * ONCELIK SIRASI: once satir guvenligi, sonra siparis adaleti --
   * seviyeyi tumden kaybetmek, bir musteriyi kaybetmekten kotudur.
   */
  DEMAND_PRESSURE: 8,
} as const;

/**
 * OZEL GUCLER -- ajans katmani.
 *
 * NEDEN VAR (olcumle): siparis sistemi baski ve tempo getirdi ama AJANS
 * getirmedi. Olculdu: siparis-farkinda politika ile siparisi tamamen
 * umursamayan politika ayni kazaniyordu (L30'da %88.7 vs %87.3), ve tepsiyi
 * 3'ten 6'ya cikarmak hicbir sey degistirmedi (%11.2 -> %10.5).
 *
 * Kok sebep yapisal: belirli bir aileden uclu kurmak ~3*T hamlelik ARZ
 * gerektiriyor ve oyuncunun bunun uzerinde HICBIR etkisi yok. Yani karar
 * arzin belirledigi bir seydi, oyuncunun degil.
 *
 * SEMAVER tam olarak bunu kirar: tepsideki bir tile'i istedigin aileye
 * cevirir. Sarj kit oldugu icin "simdi mi harcasam, saklasam mi" sorusu
 * dogar -- arzin belirlemedigi ILK gercek karar.
 *
 * Neden matcher'a joker eklemedik: joker eslesme kurallarini degistirirdi
 * ve core'un en cok test edilen dosyasini riske atardi. Semaver donusumu
 * YERLESTIRMEDEN ONCE oluyor; matcher hicbir sey bilmiyor.
 */
export const POWER = {
  /** Seviye basinda verilen semaver sarji. */
  SEMAVER_START: 1,
  /**
   * Kac musteri servis edilince bir sarj kazanilir.
   *
   * 2 DEGIL 3 (olcumle duzeltildi). 2 iken sarj o kadar hizli yenileniyordu
   * ki baskin strateji "gordugun an harca" oluyordu: savurgan politika
   * akilli politikayi YENIYORDU (L30'da %96.7 vs %89.3). Bedava avantaj
   * bir tahsis karari degildir; kaynak gercekten kit olmali.
   */
  SEMAVER_PER_CUSTOMERS: 3,
  /** Ayni anda tasinabilecek en fazla sarj. Biriktirip bosa harcama olmasin. */
  SEMAVER_MAX: 2,
} as const;

/** Animasyon sureleri (ms). UI thread'de Reanimated ile calisirlar. */
export const ANIM = {
  /** Tile'in tray'den slot'a ucus suresi. */
  PLACE_MS: 220,
  /** Eslesen uclunun kaybolma suresi. */
  MATCH_BURST_MS: 320,
  /** Slot'lar bosluk kapatirken kayma suresi. */
  COLLAPSE_MS: 180,
  /**
   * Combo banner'inin ekranda KALMA suresi.
   *
   * Sprint 2 kalite kapisinda yakalandi: bu sabit "ekranda kalma suresi"
   * diye belgelenmisti ama hicbir yerde zamanlayici yoktu -- banner bir
   * sonraki hamleye kadar duruyordu. Artik `clearCombo` ile gercekten
   * uygulaniyor.
   */
  COMBO_BANNER_MS: 900,
  /** Banner'in acilma/kapanma gecisi. Kalma suresinden AYRI sabit. */
  COMBO_FADE_MS: 225,
} as const;

/** Dokunma hedefi olculeri (pt/dp). iOS HIG >= 44, Material >= 48. */
export const TOUCH = {
  MIN_TARGET: 48,
} as const;

/** Kalici depolama anahtarlari. Tek yerde durmali ki yazim hatasi sessizce veri kaybettirmesin. */
export const STORAGE_KEYS = {
  HIGH_SCORE: 'cb.highScore',
  CURRENT_LEVEL: 'cb.currentLevel',
  UNLOCKED_LEVELS: 'cb.unlockedLevels',
  SOUND_ENABLED: 'cb.soundEnabled',
  HAPTICS_ENABLED: 'cb.hapticsEnabled',
} as const;

// ---------------------------------------------------------------------------
// UI olcu token'lari
//
// DoD "ciplak sayi birakma" kurali StyleSheet icin de gecerli: 24 bes dosyada,
// 0.7 iki dosyada tekrar ediyordu. Tek bir olcek olmadan her ekran kendi
// fontSize/padding kararini veriyor ve tasarim sessizce dagiliyor.
// ---------------------------------------------------------------------------

/** 4'un katlarina dayali bosluk olcegi. */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 24,
} as const;

/** Tipografi olcegi (punto). */
export const TYPO = {
  /** Ana ekran basligi. */
  title: 32,
  /** Ekran basligi. */
  heading: 24,
  /** Alt baslik / 404 basligi. */
  subheading: 20,
  /** Buton etiketi. */
  button: 17,
  /** Govde metni. */
  body: 16,
  /** Ipucu / yardimci metin. */
  caption: 14,
} as const;

/** Yazi kalinliklari. Tutarlilik icin string olarak sabitlendi ('bold' ve '700' karisimi olmasin). */
export const WEIGHT = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;

/** Kose yaricaplari. */
export const RADIUS = {
  button: 14,
} as const;

/** Saydamlik degerleri. */
export const OPACITY = {
  /** Basili durum geri bildirimi. */
  pressed: 0.75,
  /** Devre disi kontrol. 0.4 kontrasti 2.15:1'e dusuruyordu; 0.55 okunur tutuyor. */
  disabled: 0.55,
  /** Yardimci/ikincil metin. */
  muted: 0.7,
} as const;

/** Ikon olculeri. */
export const ICON = {
  tab: 28,
} as const;

/**
 * Tile uretim agirliklari.
 *
 * DoD "ciplak sayi yok" kurali geregi tiles.ts'teki 25 tanimda literal
 * yerine bu token'lar kullanilir.
 *
 * Aralik OLCUME GORE genisletildi. Onceki 5-10 araligi yalanci bir ayar
 * dugmesiydi: gercek agirliklarla tamamen duz agirlik (hepsi 8) arasindaki
 * fark %1.2 olculdu -- tohum gurultusunun altinda. Sebep iki katmanli
 * seyrelme: `pickTilePool` aileye round-robin dagittigi icin havuz ici
 * maks/min oran ~1.8'de kaliyor, ustelik cekimlerin %55'i zaten
 * TRAY.BOARD_BIAS ile tahtadan geliyor ve agirliga hic ugramiyor.
 * 3-12 araligi kolu olculebilir hale getirir.
 */
export const TILE_WEIGHT = {
  /** Tema merkezindeki nesneler (cay, simit). */
  HERO: 12,
  /** Sik gorulen nesneler. */
  COMMON: 9,
  /** Standart. */
  NORMAL: 6,
  /** "Ozel" nesneler (vapur, kayik, balik). */
  RARE: 3,
} as const;

/**
 * Tile gorsel olculeri.
 *
 * Tile GENISLIGI calisma zamaninda hesaplanir (ekran genisligi / slot sayisi),
 * cunku slot sayisi seviyeye gore 7-9 arasi degisir. Buradakiler oranlar ve
 * degismezler.
 */
export const TILE_UI = {
  /** Tile'in en fazla genisligi (genis ekranlarda buyuyup sismesin). */
  MAX_SIZE: 56,
  /**
   * Tile'in en az genisligi.
   *
   * 24 OLCUMLE secildi: 9 slot, 320pt ekran (iPhone SE) ve 24pt kenar
   * boslugu ile kullanilabilir genislik 272pt. 9 tile + 8 bosluk =
   * 9t + 32 <= 272 -> t <= 26. Taban 28 iken satir TASIYORDU; layout
   * testi bunu yakaladi.
   *
   * Gorsel olarak kucuk ama dokunma alani sorun degil: TilePreview
   * hitSlop ile hedefi TOUCH.MIN_TARGET'a tamamliyor.
   */
  MIN_SIZE: 24,
  /** Tile'lar arasi bosluk. */
  GAP: 4,
  /** Kose yuvarlakligi, tile boyutunun orani. */
  RADIUS_RATIO: 0.22,
  /** Form isaretinin tile icindeki orani. */
  SHAPE_RATIO: 0.62,
  /** Glif (emoji) yazi boyutunun tile boyutuna orani. */
  GLYPH_RATIO: 0.44,
  /** Secili tile'in buyume orani. */
  SELECTED_SCALE: 1.12,
} as const;

/**
 * Ekleme konumu gostergesi (tile'lar arasindaki cizgiler).
 *
 * IKI SORUN, IKI COZUM:
 *
 * 1. LAYOUT GENISLIGI: gostergeler satirda yer kaplarsa 9 slotlu seviye
 *    hicbir telefona sigmaz -- olculdu, 320pt ekranda satir 352pt oluyordu.
 *    Cozum: gostergeler MUTLAK konumlandirilir, layout genisligi tuketmez.
 *
 * 2. DOKUNMA HEDEFI: gorsel cizgi 4-6 birim genisliginde, oysa iOS HIG 44pt
 *    / Material 48dp ister. Cozum: `hitSlop` ile dokunma alani genisletilir.
 *
 * Not: komsu ekleme noktalarinin dokunma alanlari, tile genisligi
 * 2*TOUCH_PADDING'den kucukse ortusur. Bu kabul edilebilir -- ortusen
 * bolgede uste cizilen kazanir ve iki konum da "ayni bolgeye ekle"
 * anlamina gelir. Ekran okuyucu kullanicisi zaten etiketten secer.
 */
const INSERT_INDICATOR_WIDTH = 4;

export const INSERT_UI = {
  /**
   * Gorunen gosterge genisligi.
   *
   * TILE_UI.GAP'ten BUYUK OLAMAZ: gosterge bosluklarin tam ortasina
   * konumlaniyor (`left = GAP + i*step - GAP/2 - WIDTH/2`); genisletilirse
   * kenardaki iki gosterge kapsayicinin disina tasar.
   * `config.test.ts` bu iliskiyi zorluyor.
   */
  WIDTH: INSERT_INDICATOR_WIDTH,
  /**
   * hitSlop ile her iki yana eklenen dokunma payi.
   *
   * TURETILMIS, literal degil. Sprint 2 kalite kapisinda uc ajan birbirinden
   * bagimsiz olarak ayni seyi buldu: deger 14 yazildiginda gercek dokunma
   * hedefi 4 + 2*14 = 32pt oluyordu -- yorum HIG/Material esiginin
   * saglandigini iddia ederken aritmetik tam tersini soyluyordu.
   * Sayiyi config'e koymak yetmiyor; ILISKIYI de config'e koymak gerekiyor.
   */
  TOUCH_PADDING: (TOUCH.MIN_TARGET - INSERT_INDICATOR_WIDTH) / 2,
  /** Gostergenin yuksekligi, tile boyutunun orani. */
  HEIGHT_RATIO: 0.92,
} as const;
