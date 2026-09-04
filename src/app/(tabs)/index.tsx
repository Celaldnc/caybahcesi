import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Themed';
import { LEVEL, OPACITY, SLOTS, SPACING, TYPO, WEIGHT } from '@/constants/config';

/**
 * Ana ekran -- Sprint 0 iskeleti.
 * TODO(sprint-2): burasi SlotRow + TilePicker'i barindiran gercek oyun ekranina donusecek.
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
        // Sprint 0'da oyun ekrani henuz yok. Butonu etkin birakip hicbir sey
        // yapmamak, ekran okuyucu kullanicisina yerine getirilmeyen bir vaat verir.
        disabled
        accessibilityHint="Oyun ekranı Sprint 2’de açılacak"
        onPress={() => {
          // TODO(sprint-2): router.push('/game/1')
        }}
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
