import { ORDER } from '@/constants/config';

import type { Rng } from './rng';
import type { Customer, Order, OrderLine, ResolveResult, TileId } from './types';

/**
 * Siparis sistemi -- Sprint 3'un cekirdegi.
 *
 * NEDEN VAR (olcumle): Sprint 2 sonunda butun eslesmeler esdegerdi, yani
 * oyuncunun tek karari "nereye koyayim" idi ve cevabi neredeyse her zaman
 * mekanikti. Eslesme orani 1/3'e civili oldugu icin tempo da hic
 * degismiyordu: seviye 30, seviye 1'den ZOR degil UZUNDU.
 *
 * Siparis bunu kirar: artik hangi eslesmeyi yaptigin onemli. Sabir da
 * gercek bir kaybetme yolu ekler -- Sprint 2'de dusunen oyuncu %100
 * kazaniyordu, yani pratikte kaybetme yolu YOKTU.
 *
 * Bu dosya SAF: platform API'si yok, rastgelelik disaridan `Rng` olarak
 * geliyor, sabir HAMLE sayiyor. Ucu birlikte butun davranisi simule
 * edilebilir kiliyor (bkz. `__tests__/helpers/policies.ts`).
 */

/** Siparis satirinin eksigi. */
function missing(line: OrderLine): number {
  return Math.max(0, line.required - line.served);
}

/** Siparisteki toplam eslesme ihtiyaci. */
export function totalRequired(order: Order): number {
  return order.reduce((sum, line) => sum + line.required, 0);
}

/** Teslim edilmis toplam eslesme. */
export function totalServed(order: Order): number {
  return order.reduce((sum, line) => sum + line.served, 0);
}

/** Butun satirlar tamamlandi mi? */
export function isOrderComplete(order: Order): boolean {
  return order.every((line) => line.served >= line.required);
}

/**
 * Hala teslim edilmeyi bekleyen tile tipleri.
 *
 * Uretici bunu "talep" olarak kullanir: oyuncu kendi hatasi olmadan,
 * sirf istedigi tip tepsiye hic gelmedigi icin musteri kaybetmemeli.
 */
export function neededTileIds(order: Order): readonly TileId[] {
  return order.filter((line) => missing(line) > 0).map((line) => line.tileId);
}

/**
 * Havuzdan rastgele bir siparis uretir.
 *
 * Ayni tile iki satirda BULUNAMAZ: bulunsaydi oyuncuya "2 cay" ve "1 cay"
 * ayri ayri okunurdu -- ekranda kafa karistirici, ekran okuyucuda beter.
 * Bu yuzden havuz kopyalanip secilenler cikariliyor.
 */
export function createOrder(pool: readonly TileId[], rng: Rng): Order {
  if (pool.length === 0) {
    throw new RangeError('Siparis uretmek icin havuz bos olamaz.');
  }

  // Havuz siparis satiri sayisindan kucuk olabilir (dusuk seviyeler);
  // satir sayisi her zaman havuza sigar.
  const maxLines = Math.min(ORDER.MAX_LINES, pool.length);
  const lineCount = ORDER.MIN_LINES + rng.int(maxLines - ORDER.MIN_LINES + 1);

  const remaining = [...pool];
  const lines: OrderLine[] = [];

  for (let i = 0; i < lineCount; i++) {
    // remaining hic bosalmaz: lineCount <= pool.length.
    const index = rng.int(remaining.length);
    const [tileId] = remaining.splice(index, 1) as [TileId];

    lines.push({
      tileId,
      required: 1 + rng.int(ORDER.MAX_PER_LINE),
      served: 0,
    });
  }

  return lines;
}

/**
 * Bir hamlenin cozumlenmesini siparise yansitir.
 *
 * BIRIM ESLESMEDIR, TILE DEGIL. Uc cay yan yana gelince cay satiri BIR
 * artar; dortlu eslesme de tek birimdir (fazla tile zaten skor bonusu
 * veriyor). "3 cay" siparisi uc BARDAK cay demek, dokuz tile degil.
 *
 * Zincirin her adimindaki her eslesme ayri ayri sayilir: tek hamlede iki
 * farkli tip eslesirse ikisi de teslim edilmis olur.
 */
