import { SLOTS, TRAY } from '@/constants/config';

import {
  findPairBuildingTileIds,
  findProgressTileIds,
  findRescuePlacements,
  findRescueTileIds,
  generateTray,
  refillTray,
} from '../generator';
import { countEmpty, createEmptyRow, placeTile, resolve } from '../matcher';
import { createRng } from '../rng';
import { createTile } from '../tiles';
import type { Tile, TileId } from '../types';

import { SHORT, row } from './helpers/builders';
import { carelessPolicy, playGame, thoughtfulPolicy, type Policy } from './helpers/policies';

const POOL: readonly TileId[] = [SHORT.A, SHORT.B, SHORT.C, SHORT.D];

describe('findRescuePlacements', () => {
  it('bos satirda kurtarma yoktur', () => {
    expect(findRescuePlacements(createEmptyRow(7), POOL)).toEqual([]);
  });

  it('bitisik ciftin yanina konarak eslesme yaratan yerlestirmeyi bulur', () => {
    // [A A . . .] -> indis 2'ye A koymak AAA yapar.
    const placements = findRescuePlacements(row('A', 'A', '.', '.', '.'), POOL);
    expect(placements).toContainEqual({ tileId: SHORT.A, index: 2 });
  });

  it('iki tile arasindaki bosluga konarak eslesme yaratani bulur', () => {
    // [A . A .] -> indis 1'e A koymak AAA yapar.
    expect(findRescuePlacements(row('A', '.', 'A', '.'), POOL)).toContainEqual({
      tileId: SHORT.A,
      index: 1,
    });
  });

  it('havuzda olmayan tile ile kurtarma onermez', () => {
    const placements = findRescuePlacements(row('A', 'A', '.'), [SHORT.B]);
    expect(placements).toEqual([]);
  });

  it('eslesme yaratmayan yerlestirmeleri onermez', () => {
    // [A B . .] -> hicbir tek yerlestirme uclu yapamaz.
    expect(findRescuePlacements(row('A', 'B', '.', '.'), POOL)).toEqual([]);
  });

  it('dolu satirda kurtarma yoktur (yerlestirilecek yer yok)', () => {
    expect(findRescuePlacements(row('A', 'A', 'B'), POOL)).toEqual([]);
  });

  it('onerdigi her yerlestirme gercekten eslesme uretir', () => {
    const testRow = row('A', 'A', '.', 'B', 'B', '.', 'C');
    for (const { tileId, index } of findRescuePlacements(testRow, POOL)) {
      const after = placeTile(testRow, index, createTile(tileId));
      expect(resolve(after).removedCount).toBeGreaterThan(0);
    }
  });
});

describe('findRescueTileIds', () => {
  it('kurtarabilen tile tiplerini benzersiz olarak dondurur', () => {
    const ids = findRescueTileIds(row('A', 'A', '.', 'B', 'B', '.'), POOL);
    expect([...ids].sort()).toEqual([SHORT.A, SHORT.B].sort());
  });

  it('kurtarma yoksa bos dizi dondurur', () => {
    expect(findRescueTileIds(row('A', 'B', '.', '.'), POOL)).toEqual([]);
  });
});

describe('generateTray', () => {
  it('istenen sayida tile uretir', () => {
    expect(generateTray(createEmptyRow(7), POOL, createRng(1))).toHaveLength(TRAY.VISIBLE);
  });

  it('yalnizca havuzdaki tiplerden uretir', () => {
    for (const tile of generateTray(createEmptyRow(7), POOL, createRng(9))) {
      expect(POOL).toContain(tile.id);
    }
  });

  it('her tile benzersiz key alir', () => {
    const tray = generateTray(createEmptyRow(7), POOL, createRng(3));
    expect(new Set(tray.map((t: Tile) => t.key)).size).toBe(tray.length);
  });

  it('ayni tohum ayni tray i verir (Daily modu)', () => {
    const a = generateTray(createEmptyRow(7), POOL, createRng(42)).map((t: Tile) => t.id);
    const b = generateTray(createEmptyRow(7), POOL, createRng(42)).map((t: Tile) => t.id);
    expect(a).toEqual(b);
  });

  it('bos havuzu reddeder', () => {
    expect(() => generateTray(createEmptyRow(7), [], createRng(1))).toThrow(RangeError);
  });
});

