import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useThemeColor } from '@/components/Themed';
import { ANIM, SPACING, TILE_UI } from '@/constants/config';
import { getTileDefinition } from '@/game/core/tiles';
import type { Tray } from '@/game/core/types';

import { TilePreview } from './TilePreview';

/**
 * Alt secim seridi (tray).
 *
 * Oyuncu once buradan bir tile secer, sonra satirdaki ekleme konumuna
 * dokunur. Iki asamali secim BILEREK tercih edildi: suruklemek daha akici
 * gorunur ama ekran okuyucu kullanicisi surukleyemez. Tap-tap her iki
 * kullaniciya da ayni yolu verir.
 *
 * Tile'lar `FadeIn`/`FadeOut` + `LinearTransition` ile girip cikar; secilen
 * tile satira gidince yerine yenisi akar. Animasyon config'leri MODUL
 * SEVIYESINDE sabit -- gerekce icin bkz. `SlotRow.tsx` (Reanimated'in
 * kimlik kontrolu her render'da yeni nesne gorurse animasyonu yeniden
 * kaydediyor).
 *
 * `enabled=false` iken (seviye bitti / oyun bitti) tile'lar devre disi.
 * Aksi halde oyuncu dokunuyor, haptik titresim aliyor ve HICBIR SEY
 * olmuyordu: store `status !== 'oynaniyor'` diye sessizce reddediyordu.
 * Sahte geri bildirim, geri bildirim yoklugundan kotudur.
 */

const TRAY_IN = FadeIn.duration(ANIM.PLACE_MS);
const TRAY_OUT = FadeOut.duration(ANIM.PLACE_MS);
const TRAY_LAYOUT = LinearTransition.duration(ANIM.PLACE_MS);

export interface TilePickerProps {
  tray: Tray;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  tileSize: number;
  /** Oyun devam ediyor mu? false ise tile'lar devre disi. */
  enabled?: boolean;
  testID?: string;
}

export function TilePicker({
  tray,
  selectedIndex,
  onSelect,
  tileSize,
  enabled = true,
  testID,
}: TilePickerProps): ReactElement {
  const surface = useThemeColor({}, 'surface');

  return (
    <View
      testID={testID}
      style={[styles.root, { backgroundColor: surface }]}
      accessibilityRole="list"
      accessibilityLabel={`Seçilebilir ${tray.length} tile`}
    >
      {tray.map((tile, index) => (
        <Animated.View key={tile.key} entering={TRAY_IN} exiting={TRAY_OUT} layout={TRAY_LAYOUT}>
          <TilePreview
            tile={tile}
            size={tileSize}
            selected={selectedIndex === index}
            onPress={() => onSelect(index)}
            disabled={!enabled}
            accessibilityHint={
              !enabled
                ? 'Oyun bitti, seçim yapılamaz.'
                : selectedIndex === index
                  ? 'Seçili. Seçimi kaldırmak için tekrar dokun.'
                  : `${getTileDefinition(tile.id).nameTr} seçilir, sonra satırdaki konuma dokun.`
            }
            testID={testID === undefined ? undefined : `${testID}-tile-${index}`}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: TILE_UI.MAX_SIZE * TILE_UI.RADIUS_RATIO,
  },
});

export default TilePicker;
