import { MATCH, ORDER } from '@/constants/config';

import { createEmptyRow, insertTile, resolve } from '../matcher';
import {
  applyResolve,
  createCustomer,
  createOrder,
  isCustomerGone,
  isOrderComplete,
  neededTileIds,
  patienceRatio,
  patienceSpent,
  tickPatience,
  totalRequired,
  totalServed,
} from '../orders';
import { createRng } from '../rng';
import { createTile } from '../tiles';
import type { Order, SlotRow, TileId } from '../types';

/**
 * Siparis cekirdegi.
 *
 * Saf TypeScript: platform API'si yok, hepsi deterministik. Sabir HAMLE
 * cinsinden oldugu icin butun bu davranis simule edilebilir -- gercek
 * zamanli bir sayacla bunlarin hicbiri test edilemezdi.
 */

const CAY: TileId = 'cay-ince-belli';
const KAHVE: TileId = 'kahve-fincan';
const NAZAR: TileId = 'nazar-mavi';
const POOL: readonly TileId[] = [CAY, KAHVE, NAZAR];
/** Testlerde sabit tip sayisi -- sabir formulu buna baglidir. */
const TYPES = 5;

/** Verilen tile'lari sirayla ekleyerek satir kurar. */
function rowOf(ids: readonly TileId[], capacity = 7): SlotRow {
  return ids.reduce<SlotRow>(
    (acc, id, index) => insertTile(acc, index, createTile(id)),
    createEmptyRow(capacity),
  );
}

/** Elle siparis kurar (uretici kullanmadan). */
function orderOf(...lines: readonly (readonly [TileId, number, number])[]): Order {
  return lines.map(([tileId, required, served]) => ({ tileId, required, served }));
}

