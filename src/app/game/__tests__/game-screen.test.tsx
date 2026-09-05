import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type ViewStyle } from 'react-native';

import { ANIM, LEVEL, SPACING } from '@/constants/config';
import { thoughtfulPolicy } from '@/game/core/__tests__/helpers/policies';
import { insertTile, resolve } from '@/game/core/matcher';
import { createTile } from '@/game/core/tiles';
import { computeTileSize } from '@/game/engine/layout';
import type { SlotRow as SlotRowModel, TileId } from '@/game/core/types';
import { createRng } from '@/game/core/rng';
import { useGameStore } from '@/game/store/gameStore';

import GameScreen, { parseLevelParam } from '../[level]';

const mockAnnounce = jest.fn();
jest.mock('@/game/engine/announce', () => ({
  ...jest.requireActual<typeof import('@/game/engine/announce')>('@/game/engine/announce'),
  announce: (message: string) => mockAnnounce(message),
}));

const mockHaptic = jest.fn();
jest.mock('@/hooks/useHaptics', () => ({
  useHaptics: () => mockHaptic,
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { level: '1' };

/*
 * `setParams` mock'u ROTAYI GERCEKTEN DEGISTIRIR.
 *
 * Onceki hali yalnizca cagriyi kaydediyordu; `mockParams` sabit kaldigi
 * icin `useLocalSearchParams` degismiyor, `useEffect` yeniden kosmuyordu.
 * Bu yuzden "Sonraki seviye" butonunun seviyeyi IKI KEZ (iki farkli
 * rastgele tohumla) kurdugu hata testlerde hic gorunmedi.
 */
const mockSetParams = jest.fn((next: Record<string, string>) => {
  mockParams = { ...mockParams, ...next };
});

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  function StackScreen({ options }: { options: { title: string } }) {
    return <Text>{options.title}</Text>;
  }
  return {
    Stack: { Screen: StackScreen },
    router: {
      push: (path: string) => mockPush(path),
      back: () => mockBack(),
      setParams: (p: Record<string, string>) => mockSetParams(p),
    },
    useLocalSearchParams: () => mockParams,
  };
});

const policyRng = createRng(1); // thoughtfulPolicy rng kullanmaz; imza geregi.

function chooseMove(): { tray: number; position: number; scoring: boolean } | null {
  const { row, tray } = useGameStore.getState();
  const move = thoughtfulPolicy(row, tray, policyRng);
  if (move === null) return null;

  const tile = tray[move.tileIndex]!;
  return {
    tray: move.tileIndex,
    position: move.position,
    scoring: resolve(insertTile(row, move.position, tile)).removedCount > 0,
  };
}

describe('parseLevelParam', () => {
  it('gecerli numarayi cozer', () => {
    expect(parseLevelParam('7')).toBe(7);
  });

  it('dizi parametresinin ilkini alir', () => {
    expect(parseLevelParam(['3', '9'])).toBe(3);
  });

  /**
   * Rota parametresi KULLANICI GIRDISIDIR: derin baglanti ile
   * `/game/999` ya da `/game/abc` gelebilir. Cokmek yerine 1'e duser.
   */
  it('gecersiz girdide birinci seviyeye duser', () => {
    expect(parseLevelParam(undefined)).toBe(1);
    expect(parseLevelParam('abc')).toBe(1);
    expect(parseLevelParam('0')).toBe(1);
    expect(parseLevelParam('-5')).toBe(1);
    expect(parseLevelParam('2.5')).toBe(1);
    expect(parseLevelParam(String(LEVEL.TOTAL + 1))).toBe(1);
  });

  it('son seviyeyi kabul eder (sinir)', () => {
    expect(parseLevelParam(String(LEVEL.TOTAL))).toBe(LEVEL.TOTAL);
  });
});

describe('GameScreen', () => {
  /*
   * TOHUM SABITLENIR.
   *
   * `GameScreen` `startLevel(level)`'i tohumsuz cagirir -> `Math.random()`.
   * Sonuc: kapsam yuzdesi kosudan kosuya degisiyordu (olculdu: uc ardisik
   * kosuda [level].tsx 100/96 -> 97.22/88 -> 97.22/88; kapsanmayan satir
   * hep zincir dali). Test kapisinin rakami tekrarlanabilir olmali.
   */
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    mockParams = { level: '1' };
    mockPush.mockClear();
    mockBack.mockClear();
    mockSetParams.mockClear();
    mockAnnounce.mockClear();
    mockHaptic.mockClear();

    let seed = 0x2f6e2b1;
    randomSpy = jest.spyOn(Math, 'random').mockImplementation(() => {
      // Basit LCG -- kriptografik degil, yalnizca tekrarlanabilirlik icin.
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    });
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('seviye numarasini basliga yazar', async () => {
    mockParams = { level: '4' };
    await render(<GameScreen />);
    expect(screen.getByText('Seviye 4')).toBeOnTheScreen();
  });

  it('acilisda oyunu baslatir', async () => {
    await render(<GameScreen />);
    expect(useGameStore.getState().status).toBe('oynaniyor');
    expect(useGameStore.getState().tray.length).toBeGreaterThan(0);
  });

  it('skoru ve hedefi gosterir', async () => {
    await render(<GameScreen />);
    const config = useGameStore.getState().config;

    expect(screen.getByLabelText('Skor 0')).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(`Hedef ${config.targetScore}`))).toBeOnTheScreen();
  });

  it('baslangicta oyuncuya tile secmesini soyler', async () => {
    await render(<GameScreen />);
    expect(screen.getByText('Bir tile seç')).toBeOnTheScreen();
  });

  /**
   * IKI ASAMALI AKIS: once tray'den sec, sonra satirdaki konuma dokun.
   * Ekleme konumlari YALNIZCA secim varken etkin -- yoksa oyuncu bos
   * secimle satira dokunup hicbir sey olmamasina sasirir.
   */
  it('secim yapilmadan ekleme konumlari devre disidir', async () => {
    await render(<GameScreen />);
    expect(screen.getByTestId('satir-insert-0')).toBeDisabled();
  });

  it('tile secilince ekleme konumlari etkinlesir ve ipucu degisir', async () => {
    await render(<GameScreen />);

    await fireEvent.press(screen.getByTestId('tepsi-tile-0'));

    expect(screen.getByTestId('satir-insert-0')).not.toBeDisabled();
    expect(screen.getByText('Şimdi satırda bir konuma dokun')).toBeOnTheScreen();
  });

  it('sec-ve-yerlestir tam turu tile i tahtaya koyar', async () => {
    await render(<GameScreen />);

    await fireEvent.press(screen.getByTestId('tepsi-tile-0'));
    await fireEvent.press(screen.getByTestId('satir-insert-0'));

    expect(useGameStore.getState().moves).toBe(1);
    expect(screen.getByTestId('satir-tile-0')).toBeOnTheScreen();
  });

  it('ayni tile a tekrar dokunmak secimi kaldirir', async () => {
    await render(<GameScreen />);

    await fireEvent.press(screen.getByTestId('tepsi-tile-1'));
    await fireEvent.press(screen.getByTestId('tepsi-tile-1'));

    expect(screen.getByText('Bir tile seç')).toBeOnTheScreen();
  });

  describe('bir seviye bastan sona', () => {
    /**
     * SPRINT 2 KALITE KAPISINDA YENIDEN YAZILDI.
     *
     * Onceki hali uc ayri sekilde vakumdu:
     *  1. `expect(['seviye-tamam','oyun-bitti']).toContain(status)` --
     *     oyun KAYBEDILSE de geciyordu, yani "bir level bastan sona
     *     oynanir" DoD maddesi dogrulanmiyordu.
     *  2. Yorum "eslesme yaratan konumu bul" diyordu ama dongu ilk
     *     iterasyonda daima `break` ediyordu: her hamle konum 0'a.
     *  3. `score >= before` HER ZAMAN dogruydu (skor azalmaz), yani
     *     `if (!played) break` olu koddu.
     *
     * Olculdu: eski politika 8 kosunun 8'inde ~7 hamlede KAYBEDIYORDU;
     * `seviye-tamam` dali hic calismiyordu, onu dogrulayan iki satir
     * oluydu.
     *
     * Yeni hali hamleyi core'un saf fonksiyonlariyla ONCEDEN hesaplar,
     * ekrandan oynar ve DENETIMIN YAPILDIGINI de iddia eder.
     */
    /**
     * Ekrana dokunmadan, core ile hamleyi sec.
     *
     * `thoughtfulPolicy` DENGE OLCUMLERINDE KULLANILAN politikadir (once
     * eslesme, sonra ayni tipin yanina cift kurma, son care herhangi bir
     * yer). Kendi "ilk eslesmeyi bul, yoksa konum 0" politikami yazdim ve
     * bu tohumda 10 hamlede KAYBETTI -- cift kurma adimi olmadan satir
     * doluyor. Ayni politikayi kullanmak, ekran testinin dengeyle ayni
     * gercegi olcmesini de sagliyor.
     */
    it('gercekten oynanip KAZANILIR ve zafer ekrani gosterilir', async () => {
      await render(<GameScreen />);

      let played = 0;
      let scoringMoves = 0;

      for (let i = 0; i < 300; i++) {
        if (useGameStore.getState().status !== 'oynaniyor') break;

        const move = chooseMove();
        if (move === null) break;

        await fireEvent.press(screen.getByTestId(`tepsi-tile-${move.tray}`));
        await fireEvent.press(screen.getByTestId(`satir-insert-${move.position}`));

        played += 1;
        if (move.scoring) scoringMoves += 1;
      }

      // ONCE DENETIMIN YAPILDIGINI iddia et (CLAUDE.md: sayac sifirdan
      // baslayan test vakumdur). Bu satirlar olmadan asagidaki iddia,
      // dongu hic donmese bile anlamli gorunurdu.
      expect(played).toBeGreaterThan(10);
      expect(scoringMoves).toBeGreaterThan(0);
      expect(useGameStore.getState().moves).toBe(played);

      // ASIL DoD IDDIASI: seviye TAMAMLANIR.
      expect(useGameStore.getState().status).toBe('seviye-tamam');
      expect(screen.getByTestId('seviye-tamam')).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: 'Seviye tamamlandı!' })).toBeOnTheScreen();
    });

    /**
     * Oyun bittikten sonra tepsi DEVRE DISI olmali. Sprint 2'de basilabilir
     * kaliyordu: dokunus haptik titresim veriyor, store sessizce
     * reddediyordu -- ekran okuyucu kullanicisina yerine getirilmeyen vaat.
     */
    it('oyun bitince tepsi devre disi kalir', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'oyun-bitti' });
      });

      // Bitis ekrani MODAL oldugu icin arkadaki agac erisilebilirlikten
      // gizlenir -- sorgu bunu acikca istemeli. (Gizlenmesi ISTENEN
      // davranis; bir sonraki test onu ayrica dogruluyor.)
      const trayTile = screen.getByTestId('tepsi-tile-0', { includeHiddenElements: true });
      expect(trayTile).toBeDisabled();
      expect(screen.getByText('Oyun bitti', { includeHiddenElements: true })).toBeTruthy();
    });

    /** Bitis ekrani MODAL: ekran okuyucu odagi arkadaki olu kontrollere kacmamali. */
    it('bitis ekrani ekran okuyucuya modal olarak sunulur', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'oyun-bitti' });
      });

      expect(screen.getByTestId('oyun-bitti')).toHaveProp('accessibilityViewIsModal', true);
    });
  });

  describe('seviye tamamlandi ekrani', () => {
    it('sonraki seviyeye gecis sunar', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'seviye-tamam', score: 250, moves: 12 });
      });

      expect(screen.getByTestId('seviye-tamam')).toBeOnTheScreen();
      expect(screen.getByText('12 hamlede 250 puan')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Sonraki seviye' }));
      expect(mockSetParams).toHaveBeenCalledWith({ level: '2' });
    });

    /**
     * SEVIYE TAM OLARAK BIR KEZ KURULUR.
     *
     * Sprint 2'de buton hem `advanceLevel()` hem `router.setParams` cagiriyordu:
     * ilki store'da `startLevel(2)`, ikincisi rota parametresini degistirip
     * `useEffect`'i tetikliyor ve `startLevel(2)`'yi IKI FARKLI rastgele
     * tohumla bir kez daha kosturuyordu. Oyuncu ilk tahtayi bir kare gorup
     * atiyordu.
     *
     * Nasil olculur: `startLevel` tohum icin TAM OLARAK BIR KEZ
     * `Math.random()` cagirir (havuz ve tepsi tohumlanmis `Rng`'den gelir,
     * Math.random'dan degil). Yani kurulum sayisi = random cagri sayisi.
     */
    it('sonraki seviyeye gecerken oyunu bir KEZ kurar', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'seviye-tamam' });
      });

      const before = randomSpy.mock.calls.length;
      await fireEvent.press(screen.getByRole('button', { name: 'Sonraki seviye' }));
      // Gercek expo-router `setParams` sonrasi yeniden render eder; mock
      // etmiyor, o adimi elle temsil ediyoruz.
      await screen.rerender(<GameScreen />);
      const setups = randomSpy.mock.calls.length - before;

      // Denetimin yapildigini once ISPATLA: gecis gercekten olmali.
      expect(mockParams.level).toBe('2');
      expect(useGameStore.getState().level).toBe(2);
      expect(useGameStore.getState().status).toBe('oynaniyor');

      expect(setups).toBe(1);
    });

    it('son seviyede bitirme sunar', async () => {
      mockParams = { level: String(LEVEL.TOTAL) };
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'seviye-tamam' });
      });

      await fireEvent.press(screen.getByRole('button', { name: 'Bitir' }));
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('oyun bitti ekrani', () => {
    it('tekrar deneme ve geri donme sunar', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'oyun-bitti', score: 40 });
      });

      expect(screen.getByTestId('oyun-bitti')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
      expect(useGameStore.getState().status).toBe('oynaniyor');
      expect(useGameStore.getState().score).toBe(0);
    });

    it('geri butonu ana ekrana doner', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'oyun-bitti' });
      });

      await fireEvent.press(screen.getByRole('button', { name: 'Geri' }));
      expect(mockBack).toHaveBeenCalled();
    });
  });

  /**
   * EKRAN OKUYUCU DUYURUSU -- Sprint 2'nin P0 bulgusu.
   *
   * Erisilebilirlik denetimi: "gorme engelli bir oyuncu bu oyunu su an
   * oynayamaz." Etiketleme kusursuzdu, GERI BILDIRIM yoktu --
   * `announceForAccessibility` kod tabaninda sifir kez geciyordu. Oyuncu
   * hamle yapabiliyor, hamlenin ne yaptigini ogrenemiyordu.
   */
  describe('ilerleme gostergesi', () => {
    /** Mutasyon: yuzde sabit 0 yapildiginda hicbir test kirilmiyordu. */
    it('yuzde skora gore hesaplanir', async () => {
      await render(<GameScreen />);
      const target = useGameStore.getState().config.targetScore;

      await act(async () => {
        useGameStore.setState({ score: Math.round(target / 2) });
      });

      expect(screen.getByText(new RegExp(`Hedef ${target} · 50%`))).toBeOnTheScreen();
    });
  });

  describe('duyarli yerlesim', () => {
    /**
     * Mutasyon: `tileSize` sabit 40 yapildiginda hicbir test kirilmiyordu --
     * yani "yerlesim ekran genisligine gore hesaplanir" iddiasi
     * korumasizdi. Ekranin cizdigi boyut `computeTileSize`'in hesabiyla
     * BIREBIR ayni olmali; ikisi ayrisirsa satir tasar.
     */
    it('tile boyutu computeTileSize ile birebir ayni', async () => {
      await render(<GameScreen />);
      const { slotCount } = useGameStore.getState().config;
      const available = Dimensions.get('window').width - 2 * SPACING.xl;

      // Satir aciliste bos; bos slotlar da ayni `tileSize`'i kullanir.
      const drawn = StyleSheet.flatten(
        screen.getByTestId('satir-empty-0').props.style as ViewStyle,
      ).width;

      expect(drawn).toBe(computeTileSize(available, slotCount));
    });
  });

  describe('erisilebilirlik duyurulari', () => {
    it('acilista duyuru yapmaz (henuz hamle yok)', async () => {
      await render(<GameScreen />);
      expect(mockAnnounce).not.toHaveBeenCalled();
    });

    it('her hamleden sonra sonucu duyurur', async () => {
      await render(<GameScreen />);

      await fireEvent.press(screen.getByTestId('tepsi-tile-0'));
      await fireEvent.press(screen.getByTestId('satir-insert-0'));

      expect(mockAnnounce).toHaveBeenCalledTimes(1);
      expect(mockAnnounce.mock.calls[0]![0]).toContain('boş slot');
    });

    it('ayni hamleyi iki kez duyurmaz', async () => {
      await render(<GameScreen />);

      await fireEvent.press(screen.getByTestId('tepsi-tile-0'));
      await fireEvent.press(screen.getByTestId('satir-insert-0'));
      // Store'a alakasiz bir degisiklik: yeniden render olur ama hamle yeni degil.
      await act(async () => {
        useGameStore.setState({ bestCombo: 1 });
      });

      expect(mockAnnounce).toHaveBeenCalledTimes(1);
    });

    /**
     * Banner kapaninca AYNI hamle yeniden duyurulmamali. `clearCombo`
     * `lastCombo`'yu degistirir ve o bir effect bagimliligidir -- effect
     * yeniden kosar ama hamle yeni degildir.
     */
    it('banner kapaninca hamleyi tekrar duyurmaz', async () => {
      jest.useFakeTimers();
      try {
        await render(<GameScreen />);
        await fireEvent.press(screen.getByTestId('tepsi-tile-0'));
        await fireEvent.press(screen.getByTestId('satir-insert-0'));
        await act(async () => {
          useGameStore.setState({ lastCombo: 2 });
        });
        const before = mockAnnounce.mock.calls.length;
        expect(before).toBeGreaterThan(0);

        await act(async () => {
          jest.advanceTimersByTime(ANIM.COMBO_BANNER_MS);
        });

        expect(useGameStore.getState().lastCombo).toBe(0);
        expect(mockAnnounce).toHaveBeenCalledTimes(before);
      } finally {
        jest.useRealTimers();
      }
    });

    it('oyun bitince sebebini duyurur', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'oyun-bitti', moves: 9, score: 40 });
      });

      expect(mockAnnounce).toHaveBeenCalledWith('Satır doldu, oyun bitti. 40 puan.');
    });
  });

  /**
   * HAPTIK TURU hamlenin SONUCUNA baglidir. Sprint 2'de bu dal hic
   * kapsanmiyordu (lcov: [level].tsx:64-65 sifir kez), yani "eslesmede
   * farkli titresim" iddiasi dogrulanmamisti.
   */
  describe('dokunsal geri bildirim', () => {
    it('secimde secim titresimi verir', async () => {
      await render(<GameScreen />);
      await fireEvent.press(screen.getByTestId('tepsi-tile-0'));
      expect(mockHaptic).toHaveBeenCalledWith('sec');
    });

    it('puansiz hamlede yerlestirme titresimi verir', async () => {
      await render(<GameScreen />);
      await fireEvent.press(screen.getByTestId('tepsi-tile-0'));
      mockHaptic.mockClear();
      await fireEvent.press(screen.getByTestId('satir-insert-0'));

      expect(mockHaptic).toHaveBeenCalledWith('yerlestir');
    });

    it('eslesmede eslesme titresimi verir', async () => {
      await render(<GameScreen />);

      let matched = false;
      for (let i = 0; i < 60 && !matched; i++) {
        if (useGameStore.getState().status !== 'oynaniyor') break;
        const move = chooseMove();
        if (move === null) break;

        mockHaptic.mockClear();
        await fireEvent.press(screen.getByTestId(`tepsi-tile-${move.tray}`));
        await fireEvent.press(screen.getByTestId(`satir-insert-${move.position}`));

        if (move.scoring) {
          expect(mockHaptic).toHaveBeenCalledWith('eslesme');
          matched = true;
        }
      }

      // Denetimin YAPILDIGINI iddia et.
      expect(matched).toBe(true);
    });

    /**
     * ZINCIR (cascade) UCTAN UCA.
     *
     * Belgelenmis senaryo: [A A B B A A] + araya B -> BBB gider ->
     * AAAA gider (2 adim, 7 tile). Ac gozlu oyun ucluyu aninda aldigi icin
     * bu durum dogal oyunda nadirdir; BILEREK kuruluyor. Sprint 2'de
     * `[level].tsx`'in `basari` dali hic kapsanmiyordu -- yani "zincirde
     * farkli titresim" iddiasi dogrulanmamisti.
     */
    it('zincirde basari titresimi verir', async () => {
      await render(<GameScreen />);

      const a: TileId = 'cay-ince-belli';
      const b: TileId = 'kahve-fincan';
      const row: SlotRowModel = [
        createTile(a),
        createTile(a),
        createTile(b),
        createTile(b),
        createTile(a),
        createTile(a),
        null,
      ];

      await act(async () => {
        useGameStore.setState({ row, tray: [createTile(b)], selectedTrayIndex: null });
      });

      mockHaptic.mockClear();
      await fireEvent.press(screen.getByTestId('tepsi-tile-0'));
      await fireEvent.press(screen.getByTestId('satir-insert-4'));

      // Zincirin GERCEKTEN olustugunu once ispatla.
      expect(useGameStore.getState().lastCombo).toBe(2);
      expect(mockHaptic).toHaveBeenCalledWith('basari');
    });

    it('oyun bittikten sonra secim titresimi vermez', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ status: 'oyun-bitti' });
      });
      mockHaptic.mockClear();

      const tile = screen.getByTestId('tepsi-tile-0', { includeHiddenElements: true });
      await fireEvent.press(tile);

      expect(mockHaptic).not.toHaveBeenCalled();
    });
  });

  describe('combo banner', () => {
    it('combo yokken gorunmez', async () => {
      await render(<GameScreen />);
      expect(screen.queryByTestId('combo')).toBeNull();
    });

    it('zincir olusunca duyurulur', async () => {
      await render(<GameScreen />);
      await act(async () => {
        useGameStore.setState({ lastCombo: 2 });
      });

      expect(screen.getByTestId('combo')).toBeOnTheScreen();
      expect(screen.getByLabelText('Combo x2!')).toBeOnTheScreen();
    });

    /**
     * BANNER'IN OMRU VAR.
     *
     * Sprint 2'de `ANIM.COMBO_BANNER_MS` "ekranda kalma suresi" diye
     * belgelenmisti ama zamanlayici yoktu: banner bir sonraki hamleye kadar
     * duruyordu. Ustelik `pointerEvents` de olmadigindan tam da o hamlenin
     * dokunusunu blokluyordu -- oyuncu banner'in DISINDA bir konuma
     * dokunmadan kurtulamiyordu.
     */
    it('sure dolunca kendiliginden kapanir', async () => {
      jest.useFakeTimers();
      try {
        await render(<GameScreen />);
        await act(async () => {
          useGameStore.setState({ lastCombo: 2 });
        });
        expect(screen.getByTestId('combo')).toBeOnTheScreen();

        await act(async () => {
          jest.advanceTimersByTime(ANIM.COMBO_BANNER_MS);
        });

        expect(screen.queryByTestId('combo')).toBeNull();
        expect(useGameStore.getState().lastCombo).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
