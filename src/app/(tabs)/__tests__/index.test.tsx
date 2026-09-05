import { fireEvent, render, screen } from '@testing-library/react-native';

import { LEVEL, SLOTS } from '@/constants/config';

import HomeScreen from '../index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (path: string) => mockPush(path),
  },
}));

describe('HomeScreen', () => {
  it('oyun basligini gosterir', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('Çay Bahçesi Topla')).toBeOnTheScreen();
  });

  it('basligi ekran okuyucuya baslik olarak bildirir', async () => {
    await render(<HomeScreen />);
    expect(screen.getByRole('header', { name: 'Çay Bahçesi Topla' })).toBeOnTheScreen();
  });

  it('slot ve seviye sayisini config ten okur (sabit kodlanmamis)', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText(`${SLOTS.INITIAL} slot · ${LEVEL.TOTAL} seviye`)).toBeOnTheScreen();
  });

  it('orta nokta yerine ekran okuyucuya duz metin sunar', async () => {
    await render(<HomeScreen />);
    // "·" karakterini ekran okuyucular tutarsiz okur.
    expect(screen.getByLabelText(`${SLOTS.INITIAL} slot, ${LEVEL.TOTAL} seviye`)).toBeOnTheScreen();
  });

  it('Oyna butonu etkindir', async () => {
    await render(<HomeScreen />);
    const button = screen.getByRole('button', { name: 'Oyna' });
    expect(button).toBeOnTheScreen();
    expect(button).not.toBeDisabled();
  });

  it('Oyna butonu ilk seviyeye yonlendirir', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(mockPush).toHaveBeenCalledWith('/game/1');
  });

  it('Oyna butonunun ipucu ne yapacagini anlatir', async () => {
    await render(<HomeScreen />);
    expect(screen.getByRole('button', { name: 'Oyna' })).toHaveProp(
      'accessibilityHint',
      'Birinci seviyeden oyunu başlatır',
    );
  });
});
