import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, type ReactElement } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text, useThemeColor } from '@/components/Themed';
import { ANIM, LEVEL, OPACITY, SPACING, TYPO, WEIGHT } from '@/constants/config';
import { progressRatio } from '@/game/core/level';
import { tilesOf } from '@/game/core/matcher';
import { announce, moveAnnouncement } from '@/game/engine/announce';
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
 *
 * SEVIYE KURULUMUNUN TEK KAYNAGI ROTA PARAMETRESIDIR. "Sonraki seviye"
 * butonu YALNIZCA `router.setParams` cagirir, `advanceLevel()` cagirmaz.
 * Sprint 2 kalite kapisinda uc ajan ayni hatayi buldu: ikisi birden
 * cagrildiginda `startLevel` IKI KEZ, iki FARKLI rastgele tohumla
 * kosuyordu -- ilk tahta bir kare gorunup atiliyordu. Testte gorunmuyordu
 * cunku `setParams` mock'u parametreyi gercekten degistirmiyordu.
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
  const backdrop = useThemeColor({}, 'background');

  const state = useGameStore();
  const { startLevel, selectTray, insertAt, clearCombo, retry } = state;

  // Ekran acildiginda (ya da seviye degistiginde) oyunu kur.
  useEffect(() => {
    startLevel(level);
  }, [level, startLevel]);

  const tileSize = computeTileSize(width - SPACING.xl * 2, state.config.slotCount);
  const progress = progressRatio(state.score, state.config);
  const playing = state.status === 'oynaniyor';
  const finished = state.status === 'seviye-tamam' || state.status === 'oyun-bitti';

  /*
   * EKRAN OKUYUCU DUYURUSU.
   *
   * Sprint 2'de bu kanal TAMAMEN yoktu: oyuncu hamle yapabiliyor ama
   * hamlenin ne yaptigini ogrenemiyordu (`announceForAccessibility` kod
   * tabaninda sifir kez geciyordu). Anahtar `level:moves` -- `retry` ya da
   * seviye gecisinde sayac sifirlandiginda eski anahtar yeni hamleyi
   * yutmasin diye seviye de anahtara dahil.
   */
  const { status, score, lastGain, lastCombo, row, config, moves } = state;
  const announceKey = `${state.level}:${moves}`;
  // `null` = bu mount'ta henuz taban alinmadi.
  const announcedRef = useRef<string | null>(null);

  useEffect(() => {
    /*
     * MOUNT'TA ASLA DUYURMA.
     *
     * Store bir singleton: ekrana geri donuldugunde onceki oyunun `moves`
     * degerini tasiyor olabilir. Effect'ler bildirim sirasiyla kosar --
     * `startLevel` etkisi state'i sifirlayana kadar bu effect'in render
     * closure'i hala ESKI `moves`'u goruyor ve bayat bir hamleyi
     * duyuruyordu. (Testte yakalandi: aciliste 1 yerine 2 duyuru.)
     * Oyuncu ekrana yeni geldi; raporlanacak bir hamle yok.
     */
    if (announcedRef.current === null || moves === 0) {
      announcedRef.current = announceKey;
      return;
    }
    if (announcedRef.current === announceKey) return;
    announcedRef.current = announceKey;

    announce(
      moveAnnouncement({
        status,
        score,
        gain: lastGain,
        combo: lastCombo,
        filled: tilesOf(row).length,
        slotCount: config.slotCount,
        moves,
      }),
    );
  }, [announceKey, moves, status, score, lastGain, lastCombo, row, config.slotCount]);

  /*
   * Combo banner'inin OMRU. `ANIM.COMBO_BANNER_MS` "ekranda kalma suresi"
   * diye belgelenmisti ama hicbir zamanlayici yoktu -- banner bir sonraki
   * hamleye kadar duruyordu.
   */
  useEffect(() => {
    if (lastCombo <= 1) return undefined;
    const timer = setTimeout(clearCombo, ANIM.COMBO_BANNER_MS);
    return () => clearTimeout(timer);
  }, [lastCombo, clearCombo]);

  /*
   * Kararli referanslar. Olculdu: `TilePreview` memo'lansa bile inline
   * callback karsilastirmayi her zaman dusurur ve memo'suz halden 2x YAVAS
   * olur (11.7 ms vs 5.6 ms). memo ile useCallback birlikte anlamli.
   */
  const handleSelect = useCallback(
    (index: number): void => {
      /*
       * SAVUNMA DALI -- testte kapsanmiyor, bilincli.
       *
       * `TilePicker` oyun bitince zaten devre disi, store da `selectTray`'i
       * reddediyor. Bu kontrol yalnizca SIRALAMA yarisini kapatir: durum
       * degismeden hemen once siraya girmis bir dokunus, `disabled` prop'u
       * bir sonraki render'da uygulanacagi icin buraya ulasabilir. O
       * durumda store zaten reddederdi ama HAPTIK ATESLENIRDI -- yani
       * Sprint 2'de duzeltilen "sahte geri bildirim" hatasi geri gelirdi.
       * Testten kurulamiyor cunku RNTL devre disi Pressable'i tetiklemiyor.
       */
      if (useGameStore.getState().status !== 'oynaniyor') return;
      haptic('sec');
      selectTray(index);
    },
    [haptic, selectTray],
  );

  const handleInsert = useCallback(
    (position: number): void => {
      insertAt(position);

      // TEK okuma kaynagi: store'un kendi turettigi `lastGain`. Onceki hal
      // render closure'indaki bayat `state.score` ile `getState().score`'u
      // karsilastiriyordu -- hizli cift dokunusta hamle yapilmadigi halde
      // "basari" haptigi veriyordu.
      const after = useGameStore.getState();
      if (after.lastGain > 0) {
        haptic(after.lastCombo > 1 ? 'basari' : 'eslesme');
      } else {
        haptic('yerlestir');
      }
    },
    [haptic, insertAt],
  );

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

        <View style={styles.picker}>
          <TilePicker
            tray={state.tray}
            selectedIndex={state.selectedTrayIndex}
            onSelect={handleSelect}
            tileSize={tileSize}
            enabled={playing}
            testID="tepsi"
          />
          <Text style={styles.hint}>
            {!playing
              ? 'Oyun bitti'
              : state.selectedTrayIndex === null
                ? 'Bir tile seç'
                : 'Şimdi satırda bir konuma dokun'}
          </Text>
        </View>
      </Screen>

      {/*
        OVERLAY'LER AKISIN DISINDA, USTUNDE.
        Sprint 2'de bunlar `ScrollView`'in normal cocuguydu: oyun bitince
        tahta ile tepsi ARASINA giriyor, tepsiyi asagi zipatiyor ve arkadaki
        tepsi hala basilabilir kaliyordu. `accessibilityViewIsModal` ekran
        okuyucunun odagini overlay'e hapseder -- aksi halde kullanici
        arkadaki olu kontrollerde dolasir.
      */}
      {finished ? (
        <View
          style={[styles.overlay, { backgroundColor: backdrop }]}
          accessibilityViewIsModal
          testID={state.status === 'seviye-tamam' ? 'seviye-tamam' : 'oyun-bitti'}
        >
          {state.status === 'seviye-tamam' ? (
            <>
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
                    // YALNIZCA setParams -- effect seviyeyi bir kez kurar.
                    router.setParams({ level: String(level + 1) });
                  } else {
                    router.back();
                  }
                }}
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </View>
      ) : null}
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
    // Akisin USTUNDE, icinde degil. (RN 0.86 tiplerinde
    // `StyleSheet.absoluteFillObject` yok; acikca yaziyoruz.)
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.xl,
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
