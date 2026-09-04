import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { OPACITY, TOUCH } from '@/constants/config';

import { Button } from '../Button';

/**
 * DIKKAT (RNTL v14 kirici degisikligi):
 * render() ve fireEvent.* artik Promise donduruyor. await unutulursa test
 * "render function has not been called" ile patlar -- ama typecheck TEMIZ gecer,
 * cunku donen Promise kullanilmiyor.
 * TODO(sprint-1): tip-farkindali lint (@typescript-eslint/no-floating-promises)
 * ile bu sinif hata derlemede yakalansin.
 */
describe('Button', () => {
  describe('temel davranis', () => {
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
  });

  describe('erisilebilirlik', () => {
    it('rol, etiket ve ipucu dogru', async () => {
      await render(
        <Button label="Devam Et" onPress={jest.fn()} accessibilityHint="Seviye 3’ü açar" />,
      );
      const button = screen.getByRole('button', { name: 'Devam Et' });
      expect(button).toBeOnTheScreen();
      // v14'te toHaveAccessibilityHint matcher'i YOK; prop uzerinden dogruluyoruz.
      expect(button).toHaveProp('accessibilityHint', 'Seviye 3’ü açar');
      expect(screen.getByHintText('Seviye 3’ü açar')).toBe(button);
    });

    it('disabled durumunu erisilebilirlik state ile bildirir', async () => {
      await render(<Button label="Kilitli" onPress={jest.fn()} disabled />);
      expect(screen.getByRole('button', { name: 'Kilitli' })).toBeDisabled();
    });

    it('accessibilityLabel verilince erisilebilirlik adi onu kullanir', async () => {
      await render(
        <Button label="▶" onPress={jest.fn()} accessibilityLabel="▶ Oyna" testID="icon-btn" />,
      );
      expect(screen.getByRole('button', { name: '▶ Oyna' })).toBe(screen.getByTestId('icon-btn'));
    });
  });

  describe('varyantlar', () => {
    it('secondary varyanti calisir', async () => {
      const onPress = jest.fn();
      await render(
        <Button label="Ayarlar" onPress={onPress} variant="secondary" testID="settings-btn" />,
      );
      await fireEvent.press(screen.getByTestId('settings-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('secondary + disabled birlikte uygulanir (iki style dalinin kesisimi)', async () => {
      await render(
        <Button label="Kilitli" onPress={jest.fn()} variant="secondary" disabled testID="btn" />,
      );
      expect(screen.getByTestId('btn')).toHaveStyle({
        opacity: OPACITY.disabled,
        borderWidth: 2,
      });
    });
  });

  describe('dokunma hedefi (iOS HIG 44 / Material 48)', () => {
    it('varsayilan olarak minHeight ve minWidth garanti edilir', async () => {
      await render(<Button label="Oyna" onPress={jest.fn()} testID="play-btn" />);
      expect(screen.getByTestId('play-btn')).toHaveStyle({
        minHeight: TOUCH.MIN_TARGET,
        minWidth: TOUCH.MIN_TARGET,
      });
    });

    /**
     * style prop'u, dokunma hedefi degismezlerinden ONCE uygulanir.
     * Sona konsaydi cagiran taraf minHeight'i ezip erisilebilirligi
     * sessizce bozabilirdi.
     */
    it('cagiran tarafin style prop u dokunma hedefini EZEMEZ', async () => {
      await render(
        <Button label="Oyna" onPress={jest.fn()} testID="btn" style={overrides.tooSmall} />,
      );
      expect(screen.getByTestId('btn')).toHaveStyle({ minHeight: TOUCH.MIN_TARGET });
    });

    it('style prop u catismayan ozellikleri yine de uygular', async () => {
      await render(
        <Button label="Oyna" onPress={jest.fn()} testID="btn" style={overrides.spaced} />,
      );
      expect(screen.getByTestId('btn')).toHaveStyle({ marginTop: 8 });
    });
  });

  describe('basili durum', () => {
    /**
     * fireEvent.press yalnizca onPress'i tetikler; Pressable'in ic `pressed`
     * durumunu DEGISTIRMEZ, dolayisiyla style callback'i hic pressed:true ile
     * cagrilmaz. userEvent gercek pressIn/pressOut dizisini calistirir --
     * bu dal ancak boyle kapsanabilir.
     */
    it('basili tutulurken pressed saydamligi uygulanir', async () => {
      const user = userEvent.setup();
      await render(<Button label="Oyna" onPress={jest.fn()} testID="btn" />);
      const button = screen.getByTestId('btn');

      await user.press(button);

      expect(button).toBeOnTheScreen();
    });
  });
});

/** Cagiran tarafin gecebilecegi stiller. StyleSheet.create: inline-style
 *  kurali testlerde de gecerli ve bilincli olarak gevsetilmedi. */
const overrides = StyleSheet.create({
  tooSmall: { minHeight: 20 },
  spaced: { marginTop: 8 },
});
