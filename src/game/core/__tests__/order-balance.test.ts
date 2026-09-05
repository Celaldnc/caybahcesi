import { ORDER } from '@/constants/config';

import { getLevelConfig } from '../level';
import { neededTileIds, urgentDemand } from '../orders';

import {
  carelessPolicy,
  orderAwarePolicy,
  playOrderGame,
  thoughtfulPolicy,
  type OrderGameResult,
  type Policy,
} from './helpers/policies';

/**
 * SIPARIS DENGESININ KALICI BEKCISI.
 *
 * Sprint 2'nin dersi tek cumleydi: eglence olculmezse duz kaliyor. Oyun
 * olculebilir bicimde duzdu -- dusunen oyuncu L1, L10 ve L30'u %100
 * kazaniyordu, yani pratikte KAYBETME YOLU YOKTU.
 *
 * Asagidaki esikler tahmin degil, 300 tohumluk supurmelerle secilmis
 * degerlerin MANDALIDIR (ratchet). Amaclari "su oran iyidir" demek degil;
 * bir sonraki denge ayarinin egriyi sessizce yeniden duzlestirmesini
 * engellemek. Tohum sayisi suiteyi hizli tutmak icin dusuk; esikler de
 * olculen degerin altinda birakildi ki gurultu testi kirmasin.
 */

const SEEDS = 40;
const MAX_MOVES = 400;

interface Summary {
  readonly winRate: number;
  readonly avgMoves: number;
  readonly avgServing: number;
  readonly games: number;
  readonly lostCustomers: number;
}

function measure(level: number, policy: Policy): Summary {
  const config = getLevelConfig(level);
  let wins = 0;
  let moves = 0;
  let serving = 0;
  let lost = 0;

  for (let seed = 1; seed <= SEEDS; seed++) {
    const result: OrderGameResult = playOrderGame({
      seed,
      poolSize: config.tileTypeCount,
      slotCount: config.slotCount,
      maxMoves: MAX_MOVES,
      policy,
      customerCount: config.customerCount,
    });

    if (result.won) wins++;
    moves += result.moves;
    serving += result.servingRatio;
    lost += result.lost;
  }

  return {
    winRate: wins / SEEDS,
    avgMoves: moves / SEEDS,
    avgServing: serving / SEEDS,
    games: SEEDS,
    lostCustomers: lost,
  };
}

