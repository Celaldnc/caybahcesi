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
  /** Etkin degilse dokunma kapali ve ekran okuyucuya "devre disi" bildirilir. */
  disabled?: boolean;
  /** Ekran okuyucuya ek baglam (orn. "3. sirada"). */
  accessibilityHint?: string;
  testID?: string;
}

export function TilePreview({
  tile,
  size,
  selected = false,
  onPress,
  disabled = false,
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
        testID={testID === undefined ? undefined : `${testID}-glif`}
        style={[styles.glyph, { fontSize: size * TILE_UI.GLYPH_RATIO }]}
        // Glif dekoratif: anlam `accessibilityLabel`de zaten var, ekran
        // okuyucu emojiyi ikinci kez okumasin.
        accessibilityElementsHidden
        importantForAccessibility="no"
        /*
         * `allowFontScaling={false}` ERISILEBILIRLIK GEREGI, aksine degil.
         * Varsayilan `true` ile iOS AX5 (~3x) olceginde 26pt tile'da 34pt
         * glif olusuyor, `overflow: hidden` ile kirpiliyor ve ALTINDAKI
         * ShapeMark'i tamamen kapatiyor. Yani yaziyi buyuten az goren
         * kullanici, tam olarak dusuk gorus icin tasarlanan BIRINCIL form
         * kanalini kaybediyordu. Glif dekoratif ve olculeri tile'a bagli;
         * anlam tasiyan metin degil.
         */
        allowFontScaling={false}
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
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={definition.nameTr}
      accessibilityHint={accessibilityHint}
      // Devre disi durumu ekran okuyucuya BILDIRILMELI. Sprint 0'da ana
      // ekranda kurulan kural: "butonu etkin birakip hicbir sey yapmamak,
      // ekran okuyucu kullanicisina yerine getirilmeyen bir vaat verir."
      accessibilityState={{ selected, disabled }}
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
