import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  History: undefined;
  AddPlaceholder: undefined;
  Reports: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AddTransaction: { transactionId?: number; transferId?: number; initialType?: 'EXPENSE' | 'INCOME' | 'TRANSFER' } | undefined;
  TransactionDetails: { transactionId?: number; transferId?: number };
  Categories: undefined;
  Accounts: undefined;
  Budgets: undefined;
  Goals: undefined;
  BackupRestore: undefined;
};
