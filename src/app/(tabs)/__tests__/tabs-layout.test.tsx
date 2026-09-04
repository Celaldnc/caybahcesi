import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import Colors from '@/constants/colors';
import { ICON } from '@/constants/config';

import TabLayout from '../_layout';

type ScreenOptions = {
  tabBarActiveTintColor: string;
  tabBarInactiveTintColor: string;
  headerShown: boolean;
};
type TabOptions = {
  title: string;
  tabBarAccessibilityLabel: string;
  tabBarIcon: (props: { color: string }) => ReactNode;
};

/** Tabs navigator'unu, verilen yapilandirmayi disari acan bir taklitle degistirir. */
const capturedScreens: { name: string; options: TabOptions }[] = [];
let capturedScreenOptions: ScreenOptions | undefined;

jest.mock('expo-router', () => {
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  // Adlandirilmis fonksiyon bildirimleri: react/display-name kurali anonim
  // ok fonksiyonlarini bilesen olarak kabul etmiyor.
  function Tabs({
    screenOptions,
    children,
  }: {
    screenOptions: ScreenOptions;
    children: ReactNode;
  }) {
    capturedScreenOptions = screenOptions;
    return <View>{children}</View>;
  }
  function TabScreen({ name, options }: { name: string; options: TabOptions }) {
    capturedScreens.push({ name, options });
    return <Text>{options.title}</Text>;
  }
  Tabs.Screen = TabScreen;
  return { Tabs };
});

jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  function SymbolView({ size, tintColor }: { size: number; tintColor: string }) {
    return <View testID={`symbol-${size}-${tintColor}`} />;
  }
  return { SymbolView };
});

const mockUseColorScheme = jest.fn<'light' | 'dark', []>();
jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: () => mockUseColorScheme(),
}));

describe('TabLayout', () => {
  beforeEach(() => {
    capturedScreens.length = 0;
    capturedScreenOptions = undefined;
    mockUseColorScheme.mockReturnValue('light');
  });

  it('iki sekme tanimlar: oyun ve ayarlar', async () => {
    await render(<TabLayout />);
    expect(capturedScreens.map((s) => s.name)).toEqual(['index', 'settings']);
  });

  it('sekme basliklari Turkce karakterlerle dogru', async () => {
    await render(<TabLayout />);
    expect(capturedScreens.map((s) => s.options.title)).toEqual(['Çay Bahçesi', 'Ayarlar']);
  });

  /**
   * WCAG 2.5.3 (Label in Name): erisilebilirlik adi GORUNEN etiketi icermeli,
   * yoksa Voice Control kullanicisi gordugu metni soyleyerek sekmeyi acamaz.
   * Onceki deger "Oyun sekmesi" idi ve "Çay Bahçesi" metnini icermiyordu.
   */
  it('erisilebilirlik adi gorunen etiketi icerir', async () => {
    await render(<TabLayout />);
    for (const { options } of capturedScreens) {
      expect(options.tabBarAccessibilityLabel).toContain(options.title);
    }
  });

  it('acik temada acik tema renklerini kullanir', async () => {
    mockUseColorScheme.mockReturnValue('light');
    await render(<TabLayout />);
    expect(capturedScreenOptions?.tabBarActiveTintColor).toBe(Colors.light.tint);
    expect(capturedScreenOptions?.tabBarInactiveTintColor).toBe(Colors.light.tabIconDefault);
  });

  it('koyu temada koyu tema renklerini kullanir', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    await render(<TabLayout />);
    expect(capturedScreenOptions?.tabBarActiveTintColor).toBe(Colors.dark.tint);
    expect(capturedScreenOptions?.tabBarInactiveTintColor).toBe(Colors.dark.tabIconDefault);
  });

  it('ikon olcusu config ten gelir (sabit kodlanmamis)', async () => {
    await render(<TabLayout />);
    // tabBarIcon bir render-prop; navigator onu aktif renkle cagirir.
    for (const { options } of capturedScreens) {
      await render(<>{options.tabBarIcon({ color: '#123456' })}</>);
      expect(screen.getByTestId(`symbol-${ICON.tab}-#123456`)).toBeOnTheScreen();
    }
  });
});
