import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { View } from '@/components/Themed';
import { SPACING } from '@/constants/config';

/** Ekranin kaydirilabilir icerik kapsayicisinin testID'si. */
export const SCREEN_CONTENT_TEST_ID = 'screen-content';

export interface ScreenProps {
  children: ReactNode;
  /** Icerigi dikey olarak ortalar. Oyun tahtasi gibi tam-ekran duzenlerde kapatilir. */
  centered?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Ekranlarin ortak kabugu.
 *
 * ScrollView neden var: WCAG 1.4.4. iOS Dynamic Type / Android yazi tipi olcegi
 * %200'e cekildiginde 32pt baslik ekrandan tasar. Sabit `flex:1 + center`
 * duzeninde tasan icerige ULASILAMAZ; kaydirilabilir kapsayici bunu cozer.
 * `flexGrow: 1` + `justifyContent: center`, icerik kisayken ortalamayi korur,
 * uzunken kaydirmaya izin verir.
 */
export function Screen({ children, centered = true, testID, style }: ScreenProps): ReactElement {
  return (
    <View style={styles.root} testID={testID}>
      <ScrollView
        // Kararli testID: RNTL v14'te UNSAFE_getByType kaldirildi, ic yapiya
        // dayali sorgu yerine acik bir tutamak veriyoruz.
        testID={SCREEN_CONTENT_TEST_ID}
        contentContainerStyle={[styles.content, centered ? styles.centered : null, style]}
        // Klavye/odak davranisini bozmadan kaydirma cubugunu gizle.
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Screen;
