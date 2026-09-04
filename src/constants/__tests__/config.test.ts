import {
  ICON,
  LEVEL,
  MATCH,
  OPACITY,
  RADIUS,
  SCORE,
  SLOTS,
  SPACING,
  STORAGE_KEYS,
  TOUCH,
  TRAY,
  TYPO,
  WEIGHT,
} from '../config';

/**
 * Sabitleri "dokumantasyon"dan "sozlesme"ye cevirir.
 *
 * config.ts denge (balancing) dosyasi: Sprint 1-3 boyunca surekli elle
 * duzenlenecek. Bu testler olmadan tutarsiz bir kombinasyon (orn. baslangic
 * slot sayisi > tavan) ancak oyun oynanirken fark edilirdi.
 */
describe('config invariant sozlesmeleri', () => {
  describe('SLOTS', () => {
    it('baslangic slot sayisi tavani asmaz', () => {
      expect(SLOTS.INITIAL).toBeLessThanOrEqual(SLOTS.MAX);
    });

    it('bir eslesme sigacak kadar slot vardir', () => {
      expect(SLOTS.INITIAL).toBeGreaterThanOrEqual(MATCH.LENGTH);
    });
  });

  describe('LEVEL', () => {
    it('en az tile tipi, en fazla tile tipini asmaz', () => {
      expect(LEVEL.MIN_TILE_TYPES).toBeLessThanOrEqual(LEVEL.MAX_TILE_TYPES);
    });

    it('tile tipi sayisi slot tavanini asmaz (aksi halde tahta cozulemez olur)', () => {
      expect(LEVEL.MAX_TILE_TYPES).toBeLessThanOrEqual(SLOTS.MAX);
    });

    it('en az bir seviye vardir', () => {
      expect(LEVEL.TOTAL).toBeGreaterThan(0);
    });
  });

  describe('TRAY / MATCH', () => {
    it('tray en az bir eslesme kurabilecek kadar tile gosterir', () => {
      expect(TRAY.VISIBLE).toBeGreaterThan(0);
    });

    it('eslesme uzunlugu triple-match turune uygundur', () => {
      expect(MATCH.LENGTH).toBe(3);
    });

    it('guvenlik esigi anlamli bir aralikta (0 = kapali, slot sayisi = her zaman acik)', () => {
      expect(TRAY.SAFETY_THRESHOLD).toBeGreaterThan(0);
      expect(TRAY.SAFETY_THRESHOLD).toBeLessThan(SLOTS.INITIAL);
    });

    it('tahta yanliligi gecerli bir olasiliktir', () => {
      expect(TRAY.BOARD_BIAS).toBeGreaterThan(0);
      expect(TRAY.BOARD_BIAS).toBeLessThanOrEqual(1);
    });
  });

  describe('SCORE', () => {
    it('taban puan pozitiftir', () => {
      expect(SCORE.BASE_PER_MATCH).toBeGreaterThan(0);
    });

    it('combo carpani en az 1 ile baslar ve tavani vardir', () => {
      expect(SCORE.COMBO_MAX).toBeGreaterThanOrEqual(1);
      expect(SCORE.COMBO_STEP).toBeGreaterThanOrEqual(1);
    });

    /**
     * Tavan ULASILABILIR olmali. Zincirin her adimi en az MATCH.LENGTH tile
     * kaldirir ve kapasite SLOTS.MAX'tir, dolayisiyla en fazla
     * floor(SLOTS.MAX / MATCH.LENGTH) adim mumkundur. Bunun ustundeki bir
     * COMBO_MAX, oyuncunun asla goremeyecegi olu bir sabittir.
     */
    it('combo tavani yapisal olarak ulasilabilirdir', () => {
      expect(SCORE.COMBO_MAX).toBeLessThanOrEqual(Math.floor(SLOTS.MAX / MATCH.LENGTH));
    });

    /**
     * COMBO_STEP tam sayi olmali: runPoints kesirli carpani RangeError ile
     * reddediyor, yani 0.5 gibi "makul" bir denge degeri oyunu CALISMA
     * ZAMANINDA patlatirdi -- testte degil.
     */
    it('combo adimi tam sayidir (kesirli deger runPoints i patlatir)', () => {
      expect(Number.isInteger(SCORE.COMBO_STEP)).toBe(true);
    });

    it('perfect-sort bonusu tek bir eslesmeden daha degerlidir', () => {
      expect(SCORE.PERFECT_SORT_BONUS).toBeGreaterThan(SCORE.BASE_PER_MATCH);
    });

    it('ekstra tile bonusu pozitif ama taban puandan kucuktur', () => {
      // 4'lu eslesme 3'luden degerli olmali, ama iki ayri 3'luden degil.
      expect(SCORE.EXTRA_TILE_BONUS).toBeGreaterThan(0);
      expect(SCORE.EXTRA_TILE_BONUS).toBeLessThan(SCORE.BASE_PER_MATCH);
    });
  });

  describe('TOUCH', () => {
    it('dokunma hedefi hem iOS HIG (44) hem Material (48) esigini karsilar', () => {
      expect(TOUCH.MIN_TARGET).toBeGreaterThanOrEqual(48);
    });
  });

  describe('STORAGE_KEYS', () => {
    it('anahtarlar benzersizdir (cakisma sessiz veri kaybi demektir)', () => {
      const values = Object.values(STORAGE_KEYS);
      expect(new Set(values).size).toBe(values.length);
    });

    it('tum anahtarlar "cb." on ekini tasir (baska uygulamalarla cakismasin)', () => {
      for (const value of Object.values(STORAGE_KEYS)) {
        expect(value.startsWith('cb.')).toBe(true);
      }
    });
  });

  describe('UI olcekleri', () => {
    it('SPACING artan siradadir', () => {
      const values = [SPACING.xs, SPACING.sm, SPACING.md, SPACING.lg, SPACING.xl];
      expect([...values].sort((a, b) => a - b)).toEqual(values);
    });

    it('TYPO artan siradadir (caption en kucuk, title en buyuk)', () => {
      const values = [
        TYPO.caption,
        TYPO.body,
        TYPO.button,
        TYPO.subheading,
        TYPO.heading,
        TYPO.title,
      ];
      expect([...values].sort((a, b) => a - b)).toEqual(values);
    });

    it('OPACITY degerleri 0-1 araligindadir', () => {
      for (const value of Object.values(OPACITY)) {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it('devre disi saydamligi okunabilirligi koruyacak kadar yuksektir', () => {
      // 0.4 kontrasti 2.15:1'e dusuruyordu; kilitli seviye butonlari okunur kalmali.
      expect(OPACITY.disabled).toBeGreaterThanOrEqual(0.5);
    });

    it('RADIUS ve ICON pozitiftir', () => {
      expect(RADIUS.button).toBeGreaterThan(0);
      expect(ICON.tab).toBeGreaterThan(0);
    });

    it('WEIGHT degerleri gecerli CSS font-weight dizeleridir', () => {
      for (const value of Object.values(WEIGHT)) {
        expect(Number(value)).toBeGreaterThanOrEqual(100);
        expect(Number(value)).toBeLessThanOrEqual(900);
      }
    });
  });
});
