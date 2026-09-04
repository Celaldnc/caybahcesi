import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import RootLayout, { warnSplashFailure } from '../_layout';

const capturedThemes: unknown[] = [];

jest.mock('expo-router', () => {
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  // Adlandirilmis fonksiyon bildirimleri: react/display-name kurali icin.
  function Stack({ children }: { children: ReactNode }) {
    return <View>{children}</View>;
  }
  function StackScreen({ name }: { name: string }) {
    return <Text>{name}</Text>;
  }
  Stack.Screen = StackScreen;
  function ThemeProvider({ value, children }: { value: unknown; children: ReactNode }) {
    capturedThemes.push(value);
    return <View testID="theme-provider">{children}</View>;
  }
  function ErrorBoundary() {
    return null;
  }
  return {
    Stack,
    ThemeProvider,
    DarkTheme: { dark: true },
    DefaultTheme: { dark: false },
    ErrorBoundary,
  };
});

/**
 * GestureHandlerRootView, mount aninda native modulu kurmaya calisiyor
 * (react-native-gesture-handler/src/init.ts:15). jest-expo native preset'inde
 * o modul yok -> "_RNGestureHandlerModule.default.install is not a function".
 * Kok gorunumu duz bir View ile degistiriyoruz; test ettigimiz sey zaten
 * tema secimi ve splash davranisi, gesture altyapisi degil.
 */
jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { GestureHandlerRootView: View };
});

const mockHide = jest.fn<Promise<boolean>, []>();
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: () => Promise.resolve(true),
  hideAsync: () => mockHide(),
}));

const mockUseColorScheme = jest.fn<'light' | 'dark', []>();
jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: () => mockUseColorScheme(),
}));

describe('RootLayout', () => {
  beforeEach(() => {
    capturedThemes.length = 0;
    mockHide.mockResolvedValue(true);
    mockUseColorScheme.mockReturnValue('light');
  });

  it('navigasyon agacini olusturur', async () => {
    await render(<RootLayout />);
    expect(screen.getByTestId('theme-provider')).toBeOnTheScreen();
  });

  it('kok ekrani sekme grubuna baglar', async () => {
    await render(<RootLayout />);
    expect(screen.getByText('(tabs)')).toBeOnTheScreen();
  });

  it('acik temada DefaultTheme kullanir', async () => {
    mockUseColorScheme.mockReturnValue('light');
    await render(<RootLayout />);
    expect(capturedThemes).toContainEqual({ dark: false });
  });

  it('koyu temada DarkTheme kullanir', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    await render(<RootLayout />);
    expect(capturedThemes).toContainEqual({ dark: true });
  });

  it('mount olunca splash i gizler', async () => {
    await render(<RootLayout />);
    expect(mockHide).toHaveBeenCalled();
  });

  it('hideAsync reddedilirse cokmez', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockHide.mockRejectedValue(new Error('native modul hazir degil'));

    await render(<RootLayout />);

    expect(screen.getByTestId('theme-provider')).toBeOnTheScreen();
    warn.mockRestore();
  });
});

describe('warnSplashFailure', () => {
  it('hatayi yutmaz, adim adiyla birlikte uyari birakir', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = new Error('splash zaten gizli');

    warnSplashFailure('hideAsync')(error);

    expect(warn).toHaveBeenCalledWith('[splash] hideAsync basarisiz:', error);
    warn.mockRestore();
  });

  it('her adim icin ayri bir isleyici uretir', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    warnSplashFailure('preventAutoHideAsync')('bilinmeyen');

    expect(warn).toHaveBeenCalledWith('[splash] preventAutoHideAsync basarisiz:', 'bilinmeyen');
    warn.mockRestore();
  });
});
