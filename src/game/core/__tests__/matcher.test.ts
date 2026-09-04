import { MATCH } from '@/constants/config';

import {
  collapse,
  countEmpty,
  createEmptyRow,
  emptyIndices,
  findRuns,
  insertPositions,
  insertTile,
  isRowFull,
  resolve,
  tileCount,
  tilesOf,
} from '../matcher';
import { createTile } from '../tiles';
import type { Tile } from '../types';

import { SHORT, row, show } from './helpers/builders';

describe('createEmptyRow', () => {
  it('istenen sayida bos slot uretir', () => {
    expect(createEmptyRow(7)).toHaveLength(7);
    expect(createEmptyRow(7).every((slot) => slot === null)).toBe(true);
  });

  it('gecersiz slot sayisini reddeder', () => {
    expect(() => createEmptyRow(0)).toThrow(RangeError);
    expect(() => createEmptyRow(-3)).toThrow(RangeError);
    expect(() => createEmptyRow(2.5)).toThrow(RangeError);
  });
});

describe('countEmpty / emptyIndices / isRowFull', () => {
  it('bos satirda tum slotlar bostur', () => {
    expect(countEmpty(createEmptyRow(7))).toBe(7);
    expect(emptyIndices(createEmptyRow(3))).toEqual([0, 1, 2]);
    expect(isRowFull(createEmptyRow(7))).toBe(false);
  });

  it('kismen dolu satiri dogru sayar', () => {
    const r = row('A', '.', 'B', '.', '.');
    expect(countEmpty(r)).toBe(3);
    expect(emptyIndices(r)).toEqual([1, 3, 4]);
    expect(isRowFull(r)).toBe(false);
  });

  it('tam dolu satiri tanir', () => {
    const r = row('A', 'B', 'C');
    expect(countEmpty(r)).toBe(0);
    expect(emptyIndices(r)).toEqual([]);
    expect(isRowFull(r)).toBe(true);
  });
});

describe('tileCount / tilesOf / insertPositions', () => {
  it('dolu tile sayisini verir', () => {
    expect(tileCount(row('A', 'B', '.', '.'))).toBe(2);
    expect(tileCount(createEmptyRow(5))).toBe(0);
  });

  it('tile lari paketli sirayla dondurur', () => {
    expect(tilesOf(row('A', 'B', '.', '.')).map((t) => t.id)).toEqual([SHORT.A, SHORT.B]);
  });

  /** n tile -> n+1 konum: her tile'in soluna ve en saga. */
  it('n tile icin n+1 ekleme konumu vardir', () => {
    expect(insertPositions(createEmptyRow(4))).toEqual([0]);
    expect(insertPositions(row('A', '.', '.', '.'))).toEqual([0, 1]);
    expect(insertPositions(row('A', 'B', '.', '.'))).toEqual([0, 1, 2]);
  });

  it('dolu satirda ekleme konumu yoktur (oyun sonu)', () => {
    expect(insertPositions(row('A', 'B', 'C'))).toEqual([]);
  });
});

describe('insertTile', () => {
  it('basa ekler ve sagdakileri kaydirir', () => {
    expect(show(insertTile(row('A', 'B', '.', '.'), 0, createTile(SHORT.C)))).toBe('CAB.');
  });

  it('araya ekler ve sagdakileri kaydirir', () => {
    expect(show(insertTile(row('A', 'B', '.', '.'), 1, createTile(SHORT.C)))).toBe('ACB.');
  });

  it('sona ekler', () => {
    expect(show(insertTile(row('A', 'B', '.', '.'), 2, createTile(SHORT.C)))).toBe('ABC.');
  });

  it('bos satira ekler', () => {
    expect(show(insertTile(createEmptyRow(3), 0, createTile(SHORT.A)))).toBe('A..');
  });

  it('kapasiteyi korur', () => {
    expect(insertTile(row('A', '.', '.', '.'), 0, createTile(SHORT.B))).toHaveLength(4);
  });

  it('sonuc her zaman sola paketlidir', () => {
    const result = insertTile(row('A', 'B', '.', '.'), 1, createTile(SHORT.C));
    expect(show(result)).toBe('ACB.');
    expect(emptyIndices(result)).toEqual([3]);
  });

  it('kaynak satiri degistirmez (saf fonksiyon)', () => {
    const original = row('A', '.', '.');
    insertTile(original, 0, createTile(SHORT.B));
    expect(show(original)).toBe('A..');
  });

  it('dolu satira eklemeyi reddeder', () => {
    expect(() => insertTile(row('A', 'B', 'C'), 1, createTile(SHORT.A))).toThrow(Error);
  });

  it('gecersiz konumu reddeder', () => {
    const r = row('A', 'B', '.', '.');
    const tile = createTile(SHORT.C);
    expect(() => insertTile(r, -1, tile)).toThrow(RangeError);
    // tileCount = 2 oldugu icin gecerli en buyuk konum 2'dir.
    expect(() => insertTile(r, 3, tile)).toThrow(RangeError);
    expect(() => insertTile(r, 1.5, tile)).toThrow(RangeError);
  });
});

