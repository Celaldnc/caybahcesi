import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { useThemeColor } from '@/components/Themed';
import { ANIM, INSERT_UI, TILE_UI, TOUCH } from '@/constants/config';
import { insertPositions, tilesOf } from '@/game/core/matcher';
import { getTileDefinition } from '@/game/core/tiles';
import type { SlotRow as SlotRowModel } from '@/game/core/types';
import { TILE_BORDER_WIDTH } from '@/game/data/tileColors';

import { rowWidth } from './layout';
import { TilePreview } from './TilePreview';

/**
 * Oyun satiri.
 *
 * MODEL: ekleme (insertion). Satir her zaman sola paketlidir; oyuncu bos bir
 * slota koymaz, tile'larin ARASINA ekler. n tile varsa n+1 ekleme konumu
 * vardir -- her tile'in soluna ve en saga.
 *
 * EKLEME GOSTERGELERI MUTLAK KONUMLU. Akista yer kaplasalardi 9 slotlu
 * seviye hicbir telefona sigmazdi (olculdu: 320pt ekranda satir 352pt).
 * Simdi genislik yalnizca tile'lardan ve aralarindaki bosluklardan olusuyor;
 * gostergeler bosluklarin uzerine biniyor.
 *
 * ANIMASYON: tile'lar `LinearTransition` ile tasinir. Araya ekleme
 * yapildiginda sagdakiler kayarken bu gecis onlarin "isinlanmasini" onler.
 * Kararli `tile.key` sart -- ayni tipten iki tile ayni anahtari tasisaydi
 * Reanimated hangi View'in nereye gittigini bilemezdi.
 *
 * `TILE_LAYOUT` MODUL SEVIYESINDE, render icinde DEGIL. Reanimated'in
 * `_configureLayoutAnimation`'i `currentConfig === previousConfig` KIMLIK
 * kontrolu yapar (AnimatedComponent.js:224,268); her render'da yeni builder
 * uretilirse kontrol her zaman duser ve layout animasyonu her commit'te
 * yeniden kaydedilir (`createSerializable` + JSI batch). Olculdu: 9 tile
 * icin commit basina 6.6-9.5 ms -- 16.67 ms kare butcesinin yarisindan
 * fazlasi. Sabite cikarmak tek satirlik degisiklik, davranis ayni.
 */

/** Modul seviyesinde SABIT -- gerekce yukarida. */
const TILE_LAYOUT = LinearTransition.duration(ANIM.COLLAPSE_MS);

export interface SlotRowProps {
  row: SlotRowModel;
  /** Ekleme konumlari yalnizca bir tile secildiginde dokunulabilir. */
  insertEnabled: boolean;
  onInsert: (position: number) => void;
  /** Tile genisligi; `computeTileSize` ile hesaplanir. */
  tileSize: number;
  testID?: string;
}

/** Ekleme konumu icin ekran okuyucu etiketi. */
export function insertLabel(position: number, tileNames: readonly string[]): string {
  const total = tileNames.length;
  if (total === 0) return 'Boş satıra ekle';
  if (position === 0) return `En başa ekle, ${tileNames[0]!} öncesine`;
  if (position === total) return `En sona ekle, ${tileNames[total - 1]!} sonrasına`;
  return `${tileNames[position - 1]!} ile ${tileNames[position]!} arasına ekle`;
}

/**
 * Satir doluluk ozeti -- ekran okuyucu icin.
 *
 * "Kalan" sayisini one aliyoruz cunku oyuncuyu ilgilendiren sey doluluk
 * degil, KALAN PAY. Son slotta ozel uyari: kaybetme esigi.
 */
export function capacityLabel(filled: number, total: number): string {
  const remaining = total - filled;
  if (remaining === 0) return `Satır dolu, ${total} tile`;
  if (remaining === 1) return `Son boş slot! ${filled} tile, 1 yer kaldı`;
  return `${filled} tile, ${remaining} boş slot`;
}

