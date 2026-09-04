import { createRng, dailySeed, seedFromString } from '../rng';

describe('createRng', () => {
  describe('determinizm', () => {
    it('ayni tohum ayni diziyi uretir', () => {
      const a = createRng(42);
      const b = createRng(42);
      const seqA = Array.from({ length: 20 }, () => a.next());
      const seqB = Array.from({ length: 20 }, () => b.next());
      expect(seqA).toEqual(seqB);
    });

    it('farkli tohum farkli dizi uretir', () => {
      const a = createRng(1);
      const b = createRng(2);
      expect(a.next()).not.toBe(b.next());
    });

    it('negatif ve ondalikli tohumu kabul eder', () => {
      expect(() => createRng(-7.9)).not.toThrow();
      expect(createRng(-7.9).next()).toBe(createRng(-7.9).next());
    });

    it('sonlu olmayan tohumu reddeder', () => {
      expect(() => createRng(NaN)).toThrow(RangeError);
      expect(() => createRng(Infinity)).toThrow(RangeError);
    });
  });

  describe('next', () => {
    it('her zaman [0, 1) araliginda kalir', () => {
      const rng = createRng(2026);
      for (let i = 0; i < 5000; i++) {
        const v = rng.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('tek bir degere saplanip kalmaz', () => {
      const rng = createRng(7);
      const unique = new Set(Array.from({ length: 500 }, () => rng.next()));
      expect(unique.size).toBeGreaterThan(400);
    });
  });

  describe('int', () => {
    it('[0, maxExclusive) araliginda uretir', () => {
      const rng = createRng(99);
      for (let i = 0; i < 2000; i++) {
        const v = rng.int(7);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(7);
      }
    });

    it('int(1) her zaman 0 dondurur (sinir durumu)', () => {
      const rng = createRng(5);
      expect([rng.int(1), rng.int(1), rng.int(1)]).toEqual([0, 0, 0]);
    });

    it('tum degerlere ulasir (7 slot senaryosu)', () => {
      const rng = createRng(123);
      const seen = new Set<number>();
      for (let i = 0; i < 1000; i++) seen.add(rng.int(7));
      expect(seen.size).toBe(7);
    });

    it('gecersiz ust siniri reddeder', () => {
      const rng = createRng(1);
      expect(() => rng.int(0)).toThrow(RangeError);
      expect(() => rng.int(-3)).toThrow(RangeError);
      expect(() => rng.int(2.5)).toThrow(RangeError);
    });
  });

  describe('pick', () => {
    it('her zaman dizinin icinden bir eleman dondurur', () => {
      const rng = createRng(11);
      const tiles = ['cay', 'kahve', 'nazar', 'lokum'] as const;
      for (let i = 0; i < 200; i++) {
        expect(tiles).toContain(rng.pick(tiles));
      }
    });

    it('tek elemanli dizide o elemani dondurur', () => {
      expect(createRng(3).pick(['simit'])).toBe('simit');
    });

    it('bos dizide hata firlatir', () => {
      expect(() => createRng(1).pick([])).toThrow(RangeError);
    });
  });

  describe('shuffle', () => {
    it('kaynak diziyi degistirmez (saf fonksiyon)', () => {
      const source = [1, 2, 3, 4, 5];
      const snapshot = [...source];
      createRng(8).shuffle(source);
      expect(source).toEqual(snapshot);
    });

    it('ayni elemanlari korur, sadece sirayi degistirir', () => {
      const source = [1, 2, 3, 4, 5, 6, 7, 8];
      const shuffled = createRng(8).shuffle(source);
      expect([...shuffled].sort((a, b) => a - b)).toEqual(source);
    });

    it('gercekten karistirir', () => {
      const source = Array.from({ length: 20 }, (_, i) => i);
      expect(createRng(4).shuffle(source)).not.toEqual(source);
    });

    it('bos ve tek elemanli diziyi bozmadan dondurur (sinir durumu)', () => {
      const rng = createRng(1);
      expect(rng.shuffle([])).toEqual([]);
      expect(rng.shuffle(['tek'])).toEqual(['tek']);
    });
  });
});

describe('seedFromString', () => {
  it('ayni metin ayni tohumu verir', () => {
    expect(seedFromString('cay-bahcesi')).toBe(seedFromString('cay-bahcesi'));
  });

  it('farkli metin farkli tohum verir', () => {
    expect(seedFromString('2026-09-04')).not.toBe(seedFromString('2026-09-05'));
  });

  it('bos metin icin de gecerli bir tohum uretir', () => {
    const seed = seedFromString('');
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
  });

  it('her zaman isaretsiz 32-bit araliginda kalir', () => {
    for (const text of ['a', 'cay bardagi', 'nazar boncugu', 'x'.repeat(500)]) {
      const seed = seedFromString(text);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('dailySeed', () => {
  it('ayni takvim gunu ayni tohumu verir (saat farki onemsiz)', () => {
    const sabah = new Date('2026-09-04T06:00:00.000Z');
    const aksam = new Date('2026-09-04T21:30:00.000Z');
    expect(dailySeed(sabah)).toBe(dailySeed(aksam));
  });

  it('farkli gun farkli tohum verir', () => {
    expect(dailySeed(new Date('2026-09-04T00:00:00.000Z'))).not.toBe(
      dailySeed(new Date('2026-09-05T00:00:00.000Z')),
    );
  });

  it('tohumdan uretilen tahta da tekrarlanabilir', () => {
    const gun = new Date('2026-09-04T12:00:00.000Z');
    const a = createRng(dailySeed(gun));
    const b = createRng(dailySeed(gun));
    expect(Array.from({ length: 10 }, () => a.int(9))).toEqual(
      Array.from({ length: 10 }, () => b.int(9)),
    );
  });
});
