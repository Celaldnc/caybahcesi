/**
 * Deterministik (tohumlu) rastgele sayi uretici.
 *
 * Neden Math.random() degil?
 *  1. "Daily" modu: herkes ayni gun ayni tahtayi gormeli -> ayni tohum, ayni dizi.
 *  2. Test edilebilirlik: generator'un "no-stuck-state" garantisini ancak
 *     tekrarlanabilir bir rastgelelikle dogrulayabiliriz. Math.random() ile
 *     kirmizi olan test yarin yesil olur; boyle bir test ise yaramaz.
 *
 * Algoritma: mulberry32 -- 32-bit durumlu, ~10 satir, hizli ve dagilimi
 * oyun icin fazlasiyla yeterli. Kriptografik DEGILDIR; sifre/token uretiminde
 * asla kullanma.
 *
 * Bu dosya saf TypeScript'tir: React/React Native/Expo import etmez (bkz. eslint.config.js).
 */

export interface Rng {
  /** [0, 1) araliginda sonraki sayi. */
  next(): number;
  /** [0, maxExclusive) araliginda tam sayi. */
  int(maxExclusive: number): number;
  /** Diziden rastgele bir eleman secer. Bos dizide hata firlatir. */
  pick<T>(items: readonly T[]): T;
  /** Diziyi bozmadan karistirilmis bir kopyasini dondurur (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
}

/** 32-bit'e sigmayan tohumlari guvenle daraltir. */
function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new RangeError(`Tohum sonlu bir sayi olmali, alinan: ${seed}`);
  }
  // >>> 0 : isaretsiz 32-bit'e cevirir. Negatif ve ondalikli tohumlar da calisir.
  return Math.trunc(seed) >>> 0;
}

/**
 * Verilen tohumla bir uretici olusturur.
 * Ayni tohum -> her zaman ayni sayi dizisi.
 */
export function createRng(seed: number): Rng {
  let state = normalizeSeed(seed);

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError(`maxExclusive pozitif tam sayi olmali, alinan: ${maxExclusive}`);
    }
    return Math.floor(next() * maxExclusive);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new RangeError('Bos diziden eleman secilemez.');
    }
    // noUncheckedIndexedAccess acik oldugu icin TS burada T | undefined gorur.
    // Uzunlugu yukarida kontrol ettik, bu yuzden non-null assertion guvenli.
    return items[int(items.length)]!;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const a = copy[i]!;
      const b = copy[j]!;
      copy[i] = b;
      copy[j] = a;
    }
    return copy;
  };

  return { next, int, pick, shuffle };
}

/**
 * Metinden kararli bir tohum uretir (FNV-1a 32-bit).
 * Kullanim: seedFromString('2026-09-04') -> gunluk bulmaca tohumu.
 */
export function seedFromString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Bir tarihi "YYYY-MM-DD" gunluk tohumuna cevirir (UTC bazli).
 * UTC secildi: Turkiye'deki ve Japonya'daki oyuncu ayni takvim gununde ayni
 * bulmacayi gorsun diye. Yerel saat kullansaydik tahta saat dilimine gore kayardi.
 */
export function dailySeed(date: Date): number {
  const iso = date.toISOString().slice(0, 10);
  return seedFromString(iso);
}
