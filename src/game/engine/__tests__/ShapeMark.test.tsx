import { render } from '@testing-library/react-native';

import { FAMILY_SHAPE } from '@/game/core/tiles';
import type { TileShape } from '@/game/core/types';

import { ShapeMark } from '../ShapeMark';

/**
 * FORM, projenin BIRINCIL erisilebilirlik kanalidir.
 *
 * `tileColors.ts` acikca yaziyor: "Renk IKINCIL kanaldir, tek kanal degil."
 * Garanti su zincire dayaniyor: bir havuzda her aileden en fazla bir tile
 * bulunur (round-robin) + aile <-> form bijeksiyonu -> ekranda ayni anda
 * bulunan her tile FARKLI FORMDADIR.
 *
 * SPRINT 2 KALITE KAPISI BU ZINCIRIN SON HALKASININ KORUMASIZ OLDUGUNU
 * BULDU. Bijeksiyon `tiles.test.ts`'te VERI katmaninda test ediliydi, ama
 * `ShapeMark`'in gercekten FARKLI SEYLER CIZDIGINI hicbir test iddia
 * etmiyordu: mevcut testler yalnizca "t-shape testID'si var mi" ve "murekkep
 * rengi dogru mu" diye bakiyordu. Mutasyon testinde `switch` sabitlenip HER
 * TILE DAIRE cizildiginde 414 testin hepsi yesil geciyordu.
 *
 * CLAUDE.md: "Testi kodun yapisina degil, oyunun gercegine gore yaz."
 * Oyunun gercegi ekranda gorunen sekildir, veri tablosundaki string degil.
 */

const ALL_SHAPES = Object.values(FAMILY_SHAPE) as readonly TileShape[];

/**
 * Bir formun cizim imzasi: tum alt agacin serilestirilmis hali.
 *
 * `await` SART: RNTL v14'te `render` async. Unutulursa test
 * "render function has not been called" ile patlar -- ama typecheck TEMIZ
 * gecer, cunku donen Promise kullanilmiyor. (CLAUDE.md'de belgeli tuzak;
 * bu dosyayi yazarken tekrar dusuldu.)
 */
async function shapeSignature(shape: TileShape): Promise<string> {
  const view = await render(<ShapeMark shape={shape} size={40} color="#123456" testID="s" />);
  const json = JSON.stringify(view.toJSON());
  await view.unmount();
  return json;
}

describe('ShapeMark', () => {
  it('9 aile 9 farkli form kullanir (bijeksiyon)', () => {
    expect(new Set(ALL_SHAPES).size).toBe(ALL_SHAPES.length);
  });

  /**
   * ASIL IDDIA. Her formun cizim imzasi digerlerinden FARKLI olmali --
   * iki form ayni pikselleri uretiyorsa renk korlugu kanali fiilen yoktur.
   */
  it('her form farkli bir cizim uretir', async () => {
    const signatures = new Map<string, TileShape>();

    for (const shape of ALL_SHAPES) {
      const signature = await shapeSignature(shape);
      const clash = signatures.get(signature);

      // Cakisma varsa hangi ikili oldugunu SOYLE -- "false !== true" degil.
      expect(clash === undefined ? null : [clash, shape]).toBeNull();
      signatures.set(signature, shape);
    }

    expect(signatures.size).toBe(ALL_SHAPES.length);
  });

  /**
   * DENETIMIN YAPILDIGINI da iddia et (CLAUDE.md: sayac sifirdan baslayan
   * test vakumdur). Yukaridaki dongu hic donmeseydi `signatures.size` 0
   * olurdu ve `toBe(ALL_SHAPES.length)` bunu yakalar; burada ayrica
   * kumenin bos olmadigini ve beklenen buyuklukte oldugunu sabitliyoruz.
   */
  it('9 formun tamami denetlenir', () => {
    expect(ALL_SHAPES.length).toBe(9);
  });

  it('her form verilen murekkep rengini tasir', async () => {
    for (const shape of ALL_SHAPES) {
      const view = await render(<ShapeMark shape={shape} size={40} color="#abcdef" testID="s" />);
      expect(JSON.stringify(view.toJSON()).toLowerCase()).toContain('#abcdef');
      await view.unmount();
    }
  });

  /**
   * Boyut gercekten kullanilmali: sabitlenirse dar ekranda form tile'in
   * disina tasar ya da gorunmez kalir.
   */
  it('cizim boyutu size prop una baglidir', async () => {
    for (const shape of ALL_SHAPES) {
      const small = await render(<ShapeMark shape={shape} size={20} color="#123456" />);
      const smallJson = JSON.stringify(small.toJSON());
      await small.unmount();

      const large = await render(<ShapeMark shape={shape} size={60} color="#123456" />);
      const largeJson = JSON.stringify(large.toJSON());
      await large.unmount();

      expect(smallJson).not.toBe(largeJson);
    }
  });

  it('testID verilmezse kok tutamak tasimaz', async () => {
    const view = await render(<ShapeMark shape="daire" size={40} color="#123456" />);
    expect(view.queryByTestId('s')).toBeNull();
    await view.unmount();
  });
});
