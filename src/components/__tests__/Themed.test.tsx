import { render, screen } from '@testing-library/react-native';

import Colors from '@/constants/colors';

import { Text, View } from '../Themed';
import { useColorScheme } from '../useColorScheme';

jest.mock('../useColorScheme');
const mockedUseColorScheme = jest.mocked(useColorScheme);

describe('Themed', () => {
  describe('Text', () => {
    it('acik temada acik tema metin rengini kullanir', async () => {
      mockedUseColorScheme.mockReturnValue('light');
      await render(<Text testID="t">Cay</Text>);
      expect(screen.getByTestId('t')).toHaveStyle({ color: Colors.light.text });
    });

    it('koyu temada koyu tema metin rengini kullanir', async () => {
      mockedUseColorScheme.mockReturnValue('dark');
      await render(<Text testID="t">Cay</Text>);
      expect(screen.getByTestId('t')).toHaveStyle({ color: Colors.dark.text });
    });

    it('lightColor prop u temayi ezer', async () => {
      mockedUseColorScheme.mockReturnValue('light');
      await render(
        <Text testID="t" lightColor="#123456">
          Cay
        </Text>,
      );
      expect(screen.getByTestId('t')).toHaveStyle({ color: '#123456' });
    });

    it('darkColor prop u koyu temada temayi ezer', async () => {
      mockedUseColorScheme.mockReturnValue('dark');
      await render(
        <Text testID="t" darkColor="#abcdef">
          Cay
        </Text>,
      );
      expect(screen.getByTestId('t')).toHaveStyle({ color: '#abcdef' });
    });
  });

  describe('View', () => {
    it('acik temada acik tema zemin rengini kullanir', async () => {
      mockedUseColorScheme.mockReturnValue('light');
      await render(<View testID="v" />);
      expect(screen.getByTestId('v')).toHaveStyle({ backgroundColor: Colors.light.background });
    });

    it('koyu temada koyu tema zemin rengini kullanir', async () => {
      mockedUseColorScheme.mockReturnValue('dark');
      await render(<View testID="v" />);
      expect(screen.getByTestId('v')).toHaveStyle({ backgroundColor: Colors.dark.background });
    });

    it('darkColor prop u zemini ezer', async () => {
      mockedUseColorScheme.mockReturnValue('dark');
      await render(<View testID="v" darkColor="#000123" />);
      expect(screen.getByTestId('v')).toHaveStyle({ backgroundColor: '#000123' });
    });
  });
});
