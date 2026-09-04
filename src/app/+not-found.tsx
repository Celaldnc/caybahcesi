import { Link, Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Themed';
import { SPACING, TOUCH, TYPO, WEIGHT } from '@/constants/config';

export default function NotFoundScreen(): ReactElement {
  return (
    <>
      <Stack.Screen options={{ title: 'Bulunamadı' }} />
      <Screen>
        <Text style={styles.title} accessibilityRole="header">
          Böyle bir sayfa yok.
        </Text>

        {/* Dokunma hedefi TOUCH.MIN_TARGET ile garanti; onceki paddingVertical:15
            + fontSize:14 kombinasyonu ~47pt veriyordu (Material 48dp altinda). */}
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Ana ekrana dön</Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: TYPO.subheading,
    fontWeight: WEIGHT.bold,
    textAlign: 'center',
  },
  link: {
    marginTop: SPACING.md,
    minHeight: TOUCH.MIN_TARGET,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  linkText: {
    fontSize: TYPO.body,
    textAlign: 'center',
  },
});
