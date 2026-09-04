import { render, screen } from '@testing-library/react-native';

import SettingsScreen from '../settings';

describe('SettingsScreen', () => {
  it('baslik gosterir', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText('Ayarlar')).toBeOnTheScreen();
  });

  it('basligi ekran okuyucuya baslik olarak bildirir', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByRole('header', { name: 'Ayarlar' })).toBeOnTheScreen();
  });

  it('yer tutucu metni tipografik kesme isareti kullanir', async () => {
    await render(<SettingsScreen />);
    const hint = screen.getByText(/Ses ve titreşim ayarları/);
    expect(hint).toBeOnTheScreen();
    // U+2019 (’) -- duz apostrof (') react/no-unescaped-entities tetikler
    // ve Turkce tipografide yanlistir.
    expect(hint.props.children).toContain('’');
  });
});
