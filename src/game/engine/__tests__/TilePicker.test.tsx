import { fireEvent, render, screen } from '@testing-library/react-native';

import { createTile, getTileDefinition } from '@/game/core/tiles';
import type { TileId } from '@/game/core/types';

import { TilePicker } from '../TilePicker';

const A: TileId = 'cay-ince-belli';
const B: TileId = 'kahve-fincan';
const C: TileId = 'nazar-mavi';

describe('TilePicker', () => {
  const tray = [createTile(A), createTile(B), createTile(C)];

  it('tray deki tum tile lari gosterir', async () => {
    await render(
      <TilePicker tray={tray} selectedIndex={null} onSelect={jest.fn()} tileSize={44} />,
    );

    for (const tile of tray) {
      expect(screen.getByLabelText(getTileDefinition(tile.id).nameTr)).toBeOnTheScreen();
    }
  });

  it('dokunulan tile in indisini bildirir', async () => {
    const onSelect = jest.fn();
    await render(
      <TilePicker
        tray={tray}
        selectedIndex={null}
        onSelect={onSelect}
        tileSize={44}
        testID="tepsi"
      />,
    );

    await fireEvent.press(screen.getByTestId('tepsi-tile-1'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('secili tile i isaretler', async () => {
    await render(
      <TilePicker
        tray={tray}
        selectedIndex={2}
        onSelect={jest.fn()}
        tileSize={44}
        testID="tepsi"
      />,
    );

    expect(screen.getByTestId('tepsi-tile-2')).toBeOnTheScreen();
    const buttons = screen.getAllByRole('button');
    const selected = buttons.filter(
      (b) => (b.props.accessibilityState as { selected?: boolean } | undefined)?.selected === true,
    );
    expect(selected).toHaveLength(1);
  });

  it('secili tile in ipucu secimi kaldirmayi anlatir', async () => {
    await render(<TilePicker tray={tray} selectedIndex={0} onSelect={jest.fn()} tileSize={44} />);

    expect(screen.getByLabelText(getTileDefinition(A).nameTr)).toHaveProp(
      'accessibilityHint',
      'Seçili. Seçimi kaldırmak için tekrar dokun.',
    );
  });

  it('bos tray de cokmez', async () => {
    await render(
      <TilePicker tray={[]} selectedIndex={null} onSelect={jest.fn()} tileSize={44} testID="t" />,
    );
    expect(screen.getByTestId('t')).toBeOnTheScreen();
  });
});
