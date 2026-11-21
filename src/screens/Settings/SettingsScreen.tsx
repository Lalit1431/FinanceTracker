import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Divider, RadioButton, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { settingsRepository } from '../../database/settingsRepository';
import { authService } from '../../services/authService';
import { ThemeMode } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const { mode, setMode } = useThemeStore();

  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);

  useEffect(() => {
    const currentLock = settingsRepository.get('app_lock', 'none');
    setIsAppLockEnabled(currentLock === 'biometric');
  }, []);

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    settingsRepository.set('theme_mode', newMode);
  };

  const handleToggleLock = async (value: boolean) => {
    if (value) {
      const isAvailable = await authService.isBiometricAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Security Unavailable',
          'Biometrics or screen lock security is not configured on this device.'
        );
        return;
      }
      const authenticated = await authService.authenticate();
      if (authenticated) {
        setIsAppLockEnabled(true);
        settingsRepository.set('app_lock', 'biometric');
      }
    } else {
      setIsAppLockEnabled(false);
      settingsRepository.set('app_lock', 'none');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Theme Selection Section */}
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
        APPEARANCE & THEME
      </Text>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <RadioButton.Group
          onValueChange={(val) => handleThemeChange(val as ThemeMode)}
          value={mode}
        >
          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => handleThemeChange('light')}
          >
            <View style={styles.radioLabelRow}>
              <MaterialCommunityIcons
                name="white-balance-sunny"
                size={22}
                color={theme.colors.primary}
              />
              <View style={styles.radioTextWrapper}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  White / Blue (Light)
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Crisp white surfaces with deep royal blue accents
                </Text>
              </View>
            </View>
            <RadioButton.Android value="light" color={theme.colors.primary} />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => handleThemeChange('dark')}
          >
            <View style={styles.radioLabelRow}>
              <MaterialCommunityIcons
                name="weather-night"
                size={22}
                color={theme.colors.primary}
              />
              <View style={styles.radioTextWrapper}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  Night Mode (Dark)
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Deep midnight navy palette gentle on eyes in the dark
                </Text>
              </View>
            </View>
            <RadioButton.Android value="dark" color={theme.colors.primary} />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.radioRow}
            onPress={() => handleThemeChange('system')}
          >
            <View style={styles.radioLabelRow}>
              <MaterialCommunityIcons
                name="cellphone-cog"
                size={22}
                color={theme.colors.primary}
              />
              <View style={styles.radioTextWrapper}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  System Default
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Automatically follow your device's light/dark setting
                </Text>
              </View>
            </View>
            <RadioButton.Android value="system" color={theme.colors.primary} />
          </TouchableOpacity>
        </RadioButton.Group>
      </Surface>

      {/* Security & Access Section */}
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
        SECURITY & ACCESS
      </Text>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.switchRow}>
          <View style={styles.navLeft}>
            <View style={[styles.navIconBox, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="fingerprint" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                Biometric / Device Passcode Lock
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Require fingerprint or passcode upon opening app
              </Text>
            </View>
          </View>
          <Switch
            value={isAppLockEnabled}
            onValueChange={handleToggleLock}
            color={theme.colors.primary}
          />
        </View>
      </Surface>

      {/* Finance Management Section */}
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
        FINANCE CONFIGURATION
      </Text>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <SettingNavRow
          icon="shape-outline"
          title="Categories"
          subtitle="Manage Income and Expense custom categories"
          onPress={() => navigation.navigate('Categories')}
          theme={theme}
        />
        <Divider style={styles.divider} />

        <SettingNavRow
          icon="bank-outline"
          title="Accounts & Wallets"
          subtitle="Cash, Bank accounts, PhonePe/GPay, and Wallets"
          onPress={() => navigation.navigate('Accounts')}
          theme={theme}
        />
        <Divider style={styles.divider} />

        <SettingNavRow
          icon="bullseye-arrow"
          title="Monthly Budgets"
          subtitle="Set monthly spending limits per category"
          onPress={() => navigation.navigate('Budgets')}
          theme={theme}
        />
        <Divider style={styles.divider} />

        <SettingNavRow
          icon="database-sync-outline"
          title="Backup & Restore"
          subtitle="Export and restore local offline database"
          onPress={() => navigation.navigate('BackupRestore')}
          theme={theme}
        />
      </Surface>

      {/* Privacy & Guarantee Banner */}
      <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
        PRIVACY & DATA SECURITY
      </Text>
      <Surface
        style={[
          styles.privacyCard,
          {
            backgroundColor: theme.colors.primaryContainer,
            borderColor: theme.colors.primary,
          },
        ]}
      >
        <View style={styles.privacyHeader}>
          <MaterialCommunityIcons name="shield-lock-outline" size={24} color={theme.colors.primary} />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700', marginLeft: 8 }}
          >
            100% Offline & Private
          </Text>
        </View>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onPrimaryContainer, marginTop: 6, lineHeight: 18 }}
        >
          All your financial data is strictly stored locally on your device in SQLite.
          Zero cloud sync, zero tracking, zero external servers, and zero internet permission required.
        </Text>
      </Surface>

      <Text
        variant="labelSmall"
        style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 24 }}
      >
        Personal Finance Manager • Version 1.0.0
      </Text>
    </ScrollView>
  );
};

const SettingNavRow = ({
  icon,
  title,
  subtitle,
  onPress,
  theme,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  theme: any;
}) => (
  <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.navLeft}>
      <View style={[styles.navIconBox, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={theme.colors.primary} />
      </View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
          {title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {subtitle}
        </Text>
      </View>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 18,
    paddingVertical: 6,
    marginBottom: 16,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  radioLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  divider: {
    opacity: 0.4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
