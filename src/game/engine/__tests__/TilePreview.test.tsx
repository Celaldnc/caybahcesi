import { fireEvent, render, screen } from '@testing-library/react-native';

import { TILE_UI, TOUCH } from '@/constants/config';
import { ALL_TILE_IDS, createTile, getTileDefinition } from '@/game/core/tiles';
import type { TileId } from '@/game/core/types';
import { TILE_BORDER_WIDTH, TILE_COLOR, inkFor } from '@/game/data/tileColors';

import { TilePreview } from '../TilePreview';

const A: TileId = 'cay-ince-belli';

describe('TilePreview', () => {
  it('tile in Turkce adini erisilebilirlik etiketi olarak kullanir', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} />);
    expect(screen.getByLabelText(getTileDefinition(A).nameTr)).toBeOnTheScreen();
  });

  it('onPress verilmezse buton degil, gorsel olarak sunulur', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('image')).toBeOnTheScreen();
  });

  it('onPress verilince buton olur ve dokunmayi iletir', async () => {
    const onPress = jest.fn();
    await render(<TilePreview tile={createTile(A)} size={40} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('secili durumu ekran okuyucuya bildirir', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} selected onPress={jest.fn()} />);
    expect(screen.getByRole('button', { selected: true })).toBeOnTheScreen();
  });

  /**
   * SECIM GORSEL OLARAK DA belli olmali: `accessibilityState` goren
   * oyuncuya hicbir sey soylemez. Mutasyon testi bu iddiayi olmadan
   * `styles.selected`'in tamamen kaldirilmasini yakalamiyordu.
   */
  it('secili tile buyutulerek isaretlenir', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} selected testID="t" />);
    expect(screen.getByTestId('t')).toHaveStyle({
      transform: [{ scale: TILE_UI.SELECTED_SCALE }],
    });
  });

  /**
   * DEVRE DISI durum ekran okuyucuya BILDIRILMELI. Sprint 2'de tepsi oyun
   * bittikten sonra da basilabilir goruntudeydi: dokunus haptik titresim
   * veriyor, store sessizce reddediyordu -- yerine getirilmeyen vaat.
   */
  it('devre disi tile dokunma almaz ve durumu bildirilir', async () => {
    const onPress = jest.fn();
    await render(<TilePreview tile={createTile(A)} size={40} disabled onPress={onPress} />);

    const button = screen.getByRole('button');
    expect(button).toHaveProp('accessibilityState', expect.objectContaining({ disabled: true }));

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  /**
   * KENARLIK PAZARLIK EDILEMEZ: aciklik merdiveninin iki ucu kendi
   * renginde bir zemine karisir (en acik tile acik temada, en koyu tile
   * koyu temada). Kenarlik silueti zeminden ayirir; 0 olursa tile
   * kaybolur. Mutasyon testinde `borderWidth: 0` hicbir testi kirmiyordu.
   */
  it('tile her zaman kenarlikli cizilir', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} testID="t" />);
    expect(screen.getByTestId('t')).toHaveStyle({ borderWidth: TILE_BORDER_WIDTH });
  });

  /**
   * GLIF FONT OLCEKLEMESINE UYMAZ -- ve bu erisilebilirlik GEREGIDIR.
   * Varsayilan `allowFontScaling` ile iOS AX5 (~3x) olceginde 26pt tile'da
   * 34pt glif olusur, kirpilir ve ALTINDAKI ShapeMark'i kapatir: yaziyi
   * buyuten az goren kullanici tam da dusuk gorus icin tasarlanan birincil
   * form kanalini kaybeder.
   */
  it('glif font olceklemesini takip etmez', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} testID="t" />);
    // Glif erisilebilirlik agacindan gizli; sorgu bunu acikca istemeli.
    const glyph = screen.getByTestId('t-glif', { includeHiddenElements: true });
    expect(glyph).toHaveProp('allowFontScaling', false);
  });

  /**
   * DOKUNMA HEDEFI. Tile gorsel olarak 44pt'den kucuk olabilir (9 slot dar
   * ekrana sigmali); hedef `hitSlop` ile tamamlanir. Mutasyon testinde
   * `hitSlop` tamamen kaldirildiginda hicbir test kirilmiyordu -- yani
   * "24pt tile bile 48pt hedef sunar" iddiasi korumasizdi.
   */
  it('en kucuk tile bile dokunma esigini karsilar', async () => {
    const size = TILE_UI.MIN_SIZE;
    await render(<TilePreview tile={createTile(A)} size={size} onPress={jest.fn()} />);

    const slop = screen.getByRole('button').props.hitSlop as number;
    expect(size + 2 * slop).toBeGreaterThanOrEqual(TOUCH.MIN_TARGET);
  });

  it('tile in kendi rengini dolgu olarak kullanir', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} testID="t" />);
    expect(screen.getByTestId('t')).toHaveStyle({
      backgroundColor: TILE_COLOR[getTileDefinition(A).colorToken],
    });
  });

  /**
   * FORM, renk korlugu kanalinin tasiyicisi. Her tile'da bulunmali --
   * yoksa renk tek kanal kalir ve WCAG 1.4.1 ihlal edilir.
   */
  it('her tile form isareti cizer', async () => {
    for (const id of ALL_TILE_IDS) {
      // `screen` yerine render sonucunun kendi sorgusu: dongude birden fazla
      // agac olustugunda `screen` yalnizca sonuncuyu gosterir.
      const view = await render(<TilePreview tile={createTile(id)} size={40} testID="t" />);
      expect(view.getByTestId('t-shape')).toBeOnTheScreen();
      await view.unmount();
    }
  });

  it('form isareti okunabilir murekkep rengini kullanir', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} testID="t" />);
    const fill = TILE_COLOR[getTileDefinition(A).colorToken];
    const shape = screen.getByTestId('t-shape');

    // Form dolu ise `backgroundColor`, ucgen/halka ise kenarlik rengi tasir.
    // Renk karsilastirmasi BUYUK/kucuk harf duyarsiz: RN stil degerlerini
    // yazildigi gibi saklar, palet ise buyuk harfli hex kullaniyor.
    const style = JSON.stringify(shape.props.style).toLowerCase();
    expect(style).toContain(inkFor(fill).toLowerCase());
  });

  /**
   * Murekkep rengi formun KOKUNDE olmak zorunda degil: `capraz` formu rengi
   * iki cocuk cubuguna koyuyor. Bu yuzden ALT AGACIN tamamina bakiyoruz --
   * ilk yazimda yalnizca kok stiline bakmistim ve capraz form dusuyordu.
   */
  it('her tile in form isareti okunabilir murekkep rengi kullanir', async () => {
    for (const id of ALL_TILE_IDS) {
      const fill = TILE_COLOR[getTileDefinition(id).colorToken];
      const view = await render(<TilePreview tile={createTile(id)} size={40} testID="t" />);

      const subtree = JSON.stringify(view.toJSON()).toLowerCase();
      expect(subtree).toContain(inkFor(fill).toLowerCase());

      await view.unmount();
    }
  });

  /** Glif dekoratiftir; anlam zaten etikette. Ekran okuyucu iki kez okumasin. */
  it('emoji glifi ekran okuyucudan gizlenir', async () => {
    await render(<TilePreview tile={createTile(A)} size={40} />);

    // Gizli oldugu icin varsayilan sorgu onu BULMAMALI -- testin asil iddiasi bu.
    expect(screen.queryByText(getTileDefinition(A).glyph)).toBeNull();

    const glyph = screen.getByText(getTileDefinition(A).glyph, { includeHiddenElements: true });
    expect(glyph).toHaveProp('accessibilityElementsHidden', true);
    expect(glyph).toHaveProp('importantForAccessibility', 'no');
  });
});
