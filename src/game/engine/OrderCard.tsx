import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { ORDER, OPACITY, RADIUS, SPACING, TYPO, WEIGHT } from '@/constants/config';
import { neededTileIds, patienceRatio } from '@/game/core/orders';
import { getTileDefinition } from '@/game/core/tiles';
import type { Customer } from '@/game/core/types';

import { TilePreview } from './TilePreview';

/**
 * Bir masanin siparis karti.
 *
 * UC KANAL, Sprint 2'deki tile kurali ile ayni gerekce:
 *  1. TILE GORSELI  -- hangi aile isteniyor (renk + form + glif)
 *  2. SAYI          -- "1/2" teslim durumu
 *  3. SABIR CUBUGU  -- kalan hamle, RENK DEGIL genislik ile kodlanir
 * Ekran okuyucu icin dorduncu kanal: tek cumlelik ozet etiket.
 *
 * SABIR RENKLE KODLANMAZ: kirmizi/yesil bir cubuk WCAG 1.4.1 ihlali olurdu
 * (bilgi yalnizca renkte). Genislik birincil kanal; renk yalnizca vurgu.
 * Ayrica sayi da yazili -- "3 hamle kaldi" cubuktan bagimsiz okunur.
 */

/** Bir masa kartinin en fazla genisligi -- uc kart dar ekrana sigmali. */
const TABLE_MAX_WIDTH = 140;

export interface OrderCardProps {
  customer: Customer;
  /** Tile gorsellerinin kenar uzunlugu. */
  tileSize: number;
  /** Semaver hedefi secilirken kart vurgulanir. */
  highlighted?: boolean;
  testID?: string;
}

/** Ekran okuyucu icin tek cumlelik siparis ozeti. */
export function orderLabel(customer: Customer): string {
  const parts = customer.order.map((line) => {
    const name = getTileDefinition(line.tileId).nameTr;
    return line.served >= line.required
      ? `${name} tamam`
      : `${name} ${line.served} bölü ${line.required}`;
  });

  return `Masa siparişi: ${parts.join(', ')}. ${customer.patience} hamle kaldı.`;
}

export function OrderCard({
  customer,
  tileSize,
  highlighted = false,
  testID,
}: OrderCardProps): ReactElement {
  // Hook'lar KOSULSUZ cagrilir; secim sonradan yapilir.
  const surface = useThemeColor({}, 'surface');
  const accent = useThemeColor({}, 'accent');
  const warning = useThemeColor({}, 'warning');
  const track = useThemeColor({}, 'slotEmpty');

  const ratio = patienceRatio(customer);
  // Sabir azaldikca cubuk KISALIR; son hamlelerde ayrica uyari rengi alir.
  // Renk tek basina bilgi tasimaz -- genislik ve yazili sayi zaten tasiyor
  // (WCAG 1.4.1: bilgi yalnizca renkte olamaz).
  const urgent = customer.patience <= ORDER.DEMAND_PRESSURE;
  const barColor = urgent ? warning : accent;

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={orderLabel(customer)}
      style={[
        styles.root,
        { backgroundColor: surface },
        highlighted ? { borderColor: accent } : null,
      ]}
    >
      <View style={styles.lines}>
        {customer.order.map((line) => (
          <View key={line.tileId} style={styles.line}>
            <TilePreview tile={{ id: line.tileId, key: `order-${line.tileId}` }} size={tileSize} />
            <Text
              style={[styles.count, line.served >= line.required ? styles.done : null]}
              // Sayi zaten kart etiketinde okunuyor; iki kez okunmasin.
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {line.served}/{line.required}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.track, { backgroundColor: track }]}>
        <View
          testID={testID === undefined ? undefined : `${testID}-sabir`}
          style={[styles.fill, { backgroundColor: barColor, width: `${Math.round(ratio * 100)}%` }]}
        />
      </View>

      <Text style={styles.patience} accessibilityElementsHidden importantForAccessibility="no">
        {customer.patience} hamle
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: RADIUS.button,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lines: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  line: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  count: {
    fontSize: TYPO.caption,
    fontWeight: WEIGHT.bold,
  },
  done: {
    opacity: OPACITY.muted,
  },
  track: {
    height: SPACING.xs,
    width: '100%',
    borderRadius: SPACING.xs,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  patience: {
    fontSize: TYPO.caption,
    opacity: OPACITY.muted,
  },
});

/**
 * Masalar seridi.
 *
 * Ayri bilesen: `GameScreen`'in dallanmasini dusuk tutuyor (kart basina
 * "basilabilir mi" karari burada veriliyor) ve masalarin render'i tek
 * yerden test edilebiliyor.
 */
export interface TableRowProps {
  customers: readonly Customer[];
  tileSize: number;
  /** Semaver kurulu ve tile secili mi? */
  armed: boolean;
  onPickTable: (index: number) => void;
  testID?: string;
}

export function TableRow({
  customers,
  tileSize,
  armed,
  onPickTable,
  testID,
}: TableRowProps): ReactElement {
  return (
    <View style={rowStyles.root} testID={testID}>
      {customers.map((customer, index) => {
        const actionable = armed && neededTileIds(customer.order).length > 0;

        return actionable ? (
          <Pressable
            key={customer.id}
            testID={`masa-${index}`}
            onPress={() => onPickTable(index)}
            accessibilityRole="button"
            accessibilityHint="Seçili tile bu masanın istediği tipe dönüşür"
            style={rowStyles.slot}
          >
            <OrderCard customer={customer} tileSize={tileSize} highlighted />
          </Pressable>
        ) : (
          <View key={customer.id} style={rowStyles.slot}>
            <OrderCard customer={customer} tileSize={tileSize} testID={`masa-${index}`} />
          </View>
        );
      })}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  slot: {
    flex: 1,
    maxWidth: TABLE_MAX_WIDTH,
  },
});

export default OrderCard;
