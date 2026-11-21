import { MD3LightTheme } from 'react-native-paper';

export const LightTheme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    // Brand & Main Palette
    primary: '#1565C0', // Deep Royal Blue
    onPrimary: '#FFFFFF',
    primaryContainer: '#E3F2FD', // Soft light blue tint
    onPrimaryContainer: '#0D47A1',

    secondary: '#0288D1', // Sky/Vibrant Blue
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E1F5FE',
    onSecondaryContainer: '#01579B',

    tertiary: '#00838F',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#E0F7FA',
    onTertiaryContainer: '#006064',

    // Background & Surfaces
    background: '#F5F8FF', // Elegant off-white with subtle blue tone
    onBackground: '#0D1B2E', // Deep charcoal/navy text
    surface: '#FFFFFF', // Crisp white cards and inputs
    onSurface: '#0D1B2E',
    surfaceVariant: '#EEF4FF', // Soft blue card/row background
    onSurfaceVariant: '#455A64', // Medium slate secondary text

    outline: '#CFD8DC', // Border color
    outlineVariant: '#ECEFF1',

    // Financial Status Colors
    income: '#1976D2',
    incomeContainer: '#E3F2FD',
    expense: '#D32F2F',
    expenseContainer: '#FFEBEE',
    savings: '#2E7D32',
    savingsContainer: '#E8F5E9',

    budgetOk: '#388E3C',
    budgetWarn: '#F57C00',
    budgetOver: '#D32F2F',

    // Navigation & Tabs
    tabActive: '#1565C0',
    tabInactive: '#78909C',
    tabBackground: '#FFFFFF',
    cardBorder: '#E0E7FF',
    statusBar: '#0D47A1',
  },
};

export type AppTheme = typeof LightTheme;