describe('findRuns', () => {
  it('bos satirda eslesme bulmaz', () => {
    expect(findRuns(createEmptyRow(7))).toEqual([]);
  });

  it('yalnizca iki ayni tile eslesme sayilmaz', () => {
    expect(findRuns(row('A', 'A', '.', '.'))).toEqual([]);
  });

  it('uc ayni yanyana tile eslesir', () => {
    const runs = findRuns(row('.', 'A', 'A', 'A', '.'));
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ startIndex: 1, length: 3, tileId: SHORT.A });
  });

  /**
   * Bosluk komsulugu KIRAR.
   *
   * Ekleme modelinde satir her zaman paketli oldugu icin oyuncu bu durumu
   * goremez; bosluk yalnizca `resolve` icinde, kaldirma ile sikistirma
   * ARASINDA gecici olarak olusur. Kural yine de sabitlenmeli, `resolve`'un
   * dogrulugu buna dayaniyor.
   */
  it('arada bosluk varsa eslesme saymaz', () => {
    expect(findRuns(row('A', '.', 'A', 'A'))).toEqual([]);
    expect(findRuns(row('A', 'A', '.', 'A'))).toEqual([]);
  });

  it('ucten uzun diziyi tek bir eslesme olarak dondurur', () => {
    const runs = findRuns(row('A', 'A', 'A', 'A'));
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ startIndex: 0, length: 4 });
  });

  it('ayni satirda birden fazla eslesmeyi bulur', () => {
    const runs = findRuns(row('A', 'A', 'A', 'B', 'B', 'B'));
    expect(runs).toHaveLength(2);
    expect(runs[0]).toMatchObject({ startIndex: 0, tileId: SHORT.A });
    expect(runs[1]).toMatchObject({ startIndex: 3, tileId: SHORT.B });
  });

  it('satirin basinda ve sonunda eslesmeyi bulur (sinir durumu)', () => {
    expect(findRuns(row('A', 'A', 'A', '.'))[0]).toMatchObject({ startIndex: 0 });
    expect(findRuns(row('.', 'A', 'A', 'A'))[0]).toMatchObject({ startIndex: 1 });
  });

  it('MATCH.LENGTH sabitine uyar', () => {
    const cells = Array.from({ length: MATCH.LENGTH }, () => 'A' as const);
    expect(findRuns(row(...cells))).toHaveLength(1);
    expect(findRuns(row(...cells.slice(1)))).toEqual([]);
  });
});

describe('collapse', () => {
  it('tile lari sola kaydirir, bosluklari sona atar', () => {
    expect(show(collapse(row('.', 'A', '.', 'B', '.')))).toBe('AB...');
  });

  it('slot sayisini korur', () => {
    expect(collapse(row('.', 'A', '.', 'B', '.'))).toHaveLength(5);
  });

  it('zaten sola yaslanmis satiri degistirmez', () => {
    expect(show(collapse(row('A', 'B', '.', '.')))).toBe('AB..');
  });

  it('tile sirasini korur', () => {
    expect(show(collapse(row('.', 'A', '.', 'B', '.', 'C')))).toBe('ABC...');
  });

  it('bos ve tam dolu satirlarda calisir (sinir durumu)', () => {
    expect(show(collapse(createEmptyRow(4)))).toBe('....');
    expect(show(collapse(row('A', 'B', 'C')))).toBe('ABC');
  });

  it('kaynak satiri degistirmez (saf fonksiyon)', () => {
    const original = row('.', 'A', '.');
    collapse(original);
    expect(show(original)).toBe('.A.');
  });
});

