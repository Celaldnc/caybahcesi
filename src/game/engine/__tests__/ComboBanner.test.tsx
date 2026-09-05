import { render, screen } from '@testing-library/react-native';

import { ComboBanner } from '../ComboBanner';

/**
 * Combo banner'i.
 *
 * Sprint 2 kalite kapisina kadar bu bilesenin HIC TESTI YOKTU. Mutasyon
 * denemesinde iki ayri hata sessizce hayatta kaldi: esik `<= 1` yerine
 * `< 1` yazildiginda (combo 1'de banner acilir, "combo" sozcugu anlamini
 * yitirir) ve `accessibilityLiveRegion` tamamen silindiginde.
 */
describe('ComboBanner', () => {
  it('combo yokken hicbir sey cizmez', async () => {
    await render(<ComboBanner combo={0} testID="c" />);
    expect(screen.queryByTestId('c')).toBeNull();
  });

  /**
   * SINIR: carpan 1 "zincir" degildir -- her eslesmede banner cikarsa
   * kutlama siradanlasir. `combo <= 1` esigini pinler.
   */
  it('carpan 1 iken gorunmez (esik)', async () => {
    await render(<ComboBanner combo={1} testID="c" />);
    expect(screen.queryByTestId('c')).toBeNull();
  });

  it('carpan 2 den itibaren gorunur', async () => {
    await render(<ComboBanner combo={2} testID="c" />);
    expect(screen.getByTestId('c')).toBeOnTheScreen();
  });

  it('carpani metne ve etikete yazar', async () => {
    await render(<ComboBanner combo={3} testID="c" />);
    expect(screen.getByText('Combo x3!')).toBeOnTheScreen();
    expect(screen.getByLabelText('Combo x3!')).toBeOnTheScreen();
  });

  /**
   * DOKUNUS YUTMAMALI -- bu bilesenin en pahali hatasiydi.
   *
   * Banner `board` kapsayicisinda mutlak konumlu ve `SlotRow`'un tam
   * ustune dusuyor (~160x45pt). RN'de dokunma en ustteki hit-test'i gecen
   * View'e gider, altta kalan KARDESE dusmez. `pointerEvents` olmadigi
   * icin banner gorunurken satirin ortasindaki ekleme konumlari
   * tiklanamaz hale geliyordu -- ustelik banner'i kapatmanin tek yolu
   * hamle yapmakti. Uc ajan bunu birbirinden bagimsiz buldu.
   */
  it('altindaki dokunuslari bloklamaz', async () => {
    await render(<ComboBanner combo={2} testID="c" />);
    expect(screen.getByTestId('c')).toHaveProp('pointerEvents', 'none');
  });

  /** Ekran okuyucu banner'i goremez; duyurulmali. */
  it('ekran okuyucuya canli bolge olarak sunulur', async () => {
    await render(<ComboBanner combo={2} testID="c" />);
    const banner = screen.getByTestId('c');
    expect(banner).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(banner).toHaveProp('accessibilityRole', 'alert');
  });
});
