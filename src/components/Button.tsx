import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColor } from '@/components/Themed';
import { OPACITY, RADIUS, SPACING, TOUCH, TYPO, WEIGHT } from '@/constants/config';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps {
  /** Butonun uzerindeki metin. accessibilityLabel verilmezse erisilebilirlik adi da budur. */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /**
   * Ekran okuyucu adini metinden ayirmak icin. Ikon butonlarda gerekli olacak.
   * WCAG 2.5.3 (Label in Name): verilecekse gorunen metni ICERMELI,
   * yoksa Voice Control kullanicisi gordugu etiketi soyleyerek butonu tetikleyemez.
   */
  accessibilityLabel?: string;
  /** Ekran okuyucuya ek baglam (orn. "Seviye 3'u baslatir"). */
  accessibilityHint?: string;
  /** Testlerde bulunabilirlik icin. */
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: ButtonProps): ReactElement {
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');

  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? tint : surface;
  const labelColor = isPrimary ? surface : text;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor },
        isPrimary ? null : [styles.outlined, { borderColor: tint }],
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        // Cagiran tarafin style'i BURADA, dokunma hedefi degismezlerinden ONCE.
        // Sona konsaydi `style={{ minHeight: 32 }}` 48pt garantisini sessizce bozardi.
        style,
        styles.touchTarget,
      ]}
    >
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Pazarlik edilemez: iOS HIG 44pt / Material 48dp -> 48 ikisini de karsilar. */
  touchTarget: {
    minHeight: TOUCH.MIN_TARGET,
    minWidth: TOUCH.MIN_TARGET,
  },
  outlined: {
    borderWidth: 2,
  },
  pressed: {
    opacity: OPACITY.pressed,
  },
  disabled: {
    opacity: OPACITY.disabled,
  },
  label: {
    fontSize: TYPO.button,
    fontWeight: WEIGHT.semibold,
  },
});

export default Button;