export function SlotRow({
  row,
  insertEnabled,
  onInsert,
  tileSize,
  testID,
}: SlotRowProps): ReactElement {
  const tiles = tilesOf(row);
  const tileNames = tiles.map((tile) => getTileDefinition(tile.id).nameTr);
  const accentColor = useThemeColor({}, 'accent');
  const emptyColor = useThemeColor({}, 'slotEmpty');

  const step = tileSize + TILE_UI.GAP;
  // `rowWidth` artik `track`'in paddingHorizontal'ini da iceriyor; burada
  // ikinci kez eklemek olcumu bilesenden ayirirdi (tam da eski hatasi).
  const width = rowWidth(tileSize, row.length);
  const emptyCount = row.length - tiles.length;

  return (
    <View style={[styles.root, { width, minHeight: tileSize + TOUCH.MIN_TARGET / 2 }]}>
      {/* Tile'lar ve bos slotlar -- akista yer kaplayan tek katman. */}
      <View testID={testID} style={styles.track}>
        {tiles.map((tile, index) => (
          <Animated.View key={tile.key} layout={TILE_LAYOUT}>
            <TilePreview
              tile={tile}
              size={tileSize}
              accessibilityHint={`${index + 1}. sırada`}
              testID={testID === undefined ? undefined : `${testID}-tile-${index}`}
            />
          </Animated.View>
        ))}

        {Array.from({ length: emptyCount }, (_, i) => (
          <View
            key={`empty-${i}`}
            testID={testID === undefined ? undefined : `${testID}-empty-${i}`}
            style={[
              styles.emptySlot,
              {
                width: tileSize,
                height: tileSize,
                borderRadius: tileSize * TILE_UI.RADIUS_RATIO,
                borderColor: emptyColor,
              },
            ]}
          />
        ))}
      </View>

      {/*
        KAPASITE OZETI -- ekran okuyucunun kaybetme kosulunu gorebilmesi icin.
        Bos slotlar kesikli kenarlikli düz View'lar; goren oyuncu satirin
        dolmakta oldugunu bakinca anliyor, ekran okuyucu kullanicisi ise
        Sprint 2'de HICBIR SEKILDE anlayamiyordu -- oyun "satir doldu" ile
        bitene kadar tek uyari yoktu. Bu eleman o kanali aciyor.
      */}
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={capacityLabel(tiles.length, row.length)}
        testID={testID === undefined ? undefined : `${testID}-kapasite`}
        style={styles.capacity}
      />

      {/* Ekleme gostergeleri -- MUTLAK, genislik tuketmez. */}
      {insertPositions(row).map((position) => (
        <Pressable
          key={`insert-${position}`}
          testID={testID === undefined ? undefined : `${testID}-insert-${position}`}
          onPress={() => onInsert(position)}
          disabled={!insertEnabled}
          accessibilityRole="button"
          accessibilityLabel={insertLabel(position, tileNames)}
          accessibilityState={{ disabled: !insertEnabled }}
          hitSlop={{
            left: INSERT_UI.TOUCH_PADDING,
            right: INSERT_UI.TOUCH_PADDING,
            top: TOUCH.MIN_TARGET / 2,
            bottom: TOUCH.MIN_TARGET / 2,
          }}
          style={[
            styles.insert,
            {
              left: TILE_UI.GAP + position * step - TILE_UI.GAP / 2 - INSERT_UI.WIDTH / 2,
              width: INSERT_UI.WIDTH,
              height: tileSize * INSERT_UI.HEIGHT_RATIO,
              borderRadius: INSERT_UI.WIDTH / 2,
              backgroundColor: insertEnabled ? accentColor : 'transparent',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TILE_UI.GAP,
    paddingHorizontal: TILE_UI.GAP,
  },
  insert: {
    position: 'absolute',
  },
  emptySlot: {
    borderWidth: TILE_BORDER_WIDTH,
    borderStyle: 'dashed',
  },
  capacity: {
    // Gorsel olarak yok; yalnizca erisilebilirlik agacinda var.
    height: 0,
    width: 0,
  },
});

export default SlotRow;
