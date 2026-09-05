import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { createEmptyRow, insertTile } from '@/game/core/matcher';
import { createTile, getTileDefinition } from '@/game/core/tiles';
import type { SlotRow as SlotRowModel, TileId } from '@/game/core/types';

import { INSERT_UI, TILE_UI, TOUCH } from '@/constants/config';

import { rowWidth } from '../layout';
import { SlotRow, capacityLabel, insertLabel } from '../SlotRow';

const A: TileId = 'cay-ince-belli';
const B: TileId = 'kahve-fincan';

/** n tile'li paketli satir kurar. */
function rowWith(ids: readonly TileId[], capacity = 7): SlotRowModel {
  return ids.reduce<SlotRowModel>(
    (acc, id, index) => insertTile(acc, index, createTile(id)),
    createEmptyRow(capacity),
  );
}

describe('insertLabel', () => {
  it('bos satirda genel etiket verir', () => {
    expect(insertLabel(0, [])).toBe('Boş satıra ekle');
  });

  it('bas konumunu komsusuyla anlatir', () => {
    expect(insertLabel(0, ['Simit', 'Cezve'])).toBe('En başa ekle, Simit öncesine');
  });

  it('son konumunu komsusuyla anlatir', () => {
    expect(insertLabel(2, ['Simit', 'Cezve'])).toBe('En sona ekle, Cezve sonrasına');
  });

  it('ara konumu iki komsusuyla anlatir', () => {
    expect(insertLabel(1, ['Simit', 'Cezve'])).toBe('Simit ile Cezve arasına ekle');
  });
});