export function applyResolve(order: Order, result: ResolveResult): Order {
  if (result.steps.length === 0) return order;

  const delivered = new Map<TileId, number>();
  for (const step of result.steps) {
    for (const run of step.runs) {
      delivered.set(run.tileId, (delivered.get(run.tileId) ?? 0) + 1);
    }
  }

  let changed = false;
  const next = order.map((line) => {
    const count = delivered.get(line.tileId);
    if (count === undefined) return line;

    // `required`'i ASMAZ: fazla teslim ilerleme cubugunu tasirirdi.
    const served = Math.min(line.required, line.served + count);
    if (served === line.served) return line;

    changed = true;
    return { ...line, served };
  });

  // Degisiklik yoksa AYNI referansi don: gereksiz `set` React'te bos
  // render tetikler (bkz. `clearCombo` ile ayni gerekce).
  return changed ? next : order;
}

/**
 * Musteri olusturur; sabri siparis buyuklugunden VE TIP SAYISINDAN turetir.
 *
 * `tileTypeCount` neden gerekli -- OLCULMUS ARZ YASASI: belirli bir aileden
 * uclu kurmak icin o aileden uc tile gerekir; tepsi hamle basina bir tile
 * verir ve onun aranan aile olma olasiligi ~1/T. Yani bir birim ~3*T
 * hamlelik ARZ demek ve bu sayi tamamen oyuncunun DISINDA.
 *
 * Sabit sabirla ne oldu (300 tohum): kazanma orani L1'de %79.7 iken L30'da
 * %1'e cokuyordu. Oyuncu kotulesmiyordu; formul tip sayisini gormuyordu.
 */
export function createCustomer(id: string, order: Order, tileTypeCount: number): Customer {
  if (!Number.isInteger(tileTypeCount) || tileTypeCount < 1) {
    throw new RangeError(`Tip sayisi pozitif tam sayi olmali, alinan: ${tileTypeCount}`);
  }

  const perUnit = ORDER.PATIENCE_PER_TYPE * tileTypeCount;
  const patience = Math.round(ORDER.BASE_PATIENCE + perUnit * totalRequired(order));
  return { id, order, patience, maxPatience: patience };
}

/**
 * Sabri bir HAMLE azaltir.
 *
 * Gercek zaman degil hamle: ekran okuyucu kullanicisi etiketleri
 * dinlerken cezalandirilmamali, ve davranis simule edilebilmeli.
 */
export function tickPatience(customer: Customer): Customer {
  if (customer.patience <= 0) return customer;
  return { ...customer, patience: customer.patience - 1 };
}

/** Sabir doldu mu? (Siparis tamamlanmissa cagiran taraf zaten kontrol eder.) */
export function isCustomerGone(customer: Customer): boolean {
  return customer.patience <= 0;
}

/** Kalan sabir orani, 0..1 -- ilerleme cubugu icin. */
export function patienceRatio(customer: Customer): number {
  return customer.patience / customer.maxPatience;
}

/** Harcanan sabir (hamle). Duyuru metinlerinde kullanilir. */
export function patienceSpent(customer: Customer): number {
  return customer.maxPatience - customer.patience;
}

/**
 * Uretici tarafindan KOLLANMASI gereken tipler.
 *
 * Bos dizi = "acele yok, normal uret". Dolu = "bunlardan biri tepsiye
 * gelmeli".
 *
 * NEDEN BURADA, generator'da degil: kural tek yerde yasamali. Hem store
 * hem simulasyon harness'i ayni fonksiyonu cagirir; generator siparis
 * kavramini hic bilmez, yalnizca "su tipler acilen lazim" listesi alir.
 * Boylece generator saf ve test edilebilir kalir, kural da catallanmaz.
 *
 * Esik NEDEN VAR: her hamlede talebi zorlamak siparisi bedava yapardi --
 * oyuncu hicbir sey secmeden dogru tile'lar onune akardi. Zorlama yalnizca
 * musteri gitmek uzereyken devreye girer; o ana kadar dogru tile'i BULMAK
 * oyuncunun isidir. Yani bu bir kolaylik degil, ADALET mekanizmasi.
 */
export function urgentDemand(customer: Customer | null): readonly TileId[] {
  if (customer === null) return [];
  if (customer.patience > ORDER.DEMAND_PRESSURE) return [];
  return neededTileIds(customer.order);
}
