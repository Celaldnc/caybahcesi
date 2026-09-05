import { AccessibilityInfo, Platform } from 'react-native';

import { announce, moveAnnouncement, type MoveSnapshot } from '../announce';

/**
 * Ekran okuyucu duyurulari.
 *
 * Sprint 2 kalite kapisinda erisilebilirlik denetimi P0 verdi: "gorme
 * engelli bir oyuncu bu oyunu su an oynayamaz". Etiketleme kusursuzdu,
 * GERI BILDIRIM yoktu -- `announceForAccessibility` kod tabaninda sifir
 * kez geciyordu. Bu testler o kanalin acik KALDIGINI zorluyor.
 */

const BASE: MoveSnapshot = {
  status: 'oynaniyor',
  score: 40,
  gain: 0,
  combo: 0,
  filled: 3,
  slotCount: 7,
  moves: 5,
};

describe('moveAnnouncement', () => {
  it('puansiz hamlede yerlestirmeyi ve kalan yeri bildirir', () => {
    const text = moveAnnouncement(BASE);
    expect(text).toContain('Yerleştirildi');
    expect(text).toContain('4 boş slot');
  });

  it('eslesmede kazanilan puani ve toplami bildirir', () => {
    const text = moveAnnouncement({ ...BASE, gain: 10, score: 50, filled: 1 });
    expect(text).toContain('artı 10 puan');
    expect(text).toContain('Toplam 50');
  });

  it('zincirde combo carpanini one alir', () => {
    const text = moveAnnouncement({ ...BASE, gain: 25, combo: 2 });
    expect(text.startsWith('Combo çarpı 2!')).toBe(true);
  });

  it('combo yokken carpandan soz etmez', () => {
    expect(moveAnnouncement({ ...BASE, gain: 10, combo: 1 })).not.toContain('Combo');
  });

  /**
   * KAYBETME ESIGI. Bos slotlar kesikli kenarlikli duz View'lar; goren
   * oyuncu satirin dolmakta oldugunu bakinca anlar, ekran okuyucu
   * kullanicisi Sprint 2'de HICBIR SEKILDE anlayamiyordu.
   */
  it('son bos slotta ayrica uyarir', () => {
    const text = moveAnnouncement({ ...BASE, filled: 6, slotCount: 7 });
    expect(text).toContain('Son boş slot!');
  });

  it('seviye tamamlandiginda hamle ve puani bildirir', () => {
    const text = moveAnnouncement({ ...BASE, status: 'seviye-tamam', score: 200, moves: 18 });
    expect(text).toBe('Seviye tamamlandı! 18 hamlede 200 puan.');
  });

  it('oyun bittiginde sebebi ve skoru bildirir', () => {
    const text = moveAnnouncement({ ...BASE, status: 'oyun-bitti', score: 90 });
    expect(text).toBe('Satır doldu, oyun bitti. 90 puan.');
  });

  /**
   * SONUC ODULDEN ONCE gelir. Ekran okuyucu uzun cumleyi bastan okur;
   * oyuncunun ilk ogrenmesi gereken sey kazanip kazanmadigidir. Bitis
   * durumlarinda skor/kalan-yer ayrintisi cumleyi uzatmamali.
   */
  it('bitis duyurusu kalan slot ayrintisi tasimaz', () => {
    for (const status of ['seviye-tamam', 'oyun-bitti'] as const) {
      expect(moveAnnouncement({ ...BASE, status })).not.toContain('boş slot');
    }
  });

  it('her hamle bir duyuru uretir (sessiz hamle yok)', () => {
    const cases: MoveSnapshot[] = [
      BASE,
      { ...BASE, gain: 10 },
      { ...BASE, gain: 30, combo: 3 },
      { ...BASE, filled: 6 },
      { ...BASE, status: 'seviye-tamam' },
      { ...BASE, status: 'oyun-bitti' },
    ];
    for (const snapshot of cases) {
      expect(moveAnnouncement(snapshot).length).toBeGreaterThan(0);
    }
    expect(cases.length).toBe(6);
  });
});

describe('announce', () => {
  const originalOS = Platform.OS;
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {
      // Yan etkiyi yut; testte gercek ekran okuyucu yok.
    });
  });

  afterEach(() => {
    spy.mockRestore();
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  it('native platformda duyuruyu iletir', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    announce('Eşleşme, artı 10 puan.');
    expect(spy).toHaveBeenCalledWith('Eşleşme, artı 10 puan.');
  });

  it('android de calisir', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    announce('merhaba');
    expect(spy).toHaveBeenCalledWith('merhaba');
  });

  /**
   * Web'de erisilebilirlik duyuru API'si yok. Platform kontrolu CAGRI
   * ANINDA okunuyor -- modul sabiti olsaydi bu test yazilamazdi ve
   * "fonksiyon var mi" demekten oteye gidemezdi (`useHaptics` dersi).
   */
  it('web platformunda sessiz kalir', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    announce('duyulmamali');
    expect(spy).not.toHaveBeenCalled();
  });

  it('bos metin gondermez', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    announce('');
    expect(spy).not.toHaveBeenCalled();
  });
});
