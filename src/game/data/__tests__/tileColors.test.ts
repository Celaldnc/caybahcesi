import { ALL_FAMILIES, ALL_TILE_IDS, getTileDefinition } from '@/game/core/tiles';

import { FAMILY_COLOR, TILE_COLOR, TILE_INK, inkFor, relativeLuminance } from '../tileColors';

/**
 * Renk erisilebilirliginin KALICI bekcisi.
 *
 * Bu olcumler bir kez elle yapildi ve palet ona gore tasarlandi. Test
 * olmadan bir sonraki "su rengi biraz daha pembe yapalim" duzenlemesi
 * garantiyi sessizce bozardi -- ilk denemede tam bu oldu: ton bazli palette
 * lokum ile deniz protanopide 0.4 mesafeye dusuyordu (pratikte ayni renk).
 */

// ---------------------------------------------------------------------------
// Renk bilimi yardimcilari (Vienot/Brettel LMS yaklasimi)
// ---------------------------------------------------------------------------

type Rgb = readonly [number, number, number];
type Vision = 'normal' | 'protanopi' | 'doteranopi' | 'tritanopi';

const hexToRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toLinear = (channel: number): number => {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const fromLinear = (value: number): number => {
  const v = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as unknown as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const RGB_TO_LMS = [
  [0.31399022, 0.63951294, 0.04649755],
  [0.15537241, 0.75789446, 0.08670142],
  [0.01775239, 0.10944209, 0.87256922],
] as const;

const LMS_TO_RGB = [
  [5.47221206, -4.6419601, 0.16963708],
  [-1.1252419, 2.29317094, -0.1678952],
  [0.02980165, -0.19318073, 1.16364789],
] as const;

const SIMULATION: Record<Exclude<Vision, 'normal'>, readonly (readonly number[])[]> = {
  protanopi: [
    [0, 1.05118294, -0.05116099],
    [0, 1, 0],
    [0, 0, 1],
  ],
  doteranopi: [
    [1, 0, 0],
    [0.9513092, 0, 0.04866992],
    [0, 0, 1],
  ],
  tritanopi: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.86744736, 1.86727089, 0],
  ],
};

const apply = (matrix: readonly (readonly number[])[], v: Rgb): Rgb =>
  matrix.map((r) => r[0]! * v[0] + r[1]! * v[1] + r[2]! * v[2]) as unknown as Rgb;

