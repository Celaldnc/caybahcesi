import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

/**
 * Ayarlar ekrani -- Sprint 0 iskeleti.
 * Sprint 3'te ses/haptik anahtarlari ve ilerleme sifirlama buraya gelecek.
 */
export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ayarlar</Text>
      {/* Turkce kesme isareti icin tipografik apostrof (U+2019) kullaniyoruz:
          hem dogru tipografi hem de react/no-unescaped-entities kuralini tetiklemez. */}
      <Text style={styles.hint}>Ses ve titreşim ayarları Sprint 3’te eklenecek.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  hint: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
  },
});
