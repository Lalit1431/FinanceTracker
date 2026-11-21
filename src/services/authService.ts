import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export const authService = {
  isBiometricAvailable: async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch {
      return false;
    }
  },

  authenticate: async (): Promise<boolean> => {
    if (Platform.OS === 'web') return true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Personal Finance Manager',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    }
  },
};