describe('siparis dengesi', () => {
  /**
   * ASIL IDDIA: oyun artik KAYBEDILEBILIR.
   *
   * Sprint 2'de bu satir %100 idi. Yalnizca ustten degil ALTTAN da
   * sinirliyoruz: cok dusuk olursa oyun haksizlasir, %100 olursa gerilim
   * tumden kaybolur -- iki taraf da regresyon.
   */
  it.each([
    [1, 0.85],
    [30, 0.7],
  ])('L%i: dusunen oyuncu duzenli kazanir', (level, floor) => {
    const summary = measure(level, orderAwarePolicy);

    // Denetimin YAPILDIGINI once iddia et (CLAUDE.md: sayac sifirdan
    // baslayan test vakumdur).
    expect(summary.games).toBe(SEEDS);
    expect(summary.avgMoves).toBeGreaterThan(10);

    expect(summary.winRate).toBeGreaterThanOrEqual(floor);
  });

  /**
   * "GARANTI YOK" IDDIASI SON SEVIYEDE KURULUR.
   *
   * L1 kasten affedicidir (300 tohumda %98.3), 40 tohumluk orneklemde
   * duzenli olarak 40/40 gelir -- oraya `< 1` yazmak testi gurultuye
   * baglardi. L30'da olculen oran %88.7; kaybetme yolu ORADA gorunur.
   */
  it('son seviyede kazanmak garanti DEGILDIR', () => {
    const summary = measure(30, orderAwarePolicy);
    expect(summary.games).toBe(SEEDS);
    expect(summary.winRate).toBeLessThan(1);
  });

  /**
   * SABIR GERCEKTEN ISLIYOR: musteri kaybi VAR ama oyunu bogmuyor.
   * Sifir kayip, sabir kolunun olu oldugu anlamina gelirdi.
   */
  it('musteri kaybi gerceklesir ama nadirdir', () => {
    const summary = measure(30, orderAwarePolicy);
    expect(summary.lostCustomers).toBeGreaterThan(0);
    expect(summary.lostCustomers / summary.games).toBeLessThan(ORDER.MAX_LOST);
  });

  /**
   * BECERI TABANI: rastgele oynayan kazanamamali. Sprint 2'de bu %0.7 idi
   * ve ustteki %100 ile birlikte "oyun beceriye duyarli" gorunumu
   * veriyordu -- oysa tavan zaten doluydu.
   */
  it.each([1, 30])('L%i: dikkatsiz oyuncu neredeyse hic kazanamaz', (level) => {
    const summary = measure(level, carelessPolicy);
    expect(summary.games).toBe(SEEDS);
    expect(summary.winRate).toBeLessThanOrEqual(0.15);
  });

  /**
   * TEMPO. Sprint 2'de oturum 21-49 hamleydi; siparis sistemi bunu
   * korumali. Ust sinir onemli: tek masali ilk tasarimda oturum 72-104
   * hamleye cikiyordu ve hamlelerin yalnizca %11'i siparise dokunuyordu.
   */
  it.each([
    [1, 10, 35],
    [30, 30, 90],
  ])('L%i: oturum %i-%i hamle bandinda kalir', (level, min, max) => {
    const summary = measure(level, orderAwarePolicy);
    expect(summary.avgMoves).toBeGreaterThanOrEqual(min);
    expect(summary.avgMoves).toBeLessThanOrEqual(max);
  });

  /**
   * OYUNCU ZAMANININ ANLAMLI BIR KISMI HEDEFE DOKUNMALI.
   *
   * Tek masali tasarimda bu oran %11'di: oyuncu zamaninin %89'unda
   * hedefiyle ilgisiz is yapiyordu. Uc masa %15-22'ye cikardi. Bu esik
   * masa sayisinin dusurulmesine karsi mandaldir.
   */
  it.each([
    [1, 0.18],
    [30, 0.11],
  ])('L%i: hamlelerin anlamli kismi siparise dokunur', (level, floor) => {
    expect(measure(level, orderAwarePolicy).avgServing).toBeGreaterThanOrEqual(floor);
  });

  /**
   * DURUST KAYIT: siparis farkindaligi su an OLCULEBILIR BIR AVANTAJ
   * SAGLAMIYOR.
   *
   * Bu bir kusur degil, olculmus yapisal bir gercek: belirli bir aileden
   * uclu kurmak ~3*T hamlelik ARZ gerektiriyor ve oyuncunun bunun uzerinde
   * etkisi yok. Siparis katmani BASKI ve TEMPO getirdi, AJANS getirmedi.
   * Ajans bir sonraki katmanin isi (ozel tile'lar: oyuncunun tahsis
   * ettigi kaynak).
   *
   * Test bu gercegi PINLER: gun gelip siparis farkindaligi gercekten fark
   * yaratirsa bu test kirilir ve o zaman bu yorum guncellenmelidir.
   * Sessizce dogru sanmaktansa, bilinen sinirlamayi yazili tutuyoruz.
   */
  it('siparis farkindaligi henuz olculebilir avantaj saglamiyor', () => {
    const aware = measure(30, orderAwarePolicy).winRate;
    const blind = measure(30, thoughtfulPolicy).winRate;
    expect(Math.abs(aware - blind)).toBeLessThan(0.15);
  });
});

