import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { TOUCH } from '@/constants/config';

import NotFoundScreen from '../+not-found';

/**
 * expo-router'in Stack/Link bileşenleri gercek bir navigasyon baglami ister.
 * Ekranin KENDI mantigini (metinler, erisilebilirlik, dokunma hedefi) test
 * etmek icin router'i en kucuk calisir halde taklit ediyoruz.
 */
jest.mock('expo-router', () => {
  const { Text, View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Stack: {
      Screen: ({ options }: { options: { title: string } }) => <Text>{options.title}</Text>,
    },
    Link: ({
      href,
      children,
      style,
    }: {
      href: string;
      children: ReactNode;
      style?: StyleProp<ViewStyle>;
    }) => (
      <RNView accessibilityRole="link" accessibilityLabel={`link:${href}`} style={style}>
        {children}
      </RNView>
    ),
  };
});

describe('NotFoundScreen', () => {
  it('Turkce hata basligini gosterir', async () => {
    await render(<NotFoundScreen />);
    expect(screen.getByText('Böyle bir sayfa yok.')).toBeOnTheScreen();
  });

  it('basligi ekran okuyucuya baslik olarak bildirir', async () => {
    await render(<NotFoundScreen />);
    expect(screen.getByRole('header', { name: 'Böyle bir sayfa yok.' })).toBeOnTheScreen();
  });

  it('Stack basligini Turkce ayarlar', async () => {
    await render(<NotFoundScreen />);
    expect(screen.getByText('Bulunamadı')).toBeOnTheScreen();
  });

  it('ana ekrana giden bir baglanti sunar', async () => {
    await render(<NotFoundScreen />);
    expect(screen.getByLabelText('link:/')).toBeOnTheScreen();
    expect(screen.getByText('Ana ekrana dön')).toBeOnTheScreen();
  });

  it('baglantinin dokunma hedefi Material 48dp esigini karsilar', async () => {
    await render(<NotFoundScreen />);
    expect(screen.getByLabelText('link:/')).toHaveStyle({ minHeight: TOUCH.MIN_TARGET });
  });
});
