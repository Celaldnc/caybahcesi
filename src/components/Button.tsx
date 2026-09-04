import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColor } from '@/components/Themed';
import { TOUCH } from '@/constants/config';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps {
  /** Butonun uzerindeki metin. Ayni zamanda varsayilan erisilebilirlik etiketi. */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
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
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
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
      // Erisilebilirlik: rol + durum, ekran okuyucunun butonu dogru anons etmesi icin.
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor },
        isPrimary ? null : [styles.outlined, { borderColor: tint }],
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // TOUCH.MIN_TARGET: iOS HIG 44pt / Material 48dp -> 48 ikisini de karsilar.
    minHeight: TOUCH.MIN_TARGET,
    minWidth: TOUCH.MIN_TARGET,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlined: {
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default Button;
