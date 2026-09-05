import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Themed';
import { LEVEL, OPACITY, SLOTS, SPACING, TYPO, WEIGHT } from '@/constants/config';

/**
 * Ana ekran.
 * TODO(sprint-3): kayitli ilerlemeden "devam et", gunluk bulmaca girisi.
 */
export default function HomeScreen(): ReactElement {
  return (
    <Screen>
      {/* accessibilityRole="header": ekran okuyucuda basliktan basliga gezinme (rotor) icin. */}
      <Text style={styles.title} accessibilityRole="header">
        Çay Bahçesi Topla
      </Text>
      {/* Ekran okuyucular "·" karakterini tutarsiz okur; acik etiket veriyoruz. */}
      <Text
        style={styles.subtitle}
        accessibilityLabel={`${SLOTS.INITIAL} slot, ${LEVEL.TOTAL} seviye`}
      >
        {SLOTS.INITIAL} slot · {LEVEL.TOTAL} seviye
      </Text>

      <Button
        label="Oyna"
        accessibilityHint="Birinci seviyeden oyunu başlatır"
        onPress={() => router.push('/game/1')}
        style={styles.playButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: TYPO.title,
    fontWeight: WEIGHT.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPO.body,
    opacity: OPACITY.muted,
    textAlign: 'center',
  },
  playButton: {
    marginTop: SPACING.xl,
  },
});
