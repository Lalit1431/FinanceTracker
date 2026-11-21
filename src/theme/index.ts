import { useTheme } from 'react-native-paper';
import { LightTheme, AppTheme } from './LightTheme';
import { DarkTheme } from './DarkTheme';

export { LightTheme, DarkTheme, AppTheme };

export const useAppTheme = (): AppTheme => {
  return useTheme() as AppTheme;
};