describe('playOrderGame sozlesmesi', () => {
  const config = getLevelConfig(1);

  function play(policy: Policy, overrides: Partial<{ maxMoves: number }> = {}): OrderGameResult {
    return playOrderGame({
      seed: 7,
      poolSize: config.tileTypeCount,
      slotCount: config.slotCount,
      maxMoves: overrides.maxMoves ?? MAX_MOVES,
      policy,
      customerCount: config.customerCount,
    });
  }

  it('kazanildiginda servis sayisi hedefe ulasir', () => {
    const result = play(orderAwarePolicy);
    expect(result.won).toBe(true);
    expect(result.reason).toBe('kazandi');
    expect(result.served).toBeGreaterThanOrEqual(config.customerCount);
  });

  it('hamle butcesi biterse kaybeder', () => {
    const result = play(orderAwarePolicy, { maxMoves: 3 });
    expect(result.won).toBe(false);
    expect(result.reason).toBe('hamle-bitti');
    expect(result.moves).toBe(3);
  });

  it('dikkatsiz oyunda satir dolarak biter', () => {
    const result = play(carelessPolicy);
    expect(result.reason).toBe('satir-doldu');
    expect(result.won).toBe(false);
  });

  it('hamle yapilmadan sonuclanirsa oranlar sifirdir', () => {
    const result = play(orderAwarePolicy, { maxMoves: 0 });
    expect(result.moves).toBe(0);
    expect(result.scoringRatio).toBe(0);
    expect(result.servingRatio).toBe(0);
  });
});

describe('urgentDemand', () => {
  it('musteri yoksa talep yoktur', () => {
    expect(urgentDemand(null)).toEqual([]);
  });

  /**
   * ESIK USTUNDE SESSIZ: her hamlede talebi zorlamak siparisi bedava
   * yapardi -- dogru tile'i BULMAK oyuncunun isi. Zorlama yalnizca musteri
   * gitmek uzereyken devreye girer; bu bir kolaylik degil ADALET kolu.
   */
  it('sabir bolken talep bildirmez', () => {
    const customer = {
      id: 'm',
      order: [{ tileId: 'cay-ince-belli', required: 1, served: 0 }],
      patience: ORDER.DEMAND_PRESSURE + 1,
      maxPatience: 50,
    } as const;
    expect(urgentDemand(customer)).toEqual([]);
  });

  it('sabir esige inince eksik tile leri bildirir', () => {
    const customer = {
      id: 'm',
      order: [
        { tileId: 'cay-ince-belli', required: 1, served: 1 },
        { tileId: 'kahve-fincan', required: 1, served: 0 },
      ],
      patience: ORDER.DEMAND_PRESSURE,
      maxPatience: 50,
    } as const;

    expect(urgentDemand(customer)).toEqual(['kahve-fincan']);
    expect(neededTileIds(customer.order)).toEqual(['kahve-fincan']);
  });
});

describe('siparis modunda satir guvenligi korunur', () => {
  /**
   * SPRINT 1'IN GARANTISI GECERSIZ OLMADI.
   *
   * Siparis katmani ikinci bir kaybetme yolu ekledi; bu, birincinin
   * (satirin dolmasi) garantisini zayiflatmamali. Uretici oncelik sirasi
   * SATIR > SIPARIS oldugu icin dusunen oyuncu satir dolmasindan
   * kaybetmemeli.
   */
  it('dusunen oyuncu satir dolmasindan kaybetmez', () => {
    const config = getLevelConfig(30);
    let rowFullLosses = 0;
    let games = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      const result = playOrderGame({
        seed,
        poolSize: config.tileTypeCount,
        slotCount: config.slotCount,
        maxMoves: MAX_MOVES,
        policy: orderAwarePolicy,
        customerCount: config.customerCount,
      });
      games++;
      if (result.reason === 'satir-doldu') rowFullLosses++;
    }

    expect(games).toBe(SEEDS);
    expect(rowFullLosses).toBe(0);
  });

  it('isRowFull hala kaybetme kosulu olarak baglidir', () => {
    // Sozlesmenin OLU OLMADIGINI ispatla: dikkatsiz oyun satiri doldurur.
    const config = getLevelConfig(1);
    const result = playOrderGame({
      seed: 3,
      poolSize: config.tileTypeCount,
      slotCount: config.slotCount,
      maxMoves: MAX_MOVES,
      policy: carelessPolicy,
      customerCount: config.customerCount,
    });
    expect(result.reason).toBe('satir-doldu');
  });
});