describe('SlotRow', () => {
  const noop = () => {};

  it('tile lari ekrana basar', async () => {
    await render(
      <SlotRow row={rowWith([A, B])} insertEnabled={false} onInsert={noop} tileSize={40} />,
    );

    expect(screen.getByLabelText(getTileDefinition(A).nameTr)).toBeOnTheScreen();
    expect(screen.getByLabelText(getTileDefinition(B).nameTr)).toBeOnTheScreen();
  });

  it('kalan kapasiteyi bos slot olarak gosterir', async () => {
    await render(
      <SlotRow
        row={rowWith([A, B], 7)}
        insertEnabled={false}
        onInsert={noop}
        tileSize={40}
        testID="satir"
      />,
    );

    // 7 kapasite - 2 tile = 5 bos slot
    expect(screen.getAllByTestId(/^satir-empty-/)).toHaveLength(5);
  });

  /** n tile -> n+1 ekleme konumu. Modelin tanimlayici kurali. */
  it('tile sayisindan bir fazla ekleme konumu sunar', async () => {
    await render(
      <SlotRow row={rowWith([A, B])} insertEnabled onInsert={noop} tileSize={40} testID="satir" />,
    );

    expect(screen.getAllByTestId(/^satir-insert-/)).toHaveLength(3);
  });

  it('bos satirda tek ekleme konumu vardir', async () => {
    await render(
      <SlotRow
        row={createEmptyRow(7)}
        insertEnabled
        onInsert={noop}
        tileSize={40}
        testID="satir"
      />,
    );

    expect(screen.getAllByTestId(/^satir-insert-/)).toHaveLength(1);
  });

  it('dolu satirda ekleme konumu sunmaz (oyun sonu)', async () => {
    await render(
      <SlotRow
        row={rowWith([A, B, A], 3)}
        insertEnabled
        onInsert={noop}
        tileSize={40}
        testID="satir"
      />,
    );

    expect(screen.queryAllByTestId(/^satir-insert-/)).toHaveLength(0);
  });

  it('ekleme konumuna dokununca konumu bildirir', async () => {
    const onInsert = jest.fn();
    await render(
      <SlotRow
        row={rowWith([A, B])}
        insertEnabled
        onInsert={onInsert}
        tileSize={40}
        testID="satir"
      />,
    );

    await fireEvent.press(screen.getByTestId('satir-insert-1'));
    expect(onInsert).toHaveBeenCalledWith(1);
  });

  it('insertEnabled false iken dokunma yok sayilir', async () => {
    const onInsert = jest.fn();
    await render(
      <SlotRow
        row={rowWith([A, B])}
        insertEnabled={false}
        onInsert={onInsert}
        tileSize={40}
        testID="satir"
      />,
    );

    await fireEvent.press(screen.getByTestId('satir-insert-0'));
    expect(onInsert).not.toHaveBeenCalled();
  });

  it('ekleme konumlari ekran okuyucuya anlamli etiketlerle sunulur', async () => {
    await render(<SlotRow row={rowWith([A, B])} insertEnabled onInsert={noop} tileSize={40} />);

    const names = [getTileDefinition(A).nameTr, getTileDefinition(B).nameTr];
    expect(screen.getByLabelText(`En başa ekle, ${names[0]} öncesine`)).toBeOnTheScreen();
    expect(screen.getByLabelText(`${names[0]} ile ${names[1]} arasına ekle`)).toBeOnTheScreen();
    expect(screen.getByLabelText(`En sona ekle, ${names[1]} sonrasına`)).toBeOnTheScreen();
  });

  it('tile lar siradaki yerlerini ekran okuyucuya bildirir', async () => {
    await render(
      <SlotRow row={rowWith([A, B])} insertEnabled={false} onInsert={noop} tileSize={40} />,
    );

    expect(screen.getByLabelText(getTileDefinition(B).nameTr)).toHaveProp(
      'accessibilityHint',
      '2. sırada',
    );
  });

  /**
   * DOKUNMA HEDEFI. Gorsel gosterge 4pt genisliginde; hedef `hitSlop` ile
   * tamamlanir. Sprint 2'de deger 14 yazilmisti -> 4 + 28 = 32pt, oysa
   * `TOUCH.MIN_TARGET` 48. Config yorumu esigin saglandigini IDDIA
   * EDIYORDU. Bu test iddiayi CIZILEN elemanda dogrular -- config testi
   * sayilari, bu test bilesenin onlari gercekten kullandigini pinler.
   */
  it('ekleme gostergesinin dokunma hedefi esigi karsilar', async () => {
    await render(
      <SlotRow row={rowWith([A, B])} insertEnabled onInsert={noop} tileSize={40} testID="s" />,
    );

    const indicator = screen.getByTestId('s-insert-0');
    const hitSlop = indicator.props.hitSlop as { left: number; right: number };
    // `style` bir DIZI (`[styles.insert, {...}]`); duzlestirilmeden okunmaz.
    const width = StyleSheet.flatten(indicator.props.style as ViewStyle).width as number;

    expect(width + hitSlop.left + hitSlop.right).toBeGreaterThanOrEqual(TOUCH.MIN_TARGET);
  });

  /**
   * GOSTERGE KONUMLARI. Mutasyon testinde `left` degeri 0'a sabitlendiginde
   * hicbir test kirilmiyordu -- yani "gostergeler tile'larin ARASINDA"
   * iddiasi korumasizdi. Konum dogrulugu pekala test edilebilir.
   */
  it('ekleme gostergeleri soldan saga artan sirada ve esit araliklidir', async () => {
    const tileSize = 40;
    await render(
      <SlotRow
        row={rowWith([A, B, A])}
        insertEnabled
        onInsert={noop}
        tileSize={tileSize}
        testID="s"
      />,
    );

    const lefts = [0, 1, 2, 3].map(
      (i) =>
        StyleSheet.flatten(screen.getByTestId(`s-insert-${i}`).props.style as ViewStyle)
          .left as number,
    );

    expect(lefts).toHaveLength(4);
    for (let i = 1; i < lefts.length; i++) {
      expect(lefts[i]! - lefts[i - 1]!).toBeCloseTo(tileSize + TILE_UI.GAP, 5);
    }

    // Kenardaki gostergeler kapsayicinin DISINA tasmamali. Bu ancak
    // INSERT_UI.WIDTH <= TILE_UI.GAP oldugu surece dogru (config testi zorluyor).
    expect(lefts[0]!).toBeGreaterThanOrEqual(0);
    expect(lefts[3]! + INSERT_UI.WIDTH).toBeLessThanOrEqual(rowWidth(tileSize, 7));
  });

  /**
   * KAPASITE OZETI -- ekran okuyucunun kaybetme kosulunu gorebilmesi icin.
   * Bos slotlar duz `View`; goren oyuncu satirin doldugunu bakinca anlar,
   * ekran okuyucu kullanicisi Sprint 2'de hicbir sekilde anlayamiyordu.
   */
  it('satir doluluk ozetini ekran okuyucuya sunar', async () => {
    await render(
      <SlotRow
        row={rowWith([A, B])}
        insertEnabled={false}
        onInsert={noop}
        tileSize={40}
        testID="s"
      />,
    );

    expect(screen.getByTestId('s-kapasite')).toHaveProp('accessibilityLabel', '2 tile, 5 boş slot');
  });

  /**
   * BAG: bilesenin cizdigi genislik ile `rowWidth`'in hesabi AYNI olmali.
   *
   * Sprint 2'de ayrismislardi: `rowWidth` padding'i saymiyor, bilesen
   * `+ GAP*2` ekliyordu. Sonuc, `rowOverflows`'un bilesenden daha dar bir
   * kutuyu olcmesi ve tasmayi hic gormemesiydi. Bu test ikisini birbirine
   * baglar -- biri degisirse digeri de degismek zorunda.
   */
  it('cizilen genislik rowWidth ile birebir ayni', async () => {
    const tileSize = 36;
    const capacity = 9;
    await render(
      <SlotRow
        row={rowWith([A, B], capacity)}
        insertEnabled={false}
        onInsert={noop}
        tileSize={tileSize}
        testID="s"
      />,
    );

    const track = screen.getByTestId('s');
    const root = track.parent!;
    const width = StyleSheet.flatten(root.props.style as ViewStyle).width as number;

    expect(width).toBe(rowWidth(tileSize, capacity));
  });
});

describe('capacityLabel', () => {
  it('bos satirda tum kapasiteyi bildirir', () => {
    expect(capacityLabel(0, 7)).toBe('0 tile, 7 boş slot');
  });

  /** KAYBETME ESIGI ayrica uyarilir -- son slot sirdan bir slot degil. */
  it('son bos slotta uyarir', () => {
    expect(capacityLabel(6, 7)).toBe('Son boş slot! 6 tile, 1 yer kaldı');
  });

  it('dolu satiri bildirir', () => {
    expect(capacityLabel(7, 7)).toBe('Satır dolu, 7 tile');
  });
});
