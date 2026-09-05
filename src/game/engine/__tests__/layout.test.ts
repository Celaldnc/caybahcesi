import { SLOTS, SPACING, TILE_UI } from '@/constants/config';

import { computeTileSize, rowOverflows, rowWidth } from '../layout';

describe('computeTileSize', () => {
  it('genis ekranda tavan boyutu asmaz', () => {
    expect(computeTileSize(2000, SLOTS.INITIAL)).toBe(TILE_UI.MAX_SIZE);
  });

  it('dar ekranda taban boyutun altina inmez', () => {
    expect(computeTileSize(50, SLOTS.MAX)).toBe(TILE_UI.MIN_SIZE);
  });

  it('slot sayisi arttikca tile kuculur', () => {
    const width = 360;
    expect(computeTileSize(width, 9)).toBeLessThanOrEqual(computeTileSize(width, 7));
  });

  it('tam sayi dondurur (yarim piksel yerlesimi bozar)', () => {
    for (const width of [320, 360, 390, 414, 430]) {
      for (let slots = SLOTS.INITIAL; slots <= SLOTS.MAX; slots++) {
        expect(Number.isInteger(computeTileSize(width, slots))).toBe(true);
      }
    }
  });

  it('gecersiz genisligi guvenle karsilar', () => {
    expect(computeTileSize(0, 7)).toBe(TILE_UI.MIN_SIZE);
    expect(computeTileSize(-100, 7)).toBe(TILE_UI.MIN_SIZE);
    expect(computeTileSize(NaN, 7)).toBe(TILE_UI.MIN_SIZE);
  });

  it('gecersiz slot sayisini reddeder', () => {
    expect(() => computeTileSize(360, 0)).toThrow(RangeError);
    expect(() => computeTileSize(360, -3)).toThrow(RangeError);
    expect(() => computeTileSize(360, 2.5)).toThrow(RangeError);
  });
});

describe('rowWidth', () => {
  it('slot sayisiyla artar', () => {
    expect(rowWidth(40, 9)).toBeGreaterThan(rowWidth(40, 7));
  });

  it('tile boyutuyla artar', () => {
    expect(rowWidth(50, 7)).toBeGreaterThan(rowWidth(40, 7));
  });
});

describe('gercek cihaz genislikleri', () => {
  /**
   * ASIL SORU: en zor durumda (9 slot, en dar yaygin telefon) satir sigiyor mu?
   *
   * 320pt iPhone SE (1. nesil) genisligidir; ekran kenar boslugu dustukten
   * sonra ~272pt kalir. Bu test gecmezse `SlotRow` kaydirmali bir kapsayiciya
   * alinmali -- sessizce tasmasina izin verilmemeli.
   *
   * SPRINT 2 KALITE KAPISI: bu testler ZATEN GECIYORDU ama `rowWidth`
   * bilesenin `paddingHorizontal`ini saymadigi icin YANLIS GENISLIGI
   * olcuyorlardi -- 21 ekran/slot kombinasyonunun 19'unda satir gercekte
   * 1-8pt tasiyordu ve test "sigiyor" diyordu. Olcum dogruydu, olculen sey
   * yanlisti. `rowWidth` duzeltildi; asagidaki `SlotRow` testi ikisinin
   * ayrismasini da engelliyor.
   */
  const DEVICES: readonly (readonly [string, number])[] = [
    ['iPhone SE (320)', 320],
    ['iPhone 13 mini (375)', 375],
    ['iPhone 15 (393)', 393],
    ['Pixel 7 (412)', 412],
  ];

  it.each(DEVICES)('%s: en zor seviye (9 slot) tasmadan sigar', (_name, width) => {
    const available = width - 2 * SPACING.xl; // ekran kenar bosluklari
    expect(rowOverflows(available, SLOTS.MAX)).toBe(false);
  });

  it.each(DEVICES)('%s: baslangic seviyesi (7 slot) tasmadan sigar', (_name, width) => {
    const available = width - 2 * SPACING.xl;
    expect(rowOverflows(available, SLOTS.INITIAL)).toBe(false);
  });

  it('hesaplanan boyut en dar cihazda bile okunabilir kalir', () => {
    const available = 320 - 2 * SPACING.xl;
    expect(computeTileSize(available, SLOTS.MAX)).toBeGreaterThanOrEqual(TILE_UI.MIN_SIZE);
  });
});
