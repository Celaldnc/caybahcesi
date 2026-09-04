import { render } from '@testing-library/react-native';

import { Palette } from '@/constants/colors';

import Root from '../+html';

// jest.mock cagrilari babel tarafindan TUM import'larin uzerine hoist edilir,
// bu yuzden import'u yukarida tutmak guvenli (import/first kurali da memnun).
jest.mock('expo-router/html', () => ({
  ScrollViewStyleReset: function ScrollViewStyleReset() {
    return null;
  },
}));

/**
 * +html.tsx yalnizca web'de, statik render sirasinda Node.js icinde calisir.
 * DOM'a erisimi yoktur, dolayisiyla saf bir React agaci olarak test edilebilir.
 */
describe('+html Root', () => {
  const renderRoot = async () => {
    const view = await render(<Root>{null}</Root>);
    return view.toJSON();
  };

  it('sayfa dilini Turkce olarak bildirir (WCAG 3.1.1)', async () => {
    const tree = await renderRoot();
    // lang="en" birakilsaydi ekran okuyucu "Çay Bahçesi"yi Ingilizce
    // telaffuz motoruyla okurdu.
    expect(JSON.stringify(tree)).toContain('"lang":"tr"');
  });

  it('ilk boya renklerini paletten alir (sabit #fff/#000 degil)', async () => {
    const tree = await renderRoot();
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain(Palette.krem);
    expect(serialized).toContain(Palette.gece);
  });

  it('koyu mod icin medya sorgusu tanimlar', async () => {
    const tree = await renderRoot();
    expect(JSON.stringify(tree)).toContain('prefers-color-scheme: dark');
  });

  it('viewport meta etiketi icerir', async () => {
    const tree = await renderRoot();
    expect(JSON.stringify(tree)).toContain('width=device-width');
  });
});
