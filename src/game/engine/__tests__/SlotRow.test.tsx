import { fireEvent, render, screen } from '@testing-library/react-native';

import { createEmptyRow, insertTile } from '@/game/core/matcher';
import { createTile, getTileDefinition } from '@/game/core/tiles';
import type { SlotRow as SlotRowModel, TileId } from '@/game/core/types';

import { SlotRow, insertLabel } from '../SlotRow';

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
});
