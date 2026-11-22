import React, { useEffect, useState } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import {
  NavigationContainer,
  DefaultTheme as NavLightTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LightTheme, DarkTheme } from './src/theme';
import { useThemeStore } from './src/store/themeStore';
import { initDatabase } from './src/database/database';
import { settingsRepository } from './src/database/settingsRepository';
import { useFinanceStore } from './src/store/financeStore';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LockScreen } from './src/screens/AuthLock/LockScreen';
import { authService } from './src/services/authService';
import { ThemeMode } from './src/types';

export default function App() {
  const systemColorScheme = useColorScheme();
  const { mode, setMode } = useThemeStore();
  const { loadInitialData } = useFinanceStore();
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    try {
      // 1. Initialize SQLite database & migrations & seeds
      initDatabase();

      // 2. Load stored theme preference
      const savedThemeMode = settingsRepository.get('theme_mode', 'system') as ThemeMode;
      setMode(savedThemeMode);

      // 3. Load initial financial state
      loadInitialData();

      // 4. Check biometric security setting
      const lockSetting = settingsRepository.get('app_lock', 'none');
      if (lockSetting === 'biometric') {
        setIsLocked(true);
        // Prompt unlock automatically on startup
        authService.authenticate().then((unlocked) => {
          if (unlocked) {
            setIsLocked(false);
          }
        });
      }
    } catch (err) {
      console.error('Failed to initialize app state:', err);
    } finally {
      setIsReady(true);
    }
  }, []);

  // Determine active theme based on user setting or device system
  const effectiveThemeMode =
    mode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : mode;

  const paperTheme = effectiveThemeMode === 'dark' ? DarkTheme : LightTheme;

  const navTheme = effectiveThemeMode === 'dark'
    ? {
        ...NavDarkTheme,
        colors: {
          ...NavDarkTheme.colors,
          primary: paperTheme.colors.primary,
          background: paperTheme.colors.background,
          card: paperTheme.colors.surface,
          text: paperTheme.colors.onSurface,
          border: paperTheme.colors.cardBorder,
        },
      }
    : {
        ...NavLightTheme,
        colors: {
          ...NavLightTheme.colors,
          primary: paperTheme.colors.primary,
          background: paperTheme.colors.background,
          card: paperTheme.colors.surface,
          text: paperTheme.colors.onSurface,
          border: paperTheme.colors.cardBorder,
        },
      };

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1565C0',
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <StatusBar style={effectiveThemeMode === 'dark' ? 'light' : 'dark'} />
        {isLocked ? (
          <LockScreen onUnlock={() => setIsLocked(false)} />
        ) : (
          <NavigationContainer theme={navTheme}>
            <AppNavigator />
          </NavigationContainer>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
