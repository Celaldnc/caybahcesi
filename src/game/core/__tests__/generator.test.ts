import { SLOTS, TRAY } from '@/constants/config';

import { findRescuePlacements, findRescueTileIds, generateTray, refillTray } from '../generator';
import { countEmpty, createEmptyRow, placeTile, resolve } from '../matcher';
import { createRng } from '../rng';
import { createTile } from '../tiles';
import type { SlotRow, Tile, TileId } from '../types';

import { carelessPolicy, playGame, thoughtfulPolicy, type Policy } from './helpers/policies';

const SHORT: Record<string, TileId> = {
  A: 'cay-ince-belli',
  B: 'kahve-fincan',
  C: 'nazar-mavi',
  D: 'lokum-sade',
};
const POOL: readonly TileId[] = [SHORT.A!, SHORT.B!, SHORT.C!, SHORT.D!];

function row(...cells: string[]): SlotRow {
  return cells.map((cell) => (cell === '.' ? null : createTile(SHORT[cell] ?? 'vapur')));
}

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
    const placements = findRescuePlacements(row('A', 'A', '.'), [SHORT.B!]);
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
    const partial = [createTile(SHORT.A!)];
    expect(refillTray(createEmptyRow(7), partial, POOL, createRng(1))).toHaveLength(TRAY.VISIBLE);
  });

  it('mevcut tile lari korur ve sirasini bozmaz', () => {
    const partial = [createTile(SHORT.A!), createTile(SHORT.B!)];
    const filled = refillTray(createEmptyRow(7), partial, POOL, createRng(1));
    expect(filled.slice(0, 2)).toEqual(partial);
  });

  it('zaten dolu tray i degistirmez', () => {
    const full = [createTile(SHORT.A!), createTile(SHORT.B!), createTile(SHORT.C!)];
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
   * SOZLESME: bos slot sayisi RESCUE_THRESHOLD'a dustugunde, EGER bir
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
    expect(countEmpty(pressured)).toBeLessThanOrEqual(TRAY.RESCUE_THRESHOLD);

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

// ---------------------------------------------------------------------------
// Property-based: gercek oyun simulasyonu
// ---------------------------------------------------------------------------

describe('property: oyuncu simulasyonlari', () => {
  const SEEDS = 100;
  const MAX_MOVES = 200;

  /** Bir oyunu oynar; no-stuck-state sozlesmesinin ihlallerini sayar. */
  function countViolations(seed: number, policy: Policy): number {
    let violations = 0;

    playGame({
      seed,
      poolSize: 5,
      maxMoves: MAX_MOVES,
      policy,
      onBeforeMove: (currentRow, tray, pool) => {
        if (countEmpty(currentRow) > TRAY.RESCUE_THRESHOLD) return;

        const rescueIds = findRescueTileIds(currentRow, pool);
        if (rescueIds.length === 0) return;

        if (!tray.some((tile) => rescueIds.includes(tile.id))) violations++;
      },
    });

    return violations;
  }

  it('hicbir tohumda no-stuck-state sozlesmesi ihlal edilmez', () => {
    let total = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      total += countViolations(seed, thoughtfulPolicy);
    }
    expect(total).toBe(0);
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
