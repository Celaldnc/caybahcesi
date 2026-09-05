import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text, useThemeColor } from '@/components/Themed';
import { ANIM, LEVEL, OPACITY, RADIUS, SPACING, TOUCH, TYPO, WEIGHT } from '@/constants/config';
import { progressRatio } from '@/game/core/level';
import { tilesOf } from '@/game/core/matcher';
import { neededTileIds } from '@/game/core/orders';
import { canUseSemaver } from '@/game/core/powerups';
import { announce, moveAnnouncement } from '@/game/engine/announce';
import { ComboBanner } from '@/game/engine/ComboBanner';
import { computeTileSize } from '@/game/engine/layout';
import { TableRow } from '@/game/engine/OrderCard';
import { SlotRow } from '@/game/engine/SlotRow';
import { TilePicker } from '@/game/engine/TilePicker';
import { useGameStore, type GameStatus, type LossReason } from '@/game/store/gameStore';
import { useHaptics, type HapticKind } from '@/hooks/useHaptics';

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

/** Siparis kartindaki tile, satirdakinin bu orani kadar cizilir. */
const ORDER_TILE_RATIO = 0.7;

/**
 * Alt satirdaki yonlendirme metni.
 *
 * Ayri fonksiyon: ekran bileseninin dallanmasini dusuk tutuyor ve metin
 * kombinasyonlari tek yerden test edilebiliyor.
 */
export function hintText(
  playing: boolean,
  semaverArmed: boolean,
  selectedTrayIndex: number | null,
): string {
  if (!playing) return 'Oyun bitti';
  if (semaverArmed) return 'Hangi masaya çevirelim?';
  if (selectedTrayIndex === null) return 'Bir tile seç';
  return 'Şimdi satırda bir konuma dokun';
}

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
  const accent = useThemeColor({}, 'accent');

  const state = useGameStore();
  const { startLevel, selectTray, insertAt, clearCombo, retry, spendSemaver } = state;

  /*
   * SEMAVER "kurulu" mu?
   *
   * Yerel durum, store'da degil: bu bir NIYET, oyun durumu degil. Store'a
   * konsaydi kaydedilir/geri yuklenirdi ve oyuncu oyunu yarim birakip
   * dondugunde acikta kalmis bir niyetle karsilasirdi.
   */
  const [semaverArmed, setSemaverArmed] = useState(false);

  // Ekran acildiginda (ya da seviye degistiginde) oyunu kur.
  useEffect(() => {
    startLevel(level);
  }, [level, startLevel]);

  const tileSize = computeTileSize(width - SPACING.xl * 2, state.config.slotCount);
  const progress = progressRatio(state.served, state.config);
  const orderTileSize = Math.round(tileSize * ORDER_TILE_RATIO);
  const semaverReady = canUseSemaver(state.powers) && state.selectedTrayIndex !== null;
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
  const {
    status,
    score,
    lastGain,
    lastCombo,
    row,
    config,
    moves,
    lastCompleted,
    lastLeft,
    lossReason,
  } = state;
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
        completed: lastCompleted,
        left: lastLeft,
        lossReason,
      }),
    );
  }, [
    announceKey,
    moves,
    status,
    score,
    lastGain,
    lastCombo,
    row,
    config.slotCount,
    lastCompleted,
    lastLeft,
    lossReason,
  ]);

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

  const handleSemaver = useCallback(
    (tableIndex: number): void => {
      const current = useGameStore.getState();
      const customer = current.customers[tableIndex];
      const target = customer === undefined ? undefined : neededTileIds(customer.order)[0];

      if (current.selectedTrayIndex === null || target === undefined) return;

      haptic('basari');
      spendSemaver(current.selectedTrayIndex, target);
      setSemaverArmed(false);
    },
    [haptic, spendSemaver],
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
            Servis {state.served}/{state.config.customerCount} · {Math.round(progress * 100)}%
          </Text>
        </View>

        {/*
          MASALAR. Uc siparis karti; her biri renk + form + sayi + sabir
          cubugu tasiyor. Semaver kuruluyken kartlar BUTONA donusur:
          "bu masanin istedigi tipe cevir".
        */}
        <TableRow
          customers={state.customers}
          tileSize={orderTileSize}
          armed={semaverArmed && playing}
          onPickTable={handleSemaver}
          testID="masalar"
        />

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
          <Pressable
            testID="semaver"
            onPress={() => setSemaverArmed((armed) => !armed)}
            disabled={!semaverReady}
            accessibilityRole="button"
            accessibilityLabel={`Semaver, ${state.powers.semaver} hak`}
            accessibilityHint={
              semaverReady
                ? 'Seçili tile’ı bir masanın istediği tipe çevirir'
                : 'Önce tepsiden bir tile seç'
            }
            accessibilityState={{ disabled: !semaverReady, selected: semaverArmed }}
            hitSlop={SPACING.sm}
            style={[
              styles.semaver,
              { borderColor: accent },
              semaverArmed ? { backgroundColor: accent } : null,
              semaverReady ? null : styles.semaverOff,
            ]}
          >
            <Text style={styles.semaverText}>Semaver ×{state.powers.semaver}</Text>
          </Pressable>

          <Text style={styles.hint}>
            {hintText(playing, semaverArmed, state.selectedTrayIndex)}
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
        <FinishOverlay
          status={state.status}
          level={level}
          served={state.served}
          lossReason={state.lossReason}
          customerCount={state.config.customerCount}
          score={state.score}
          moves={state.moves}
          backdrop={backdrop}
          haptic={haptic}
          onRetry={retry}
        />
      ) : null}
    </>
  );
}

