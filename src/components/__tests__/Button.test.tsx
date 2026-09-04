import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '../Button';

/**
 * DIKKAT (RNTL v14 kirici degisikligi):
 * render() ve fireEvent.* artik Promise donduruyor. await unutulursa test
 * "render function has not been called" ile patlar -- ama typecheck TEMIZ gecer,
 * cunku donen Promise kullanilmiyor. Sprint 1'de tip-farkindali lint ile
 * (@typescript-eslint/no-floating-promises) bu sinif hata derlemede yakalanacak.
 */
describe('Button', () => {
  it('etiketi ekrana basar', async () => {
    await render(<Button label="Oyna" onPress={jest.fn()} />);
    expect(screen.getByText('Oyna')).toBeOnTheScreen();
  });

  it('basilinca onPress cagrilir', async () => {
    const onPress = jest.fn();
    await render(<Button label="Oyna" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled iken onPress cagrilmaz', async () => {
    const onPress = jest.fn();
    await render(<Button label="Oyna" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('erisilebilirlik rolu, etiketi ve ipucu dogru', async () => {
    await render(
      <Button label="Devam Et" onPress={jest.fn()} accessibilityHint="Seviye 3'u acar" />,
    );
    // v14'te toHaveAccessibilityHint matcher'i YOK; prop uzerinden dogruluyoruz.
    const button = screen.getByRole('button', { name: 'Devam Et' });
    expect(button).toBeOnTheScreen();
    expect(button).toHaveProp('accessibilityHint', "Seviye 3'u acar");
    // Ekran okuyucu ipucuyla da bulunabilmeli:
    expect(screen.getByHintText("Seviye 3'u acar")).toBe(button);
  });

  it('disabled durumunu erisilebilirlik state ile bildirir', async () => {
    await render(<Button label="Kilitli" onPress={jest.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Kilitli' })).toBeDisabled();
  });

  it('secondary varyanti da calisir (her iki dal test edildi)', async () => {
    const onPress = jest.fn();
    await render(
      <Button label="Ayarlar" onPress={onPress} variant="secondary" testID="settings-btn" />,
    );
    await fireEvent.press(screen.getByTestId('settings-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dokunma hedefi en az 48 birim yuksekliginde (HIG/Material)', async () => {
    await render(<Button label="Oyna" onPress={jest.fn()} testID="play-btn" />);
    expect(screen.getByTestId('play-btn')).toHaveStyle({ minHeight: 48 });
  });
});
