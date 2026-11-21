import { MD3DarkTheme } from 'react-native-paper';
import { AppTheme } from './LightTheme';

export const DarkTheme: AppTheme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    // Brand & Main Palette
    primary: '#90CAF9', // Light crisp blue for night contrast
    onPrimary: '#0D47A1',
    primaryContainer: '#1565C0',
    onPrimaryContainer: '#E3F2FD',

    secondary: '#81D4FA',
    onSecondary: '#01579B',
    secondaryContainer: '#0288D1',
    onSecondaryContainer: '#E1F5FE',

    tertiary: '#80DEEA',
    onTertiary: '#006064',
    tertiaryContainer: '#00838F',
    onTertiaryContainer: '#E0F7FA',

    // Background & Surfaces (Night Mode - Navy Deep)
    background: '#0A0E1A', // Deep navy black
    onBackground: '#E2E8F0',
    surface: '#111827', // Rich navy surface
    onSurface: '#F1F5F9',
    surfaceVariant: '#1A2436', // Slightly elevated navy
    onSurfaceVariant: '#94A3B8',

    outline: '#2D3748',
    outlineVariant: '#1E293B',

    // Financial Status Colors
    income: '#64B5F6',
    incomeContainer: '#0D274D',
    expense: '#EF5350',
    expenseContainer: '#4D1212',
    savings: '#81C784',
    savingsContainer: '#133D18',

    budgetOk: '#81C784',
    budgetWarn: '#FFB74D',
    budgetOver: '#EF5350',

    // Navigation & Tabs
    tabActive: '#90CAF9',
    tabInactive: '#64748B',
    tabBackground: '#111827',
    cardBorder: '#1E293B',
    statusBar: '#0A0E1A',
  },
};
