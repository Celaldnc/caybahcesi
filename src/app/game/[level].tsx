import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, type ReactElement } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Themed';
import { LEVEL, OPACITY, SPACING, TYPO, WEIGHT } from '@/constants/config';
import { progressRatio } from '@/game/core/level';
import { ComboBanner } from '@/game/engine/ComboBanner';
import { computeTileSize } from '@/game/engine/layout';
import { SlotRow } from '@/game/engine/SlotRow';
import { TilePicker } from '@/game/engine/TilePicker';
import { useGameStore } from '@/game/store/gameStore';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * Oyun ekrani.
 *
 * Akis iki asamali: tray'den tile SEC, sonra satirdaki konuma DOKUN.
 * Suruklemek yerine tap-tap secildi cunku ekran okuyucu kullanicisi
 * surukleyemez; iki kullaniciya da ayni yolu veriyoruz.
 *
 * Butun oyun mantigi store'da; bu dosya yalnizca cizim ve girdi.
 */

/** Rota parametresinden gecerli bir seviye numarasi cikarir. */
export function parseLevelParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > LEVEL.TOTAL) return 1;
  return parsed;
}

export default function GameScreen(): ReactElement {
  const params = useLocalSearchParams<{ level?: string }>();
  const level = parseLevelParam(params.level);
  const { width } = useWindowDimensions();
  const haptic = useHaptics();

  const state = useGameStore();
  const { startLevel, selectTray, insertAt, advanceLevel, retry } = state;

  // Ekran acildiginda (ya da seviye degistiginde) oyunu kur.
  useEffect(() => {
    startLevel(level);
  }, [level, startLevel]);

  const tileSize = computeTileSize(width - SPACING.xl * 2, state.config.slotCount);
  const progress = progressRatio(state.score, state.config);
  const playing = state.status === 'oynaniyor';

  const handleSelect = (index: number): void => {
    haptic('sec');
    selectTray(index);
  };

  const handleInsert = (position: number): void => {
    const scoreBefore = state.score;
    insertAt(position);

    const after = useGameStore.getState();
    if (after.score > scoreBefore) {
      haptic(after.lastCombo > 1 ? 'basari' : 'eslesme');
    } else {
      haptic('yerlestir');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: `Seviye ${level}` }} />
      <Screen centered={false} testID="oyun-ekrani">
        <View style={styles.header}>
          <Text style={styles.score} accessibilityLabel={`Skor ${state.score}`}>
            {state.score}
          </Text>
          <Text style={styles.target}>
            Hedef {state.config.targetScore} · {Math.round(progress * 100)}%
          </Text>
        </View>

        <View style={styles.board}>
          <SlotRow
            row={state.row}
            insertEnabled={playing && state.selectedTrayIndex !== null}
            onInsert={handleInsert}
            tileSize={tileSize}
            testID="satir"
          />
          <ComboBanner combo={state.lastCombo} testID="combo" />
        </View>

        {state.status === 'seviye-tamam' ? (
          <View style={styles.overlay} testID="seviye-tamam">
            <Text style={styles.overlayTitle} accessibilityRole="header">
              Seviye tamamlandı!
            </Text>
            <Text style={styles.overlayBody}>
              {state.moves} hamlede {state.score} puan
            </Text>
            <Button
              label={level < LEVEL.TOTAL ? 'Sonraki seviye' : 'Bitir'}
              accessibilityHint={
                level < LEVEL.TOTAL ? `Seviye ${level + 1} açılır` : 'Ana ekrana döner'
              }
              onPress={() => {
                haptic('basari');
                if (level < LEVEL.TOTAL) {
                  advanceLevel();
                  router.setParams({ level: String(level + 1) });
                } else {
                  router.back();
                }
              }}
            />
          </View>
        ) : null}

        {state.status === 'oyun-bitti' ? (
          <View style={styles.overlay} testID="oyun-bitti">
            <Text style={styles.overlayTitle} accessibilityRole="header">
              Satır doldu
            </Text>
            <Text style={styles.overlayBody}>
              {state.score} puan · hedef {state.config.targetScore}
            </Text>
            <View style={styles.overlayActions}>
              <Button
                label="Tekrar dene"
                accessibilityHint="Aynı seviyeyi baştan başlatır"
                onPress={() => {
                  haptic('sec');
                  retry();
                }}
              />
              <Button
                label="Geri"
                variant="secondary"
                accessibilityHint="Ana ekrana döner"
                onPress={() => router.back()}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.picker}>
          <TilePicker
            tray={state.tray}
            selectedIndex={state.selectedTrayIndex}
            onSelect={handleSelect}
            tileSize={tileSize}
            testID="tepsi"
          />
          <Text style={styles.hint}>
            {state.selectedTrayIndex === null ? 'Bir tile seç' : 'Şimdi satırda bir konuma dokun'}
          </Text>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  score: {
    fontSize: TYPO.title,
    fontWeight: WEIGHT.bold,
  },
  target: {
    fontSize: TYPO.caption,
    opacity: OPACITY.muted,
  },
  board: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xl,
  },
  picker: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  hint: {
    fontSize: TYPO.caption,
    opacity: OPACITY.muted,
  },
  overlay: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  overlayTitle: {
    fontSize: TYPO.heading,
    fontWeight: WEIGHT.bold,
    textAlign: 'center',
  },
  overlayBody: {
    fontSize: TYPO.body,
    opacity: OPACITY.muted,
    textAlign: 'center',
  },
  overlayActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
