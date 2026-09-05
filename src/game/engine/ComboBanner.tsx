import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text, useThemeColor } from '@/components/Themed';
import { ANIM, SPACING, TYPO, WEIGHT } from '@/constants/config';
import { TILE_INK } from '@/game/data/tileColors';

/**
 * Zincir (combo) banner'i.
 *
 * Yalnizca carpan 1'in USTUNDEYSE gorunur. Sebep: her eslesmede banner
 * cikarsa "combo" sozcugu anlamini yitirir; zincir zaten nadir ve
 * bilerek kurulmus bir hamlenin odulu.
 *
 * `pointerEvents="none"` PAZARLIK EDILEMEZ. Banner `board` kapsayicisinda
 * mutlak konumlu ve `SlotRow`'un TAM USTUNE dusuyor (~160x45pt). RN'de
 * dokunma en ustteki hit-test'i gecen View'e gider, altta kalan KARDESE
 * dusmez -- yani banner gorunurken satirin ortasindaki 4-5 ekleme konumu
 * tiklanamaz hale geliyordu. Uc ajan bunu birbirinden bagimsiz buldu.
 * Banner tamamen dekoratif; dokunma almamali.
 *
 * `accessibilityLiveRegion` / `accessibilityRole="alert"`: ekran okuyucu
 * kullanicisi banner'i goremez, duyurulmali. NOT: `accessibilityLiveRegion`
 * yalnizca Android'de calisir; iOS duyurusu ekran tarafindan
 * `announceForAccessibility` ile yapilir (bkz. `announce.ts`).
 */

export interface ComboBannerProps {
  /** Son hamledeki combo carpani. 1 veya altiysa banner gosterilmez. */
  combo: number;
  testID?: string;
}

/** Modul seviyesinde SABIT: her render'da yeni config Reanimated'i yeniden kaydettirir. */
const BANNER_IN = FadeIn.duration(ANIM.COMBO_FADE_MS);
const BANNER_OUT = FadeOut.duration(ANIM.COMBO_FADE_MS);

export function ComboBanner({ combo, testID }: ComboBannerProps): ReactElement | null {
  const background = useThemeColor({}, 'combo');

  if (combo <= 1) return null;

  const label = `Combo x${combo}!`;

  return (
    <Animated.View
      testID={testID}
      entering={BANNER_IN}
      exiting={BANNER_OUT}
      pointerEvents="none"
      style={[styles.root, { backgroundColor: background }]}
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
  },
  text: {
    fontSize: TYPO.heading,
    fontWeight: WEIGHT.bold,
  },
});

export default ComboBanner;
