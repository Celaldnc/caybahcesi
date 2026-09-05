import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { LEVEL } from '@/constants/config';
import { insertPositions } from '@/game/core/matcher';
import { useGameStore } from '@/game/store/gameStore';

import GameScreen, { parseLevelParam } from '../[level]';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSetParams = jest.fn();
let mockParams: Record<string, string> = { level: '1' };

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
  beforeEach(() => {
    mockParams = { level: '1' };
    mockPush.mockClear();
    mockBack.mockClear();
    mockSetParams.mockClear();
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
    /** Ekrandan oynar: her turda ilk tile'i secip eslesme arar. */
    async function playMove(): Promise<boolean> {
      const state = useGameStore.getState();
      if (state.status !== 'oynaniyor') return false;

      const positions = insertPositions(state.row);
      if (positions.length === 0) return false;

      await fireEvent.press(screen.getByTestId('tepsi-tile-0'));

      // Eslesme yaratan konumu bul; yoksa ilk konuma koy.
      const before = state.score;
      for (const position of positions) {
        await fireEvent.press(screen.getByTestId(`satir-insert-${position}`));
        if (useGameStore.getState().moves > state.moves) break;
      }
      return useGameStore.getState().score >= before;
    }

    it('oyun bir sonuca ulasir ve uygun ekran gosterilir', async () => {
      await render(<GameScreen />);

      for (let i = 0; i < 300; i++) {
        const played = await playMove();
        if (!played) break;
        if (useGameStore.getState().status !== 'oynaniyor') break;
      }

      const status = useGameStore.getState().status;
      expect(['seviye-tamam', 'oyun-bitti']).toContain(status);

      if (status === 'seviye-tamam') {
        expect(screen.getByTestId('seviye-tamam')).toBeOnTheScreen();
        expect(screen.getByRole('header', { name: 'Seviye tamamlandı!' })).toBeOnTheScreen();
      } else {
        expect(screen.getByTestId('oyun-bitti')).toBeOnTheScreen();
        expect(screen.getByRole('header', { name: 'Satır doldu' })).toBeOnTheScreen();
      }
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
  });
});