/** Verilen rengi belirtilen gorme tipinde nasil gorunecegine cevirir. */
function simulate(hex: string, vision: Vision): string {
  if (vision === 'normal') return hex;
  const linear = hexToRgb(hex).map(toLinear) as unknown as Rgb;
  const simulated = apply(LMS_TO_RGB, apply(SIMULATION[vision], apply(RGB_TO_LMS, linear)));
  return `#${simulated.map((c) => fromLinear(c).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * CIELAB'a cevirir (D65). Algisal olarak DUZGUN uzay.
 *
 * Neden lineer RGB Euclid degil: o metrik karanlik ucta SIKISIR. Iki koyu
 * renk algisal olarak rahat ayirt edilse bile kucuk mesafe verir; olcum
 * sirasinda tam bu yasandi -- kahve/nazar/cay uclusu "cok yakin" gorunuyordu,
 * oysa CIELAB'da 20+ dE ile ayriktilar. Yanlis olan palet degil, metrikti.
 */
function toLab(hex: string): readonly [number, number, number] {
  const RGB_TO_XYZ = [
    [0.4124564, 0.3575761, 0.1804375],
    [0.2126729, 0.7151522, 0.072175],
    [0.0193339, 0.119192, 0.9503041],
  ] as const;
  const WHITE = [0.95047, 1.0, 1.08883] as const;
  const pivot = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  const linear = hexToRgb(hex).map(toLinear) as unknown as Rgb;
  const xyz = RGB_TO_XYZ.map(
    (row) => row[0]! * linear[0] + row[1]! * linear[1] + row[2]! * linear[2],
  ).map((c, i) => c / WHITE[i]!);
  const [fx, fy, fz] = xyz.map(pivot) as unknown as Rgb;

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIELAB dE76 -- algisal renk farki. dE>10 "bakar bakmaz fark edilir". */
function distance(a: string, b: string): number {
  const A = toLab(a);
  const B = toLab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

const VISIONS: readonly Vision[] = ['normal', 'protanopi', 'doteranopi', 'tritanopi'];

/** Iki rengin EN KOTU durumdaki (tum gorme tipleri) ayirt edilebilirligi. */
function worstCaseDistance(a: string, b: string): number {
  return Math.min(...VISIONS.map((v) => distance(simulate(a, v), simulate(b, v))));
}

// ---------------------------------------------------------------------------

describe('renk bilimi yardimcilari (kendi dogrulugu)', () => {
  it('siyah-beyaz kontrasti 21:1 dir', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('ayni renk 1:1 kontrast ve 0 mesafe verir', () => {
    expect(contrastRatio('#9C4526', '#9C4526')).toBeCloseTo(1, 5);
    expect(distance('#9C4526', '#9C4526')).toBeCloseTo(0, 5);
  });

  /** CIELAB'in dogrulugu: siyah L*=0, beyaz L*=100. */
  it('CIELAB olcegi dogru kalibre', () => {
    expect(toLab('#000000')[0]).toBeCloseTo(0, 1);
    expect(toLab('#FFFFFF')[0]).toBeCloseTo(100, 1);
  });

  it('karanlik uctaki renkleri de ayirt eder (lineer RGB metriginin coktugu yer)', () => {
    // Koyu kahve ve koyu mavi: lineer RGB'de mesafe kucuk, CIELAB'da buyuk.
    expect(distance('#3B2C24', '#264A72')).toBeGreaterThan(15);
  });

  it('normal gorme simulasyonu rengi degistirmez', () => {
    expect(simulate('#9C4526', 'normal')).toBe('#9C4526');
  });

  /**
   * Simulasyonun gercekten bir sey yaptigini kanitla, yoksa tum palet
   * testleri vakumdur.
   *
   * DOGRU iddia: protanopide kirmizi ve yesil AYNI TONA (sari) coker --
   * yani her ikisinde de R ve G kanallari birbirine yaklasir. Yanlis iddia
   * ise "aralarindaki mesafe kucululur" olurdu: protanop kirmiziyi cok daha
   * KOYU gordugu icin lineer RGB mesafesi buyuyebilir, nitekim buyuyor
   * (70.7 -> 93.2). Ayrimi tasiyan sey ton degil, luminanstir.
   */
  it('renk korlugu simulasyonu kirmizi ve yesili ayni tona (sari) cokertir', () => {
    for (const source of ['#FF0000', '#00FF00']) {
      const [r, g] = hexToRgb(simulate(source, 'protanopi'));
      expect(Math.abs(r - g)).toBeLessThan(12);
    }
  });

  it('protanopi kirmiziyi koyulastirir (ayrimi luminans tasir)', () => {
    expect(luminance(simulate('#FF0000', 'protanopi'))).toBeLessThan(luminance('#FF0000'));
  });

  it('mavi protanopi ve doteranopiden etkilenmez', () => {
    expect(simulate('#0000FF', 'protanopi')).toBe('#0000ff');
    expect(simulate('#0000FF', 'doteranopi')).toBe('#0000ff');
  });
});

describe('FAMILY_COLOR', () => {
  it('her aile icin renk tanimli', () => {
    for (const family of ALL_FAMILIES) {
      expect(FAMILY_COLOR[family]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('aile renkleri benzersizdir', () => {
    const values = Object.values(FAMILY_COLOR);
    expect(new Set(values).size).toBe(values.length);
  });

  /**
   * ACIKLIK MERDIVENI -- paletin tasarim ilkesi.
   * Ton farki renk korlugunde cokebilir, aciklik farki korunur.
   */
  it('aile renkleri artan aciklik sirasindadir', () => {
    const ladder = Object.values(FAMILY_COLOR).map(luminance);
    expect([...ladder].sort((a, b) => a - b)).toEqual(ladder);
  });

  /**
   * ASIL GARANTI: havuzda her aileden en fazla bir tile bulundugu icin
   * ekranda ayni anda gorunen renkler tam olarak bu 9 renktir. Hepsi
   * her gorme tipinde birbirinden ayirt edilebilmeli.
   *
   * ESIK NEDEN 10: CIELAB'da dE>10 "bakar bakmaz fark edilir" kabul edilir.
   * Daha yuksek bir esik denendi ve renkleri doygunluk uclarina itiyor
   * (fusya/asit sarisi), cay bahcesi estetigini yok ediyordu; mat kisitlar
   * altinda olculen tavan dE ~11-12. Formun birincil kanal olmasi (ve
   * matematiksel olarak garanti edilmesi) 10'u yeterli kiliyor.
   */
  it('36 aile ciftinin tamami her gorme tipinde ayirt edilebilir', () => {
    const families = ALL_FAMILIES;
    const tooClose: string[] = [];

    for (let i = 0; i < families.length; i++) {
      for (let j = i + 1; j < families.length; j++) {
        const a = families[i]!;
        const b = families[j]!;
        const worst = worstCaseDistance(FAMILY_COLOR[a], FAMILY_COLOR[b]);
        if (worst < 10) tooClose.push(`${a}-${b} (dE=${worst.toFixed(1)})`);
      }
    }

    expect(tooClose).toEqual([]);
  });

  /** Merdivenin uclari zemine karismasin diye kenarlik zorunlu (bkz. TILE_BORDER_WIDTH). */
  it('aciklik merdiveni yeterince genis yayilir', () => {
    const values = Object.values(FAMILY_COLOR).map(luminance);
    const darkest = Math.min(...values);
    const lightest = Math.max(...values);
    expect(lightest / darkest).toBeGreaterThan(10);
  });
});

describe('TILE_COLOR', () => {
  it('her tile icin renk tanimli', () => {
    for (const id of ALL_TILE_IDS) {
      const { colorToken } = getTileDefinition(id);
      expect(TILE_COLOR[colorToken]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('ayni ailedeki tile lar farkli renk kullanir', () => {
    const byFamily = new Map<string, string[]>();
    for (const id of ALL_TILE_IDS) {
      const def = getTileDefinition(id);
      byFamily.set(def.family, [...(byFamily.get(def.family) ?? []), TILE_COLOR[def.colorToken]]);
    }
    for (const colors of byFamily.values()) {
      expect(new Set(colors).size).toBe(colors.length);
    }
  });
});

describe('inkFor', () => {
  /**
   * Her tile'in uzerindeki glif/isaret okunabilir olmali.
   * WCAG AA kucuk metin esigi 4.5:1.
   */
  it('her tile rengi icin secilen murekkep >= 4.5:1 kontrast saglar', () => {
    const weak: string[] = [];

    for (const id of ALL_TILE_IDS) {
      const color = TILE_COLOR[getTileDefinition(id).colorToken];
      const ratio = contrastRatio(color, inkFor(color));
      if (ratio < 4.5) weak.push(`${id} (${ratio.toFixed(2)}:1)`);
    }

    expect(weak).toEqual([]);
  });

  it('koyu dolguda acik, acik dolguda koyu murekkep secer', () => {
    expect(inkFor('#000000')).toBe(TILE_INK.light);
    expect(inkFor('#FFFFFF')).toBe(TILE_INK.dark);
  });

  /**
   * OLU BOLGE: 0.1833 < L < 0.2232 araliginda hicbir murekkep 4.5:1
   * saglayamaz. Hicbir tile bu bantta olmamali -- iki tile bir kez
   * dusmustu (cayKulplu, pideKiyma) ve disari tasindi.
   */
  it('hicbir tile murekkep olu bolgesinde degil', () => {
    const inDeadZone: string[] = [];
    for (const id of ALL_TILE_IDS) {
      const color = TILE_COLOR[getTileDefinition(id).colorToken];
      const l = relativeLuminance(color);
      if (l > 0.1833 && l < 0.2232) inDeadZone.push(`${id} (L=${l.toFixed(4)})`);
    }
    expect(inDeadZone).toEqual([]);
  });
});
