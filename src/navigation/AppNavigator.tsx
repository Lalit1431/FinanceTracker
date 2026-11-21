import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MainTabParamList, RootStackParamList } from './types';
import { useAppTheme } from '../theme';

// Screens
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { HistoryScreen } from '../screens/TransactionHistory/HistoryScreen';
import { AddTransactionScreen } from '../screens/AddTransaction/AddTransactionScreen';
import { ReportsScreen } from '../screens/Reports/ReportsScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { TransactionDetailsScreen } from '../screens/TransactionDetails/TransactionDetailsScreen';
import { CategoriesScreen } from '../screens/Categories/CategoriesScreen';
import { AccountsScreen } from '../screens/Accounts/AccountsScreen';
import { BudgetsScreen } from '../screens/Budgets/BudgetsScreen';
import { BackupRestoreScreen } from '../screens/BackupRestore/BackupRestoreScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Dummy component for the center Add tab button
const EmptyComponent = () => <View />;

const TabNavigator = () => {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.tabBackground,
          borderTopColor: theme.colors.cardBorder,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          headerTitle: 'Personal Finance',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'History',
          headerTitle: 'Transaction History',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="AddPlaceholder"
        component={EmptyComponent}
        options={({ navigation }) => ({
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.fabTabButton,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                },
              ]}
              onPress={() => {
                const parentNav = navigation.getParent();
                if (parentNav) {
                  (parentNav as any).navigate('AddTransaction');
                } else {
                  (navigation as any).navigate('AddTransaction');
                }
              }}
            >
              <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        })}
      />

      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: 'Reports',
          headerTitle: 'Analytics & Reports',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-box-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerTitle: 'Settings & Tools',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const theme = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          title: 'Record Transaction',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="TransactionDetails"
        component={TransactionDetailsScreen}
        options={{
          title: 'Transaction Details',
        }}
      />
      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: 'Categories',
        }}
      />
      <Stack.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{
          title: 'Accounts & Wallets',
        }}
      />
      <Stack.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{
          title: 'Monthly Budgets',
        }}
      />
      <Stack.Screen
        name="BackupRestore"
        component={BackupRestoreScreen}
        options={{
          title: 'Backup & Restore',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  fabTabButton: {
    top: -16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
