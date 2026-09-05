import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { ORDER } from '@/constants/config';
import { getTileDefinition } from '@/game/core/tiles';
import type { Customer, TileId } from '@/game/core/types';

import { OrderCard, TableRow, orderLabel } from '../OrderCard';

const CAY: TileId = 'cay-ince-belli';
const KAHVE: TileId = 'kahve-fincan';

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'm1',
    order: [{ tileId: CAY, required: 2, served: 0 }],
    patience: 20,
    maxPatience: 20,
    ...overrides,
  };
}

/**
 * Siparis karti.
 *
 * Sprint 2'nin dersi burada da gecerli: bir kanal ekranda GORUNMUYORSA
 * test onu koruyamaz. Kart uc gorsel kanal tasiyor (tile, sayi, cubuk) ve
 * dorduncusu ekran okuyucu etiketi.
 */
describe('orderLabel', () => {
  it('siparisi ve kalan sabri tek cumlede ozetler', () => {
    const label = orderLabel(customer());
    expect(label).toContain(getTileDefinition(CAY).nameTr);
    expect(label).toContain('0 bölü 2');
    expect(label).toContain('20 hamle');
  });

  it('tamamlanan satiri tamam diye okur', () => {
    const label = orderLabel(customer({ order: [{ tileId: CAY, required: 1, served: 1 }] }));
    expect(label).toContain('tamam');
    expect(label).not.toContain('bölü');
  });

  it('birden fazla satiri birlestirir', () => {
    const label = orderLabel(
      customer({
        order: [
          { tileId: CAY, required: 1, served: 0 },
          { tileId: KAHVE, required: 1, served: 0 },
        ],
      }),
    );
    expect(label).toContain(getTileDefinition(CAY).nameTr);
    expect(label).toContain(getTileDefinition(KAHVE).nameTr);
  });
});

describe('OrderCard', () => {
  it('siparisi ekran okuyucuya tek eleman olarak sunar', async () => {
    await render(<OrderCard customer={customer()} tileSize={24} testID="k" />);
    expect(screen.getByLabelText(orderLabel(customer()))).toBeOnTheScreen();
  });

  it('teslim durumunu yazili gosterir', async () => {
    await render(<OrderCard customer={customer()} tileSize={24} testID="k" />);
    expect(screen.getByText('0/2', { includeHiddenElements: true })).toBeTruthy();
  });

  /**
   * SABIR CUBUGU GENISLIKLE KODLANIR, renkle degil.
   *
   * Kirmizi/yesil bir cubuk WCAG 1.4.1 ihlali olurdu (bilgi yalnizca
   * renkte). Genislik birincil kanal; ayrica sayi da yazili.
   */
  it('sabir cubugu kalan orana gore kisalir', async () => {
    const half = customer({ patience: 10, maxPatience: 20 });
    await render(<OrderCard customer={half} tileSize={24} testID="k" />);

    const fill = StyleSheet.flatten(screen.getByTestId('k-sabir').props.style as ViewStyle) as {
      width: string;
    };

    expect(fill.width).toBe('50%');
  });

  it('sabir bitince cubuk sifirlanir', async () => {
    await render(
      <OrderCard customer={customer({ patience: 0, maxPatience: 20 })} tileSize={24} testID="k" />,
    );
    const fill = StyleSheet.flatten(screen.getByTestId('k-sabir').props.style as ViewStyle) as {
      width: string;
    };

    expect(fill.width).toBe('0%');
  });

  /** Kalan hamle YAZILI da olmali: cubuk tek kanal kalmasin. */
  it('kalan hamleyi sayiyla da yazar', async () => {
    await render(<OrderCard customer={customer({ patience: 7 })} tileSize={24} testID="k" />);
    expect(screen.getByText('7 hamle', { includeHiddenElements: true })).toBeTruthy();
  });

  it('acil durumda farkli vurgu rengi kullanir', async () => {
    const calm = await render(
      <OrderCard
        customer={customer({ patience: ORDER.DEMAND_PRESSURE + 5 })}
        tileSize={24}
        testID="k"
      />,
    );
    const calmColor = (
      StyleSheet.flatten(calm.getByTestId('k-sabir').props.style as ViewStyle) as {
        backgroundColor: string;
      }
    ).backgroundColor;
    await calm.unmount();

    const urgent = await render(
      <OrderCard
        customer={customer({ patience: ORDER.DEMAND_PRESSURE })}
        tileSize={24}
        testID="k"
      />,
    );
    const urgentColor = (
      StyleSheet.flatten(urgent.getByTestId('k-sabir').props.style as ViewStyle) as {
        backgroundColor: string;
      }
    ).backgroundColor;

    expect(urgentColor).not.toBe(calmColor);
  });
});

describe('TableRow', () => {
  const three: readonly Customer[] = [
    customer({ id: 'a' }),
    customer({ id: 'b' }),
    customer({ id: 'c' }),
  ];

  it('her masayi cizer', async () => {
    await render(
      <TableRow customers={three} tileSize={24} armed={false} onPickTable={jest.fn()} />,
    );
    expect(screen.getByTestId('masa-0')).toBeOnTheScreen();
    expect(screen.getByTestId('masa-2')).toBeOnTheScreen();
  });

  /** Semaver kurulu DEGILKEN masalar buton degil: bos vaat verilmez. */
  it('semaver kurulu degilken masalar basilamaz', async () => {
    const onPickTable = jest.fn();
    await render(
      <TableRow customers={three} tileSize={24} armed={false} onPickTable={onPickTable} />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('semaver kuruluyken masaya basilinca indisi bildirir', async () => {
    const onPickTable = jest.fn();
    await render(<TableRow customers={three} tileSize={24} armed onPickTable={onPickTable} />);

    await fireEvent.press(screen.getByTestId('masa-1'));
    expect(onPickTable).toHaveBeenCalledWith(1);
  });

  /** Siparisi tamamlanmis masa hedef olamaz -- cevirecek bir sey yok. */
  it('tamamlanmis siparis hedef gosterilmez', async () => {
    const done: readonly Customer[] = [
      customer({ id: 'a', order: [{ tileId: CAY, required: 1, served: 1 }] }),
    ];
    const onPickTable = jest.fn();
    await render(<TableRow customers={done} tileSize={24} armed onPickTable={onPickTable} />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