describe('resolve', () => {
  it('eslesme yoksa satiri oldugu gibi dondurur', () => {
    const r = row('A', 'B', '.', '.');
    const result = resolve(r);
    expect(show(result.row)).toBe('AB..');
    expect(result.steps).toEqual([]);
    expect(result.removedCount).toBe(0);
  });

  it('tek eslesmeyi kaldirir ve bosluklari kapatir', () => {
    const result = resolve(row('B', 'A', 'A', 'A', 'C', '.', '.'));
    expect(show(result.row)).toBe('BC.....');
    expect(result.steps).toHaveLength(1);
    expect(result.removedCount).toBe(3);
  });

  it('kaldirilan tile lari animasyon icin dondurur', () => {
    const result = resolve(row('A', 'A', 'A', '.'));
    expect(result.steps[0]?.removed).toHaveLength(3);
    expect(result.steps[0]?.removed.every((tile: Tile) => tile.id === SHORT.A)).toBe(true);
  });

  /**
   * Zincir (cascade) -- combo carpaninin kaynagi.
   * [B A A A B B .] -> AAA gider -> [B . . . B B .] -> sikistir ->
   * [B B B . . . .] -> BBB gider -> tamamen bosalir. Iki adim.
   */
  it('bosluk kapandiktan sonra olusan yeni eslesmeyi zincirler', () => {
    const result = resolve(row('B', 'A', 'A', 'A', 'B', 'B', '.'));
    expect(result.steps).toHaveLength(2);
    expect(result.removedCount).toBe(6);
    expect(show(result.row)).toBe('.......');
  });

  /**
   * EKLEME MODELININ VAROLUS GEREKCESI.
   *
   * Iki A-cifti arasindaki B-ciftini tamamlamak, B'leri kaldirinca A'lari
   * birlestirir. Sabit-slot modelinde bu IMKANSIZDI (satir bir yigina
   * donusuyordu, oyuncu hep sona ekliyordu, 80.000 hamlede 0 zincir).
   *
   * Zincir acgozlu oyunda nadirdir -- oyuncu ucluyu aninda aldigi icin
   * ayni tipten iki grup nadiren birlikte bulunur. Grubu bilerek BOLEN
   * oyuncunun odulu: beceri tavani.
   */
  it('iki grubun arasina eklemek zincir yaratir (ekleme modeli)', () => {
    const board = row('A', 'A', 'B', 'B', 'A', 'A', '.');
    const result = resolve(insertTile(board, 2, createTile(SHORT.B)));

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.runs[0]).toMatchObject({ tileId: SHORT.B, length: 3 });
    expect(result.steps[1]?.runs[0]).toMatchObject({ tileId: SHORT.A, length: 4 });
    expect(result.removedCount).toBe(7);
    expect(show(result.row)).toBe('.......');
  });

  it('ayni adimda birden fazla eslesmeyi birlikte kaldirir', () => {
    const result = resolve(row('A', 'A', 'A', 'B', 'B', 'B'));
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.runs).toHaveLength(2);
    expect(result.removedCount).toBe(6);
    expect(show(result.row)).toBe('......');
  });

  it('ucten uzun diziyi tamamen kaldirir', () => {
    const result = resolve(row('A', 'A', 'A', 'A', 'B'));
    expect(result.removedCount).toBe(4);
    expect(show(result.row)).toBe('B....');
  });

  it('kaynak satiri degistirmez (saf fonksiyon)', () => {
    const original = row('A', 'A', 'A', '.');
    resolve(original);
    expect(show(original)).toBe('AAA.');
  });

  it('bos satirda guvenle calisir (sinir durumu)', () => {
    const result = resolve(createEmptyRow(7));
    expect(result.steps).toEqual([]);
    expect(show(result.row)).toBe('.......');
  });

  it('sonsuz donguye girmez (tamamen ayni tile larla dolu satir)', () => {
    const result = resolve(row('A', 'A', 'A', 'A', 'A', 'A', 'A'));
    expect(result.removedCount).toBe(7);
    expect(show(result.row)).toBe('.......');
  });
});
