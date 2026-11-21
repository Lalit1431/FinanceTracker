import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import {
  Text,
  Surface,
  FAB,
  Switch,
  Portal,
  Modal,
  TextInput,
  Button,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { accountRepository } from '../../database/accountRepository';
import { Account, AccountType } from '../../types';
import { formatPaiseToRupees, parseRupeesToPaise } from '../../utils/currency';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ACCOUNT_TYPES: { label: string; value: AccountType; icon: string }[] = [
  { label: 'Bank Account', value: 'BANK', icon: 'bank' },
  { label: 'UPI / PhonePe', value: 'UPI', icon: 'cellphone-wireless' },
  { label: 'Cash in Hand', value: 'CASH', icon: 'cash' },
  { label: 'Digital Wallet', value: 'WALLET', icon: 'wallet-outline' },
  { label: 'Credit Card', value: 'CREDIT_CARD', icon: 'credit-card-outline' },
];

export const AccountsScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const { refreshAccounts } = useFinanceStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('BANK');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('0');

  const loadData = () => {
    accountRepository.ensureCashAccount();
    const list = accountRepository.getAll(false);
    setAccounts(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = (acc: Account) => {
    const nextState = acc.is_active === 1 ? false : true;
    accountRepository.toggleActive(acc.id, nextState);
    loadData();
    refreshAccounts();
  };

  const handleCreateAccount = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter account name');
      return;
    }

    try {
      const openingBalancePaise = parseRupeesToPaise(openingBalanceStr);
      const selectedTypeConfig = ACCOUNT_TYPES.find((t) => t.value === accountType);

      accountRepository.create({
        name: name.trim(),
        account_type: accountType,
        opening_balance_paise: openingBalancePaise,
        icon: selectedTypeConfig?.icon ?? 'bank',
        color: '#1565C0',
      });

      setName('');
      setOpeningBalanceStr('0');
      setModalVisible(false);
      loadData();
      refreshAccounts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create account');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <MaterialCommunityIcons name="bank-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No accounts or wallets added yet.
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Tap '+ Add Account' below to add Cash, Bank, or UPI.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Surface
            style={[
              styles.itemCard,
              {
                backgroundColor: theme.colors.surface,
                opacity: item.is_active === 1 ? 1 : 0.6,
              },
            ]}
            elevation={1}
          >
            <View style={[styles.iconWrapper, { backgroundColor: `${item.color || '#1565C0'}18` }]}>
              <MaterialCommunityIcons
                name={(item.icon as any) || 'bank'}
                size={22}
                color={item.color || theme.colors.primary}
              />
            </View>

            <View style={styles.itemInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                  {item.name}
                </Text>
                {item.account_type === 'CASH' && (
                  <Chip compact style={{ height: 18, backgroundColor: '#10B98120' }} textStyle={{ fontSize: 9, lineHeight: 10, color: '#10B981', fontWeight: '700' }}>
                    Cash Wallet
                  </Chip>
                )}
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.account_type} • Opening: {formatPaiseToRupees(item.opening_balance_paise)}
              </Text>
              <Text
                variant="titleMedium"
                style={{
                  color: (item.current_balance_paise ?? 0) >= 0 ? theme.colors.income : theme.colors.expense,
                  fontWeight: '700',
                  marginTop: 4,
                }}
              >
                {formatPaiseToRupees(item.current_balance_paise ?? 0)}
              </Text>
              {item.account_type === 'CASH' && (
                <Button
                  mode="text"
                  compact
                  icon="bank-transfer"
                  textColor={theme.colors.primary}
                  onPress={() => navigation.navigate('AddTransaction', { initialType: 'TRANSFER' })}
                  style={{ alignSelf: 'flex-start', marginTop: 2, marginLeft: -8 }}
                >
                  Withdraw Cash (ATM)
                </Button>
              )}
            </View>

            <Switch
              value={item.is_active === 1}
              onValueChange={() => handleToggleActive(item)}
              color={theme.colors.primary}
            />
          </Surface>
        )}
      />

      <FAB
        icon="plus"
        label="Add Account"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => setModalVisible(true)}
      />

      {/* Add Account Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modalBox, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            New Account / Wallet
          </Text>

          <TextInput
            label="Account Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. HDFC Salary, Cash, Google Pay"
            mode="outlined"
            style={styles.modalInput}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          <TextInput
            label="Opening Balance (₹)"
            value={openingBalanceStr}
            onChangeText={setOpeningBalanceStr}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.modalInput}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Account Type:
          </Text>
          <View style={styles.typeChipsRow}>
            {ACCOUNT_TYPES.map((t) => (
              <Chip
                key={t.value}
                selected={accountType === t.value}
                onPress={() => setAccountType(t.value)}
                icon={t.icon}
                style={[
                  styles.typeChip,
                  accountType === t.value && { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                {t.label}
              </Chip>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button mode="contained" buttonColor={theme.colors.primary} onPress={handleCreateAccount}>
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    borderRadius: 16,
  },
  modalBox: {
    margin: 20,
    padding: 20,
    borderRadius: 18,
  },
  modalInput: {
    marginVertical: 8,
  },
  typeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  typeChip: {
    borderRadius: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
});
