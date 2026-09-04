import { render, screen } from '@testing-library/react-native';

import { SCREEN_CONTENT_TEST_ID, Screen } from '../Screen';
import { Text } from '../Themed';

const centeredStyle = expect.arrayContaining([
  expect.objectContaining({ justifyContent: 'center' }),
]);

describe('Screen', () => {
  it('cocuklarini ekrana basar', async () => {
    await render(
      <Screen>
        <Text>Çay Bahçesi</Text>
      </Screen>,
    );
    expect(screen.getByText('Çay Bahçesi')).toBeOnTheScreen();
  });

  it('varsayilan olarak icerigi ortalar', async () => {
    await render(
      <Screen>
        <Text>içerik</Text>
      </Screen>,
    );
    expect(screen.getByTestId(SCREEN_CONTENT_TEST_ID)).toHaveProp(
      'contentContainerStyle',
      centeredStyle,
    );
  });

  it('centered=false verilince ortalamaz (oyun tahtasi duzeni)', async () => {
    await render(
      <Screen centered={false}>
        <Text>içerik</Text>
      </Screen>,
    );
    expect(screen.getByTestId(SCREEN_CONTENT_TEST_ID)).not.toHaveProp(
      'contentContainerStyle',
      centeredStyle,
    );
  });

  it('buyuk yazi tipi olceginde icerige ulasilabilsin diye kaydirilabilirdir', async () => {
    // WCAG 1.4.4: sabit "flex:1 + center" duzeninde tasan icerik erisilemez olur.
    await render(
      <Screen>
        <Text>içerik</Text>
      </Screen>,
    );
    expect(screen.getByTestId(SCREEN_CONTENT_TEST_ID)).toBeOnTheScreen();
  });

  it('testID kok kapsayiciya uygulanir', async () => {
    await render(
      <Screen testID="ayarlar-ekrani">
        <Text>içerik</Text>
      </Screen>,
    );
    expect(screen.getByTestId('ayarlar-ekrani')).toBeOnTheScreen();
  });
});