interface FinishOverlayProps {
  status: GameStatus;
  level: number;
  served: number;
  customerCount: number;
  score: number;
  moves: number;
  lossReason: LossReason;
  backdrop: string;
  haptic: (kind: HapticKind) => void;
  onRetry: () => void;
}

/**
 * Bitis ekrani -- AKISIN DISINDA, USTUNDE.
 *
 * Sprint 2'de bu `ScrollView`'in normal cocuguydu: oyun bitince tahta ile
 * tepsi ARASINA giriyor, tepsiyi asagi zipatiyor ve arkadaki tepsi hala
 * basilabilir kaliyordu. `accessibilityViewIsModal` ekran okuyucunun
 * odagini overlay'e hapseder.
 */
function FinishOverlay({
  status,
  level,
  served,
  customerCount,
  score,
  moves,
  lossReason,
  backdrop,
  haptic,
  onRetry,
}: FinishOverlayProps): ReactElement {
  const won = status === 'seviye-tamam';
  const isLast = level >= LEVEL.TOTAL;

  return (
    <View
      style={[styles.overlay, { backgroundColor: backdrop }]}
      accessibilityViewIsModal
      testID={won ? 'seviye-tamam' : 'oyun-bitti'}
    >
      <Text style={styles.overlayTitle} accessibilityRole="header">
        {won
          ? 'Seviye tamamlandı!'
          : lossReason === 'musteri-bitti'
            ? 'Müşteriler gitti'
            : 'Satır doldu'}
      </Text>
      <Text style={styles.overlayBody}>
        {won
          ? `${moves} hamlede ${score} puan`
          : `${served}/${customerCount} servis · ${score} puan`}
      </Text>

      {won ? (
        <Button
          label={isLast ? 'Bitir' : 'Sonraki seviye'}
          accessibilityHint={isLast ? 'Ana ekrana döner' : `Seviye ${level + 1} açılır`}
          onPress={() => {
            haptic('basari');
            if (isLast) {
              router.back();
            } else {
              // YALNIZCA setParams -- effect seviyeyi bir kez kurar.
              router.setParams({ level: String(level + 1) });
            }
          }}
        />
      ) : (
        <View style={styles.overlayActions}>
          <Button
            label="Tekrar dene"
            accessibilityHint="Aynı seviyeyi baştan başlatır"
            onPress={() => {
              haptic('sec');
              onRetry();
            }}
          />
          <Button
            label="Geri"
            variant="secondary"
            accessibilityHint="Ana ekrana döner"
            onPress={() => router.back()}
          />
        </View>
      )}
    </View>
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
  semaver: {
    borderWidth: 2,
    borderRadius: RADIUS.button,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    minHeight: TOUCH.MIN_TARGET / 2,
    justifyContent: 'center',
  },
  semaverOff: {
    opacity: OPACITY.disabled,
  },
  semaverText: {
    fontSize: TYPO.caption,
    fontWeight: WEIGHT.bold,
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
