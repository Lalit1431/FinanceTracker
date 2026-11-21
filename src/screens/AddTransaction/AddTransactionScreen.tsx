import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Surface,
  Chip,
  HelperText,
  Portal,
  Modal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useIsFocused, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { transactionRepository } from '../../database/transactionRepository';
import { transferRepository } from '../../database/transferRepository';
import { categoryRepository } from '../../database/categoryRepository';
import { accountRepository } from '../../database/accountRepository';
import { parseRupeesToPaise, formatPaiseToRupees } from '../../utils/currency';
import { getTodayDateString } from '../../utils/dateUtils';
import { TransactionType, PaymentMethod, Category, Account, AccountType } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddTransaction'>;

const PAYMENT_METHODS: { label: string; value: PaymentMethod; icon: string }[] = [
  { label: 'Cash', value: 'CASH', icon: 'cash' },
  { label: 'UPI', value: 'UPI', icon: 'cellphone-wireless' },
  { label: 'Card', value: 'CARD', icon: 'credit-card-outline' },
  { label: 'Net Banking', value: 'NET_BANKING', icon: 'bank-transfer' },
  { label: 'Wallet', value: 'WALLET', icon: 'wallet-outline' },
  { label: 'Other', value: 'OTHER', icon: 'dots-horizontal' },
];

const ACCOUNT_TYPES: { label: string; value: AccountType; icon: string }[] = [
  { label: 'Bank Account', value: 'BANK', icon: 'bank' },
  { label: 'UPI / PhonePe', value: 'UPI', icon: 'cellphone-wireless' },
  { label: 'Cash in Hand', value: 'CASH', icon: 'cash' },
  { label: 'Digital Wallet', value: 'WALLET', icon: 'wallet-outline' },
  { label: 'Credit Card', value: 'CREDIT_CARD', icon: 'credit-card-outline' },
];

