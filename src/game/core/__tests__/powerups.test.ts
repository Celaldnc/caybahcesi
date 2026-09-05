import { POWER } from '@/constants/config';

import { createTile } from '../tiles';
import type { TileId, Tray } from '../types';
import {
  applySemaver,
  canUseSemaver,
  earnedSemaver,
  NO_POWERS,
  powersAfterServe,
  startingPowers,
} from '../powerups';

/**
 * Ozel gucler -- oyunun AJANS katmani.
 *
 * Bu dosyanin varlik sebebi Sprint 3a'nin durust bulgusu: siparis sistemi
 * baski ve tempo getirdi ama siparis-farkinda oyuncu ile siparisi umursamayan
 * oyuncu AYNI kazaniyordu. Semaver, arzin belirlemedigi ilk karari verir.
 */

const CAY: TileId = 'cay-ince-belli';
const KAHVE: TileId = 'kahve-fincan';
const NAZAR: TileId = 'nazar-mavi';
const POOL: readonly TileId[] = [CAY, KAHVE, NAZAR];

const trayOf = (...ids: readonly TileId[]): Tray => ids.map((id) => createTile(id));

describe('startingPowers / canUseSemaver', () => {
  it('seviye basinda sarj verir', () => {
    expect(startingPowers().semaver).toBe(POWER.SEMAVER_START);
  });

  it('sarj varken kullanilabilir', () => {
    expect(canUseSemaver({ semaver: 1 })).toBe(true);
  });

  it('sarj yokken kullanilamaz', () => {
    expect(canUseSemaver(NO_POWERS)).toBe(false);
  });
});

describe('earnedSemaver', () => {
  it('esige ulasilmadan sarj vermez', () => {
    expect(earnedSemaver(POWER.SEMAVER_PER_CUSTOMERS - 1)).toBe(0);
  });

  it('her esikte bir sarj verir', () => {
    expect(earnedSemaver(POWER.SEMAVER_PER_CUSTOMERS)).toBe(1);
    expect(earnedSemaver(POWER.SEMAVER_PER_CUSTOMERS * 3)).toBe(3);
  });

  it('gecersiz sayida hata verir', () => {
    expect(() => earnedSemaver(-1)).toThrow(RangeError);
    expect(() => earnedSemaver(1.5)).toThrow(RangeError);
  });
});

describe('powersAfterServe', () => {
  /**
   * KUMULATIF hesap: sarj, servis sayisindan TURETILIR. Artimli bir sayac
   * "iki kez kazandirma" hatasina acik olurdu ve geri alma/yeniden yukleme
   * durumlarinda sessizce kayardi.
   */
  it('harcanmamis sarjlari biriktirir', () => {
    const powers = powersAfterServe(0, POWER.SEMAVER_PER_CUSTOMERS);
    expect(powers.semaver).toBe(POWER.SEMAVER_START + 1);
  });

  it('harcanan sarji duser', () => {
    expect(powersAfterServe(1, 0).semaver).toBe(POWER.SEMAVER_START - 1);
  });

  it('tavani asmaz', () => {
    const powers = powersAfterServe(0, POWER.SEMAVER_PER_CUSTOMERS * 20);
    expect(powers.semaver).toBe(POWER.SEMAVER_MAX);
  });

  it('sifirin altina inmez', () => {
    expect(powersAfterServe(99, 0).semaver).toBe(0);
  });
});

describe('applySemaver', () => {
  it('secilen tepsi tile ini hedef tipe cevirir', () => {
    const tray = trayOf(CAY, KAHVE, NAZAR);
    const next = applySemaver(tray, 1, CAY, POOL);

    expect(next.map((t) => t.id)).toEqual([CAY, CAY, NAZAR]);
  });

  it('digerlerine dokunmaz', () => {
    const tray = trayOf(CAY, KAHVE, NAZAR);
    const next = applySemaver(tray, 1, CAY, POOL);

    expect(next[0]).toBe(tray[0]);
    expect(next[2]).toBe(tray[2]);
  });

  /**
   * YENI `key` SART. Kararli anahtar Reanimated'in layout animasyonunun
   * tasiyicisi; ayni anahtarla tip degistirmek "ayni View bambaska bir sey
   * oldu" demek olurdu ve gecis yanlis nesneyi takip ederdi.
   */
  it('donusen tile yeni bir anahtar alir', () => {
    const tray = trayOf(CAY, KAHVE);
    const next = applySemaver(tray, 1, NAZAR, POOL);

    expect(next[1]!.key).not.toBe(tray[1]!.key);
  });

  it('girdiyi degistirmez', () => {
    const tray = trayOf(CAY, KAHVE);
    applySemaver(tray, 0, NAZAR, POOL);
    expect(tray.map((t) => t.id)).toEqual([CAY, KAHVE]);
  });

  /**
   * HAVUZ DISI HEDEF REDDEDILIR: aksi halde oyuncu seviyede hic bulunmayan
   * bir tip uretip kendi eslesme sansini tumden yok edebilirdi.
   */
  it('havuzda olmayan hedefi reddeder', () => {
    expect(() => applySemaver(trayOf(CAY), 0, 'firin-simit', POOL)).toThrow(RangeError);
  });

  it('gecersiz indisi reddeder', () => {
    const tray = trayOf(CAY, KAHVE);
    expect(() => applySemaver(tray, -1, CAY, POOL)).toThrow(RangeError);
    expect(() => applySemaver(tray, 2, CAY, POOL)).toThrow(RangeError);
    expect(() => applySemaver(tray, 1.5, CAY, POOL)).toThrow(RangeError);
  });
});
