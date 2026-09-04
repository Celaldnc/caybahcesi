import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/Screen';
import { Text } from '@/components/Themed';
import { OPACITY, TYPO, WEIGHT } from '@/constants/config';

/**
 * Ayarlar ekrani -- Sprint 0 iskeleti.
 * TODO(sprint-3): ses/haptik anahtarlari ve ilerleme sifirlama.
 */
export default function SettingsScreen(): ReactElement {
  return (
    <Screen>
      <Text style={styles.title} accessibilityRole="header">
        Ayarlar
      </Text>
      {/* Turkce kesme isareti: tipografik apostrof (U+2019). Duz ' karakteri
          react/no-unescaped-entities kuralini tetikler ve tipografik olarak yanlistir. */}
      <Text style={styles.hint}>Ses ve titreşim ayarları Sprint 3’te eklenecek.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: TYPO.heading,
    fontWeight: WEIGHT.bold,
    textAlign: 'center',
  },
  hint: {
    fontSize: TYPO.caption,
    opacity: OPACITY.muted,
    textAlign: 'center',
  },
});