export const AddTransactionScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { refreshAll, refreshAccounts } = useFinanceStore();

  const editId = route.params?.transactionId;
  const editTransferId = route.params?.transferId;
  const initialType = route.params?.transferId ? 'TRANSFER' : (route.params?.initialType ?? 'EXPENSE');

  const [mode, setMode] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [dateStr, setDateStr] = useState(getTodayDateString());
  const [isEssential, setIsEssential] = useState<number | null>(null);

  // Transfer specific state
  const [fromAccountId, setFromAccountId] = useState<number | null>(null);
  const [toAccountId, setToAccountId] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quick account creation modal state
  const [quickAccountModal, setQuickAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('BANK');
  const [newAccBalance, setNewAccBalance] = useState('0');

  const isFocused = useIsFocused();

  const loadDependencies = () => {
    // Ensure cash account always exists
    accountRepository.ensureCashAccount();
    const accs = accountRepository.getAll(true);
    setAccounts(accs);

    const cashAcc = accs.find((a) => a.account_type === 'CASH');
    const nonCashAcc = accs.find((a) => a.account_type !== 'CASH');

    // Default transfer accounts
    if (nonCashAcc) {
      setFromAccountId((prev) => prev ?? nonCashAcc.id);
    } else if (accs.length > 0) {
      setFromAccountId((prev) => prev ?? accs[0].id);
    }

    if (cashAcc) {
      setToAccountId((prev) => prev ?? cashAcc.id);
    } else if (accs.length > 1) {
      setToAccountId((prev) => prev ?? accs[1].id);
    }

    // Default account for transaction
    if (paymentMethod === 'CASH' && cashAcc) {
      setSelectedAccountId(cashAcc.id);
    } else if (accs.length > 0) {
      if (!selectedAccountId || !accs.some((a) => a.id === selectedAccountId)) {
        setSelectedAccountId(nonCashAcc ? nonCashAcc.id : accs[0].id);
      }
    }

    if (mode !== 'TRANSFER') {
      const cats = categoryRepository.getByType(mode as TransactionType, true);
      setCategories(cats);
      if (cats.length > 0) {
        if (!selectedCategoryId || !cats.some((c) => c.id === selectedCategoryId)) {
          setSelectedCategoryId(cats[0].id);
        }
      } else {
        setSelectedCategoryId(null);
      }
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadDependencies();
    }
  }, [isFocused, mode]);

  // Load existing transaction or transfer if editId / editTransferId passed
  useEffect(() => {
    if (editId) {
      const existing = transactionRepository.getById(editId);
      if (existing) {
        setMode(existing.type);
        setAmountStr((existing.amount_paise / 100).toString());
        setDescription(existing.description);
        setNotes(existing.notes ?? '');
        setSelectedCategoryId(existing.category_id);
        setSelectedAccountId(existing.account_id);
        setPaymentMethod(existing.payment_method);
        setDateStr(existing.transaction_date);
        setIsEssential(existing.is_essential ?? null);
      }
    } else if (editTransferId) {
      const existing = transferRepository.getById(editTransferId);
      if (existing) {
        setMode('TRANSFER');
        setAmountStr((existing.amount_paise / 100).toString());
        setFromAccountId(existing.from_account_id);
        setToAccountId(existing.to_account_id);
        setDateStr(existing.transfer_date);
        setNotes(existing.notes ?? '');
      }
    }
  }, [editId, editTransferId]);

  // Auto-route cash payment to Cash account
  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    const cashAcc = accounts.find((a) => a.account_type === 'CASH');
    if (method === 'CASH') {
      if (cashAcc) {
        setSelectedAccountId(cashAcc.id);
      }
    } else {
      // If currently pointing to cash, switch to a non-cash account if available
      const nonCash = accounts.find((a) => a.account_type !== 'CASH');
      if (nonCash) {
        setSelectedAccountId(nonCash.id);
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const amountPaise = parseRupeesToPaise(amountStr);

    if (amountPaise <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than ₹0';
      Alert.alert('Amount Required', 'Please enter a valid amount greater than ₹0.');
      setErrors(newErrors);
      return false;
    }

    if (mode === 'TRANSFER') {
      if (!fromAccountId) {
        newErrors.fromAccount = 'Please select source account (e.g. Bank)';
        Alert.alert('Source Account Required', 'Please select which account you are withdrawing money from.');
        setErrors(newErrors);
        return false;
      }
      if (!toAccountId) {
        newErrors.toAccount = 'Please select destination account (e.g. Cash in Hand)';
        Alert.alert('Destination Account Required', 'Please select which account you are transferring money to.');
        setErrors(newErrors);
        return false;
      }
      if (fromAccountId === toAccountId) {
        newErrors.toAccount = 'Source and destination accounts must be different';
        Alert.alert('Invalid Transfer', 'Source and destination accounts must be different.');
        setErrors(newErrors);
        return false;
      }
      setErrors(newErrors);
      return true;
    }

    // Expense / Income validations
    if (!description.trim()) {
      newErrors.description = 'Please enter a description';
      Alert.alert('Description Required', 'Please enter a short description for this transaction.');
      setErrors(newErrors);
      return false;
    }
    if (!selectedCategoryId) {
      newErrors.category = 'Please select a category';
      Alert.alert('Category Required', 'Please select or create a category first.');
      setErrors(newErrors);
      return false;
    }

    // If payment method is cash, automatically ensure cash account ID is bound
    let finalAccountId = selectedAccountId;
    if (paymentMethod === 'CASH') {
      const cashAcc = accounts.find((a) => a.account_type === 'CASH') ?? accountRepository.ensureCashAccount();
      finalAccountId = cashAcc.id;
      setSelectedAccountId(cashAcc.id);
    }

    if (!finalAccountId) {
      newErrors.account = 'Please select or create an account';
      Alert.alert(
        'Account Required',
        'An Account or Wallet (e.g. Bank or UPI) is required so the app knows where this money is drawn from.'
      );
      setErrors(newErrors);
      return false;
    }

    setErrors(newErrors);
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    const amountPaise = parseRupeesToPaise(amountStr);

    try {
      if (mode === 'TRANSFER') {
        const fromAcc = accounts.find((a) => a.id === fromAccountId);
        const toAcc = accounts.find((a) => a.id === toAccountId);
        const autoNote = notes.trim()
          ? notes.trim()
          : toAcc?.account_type === 'CASH'
          ? 'ATM Cash Withdrawal'
          : `Transfer: ${fromAcc?.name || 'Account'} ➔ ${toAcc?.name || 'Account'}`;

        if (editTransferId) {
          transferRepository.update(editTransferId, {
            from_account_id: fromAccountId!,
            to_account_id: toAccountId!,
            amount_paise: amountPaise,
            transfer_date: dateStr,
            notes: autoNote,
          });
          refreshAll();
          Alert.alert(
            'Transfer Updated',
            `Successfully updated transfer of ${formatPaiseToRupees(amountPaise)}.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          transferRepository.create({
            from_account_id: fromAccountId!,
            to_account_id: toAccountId!,
            amount_paise: amountPaise,
            transfer_date: dateStr,
            notes: autoNote,
          });
          refreshAll();
          Alert.alert(
            'Withdrawal / Transfer Saved',
            `Successfully transferred ${formatPaiseToRupees(amountPaise)} from ${fromAcc?.name || 'Source'} to ${toAcc?.name || 'Destination'}.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
        return;
      }

      // Expense or Income
      const finalAccountId =
        paymentMethod === 'CASH'
          ? (accounts.find((a) => a.account_type === 'CASH')?.id ?? selectedAccountId!)
          : selectedAccountId!;

      if (editId) {
        transactionRepository.update(editId, {
          type: mode,
          category_id: selectedCategoryId!,
          account_id: finalAccountId,
          amount_paise: amountPaise,
          transaction_date: dateStr,
          payment_method: paymentMethod,
          description: description.trim(),
          notes: notes.trim() || null,
          is_essential: mode === 'EXPENSE' ? isEssential : null,
        });
      } else {
        transactionRepository.create({
          type: mode,
          category_id: selectedCategoryId!,
          account_id: finalAccountId,
          amount_paise: amountPaise,
          transaction_date: dateStr,
          payment_method: paymentMethod,
          description: description.trim(),
          notes: notes.trim() || null,
          is_essential: mode === 'EXPENSE' ? isEssential : null,
        });
      }

      refreshAll();
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save transaction');
    }
  };

  const handleQuickCreateAccount = () => {
    if (!newAccName.trim()) {
      Alert.alert('Error', 'Please enter an account name (e.g. Bank or UPI)');
      return;
    }

    try {
      const balancePaise = parseRupeesToPaise(newAccBalance);
      const typeConfig = ACCOUNT_TYPES.find((t) => t.value === newAccType);
      const newId = accountRepository.create({
        name: newAccName.trim(),
        account_type: newAccType,
        opening_balance_paise: balancePaise,
        icon: typeConfig?.icon ?? 'bank',
        color: '#1565C0',
      });

      const updatedAccs = accountRepository.getAll(true);
      setAccounts(updatedAccs);
      setSelectedAccountId(newId);
      if (mode === 'TRANSFER') {
        if (!fromAccountId) setFromAccountId(newId);
      }
      setErrors((prev) => ({ ...prev, account: '', fromAccount: '', toAccount: '' }));
      refreshAccounts();

      setNewAccName('');
      setNewAccBalance('0');
      setQuickAccountModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create account');
    }
  };

  const cashAccount = accounts.find((a) => a.account_type === 'CASH');
  const nonCashAccounts = accounts.filter((a) => a.account_type !== 'CASH');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Type Toggle Segment (Expense | Income | Transfer) */}
      <SegmentedButtons
        value={mode}
        onValueChange={(val) => {
          setMode(val as any);
          setErrors({});
        }}
        buttons={[
          {
            value: 'EXPENSE',
            label: 'Expense',
            icon: 'arrow-up-circle',
            style: mode === 'EXPENSE' ? { backgroundColor: theme.colors.expenseContainer } : {},
          },
          {
            value: 'INCOME',
            label: 'Income',
            icon: 'arrow-down-circle',
            style: mode === 'INCOME' ? { backgroundColor: theme.colors.incomeContainer } : {},
          },
          {
            value: 'TRANSFER',
            label: 'Withdraw / Transfer',
            icon: 'bank-transfer',
            style: mode === 'TRANSFER' ? { backgroundColor: theme.colors.primaryContainer } : {},
          },
        ]}
        style={styles.segmentedButtons}
      />

      {/* Amount Input Card */}
      <Surface style={[styles.amountCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {mode === 'TRANSFER'
            ? 'ENTER WITHDRAWAL / TRANSFER AMOUNT'
            : mode === 'INCOME'
            ? 'ENTER INCOME AMOUNT'
            : 'ENTER EXPENSE AMOUNT'}
        </Text>
        <View style={styles.amountInputRow}>
          <Text
            variant="displayMedium"
            style={[
              styles.currencySymbol,
              {
                color:
                  mode === 'INCOME'
                    ? theme.colors.income
                    : mode === 'TRANSFER'
                    ? theme.colors.primary
                    : theme.colors.expense,
              },
            ]}
          >
            ₹
          </Text>
          <TextInput
            value={amountStr}
            onChangeText={(txt) => {
              setAmountStr(txt);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={[
              styles.amountInput,
              {
                backgroundColor: theme.colors.surface,
                color:
                  mode === 'INCOME'
                    ? theme.colors.income
                    : mode === 'TRANSFER'
                    ? theme.colors.primary
                    : theme.colors.expense,
              },
            ]}
            textColor={
              mode === 'INCOME'
                ? theme.colors.income
                : mode === 'TRANSFER'
                ? theme.colors.primary
                : theme.colors.expense
            }
            placeholderTextColor={theme.colors.onSurfaceVariant}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
          />
        </View>
        {errors.amount ? (
          <HelperText type="error" visible={true}>
            {errors.amount}
          </HelperText>
        ) : null}
      </Surface>

      {/* =========================================================================
          TRANSFER / CASH WITHDRAWAL VIEW
         ========================================================================= */}
      {mode === 'TRANSFER' ? (
        <View>
          {/* Quick Notice */}
          <Surface
            style={[
              styles.infoBanner,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
            ]}
            elevation={1}
          >
            <MaterialCommunityIcons name="swap-horizontal-bold" size={26} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                ATM Cash Withdrawal & Transfer
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Moves money between your accounts (e.g. Bank ➔ Cash in Hand) without affecting your spending/expense reports.
              </Text>
            </View>
          </Surface>

          {/* Source Account (From) */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleSmall" style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>
              Withdrawn From (Source Account) *
            </Text>
            <Button compact mode="text" textColor={theme.colors.primary} onPress={() => setQuickAccountModal(true)}>
              + Add Bank
            </Button>
          </View>

          {accounts.length === 0 ? (
            <Surface style={[styles.inlineEmpty, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                No accounts found. Tap '+ Add Bank' to add your bank account.
              </Text>
            </Surface>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {accounts.map((acc) => {
                const isSelected = fromAccountId === acc.id;
                return (
                  <Chip
                    key={`from-${acc.id}`}
                    selected={isSelected}
                    onPress={() => {
                      setFromAccountId(acc.id);
                      if (errors.fromAccount) setErrors((prev) => ({ ...prev, fromAccount: '' }));
                    }}
                    style={[
                      styles.categoryChip,
                      isSelected
                        ? { backgroundColor: theme.colors.primaryContainer }
                        : { backgroundColor: theme.colors.surface },
                    ]}
                    icon={() => (
                      <MaterialCommunityIcons
                        name={(acc.icon as any) || 'bank'}
                        size={16}
                        color={isSelected ? theme.colors.primary : acc.color}
                      />
                    )}
                  >
                    {acc.name} ({formatPaiseToRupees(acc.current_balance_paise ?? 0)})
                  </Chip>
                );
              })}
            </ScrollView>
          )}
          {errors.fromAccount ? (
            <HelperText type="error" visible={true}>
              {errors.fromAccount}
            </HelperText>
          ) : null}

          {/* Destination Account (To) */}
          <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
            <Text variant="titleSmall" style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>
              Deposited Into (Destination Account) *
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {accounts.map((acc) => {
              const isSelected = toAccountId === acc.id;
              const isCash = acc.account_type === 'CASH';
              return (
                <Chip
                  key={`to-${acc.id}`}
                  selected={isSelected}
                  onPress={() => {
                    setToAccountId(acc.id);
                    if (errors.toAccount) setErrors((prev) => ({ ...prev, toAccount: '' }));
                  }}
                  style={[
                    styles.categoryChip,
                    isSelected
                      ? { backgroundColor: isCash ? '#10B98125' : theme.colors.primaryContainer }
                      : { backgroundColor: theme.colors.surface },
                    isCash && { borderColor: '#10B981', borderWidth: 1 },
                  ]}
                  icon={() => (
                    <MaterialCommunityIcons
                      name={(acc.icon as any) || 'cash'}
                      size={16}
                      color={isCash ? '#10B981' : isSelected ? theme.colors.primary : acc.color}
                    />
                  )}
                >
                  {acc.name} {isCash ? '★ (Cash Wallet)' : ''}
                </Chip>
              );
            })}
          </ScrollView>
          {errors.toAccount ? (
            <HelperText type="error" visible={true}>
              {errors.toAccount}
            </HelperText>
          ) : null}

          {/* Date */}
          <TextInput
            label="Date (YYYY-MM-DD)"
            value={dateStr}
            onChangeText={setDateStr}
            mode="outlined"
            style={[styles.input, { marginTop: 12 }]}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="calendar" />}
          />

          {/* Optional Notes */}
          <TextInput
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. ATM cash withdrawal for groceries"
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            buttonColor={theme.colors.primary}
            textColor="#FFFFFF"
            icon="swap-horizontal"
          >
            {editTransferId ? 'Update Transfer' : 'Record Cash Withdrawal / Transfer'}
          </Button>
        </View>
      ) : (
        /* =========================================================================
            EXPENSE & INCOME VIEW
           ========================================================================= */
        <View>
          {/* Description */}
          <TextInput
            label="Description *"
            value={description}
            onChangeText={(txt) => {
              setDescription(txt);
              if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
            }}
            mode="outlined"
            placeholder={mode === 'INCOME' ? 'e.g. Monthly Salary, Freelance' : 'e.g. Grocery items, Tea, Fuel'}
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            error={!!errors.description}
          />
          {errors.description ? (
            <HelperText type="error" visible={true}>
              {errors.description}
            </HelperText>
          ) : null}

          {/* Category Selection */}
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleSmall" style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>
              Category *
            </Text>
            <Button compact mode="text" textColor={theme.colors.primary} onPress={() => navigation.navigate('Categories')}>
              + Manage
            </Button>
          </View>

          {categories.length === 0 ? (
            <Surface style={[styles.inlineEmpty, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                No {mode.toLowerCase()} categories found.
              </Text>
              <Button
                mode="contained-tonal"
                compact
                onPress={() => navigation.navigate('Categories')}
                style={{ marginTop: 6, borderRadius: 8 }}
              >
                Create {mode === 'INCOME' ? 'Income' : 'Expense'} Category
              </Button>
            </Surface>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <Chip
                    key={cat.id}
                    selected={isSelected}
                    onPress={() => {
                      setSelectedCategoryId(cat.id);
                      if (errors.category) setErrors((prev) => ({ ...prev, category: '' }));
                    }}
                    style={[
                      styles.categoryChip,
                      isSelected
                        ? { backgroundColor: theme.colors.primaryContainer }
                        : { backgroundColor: theme.colors.surface },
                    ]}
                    icon={() => (
                      <MaterialCommunityIcons
                        name={(cat.icon as any) || 'circle'}
                        size={16}
                        color={isSelected ? theme.colors.primary : cat.color}
                      />
                    )}
                  >
                    {cat.name}
                  </Chip>
                );
              })}
            </ScrollView>
          )}
          {errors.category ? (
            <HelperText type="error" visible={true}>
              {errors.category}
            </HelperText>
          ) : null}

          {/* Payment Method */}
          <Text variant="titleSmall" style={[styles.fieldLabel, { color: theme.colors.onSurface, marginTop: 10 }]}>
            Payment Method
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {PAYMENT_METHODS.map((method) => {
              const isSelected = paymentMethod === method.value;
              return (
                <Chip
                  key={method.value}
                  selected={isSelected}
                  onPress={() => handleSelectPaymentMethod(method.value)}
                  style={[
                    styles.categoryChip,
                    isSelected
                      ? { backgroundColor: method.value === 'CASH' ? '#10B98125' : theme.colors.primaryContainer }
                      : { backgroundColor: theme.colors.surface },
                    method.value === 'CASH' && { borderColor: '#10B981', borderWidth: 1 },
                  ]}
                  icon={() => (
                    <MaterialCommunityIcons
                      name={method.icon as any}
                      size={16}
                      color={
                        method.value === 'CASH'
                          ? '#10B981'
                          : isSelected
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                  )}
                >
                  {method.label}
                </Chip>
              );
            })}
          </ScrollView>

          {/* Account / Wallet Section:
              If payment method is Cash, show a clean auto-handled cash wallet card */}
          {paymentMethod === 'CASH' && mode === 'EXPENSE' ? (
            <Surface style={[styles.cashWalletNotice, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.cashNoticeIconWrapper}>
                <MaterialCommunityIcons name="cash-check" size={26} color="#10B981" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  Paid with Cash
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Automatically deducted from{' '}
                  <Text style={{ fontWeight: '700', color: '#10B981' }}>
                    Cash in Hand
                  </Text>{' '}
                  (Available: {formatPaiseToRupees(cashAccount?.current_balance_paise ?? 0)})
                </Text>
              </View>
            </Surface>
          ) : (
            <View>
              <View style={styles.sectionHeaderRow}>
                <Text variant="titleSmall" style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>
                  {mode === 'INCOME' ? 'Deposit Into Account *' : 'Paid From Account *'}
                </Text>
                <Button compact mode="text" textColor={theme.colors.primary} onPress={() => setQuickAccountModal(true)}>
                  + Quick Add
                </Button>
              </View>

              {accounts.length === 0 ? (
                <Surface style={[styles.inlineEmpty, { backgroundColor: theme.colors.surface }]} elevation={1}>
                  <MaterialCommunityIcons name="bank-outline" size={24} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 4 }}>
                    No bank accounts added yet
                  </Text>
                  <Button
                    mode="contained"
                    buttonColor={theme.colors.primary}
                    onPress={() => setQuickAccountModal(true)}
                    style={{ marginTop: 10, borderRadius: 8 }}
                  >
                    Add Bank Account
                  </Button>
                </Surface>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <Chip
                        key={acc.id}
                        selected={isSelected}
                        onPress={() => {
                          setSelectedAccountId(acc.id);
                          if (errors.account) setErrors((prev) => ({ ...prev, account: '' }));
                        }}
                        style={[
                          styles.categoryChip,
                          isSelected
                            ? { backgroundColor: theme.colors.primaryContainer }
                            : { backgroundColor: theme.colors.surface },
                        ]}
                        icon={() => (
                          <MaterialCommunityIcons
                            name={(acc.icon as any) || 'bank'}
                            size={16}
                            color={isSelected ? theme.colors.primary : acc.color}
                          />
                        )}
                      >
                        {acc.name}
                      </Chip>
                    );
                  })}
                </ScrollView>
              )}
              {errors.account ? (
                <HelperText type="error" visible={true}>
                  {errors.account}
                </HelperText>
              ) : null}
            </View>
          )}

          {/* Date */}
          <TextInput
            label="Date (YYYY-MM-DD)"
            value={dateStr}
            onChangeText={setDateStr}
            mode="outlined"
            style={[styles.input, { marginTop: 8 }]}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="calendar" />}
          />

          {/* Optional Notes */}
          <TextInput
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            numberOfLines={2}
            multiline
            style={styles.input}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          {/* Essential / Non-essential classification for expenses */}
          {mode === 'EXPENSE' && (
            <View style={styles.essentialRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Expense Type:
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Chip
                  selected={isEssential === 1}
                  onPress={() => setIsEssential(isEssential === 1 ? null : 1)}
                  icon="check-decagram"
                >
                  Essential (Need)
                </Chip>
                <Chip
                  selected={isEssential === 0}
                  onPress={() => setIsEssential(isEssential === 0 ? null : 0)}
                  icon="star-outline"
                >
                  Discretionary (Want)
                </Chip>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            buttonColor={mode === 'INCOME' ? theme.colors.income : theme.colors.expense}
            textColor="#FFFFFF"
            icon="check"
          >
            {editId ? 'Update Transaction' : 'Save Transaction'}
          </Button>
        </View>
      )}

      {/* Quick Add Account Modal */}
      <Portal>
        <Modal
          visible={quickAccountModal}
          onDismiss={() => setQuickAccountModal(false)}
          contentContainerStyle={[styles.modalBox, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Add Account / Wallet
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            e.g. HDFC Bank, SBI, Paytm, or Credit Card
          </Text>

          <TextInput
            label="Account Name *"
            value={newAccName}
            onChangeText={setNewAccName}
            placeholder="e.g. Savings Bank, HDFC"
            mode="outlined"
            style={{ marginTop: 12, marginBottom: 8 }}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          <TextInput
            label="Opening Balance (₹)"
            value={newAccBalance}
            onChangeText={setNewAccBalance}
            keyboardType="decimal-pad"
            mode="outlined"
            style={{ marginBottom: 12 }}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Account Type:
          </Text>
          <View style={styles.modalTypeRow}>
            {ACCOUNT_TYPES.map((t) => (
              <Chip
                key={t.value}
                selected={newAccType === t.value}
                onPress={() => setNewAccType(t.value)}
                icon={t.icon}
                style={[
                  styles.modalTypeChip,
                  newAccType === t.value && { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                {t.label}
              </Chip>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setQuickAccountModal(false)}>
              Cancel
            </Button>
            <Button mode="contained" buttonColor={theme.colors.primary} onPress={handleQuickCreateAccount}>
              Save & Select
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  amountCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  currencySymbol: {
    fontWeight: '800',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '800',
    minWidth: 150,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  fieldLabel: {
    fontWeight: '700',
  },
  chipRow: {
    marginBottom: 10,
  },
  categoryChip: {
    marginRight: 8,
    borderRadius: 10,
  },
  inlineEmpty: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  cashWalletNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  cashNoticeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  essentialRow: {
    marginVertical: 10,
  },
  saveButton: {
    marginTop: 20,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalBox: {
    margin: 20,
    padding: 22,
    borderRadius: 20,
  },
  modalTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  modalTypeChip: {
    borderRadius: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
