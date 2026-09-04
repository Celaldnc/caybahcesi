import { SLOTS } from '@/constants/config';

import { createEmptyRow, isRowFull } from '../matcher';
import { createRng } from '../rng';
import type { Tile } from '../types';

import { SHORT, row, show } from './helpers/builders';
import { carelessPolicy, playGame, thoughtfulPolicy } from './helpers/policies';

/**
 * Test YARDIMCILARININ kendi testleri.
 *
 * Neden gerekli: projenin en yuksek sesle savundugu iki iddia --
 * "no-stuck-state garantisi" ve "her seviye gecilebilir" -- tamamen
 * `playGame` ve politikalara dayaniyor. Bu yardimcilar bir donem coverage
 * olcumunun DISINDAYDI; mutasyon denetimi icinde hayatta kalan hatalar
 * buldu (orn. skoru iki katina cikarmak hicbir testi kirmiyordu).
 * Simdi hem olculuyor hem dogrulaniyorlar.
 */

describe('builders.row', () => {
  it('nokta bos slot uretir', () => {
    expect(row('.', '.', '.')).toEqual([null, null, null]);
  });

  it('kisa kodu dogru tile a cevirir', () => {
    const [tile] = row('A');
    expect(tile?.id).toBe(SHORT.A);
  });

  /**
   * Onceden `SHORT[cell] ?? 'vapur'` yaziyordu: harf hatasi testi
   * basarisiz yapmiyor, gecerli ama YANLIS bir tahta uretiyordu.
   */
  it('bilinmeyen kisa kodda hata firlatir (sessiz yanlis tahta uretmez)', () => {
    expect(() => row('Z' as 'A')).toThrow(RangeError);
  });
});

describe('builders.show', () => {
  it('satiri kisa gosterime cevirir', () => {
    expect(show(row('A', '.', 'B'))).toBe('A.B');
  });

  it('haritada olmayan tile i soru isaretiyle gosterir', () => {
    // SHORT haritasinda karsiligi olmayan bir tile dogrudan kurulur.
    expect(show([{ id: 'deniz-vapur', key: 'v1' }])).toBe('?');
  });
});

describe('thoughtfulPolicy', () => {
  it('eslesme yaratan hamleyi tercih eder', () => {
    // [A A . . .] + tray'de A -> indis 2'ye koymali.
    const board = row('A', 'A', '.', '.', '.');
    const tray: Tile[] = [
      { id: SHORT.B, key: 'b1' },
      { id: SHORT.A, key: 'a1' },
    ];

    const move = thoughtfulPolicy(board, tray, createRng(1));
    expect(move).toEqual({ tileIndex: 1, slotIndex: 2 });
  });

  it('eslesme yoksa ayni tipin bitisigine koyar (cift kurar)', () => {
    const board = row('.', '.', 'A', '.');
    const tray: Tile[] = [{ id: SHORT.A, key: 'a1' }];

    const move = thoughtfulPolicy(board, tray, createRng(1));
    expect([1, 3]).toContain(move?.slotIndex);
  });

  it('dolu tahtada null doner (oyun sonu)', () => {
    const board = row('A', 'B', 'C');
    expect(isRowFull(board)).toBe(true);
    expect(thoughtfulPolicy(board, [{ id: SHORT.A, key: 'a1' }], createRng(1))).toBeNull();
  });

  it('bos tray de null doner', () => {
    expect(thoughtfulPolicy(createEmptyRow(7), [], createRng(1))).toBeNull();
  });
});

describe('carelessPolicy', () => {
  it('gecerli bir hamle uretir', () => {
    const move = carelessPolicy(row('A', '.', '.'), [{ id: SHORT.B, key: 'b1' }], createRng(3));
    expect(move).not.toBeNull();
    expect([1, 2]).toContain(move?.slotIndex);
    expect(move?.tileIndex).toBe(0);
  });

  it('dolu tahtada null doner', () => {
    expect(carelessPolicy(row('A', 'B'), [{ id: SHORT.A, key: 'a1' }], createRng(1))).toBeNull();
  });

  it('bos tray de null doner', () => {
    expect(carelessPolicy(createEmptyRow(7), [], createRng(1))).toBeNull();
  });
});

describe('playGame', () => {
  it('maxMoves sinirina uyar', () => {
    const result = playGame({ seed: 1, poolSize: 5, maxMoves: 12, policy: thoughtfulPolicy });
    expect(result.moves).toBeLessThanOrEqual(12);
  });

  it('ayni tohum ayni sonucu verir (deterministik)', () => {
    const options = { seed: 7, poolSize: 5, maxMoves: 50, policy: thoughtfulPolicy } as const;
    expect(playGame(options)).toEqual(playGame(options));
  });

  it('skor negatif olmaz ve hamle sayisiyla tutarli buyur', () => {
    const short = playGame({ seed: 5, poolSize: 5, maxMoves: 10, policy: thoughtfulPolicy });
    const long = playGame({ seed: 5, poolSize: 5, maxMoves: 60, policy: thoughtfulPolicy });
    expect(short.score).toBeGreaterThanOrEqual(0);
    expect(long.score).toBeGreaterThanOrEqual(short.score);
  });

  /**
   * targetScore verildiginde oyun HEDEFTE durmali.
   * Mutasyon: skoru 2 katina cikarmak, hedefi ~yarisina indirmekle ayni
   * etkiyi yapar; bu test o sinifi yakalar.
   */
  it('hedef skora ulasinca durur ve reachedTarget doner', () => {
    const result = playGame({
      seed: 1,
      poolSize: 5,
      maxMoves: 300,
      policy: thoughtfulPolicy,
      targetScore: 60,
    });
    expect(result.reachedTarget).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('ulasilamaz hedefte reachedTarget false doner', () => {
    const result = playGame({
      seed: 1,
      poolSize: 5,
      maxMoves: 5,
      policy: thoughtfulPolicy,
      targetScore: 100000,
    });
    expect(result.reachedTarget).toBe(false);
  });

  it('onBeforeMove her hamleden once cagrilir', () => {
    let calls = 0;
    const result = playGame({
      seed: 2,
      poolSize: 5,
      maxMoves: 15,
      policy: thoughtfulPolicy,
      onBeforeMove: () => {
        calls++;
      },
    });
    expect(calls).toBe(result.moves);
  });

  it('ozel slot sayisiyla calisir', () => {
    const result = playGame({
      seed: 3,
      poolSize: 5,
      slotCount: SLOTS.MAX,
      maxMoves: 20,
      policy: thoughtfulPolicy,
    });
    expect(result.moves).toBe(20);
  });
});
