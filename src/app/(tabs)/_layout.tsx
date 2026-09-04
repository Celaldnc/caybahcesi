import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactElement } from 'react';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/colors';
import { ICON } from '@/constants/config';

export default function TabLayout(): ReactElement {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        // web.output "single" (SPA): sunucu render'i yok, dolayisiyla hidrasyon
        // uyusmazligi da yok. Expo template'inin useClientOnlyValue sarmalayicisi
        // yalnizca statik render icin gerekliydi; kaldirildi.
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Çay Bahçesi',
          // WCAG 2.5.3 (Label in Name): erisilebilirlik adi GORUNEN etiketi
          // icermeli. Onceki "Oyun sekmesi" degeri gorunen "Çay Bahçesi"
          // metnini icermiyordu; Voice Control kullanicisi "Çay Bahçesi'ne
          // dokun" dediginde sekme tetiklenmiyordu.
          tabBarAccessibilityLabel: 'Çay Bahçesi sekmesi',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'cup.and.saucer.fill', android: 'local_cafe', web: 'local_cafe' }}
              tintColor={color}
              size={ICON.tab}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarAccessibilityLabel: 'Ayarlar sekmesi',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={ICON.tab}
            />
          ),
        }}
      />
    </Tabs>
  );
}
