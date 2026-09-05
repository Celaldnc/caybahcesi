import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TileShape } from '@/game/core/types';

/**
 * Tile'in renkten BAGIMSIZ form isareti.
 *
 * Neden metin sembolu (⬢ ★ ☾) degil: font destegine bagimli olurdu.
 * Android'de bir glif eksikse tofu kutusu cikar ve renk korlugu kanalinin
 * TAMAMI kaybolur. Erisilebilirligin tek tasiyicisini font kapsamina emanet
 * etmiyoruz -- her form duz `View` ile ciziliyor.
 *
 * Ucgenler icin klasik kenarlik hilesi kullaniliyor: yan kenarliklar
 * saydam, tek kenarlik renkli -> ucgen olusur.
 */

export interface ShapeMarkProps {
  shape: TileShape;
  /** Isaretin kenar uzunlugu (px). */
  size: number;
  color: string;
  testID?: string;
}

export function ShapeMark({ shape, size, color, testID }: ShapeMarkProps): ReactElement {
  const half = size / 2;

  switch (shape) {
    case 'daire':
      return (
        <View
          testID={testID}
          style={[
            styles.base,
            { width: size, height: size, borderRadius: half, backgroundColor: color },
          ]}
        />
      );

    case 'kare':
      return (
        <View
          testID={testID}
          style={[styles.base, { width: size, height: size, backgroundColor: color }]}
        />
      );

    case 'yuvarlak':
      return (
        <View
          testID={testID}
          style={[
            styles.base,
            { width: size, height: size, borderRadius: size * 0.3, backgroundColor: color },
          ]}
        />
      );

    case 'elmas':
      return (
        <View
          testID={testID}
          style={[
            styles.base,
            styles.rotated,
            { width: size * 0.78, height: size * 0.78, backgroundColor: color },
          ]}
        />
      );

    case 'ucgen':
      return (
        <View
          testID={testID}
          style={[
            styles.triangleBase,
            {
              borderLeftWidth: half,
              borderRightWidth: half,
              borderBottomWidth: size * 0.86,
              borderBottomColor: color,
            },
          ]}
        />
      );

    case 'ters-ucgen':
      return (
        <View
          testID={testID}
          style={[
            styles.triangleBase,
            {
              borderLeftWidth: half,
              borderRightWidth: half,
              borderTopWidth: size * 0.86,
              borderTopColor: color,
            },
          ]}
        />
      );

    case 'cubuk':
      return (
        <View
          testID={testID}
          style={[
            styles.base,
            {
              width: size,
              height: size * 0.34,
              borderRadius: size * 0.17,
              backgroundColor: color,
            },
          ]}
        />
      );

    case 'halka':
      return (
        <View
          testID={testID}
          style={[
            styles.base,
            {
              width: size,
              height: size,
              borderRadius: half,
              borderWidth: size * 0.24,
              borderColor: color,
            },
          ]}
        />
      );

    case 'capraz':
      return (
        <View testID={testID} style={[styles.crossRoot, { width: size, height: size }]}>
          <View
            style={[
              styles.crossBar,
              styles.rotated,
              { width: size, height: size * 0.24, backgroundColor: color },
            ]}
          />
          <View
            style={[
              styles.crossBar,
              styles.rotatedBack,
              { width: size, height: size * 0.24, backgroundColor: color },
            ]}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  base: {
    // Ucgen disindaki tum formlarin ortak zemini.
  },
  rotated: {
    transform: [{ rotate: '45deg' }],
  },
  rotatedBack: {
    transform: [{ rotate: '-45deg' }],
  },
  /**
   * Ucgen kenarlik hilesi: genislik/yukseklik 0, yan kenarliklar saydam,
   * tek kenarlik renkli. RN'de SVG'siz ucgen cizmenin standart yolu.
   */
  triangleBase: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
  crossRoot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossBar: {
    position: 'absolute',
    borderRadius: 2,
  },
});

export default ShapeMark;
