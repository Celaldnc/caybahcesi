import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from '@/components/Themed';
import { TILE_UI, TOUCH } from '@/constants/config';
import { getTileDefinition } from '@/game/core/tiles';
import type { Tile } from '@/game/core/types';
import { TILE_BORDER_WIDTH, TILE_COLOR, inkFor } from '@/game/data/tileColors';

import { ShapeMark } from './ShapeMark';

/**
 * Tek bir tile.
 *
 * UC KANALDA bilgi tasir ve ucu de bagimsizdir:
 *  1. RENK   -- aile kimligi (aciklik merdiveni, renk korlugunde olculdu)
 *  2. FORM   -- aile kimligi (9 aile <-> 9 form bijeksiyonu, View ile cizilir)
 *  3. GLIF   -- tile kimligi (emoji, gecici yer tutucu)
 * Ekran okuyucu icin dorduncu kanal: `nameTr` erisilebilirlik etiketi.
 *
 * KENARLIK zorunlu: aciklik merdiveninin iki ucu kendi renginde bir zemine
 * karisir (en acik tile acik temada, en koyu tile koyu temada). Kenarlik
 * silueti zeminden ayirir.
 */

export interface TilePreviewProps {
  tile: Tile;
  /** Kenar uzunlugu (px). Satir/tray genisligine gore hesaplanir. */
  size: number;
  selected?: boolean;
  onPress?: () => void;
  /** Ekran okuyucuya ek baglam (orn. "3. sirada"). */
  accessibilityHint?: string;
  testID?: string;
}

export function TilePreview({
  tile,
  size,
  selected = false,
  onPress,
  accessibilityHint,
  testID,
}: TilePreviewProps): ReactElement {
  const definition = getTileDefinition(tile.id);
  const fill = TILE_COLOR[definition.colorToken];
  const ink = inkFor(fill);
  const borderColor = useThemeColor({}, 'text');

  const body = (
    <View
      testID={testID}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * TILE_UI.RADIUS_RATIO,
          backgroundColor: fill,
          borderColor,
          borderWidth: TILE_BORDER_WIDTH,
        },
        selected ? styles.selected : null,
      ]}
    >
      <ShapeMark
        shape={definition.shape}
        size={size * TILE_UI.SHAPE_RATIO}
        color={ink}
        testID={testID === undefined ? undefined : `${testID}-shape`}
      />
      <Text
        style={[styles.glyph, { fontSize: size * TILE_UI.GLYPH_RATIO }]}
        // Glif dekoratif: anlam `accessibilityLabel`de zaten var, ekran
        // okuyucu emojiyi ikinci kez okumasin.
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {definition.glyph}
      </Text>
    </View>
  );

  if (onPress === undefined) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={definition.nameTr}
        accessibilityHint={accessibilityHint}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={definition.nameTr}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      // Tile gorsel olarak 44pt'den kucuk olabilir (9 slot dar ekrana
      // sigmali); dokunma alani hitSlop ile HIG/Material esigine tamamlanir.
      hitSlop={Math.max(0, (TOUCH.MIN_TARGET - size) / 2)}
      style={styles.pressable}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selected: {
    transform: [{ scale: TILE_UI.SELECTED_SCALE }],
  },
  glyph: {
    position: 'absolute',
    textAlign: 'center',
  },
});

export default TilePreview;
