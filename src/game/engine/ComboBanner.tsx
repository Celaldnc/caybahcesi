import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text } from '@/components/Themed';
import { ANIM, SPACING, TYPO, WEIGHT } from '@/constants/config';
import { TILE_INK } from '@/game/data/tileColors';

/**
 * Zincir (combo) banner'i.
 *
 * Yalnizca carpan 1'in USTUNDEYSE gorunur. Sebep: her eslesmede banner
 * cikarsa "combo" sozcugu anlamini yitirir; zincir zaten nadir ve
 * bilerek kurulmus bir hamlenin odulu.
 *
 * `accessibilityLiveRegion` / `accessibilityRole="alert"`: ekran okuyucu
 * kullanicisi bannerı goremez, duyurulmali.
 */

export interface ComboBannerProps {
  /** Son hamledeki combo carpani. 1 veya altiysa banner gosterilmez. */
  combo: number;
  testID?: string;
}

export function ComboBanner({ combo, testID }: ComboBannerProps): ReactElement | null {
  if (combo <= 1) return null;

  const label = `Combo x${combo}!`;

  return (
    <Animated.View
      testID={testID}
      entering={FadeIn.duration(ANIM.COMBO_BANNER_MS / 4)}
      exiting={FadeOut.duration(ANIM.COMBO_BANNER_MS / 4)}
      style={styles.root}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
    >
      <Text style={styles.text} lightColor={TILE_INK.light} darkColor={TILE_INK.light}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: SPACING.lg,
    backgroundColor: '#C0492D',
  },
  text: {
    fontSize: TYPO.heading,
    fontWeight: WEIGHT.bold,
  },
});

export default ComboBanner;