describe('createOrder', () => {
  it('havuzdan siparis uretir', () => {
    const order = createOrder(POOL, createRng(1));

    expect(order.length).toBeGreaterThanOrEqual(ORDER.MIN_LINES);
    expect(order.length).toBeLessThanOrEqual(ORDER.MAX_LINES);
    for (const line of order) {
      expect(POOL).toContain(line.tileId);
      expect(line.required).toBeGreaterThanOrEqual(1);
      expect(line.required).toBeLessThanOrEqual(ORDER.MAX_PER_LINE);
      expect(line.served).toBe(0);
    }
  });

  /**
   * AYNI TILE IKI SATIRDA OLAMAZ. Olsaydi "2 cay" ve "1 cay" ayri satirlar
   * olarak gorunur, oyuncuya tek bir sayi yerine iki sayi okunurdu --
   * ekran okuyucuda ozellikle kafa karistirici.
   */
  it('ayni tile i iki kez istemez', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const order = createOrder(POOL, createRng(seed));
      const ids = order.map((line) => line.tileId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  /** Havuz siparis satiri sayisindan kucukse siparis havuza sigmali. */
  it('tek tilelik havuzda tek satir uretir', () => {
    const order = createOrder([CAY], createRng(7));
    expect(order).toHaveLength(1);
    expect(order[0]!.tileId).toBe(CAY);
  });

  it('bos havuzda hata verir', () => {
    expect(() => createOrder([], createRng(1))).toThrow(RangeError);
  });

  it('ayni tohum ayni siparisi uretir', () => {
    expect(createOrder(POOL, createRng(42))).toEqual(createOrder(POOL, createRng(42)));
  });
});

describe('totalRequired / totalServed / isOrderComplete', () => {
  it('satirlari toplar', () => {
    const order = orderOf([CAY, 2, 1], [KAHVE, 1, 0]);
    expect(totalRequired(order)).toBe(3);
    expect(totalServed(order)).toBe(1);
  });

  it('hepsi teslim edilince tamamlanir', () => {
    expect(isOrderComplete(orderOf([CAY, 2, 2], [KAHVE, 1, 1]))).toBe(true);
  });

  it('tek satir eksikse tamamlanmaz', () => {
    expect(isOrderComplete(orderOf([CAY, 2, 2], [KAHVE, 1, 0]))).toBe(false);
  });

  /** Fazla teslim (4'lu eslesme vb.) tamamlanmayi bozmamali. */
  it('fazla teslim tamamlanmis sayilir', () => {
    expect(isOrderComplete(orderOf([CAY, 1, 3]))).toBe(true);
  });
});

describe('neededTileIds', () => {
  it('yalnizca eksik satirlarin tile lerini doner', () => {
    const order = orderOf([CAY, 2, 2], [KAHVE, 2, 1], [NAZAR, 1, 0]);
    expect(neededTileIds(order)).toEqual([KAHVE, NAZAR]);
  });

  it('tamamlanmis siparis icin bos doner', () => {
    expect(neededTileIds(orderOf([CAY, 1, 1]))).toEqual([]);
  });
});

describe('applyResolve', () => {
  /**
   * BIRIM ESLESMEDIR, TILE DEGIL. Uc cay yan yana gelince siparisin cay
   * satiri BIR artar -- uc degil.
   */
  it('eslesen tile in satirini bir artirir', () => {
    const order = orderOf([CAY, 2, 0]);
    const result = resolve(rowOf([CAY, CAY, CAY]));

    expect(result.removedCount).toBe(MATCH.LENGTH);
    expect(applyResolve(order, result)).toEqual(orderOf([CAY, 2, 1]));
  });

  /** Dortlu eslesme de TEK birimdir; fazla tile zaten skor bonusu veriyor. */
  it('dortlu eslesme de tek birim sayilir', () => {
    const order = orderOf([CAY, 3, 0]);
    const result = resolve(rowOf([CAY, CAY, CAY, CAY]));

    expect(result.removedCount).toBe(4);
    expect(applyResolve(order, result)[0]!.served).toBe(1);
  });

  it('siparis disi eslesme siparisi degistirmez', () => {
    const order = orderOf([CAY, 2, 0]);
    const result = resolve(rowOf([KAHVE, KAHVE, KAHVE]));

    expect(applyResolve(order, result)).toEqual(order);
  });

  it('eslesme yoksa siparis degismez', () => {
    const order = orderOf([CAY, 2, 0]);
    const result = resolve(rowOf([CAY, KAHVE]));

    expect(result.removedCount).toBe(0);
    expect(applyResolve(order, result)).toEqual(order);
  });

  /** Zincir: bir hamlede iki farkli tip eslesirse ikisi de sayilir. */
  it('zincirdeki her adimi sayar', () => {
    const order = orderOf([CAY, 2, 0], [KAHVE, 2, 0]);
    // [C C K K C C] + araya K -> KKK gider -> CCCC gider (2 adim).
    const row = rowOf([CAY, CAY, KAHVE, KAHVE, CAY, CAY]);
    const result = resolve(insertTile(row, 4, createTile(KAHVE)));

    expect(result.steps).toHaveLength(2);
    const applied = applyResolve(order, result);
    expect(applied).toEqual(orderOf([CAY, 2, 1], [KAHVE, 2, 1]));
  });

  /** Gereğinden fazla teslim SAYILMAZ: satir `required`'da durur. */
  it('gereginden fazla teslim etmez', () => {
    const order = orderOf([CAY, 1, 1]);
    const result = resolve(rowOf([CAY, CAY, CAY]));

    expect(applyResolve(order, result)[0]!.served).toBe(1);
  });
});

describe('createCustomer', () => {
  it('sabri siparis buyuklugunden turetir', () => {
    const customer = createCustomer('m1', orderOf([CAY, 2, 0], [KAHVE, 1, 0]), TYPES);
    const expected = Math.round(ORDER.BASE_PATIENCE + ORDER.PATIENCE_PER_TYPE * TYPES * 3);

    expect(customer.patience).toBe(expected);
    expect(customer.maxPatience).toBe(expected);
  });

  it('buyuk siparise daha cok sabir verir', () => {
    const small = createCustomer('a', orderOf([CAY, 1, 0]), TYPES);
    const big = createCustomer('b', orderOf([CAY, 2, 0], [KAHVE, 2, 0]), TYPES);

    expect(big.patience).toBeGreaterThan(small.patience);
  });
});

describe('tickPatience', () => {
  it('her hamlede bir azalir', () => {
    const customer = createCustomer('m1', orderOf([CAY, 1, 0]), TYPES);
    expect(tickPatience(customer).patience).toBe(customer.patience - 1);
  });

  /** Sifirin ALTINA inmez: ilerleme cubugu negatife dusmemeli. */
  it('sifirin altina inmez', () => {
    const customer = { ...createCustomer('m1', orderOf([CAY, 1, 0]), TYPES), patience: 0 };
    expect(tickPatience(customer).patience).toBe(0);
  });

  it('maxPatience i degistirmez', () => {
    const customer = createCustomer('m1', orderOf([CAY, 1, 0]), TYPES);
    expect(tickPatience(customer).maxPatience).toBe(customer.maxPatience);
  });
});

describe('isCustomerGone', () => {
  it('sabir varken gitmez', () => {
    expect(isCustomerGone(createCustomer('m', orderOf([CAY, 1, 0]), TYPES))).toBe(false);
  });

  it('sabir bitince gider', () => {
    const customer = { ...createCustomer('m', orderOf([CAY, 1, 0]), TYPES), patience: 0 };
    expect(isCustomerGone(customer)).toBe(true);
  });

  /**
   * SINIR: son sabir hamlesinde musteri HALA burada. Aksi halde oyuncu
   * cubukta bir birim gorurken musteri gitmis olurdu.
   */
  it('son sabir hamlesinde hala burada', () => {
    const customer = { ...createCustomer('m', orderOf([CAY, 1, 0]), TYPES), patience: 1 };
    expect(isCustomerGone(customer)).toBe(false);
    expect(isCustomerGone(tickPatience(customer))).toBe(true);
  });
});

describe('patienceRatio / patienceSpent', () => {
  it('dolu sabirda 1 doner', () => {
    expect(patienceRatio(createCustomer('m', orderOf([CAY, 1, 0]), TYPES))).toBe(1);
  });

  it('bitmis sabirda 0 doner', () => {
    const customer = { ...createCustomer('m', orderOf([CAY, 1, 0]), TYPES), patience: 0 };
    expect(patienceRatio(customer)).toBe(0);
  });

  it('harcanan sabri hamle cinsinden verir', () => {
    const customer = createCustomer('m', orderOf([CAY, 1, 0]), TYPES);
    const after = tickPatience(tickPatience(customer));
    expect(patienceSpent(after)).toBe(2);
  });
});
