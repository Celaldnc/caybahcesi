import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Text, View } from '@/components/Themed';
import { LEVEL, SLOTS } from '@/constants/config';

/**
 * Ana ekran -- Sprint 0 iskeleti.
 * Sprint 2'de burasi SlotRow + TilePicker'i barindiran gercek oyun ekranina donusecek.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Çay Bahçesi Topla</Text>
      <Text style={styles.subtitle}>
        {SLOTS.INITIAL} slot · {LEVEL.TOTAL} seviye
      </Text>

      <View style={styles.actions}>
        <Button
          label="Oyna"
          accessibilityHint="Bulunduğun seviyeden oyunu başlatır"
          onPress={() => {
            // Sprint 2: router.push('/game/1')
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  actions: {
    marginTop: 24,
  },
});
