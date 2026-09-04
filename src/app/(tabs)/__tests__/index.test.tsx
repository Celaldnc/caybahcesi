import { render, screen } from '@testing-library/react-native';

import { LEVEL, SLOTS } from '@/constants/config';

import HomeScreen from '../index';

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

  it('Oyna butonu Sprint 0 da devre disidir (yerine getirilmeyen vaat verilmez)', async () => {
    await render(<HomeScreen />);
    const button = screen.getByRole('button', { name: 'Oyna' });
    expect(button).toBeOnTheScreen();
    expect(button).toBeDisabled();
  });

  it('Oyna butonunun ipucu durumu dogru anlatir', async () => {
    await render(<HomeScreen />);
    expect(screen.getByRole('button', { name: 'Oyna' })).toHaveProp(
      'accessibilityHint',
      'Oyun ekranı Sprint 2’de açılacak',
    );
  });
});