describe('refillTray', () => {
  it('eksik tray i hedef boyuta tamamlar', () => {
    const partial = [createTile(SHORT.A)];
    expect(refillTray(createEmptyRow(7), partial, POOL, createRng(1))).toHaveLength(TRAY.VISIBLE);
  });

  it('mevcut tile lari korur ve sirasini bozmaz', () => {
    const partial = [createTile(SHORT.A), createTile(SHORT.B)];
    const filled = refillTray(createEmptyRow(7), partial, POOL, createRng(1));
    expect(filled.slice(0, 2)).toEqual(partial);
  });

  it('zaten dolu tray i degistirmez', () => {
    const full = [createTile(SHORT.A), createTile(SHORT.B), createTile(SHORT.C)];
    expect(refillTray(createEmptyRow(7), full, POOL, createRng(1))).toEqual(full);
  });

  it('gecersiz tray boyutunu reddeder', () => {
    const emptyRow = createEmptyRow(7);
    expect(() => refillTray(emptyRow, [], POOL, createRng(1), 0)).toThrow(RangeError);
    expect(() => refillTray(emptyRow, [], POOL, createRng(1), -1)).toThrow(RangeError);
    expect(() => refillTray(emptyRow, [], POOL, createRng(1), 2.5)).toThrow(RangeError);
  });

  it('ozel tray boyutuyla calisir', () => {
    expect(refillTray(createEmptyRow(7), [], POOL, createRng(1), 5)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// No-stuck-state garantisi
// ---------------------------------------------------------------------------

describe('no-stuck-state garantisi', () => {
  /**
   * SOZLESME: bos slot sayisi SAFETY_THRESHOLD'a dustugunde, EGER bir
   * kurtarma yerlestirmesi mumkunse, tray o kurtarmayi yapabilen bir tile
   * ICERMEK ZORUNDADIR.
   *
   * Bu garanti olmadan oyuncu, kendi hatasi olmadan, tamamen ureticinin
   * sansizligi yuzunden kaybedebilir -- spec'in "tuh, mahsur kaldim
   * durumu olusturma" maddesi tam olarak bunu yasakliyor.
   */
  it('baski altindayken kurtarma mumkunse tray de kurtarma tile i bulunur', () => {
    // 7 slotun 6'si dolu, tek bos slot var; [A A] cifti kurtarilabilir.
    const pressured = row('A', 'A', '.', 'B', 'C', 'D', 'B');
    expect(countEmpty(pressured)).toBeLessThanOrEqual(TRAY.SAFETY_THRESHOLD);

    const rescueIds = findRescueTileIds(pressured, POOL);
    expect(rescueIds.length).toBeGreaterThan(0);

    // Cok sayida tohumda TEK BIR ihlal bile kabul edilemez.
    for (let seed = 0; seed < 300; seed++) {
      const tray = generateTray(pressured, POOL, createRng(seed));
      expect(tray.some((tile: Tile) => rescueIds.includes(tile.id))).toBe(true);
    }
  });

  it('kurtarma imkansizken uretici yine de gecerli tray uretir (cokmez)', () => {
    // Hicbir tek yerlestirme uclu yapamaz.
    const hopeless = row('A', 'B', 'C', 'D', 'A', 'B', '.');
    expect(findRescueTileIds(hopeless, POOL)).toEqual([]);

    for (let seed = 0; seed < 50; seed++) {
      const tray = generateTray(hopeless, POOL, createRng(seed));
      expect(tray).toHaveLength(TRAY.VISIBLE);
    }
  });

  it('baski yokken kurtarma zorunlulugu uygulanmaz (cesitlilik korunur)', () => {
    // Bol bos slot: uretici serbest davranmali, aksi halde oyun tekduze olur.
    const relaxed = row('A', 'A', '.', '.', '.', '.', '.');
    const seen = new Set<TileId>();
    for (let seed = 0; seed < 200; seed++) {
      for (const tile of generateTray(relaxed, POOL, createRng(seed))) {
        seen.add(tile.id);
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('findPairBuildingTileIds', () => {
  it('sag komsuya gore cift kurulabilecek tipi bulur', () => {
    // [. A . . ] -> indis 0'a A koymak bitisik cift yapar.
    expect(findPairBuildingTileIds(row('.', 'A', '.', '.'), POOL)).toContain(SHORT.A);
  });

  it('sol komsuya gore de bulur (simetri)', () => {
    expect(findPairBuildingTileIds(row('.', '.', 'A', '.'), POOL)).toContain(SHORT.A);
  });

  it('satirin iki ucunda da calisir (sinir durumu)', () => {
    expect(findPairBuildingTileIds(row('A', '.', '.'), POOL)).toContain(SHORT.A);
    expect(findPairBuildingTileIds(row('.', '.', 'A'), POOL)).toContain(SHORT.A);
  });

  it('havuzda olmayan komsuyu onermez', () => {
    expect(findPairBuildingTileIds(row('.', 'A', '.'), [SHORT.B])).toEqual([]);
  });

  it('bos satirda cift kurulamaz', () => {
    expect(findPairBuildingTileIds(createEmptyRow(7), POOL)).toEqual([]);
  });

  it('dolu satirda cift kurulamaz (yerlestirilecek yer yok)', () => {
    expect(findPairBuildingTileIds(row('A', 'B', 'C'), POOL)).toEqual([]);
  });

  it('bos slotun iki komsusunu da dondurur', () => {
    const ids = findPairBuildingTileIds(row('A', '.', 'B'), POOL);
    expect([...ids].sort()).toEqual([SHORT.A, SHORT.B].sort());
  });
});

describe('findProgressTileIds', () => {
  it('kurtarma mumkunse kurtarma tiplerini dondurur (cift kurmayi golgeler)', () => {
    // [A A . B .] -> A ile uclu tamamlanabilir; B yalnizca cift kurar.
    const ids = findProgressTileIds(row('A', 'A', '.', 'B', '.'), POOL);
    expect(ids).toContain(SHORT.A);
    expect(ids).not.toContain(SHORT.B);
  });

  it('kurtarma imkansizsa cift kurma tiplerine duser', () => {
    const testRow = row('A', 'B', '.', '.');
    expect(findRescueTileIds(testRow, POOL)).toEqual([]);
    expect(findProgressTileIds(testRow, POOL).length).toBeGreaterThan(0);
  });
});

describe('SAFETY esigi sozlesmesi', () => {
  /**
   * Esik SINIRINI pinler. Mutasyon denetiminde `empty <= SAFETY` -> `<`
   * degisikligi hicbir testi kirmiyordu, yani esik degeri korumasizdi.
   */
  it('esikte (empty === SAFETY_THRESHOLD) ilerleme tile i ZORUNLU', () => {
    // 7 slot, SAFETY_THRESHOLD kadar bosluk birak.
    const filled = SLOTS.INITIAL - TRAY.SAFETY_THRESHOLD;
    const cells = Array.from({ length: SLOTS.INITIAL }, (_, i) =>
      i < filled ? (['A', 'B', 'C', 'D'] as const)[i % 4]! : ('.' as const),
    );
    const pressured = row(...cells);
    expect(countEmpty(pressured)).toBe(TRAY.SAFETY_THRESHOLD);

    const progressIds = findProgressTileIds(pressured, POOL);
    expect(progressIds.length).toBeGreaterThan(0);

    for (let seed = 0; seed < 200; seed++) {
      const tray = generateTray(pressured, POOL, createRng(seed));
      expect(tray.some((tile: Tile) => progressIds.includes(tile.id))).toBe(true);
    }
  });

  /**
   * Esigin BIR USTUNDE zorunluluk YOK. Bu, esigin gercekten bir esik
   * oldugunu (her zaman acik bir kapi olmadigini) kanitlar; aksi halde
   * uretici oyunu oynar ve cesitlilik olur.
   */
  it('esigin ustunde (empty === SAFETY_THRESHOLD + 1) zorunluluk YOK', () => {
    const filled = SLOTS.INITIAL - TRAY.SAFETY_THRESHOLD - 1;
    const cells = Array.from({ length: SLOTS.INITIAL }, (_, i) =>
      i < filled ? (['A', 'B', 'C', 'D'] as const)[i % 4]! : ('.' as const),
    );
    const relaxed = row(...cells);
    expect(countEmpty(relaxed)).toBe(TRAY.SAFETY_THRESHOLD + 1);

    const progressIds = findProgressTileIds(relaxed, POOL);
    const withoutProgress = Array.from({ length: 300 }, (_, seed) =>
      generateTray(relaxed, POOL, createRng(seed)),
    ).filter((tray) => !tray.some((tile) => progressIds.includes(tile.id)));

    expect(withoutProgress.length).toBeGreaterThan(0);
  });

  it('zorunlu tile her zaman ayni yuvaya konmaz (tahmin edilebilir olmasin)', () => {
    const pressured = row('A', 'A', '.', 'B', 'C', 'D', 'B');
    const progressIds = findProgressTileIds(pressured, POOL);

    const positions = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
      const tray = generateTray(pressured, POOL, createRng(seed));
      tray.forEach((tile, index) => {
        if (progressIds.includes(tile.id)) positions.add(index);
      });
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Property-based: gercek oyun simulasyonu
// ---------------------------------------------------------------------------

describe('property: oyuncu simulasyonlari', () => {
  const SEEDS = 100;
  const MAX_MOVES = 200;

  /**
   * Bir oyunu oynar ve sozlesmeyi DENETLER.
   *
   * `violations` yaninda `audits` ve `pressureSeen` de doner. Sebep:
   * yalnizca `expect(violations).toBe(0)` yazan bir test VAKUMDUR -- denetim
   * callback'i hic calismasa bile sayac 0 kalir ve test yesil gecer.
   * Mutasyon testiyle dogrulandi: `onBeforeMove` cagrisi tamamen silindiginde
   * eski test hala geciyordu. Artik denetimin GERCEKTEN yapildigini da
   * iddia ediyoruz.
   */
  interface AuditResult {
    violations: number;
    /** onBeforeMove kac kez calisti. */
    audits: number;
    /** Kac kez baski altinda (empty <= SAFETY_THRESHOLD) bir tahta gorduk. */
    pressureSeen: number;
    /** Kac kez baski altinda VE kurtarma gercekten mumkundu. */
    rescuablePressure: number;
  }

  function auditGame(seed: number, policy: Policy): AuditResult {
    const result: AuditResult = {
      violations: 0,
      audits: 0,
      pressureSeen: 0,
      rescuablePressure: 0,
    };

    playGame({
      seed,
      poolSize: 5,
      maxMoves: MAX_MOVES,
      policy,
      onBeforeMove: (currentRow, tray, pool) => {
        result.audits++;
        if (countEmpty(currentRow) > TRAY.SAFETY_THRESHOLD) return;

        result.pressureSeen++;
        const rescueIds = findRescueTileIds(currentRow, pool);
        if (rescueIds.length === 0) return;

        result.rescuablePressure++;
        if (!tray.some((tile) => rescueIds.includes(tile.id))) result.violations++;
      },
    });

    return result;
  }

  it('hicbir tohumda no-stuck-state sozlesmesi ihlal edilmez', () => {
    const total = { violations: 0, audits: 0, pressureSeen: 0, rescuablePressure: 0 };

    for (let seed = 1; seed <= SEEDS; seed++) {
      const result = auditGame(seed, thoughtfulPolicy);
      total.violations += result.violations;
      total.audits += result.audits;
      total.pressureSeen += result.pressureSeen;
      total.rescuablePressure += result.rescuablePressure;
    }

    // Once denetimin gercekten yapildigini kanitla, sonra sonucunu iddia et.
    // Bu uc satir olmadan asagidaki expect(0) hicbir sey ispatlamaz.
    expect(total.audits).toBeGreaterThan(SEEDS * 10);
    expect(total.pressureSeen).toBeGreaterThan(0);
    expect(total.rescuablePressure).toBeGreaterThan(0);

    expect(total.violations).toBe(0);
  });

  /**
   * ADILLIK GARANTISI -- bu projenin en onemli oyun-tasarim iddiasi.
   *
   * Yerlestirmesini dusunen bir oyuncu, ureticinin sansizligi yuzunden ASLA
   * kaybetmemeli. Spec bunu "tuh, mahsur kaldim durumu olusturma" diye
   * ifade ediyor.
   *
   * Olculdu: kurtarma katmani TEK BASINA yetmiyordu -- bazi tohumlarda oyuncu
   * 7 hamlede kaybediyordu, cunku tahtada hic bitisik cift yokken hicbir tek
   * tile uclu yapamaz. Guvenlik (ilerleme) katmani bu kuyrugu kapatti.
   */
  it('yerlestirmesini dusunen oyuncu hicbir tohumda takilip kalmaz', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const result = playGame({
        seed,
        poolSize: 5,
        maxMoves: MAX_MOVES,
        policy: thoughtfulPolicy,
      });
      expect(result.moves).toBe(MAX_MOVES);
    }
  });

  /**
   * ADILLIK, KOLAYLIK DEGILDIR.
   *
   * Yukaridaki garanti "oyun kaybedilemez" anlamina gelmemeli, yoksa hedef
   * skorlar ve game-over ekrani anlamsizlasir. Dikkatsiz oyuncu HIZLA
   * kaybetmeli: kayip ureticiden degil, oyuncunun yerlestirme hatasindan
   * gelmeli. Bu bir "sort" oyunu -- yerlestirme becerinin ta kendisi.
   */
  it('rastgele oynayan oyuncu hizla kaybeder (beceri belirleyicidir)', () => {
    const moves = Array.from(
      { length: SEEDS },
      (_, i) =>
        playGame({ seed: i + 1, poolSize: 5, maxMoves: MAX_MOVES, policy: carelessPolicy }).moves,
    );
    const median = [...moves].sort((a, b) => a - b)[Math.floor(moves.length / 2)] ?? 0;

    expect(median).toBeLessThan(SLOTS.INITIAL * 4);
    expect(moves.every((m) => m < MAX_MOVES)).toBe(true);
  });

  it('oyuncu en az slot sayisi kadar hamle yapabilir (anlik kayip yok)', () => {
    // Tahta bosken hicbir oyuncu SLOTS.INITIAL hamleden once kaybedemez.
    for (let seed = 1; seed <= 30; seed++) {
      const result = playGame({
        seed,
        poolSize: 5,
        maxMoves: MAX_MOVES,
        policy: carelessPolicy,
      });
      expect(result.moves).toBeGreaterThanOrEqual(SLOTS.INITIAL);
    }
  });
});
