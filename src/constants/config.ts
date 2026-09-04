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
   * "Kurtarma" esigi: bu kadar veya daha az bos slot kaldiginda uretici,
   * mumkunse tray'e eslesme tamamlayabilen bir tile koymak ZORUNDADIR.
   *
   * Bu, spec'teki "no-stuck-state" garantisinin somut hali. 2 secildi:
   * oyuncuya bir hamle manevra payi birakir, ama kurtarmayi da geciktirmez.
   */
  RESCUE_THRESHOLD: 2,

  /**
   * "Guvenlik" esigi: bu kadar veya daha az bos slot kaldiginda uretici,
   * tray'e en azindan ILERLEME saglayan bir tile koymak zorundadir.
   *
   * Neden RESCUE tek basina yetmiyor: kurtarma ancak bir uclu TAMAMLANABILIYORSA
   * mumkundur. Tahtada hicbir bitisik cift yoksa hicbir tek tile uclu yapamaz --
   * yani kurtarma esigine gelindiginde is isten gecmis olur. Olculdu: bu katman
   * olmadan oyuncu bazi tohumlarda 7 hamlede, kendi hatasi olmadan kaybediyordu.
   *
   * Ilerleme = ya uclu tamamlar ya da tahtadaki bir tile'in yanina konup
   * bitisik CIFT olusturur.
   */
  SAFETY_THRESHOLD: 3,

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
   */
  EXTRA_TILE_BONUS: 5,
  /** Zincirleme eslesmede her adimda carpanin artisi. */
  COMBO_STEP: 1,
  /** Combo carpaninin ust siniri (sonsuz buyumeyi engeller). */
  COMBO_MAX: 5,
  /** Level bitiminde satir tamamen bossa verilen bonus. */
  PERFECT_SORT_BONUS: 50,
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
   * Olculdu: 7 slot + 5 tip yapilandirmasinda oyuncu UZUN VADEDE hamle
   * basina ~11 puan topluyor, ama acilis hamleleri puan getirmez (once
   * tahtayi kurman gerekir). Gercek olcum: 120 puan ~20-25 hamle, yani
   * ~30-40 saniyelik bir ilk oturum. Ilk seviye hizli ve cesaretlendirici
   * olsun diye bilerek dusuk tutuldu.
   */
  BASE_TARGET_SCORE: 120,

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

/** Animasyon sureleri (ms). UI thread'de Reanimated ile calisirlar. */
export const ANIM = {
  /** Tile'in tray'den slot'a ucus suresi. */
  PLACE_MS: 220,
  /** Eslesen uclunun kaybolma suresi. */
  MATCH_BURST_MS: 320,
  /** Slot'lar bosluk kapatirken kayma suresi. */
  COLLAPSE_MS: 180,
  /** Combo banner'inin ekranda kalma suresi. */
  COMBO_BANNER_MS: 900,
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
