import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, Button, Divider, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { transactionRepository } from '../../database/transactionRepository';
import { transferRepository } from '../../database/transferRepository';
import { Transaction, Transfer } from '../../types';
import { formatPaiseToRupees } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/dateUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'TransactionDetails'>;

export const TransactionDetailsScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { refreshAll } = useFinanceStore();

  const { transactionId, transferId } = route.params;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = () => {
    if (transferId) {
      const tr = transferRepository.getById(transferId);
      setTransfer(tr);
    } else if (transactionId) {
      const txn = transactionRepository.getById(transactionId);
      setTransaction(txn);
    }
  };

  useEffect(() => {
    loadData();
  }, [transactionId, transferId]);

  // Handle Transfer View
  if (transferId) {
    if (!transfer) {
      return (
        <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Transfer not found
          </Text>
        </View>
      );
    }

    const handleDeleteTransfer = () => {
      setShowDeleteConfirm(false);
      try {
        transferRepository.delete(transfer.id);
        refreshAll();
        Alert.alert('Transfer Deleted', 'The cash withdrawal/transfer has been deleted and account balances have been restored.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to delete transfer');
      }
    };

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Top Amount Banner */}
        <Surface
          style={[
            styles.amountCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: '#0284C7',
            },
          ]}
          elevation={2}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#0284C720' }]}>
            <MaterialCommunityIcons name="bank-transfer" size={36} color="#0284C7" />
          </View>

          <Text
            variant="headlineMedium"
            style={[styles.amountText, { color: theme.colors.primary }]}
          >
            {formatPaiseToRupees(transfer.amount_paise)}
          </Text>

          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, fontWeight: '600', marginTop: 4, textAlign: 'center' }}
          >
            {transfer.from_account_name} ➔ {transfer.to_account_name}
          </Text>

          <View style={[styles.typeBadge, { backgroundColor: '#0284C720' }]}>
            <Text variant="labelMedium" style={{ color: '#0284C7', fontWeight: '700' }}>
              ATM WITHDRAWAL / TRANSFER
            </Text>
          </View>
        </Surface>

        {/* Details List */}
        <Surface style={[styles.detailsCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <DetailRow
            icon="bank-minus"
            label="Withdrawn From"
            value={transfer.from_account_name ?? '---'}
            theme={theme}
          />
          <Divider style={styles.divider} />

          <DetailRow
            icon="cash-plus"
            label="Deposited Into"
            value={transfer.to_account_name ?? '---'}
            theme={theme}
          />
          <Divider style={styles.divider} />

          <DetailRow
            icon="calendar-outline"
            label="Date"
            value={formatDisplayDate(transfer.transfer_date)}
            theme={theme}
          />

          {transfer.notes ? (
            <>
              <Divider style={styles.divider} />
              <DetailRow
                icon="note-text-outline"
                label="Notes"
                value={transfer.notes}
                theme={theme}
              />
            </>
          ) : null}
        </Surface>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="contained-tonal"
            icon="pencil"
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate('AddTransaction', {
                transferId: transfer.id,
                initialType: 'TRANSFER',
              })
            }
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            textColor={theme.colors.expense}
            style={[styles.actionBtn, { borderColor: theme.colors.expense }]}
            onPress={() => setShowDeleteConfirm(true)}
          >
            Delete
          </Button>
        </View>

        {/* Confirmation Dialog */}
        <Portal>
          <Dialog
            visible={showDeleteConfirm}
            onDismiss={() => setShowDeleteConfirm(false)}
            style={{ backgroundColor: theme.colors.surface }}
          >
            <Dialog.Title style={{ color: theme.colors.onSurface }}>Delete Transfer?</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Are you sure you want to delete this transfer of{' '}
                {formatPaiseToRupees(transfer.amount_paise)}?
                {'\n\n'}
                The balances for {transfer.from_account_name} and {transfer.to_account_name} will be restored.
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button textColor={theme.colors.expense} onPress={handleDeleteTransfer}>
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    );
  }

  // Handle Standard Transaction View
  if (!transaction) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Transaction not found
        </Text>
      </View>
    );
  }

  const isIncome = transaction.type === 'INCOME';

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    try {
      transactionRepository.delete(transaction.id);
      refreshAll();
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete transaction');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Top Amount Banner */}
      <Surface
        style={[
          styles.amountCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isIncome ? theme.colors.primaryContainer : theme.colors.expenseContainer,
          },
        ]}
        elevation={2}
      >
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: `${transaction.category_color ?? '#1565C0'}20` },
          ]}
        >
          <MaterialCommunityIcons
            name={(transaction.category_icon as any) || 'circle'}
            size={36}
            color={transaction.category_color ?? theme.colors.primary}
          />
        </View>

        <Text
          variant="headlineMedium"
          style={[
            styles.amountText,
            { color: isIncome ? theme.colors.income : theme.colors.expense },
          ]}
        >
          {isIncome ? '+' : '-'} {formatPaiseToRupees(transaction.amount_paise)}
        </Text>

        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, fontWeight: '600', marginTop: 4 }}
        >
          {transaction.description}
        </Text>

        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor: isIncome
                ? theme.colors.incomeContainer
                : theme.colors.expenseContainer,
            },
          ]}
        >
          <Text
            variant="labelMedium"
            style={{
              color: isIncome ? theme.colors.income : theme.colors.expense,
              fontWeight: '700',
            }}
          >
            {transaction.type}
          </Text>
        </View>
      </Surface>

      {/* Details List */}
      <Surface style={[styles.detailsCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <DetailRow
          icon="shape-outline"
          label="Category"
          value={transaction.category_name ?? '---'}
          theme={theme}
        />
        <Divider style={styles.divider} />

        <DetailRow
          icon="bank-outline"
          label="Account"
          value={transaction.account_name ?? '---'}
          theme={theme}
        />
        <Divider style={styles.divider} />

        <DetailRow
          icon="credit-card-outline"
          label="Payment Method"
          value={transaction.payment_method}
          theme={theme}
        />
        <Divider style={styles.divider} />

        <DetailRow
          icon="calendar-outline"
          label="Date"
          value={formatDisplayDate(transaction.transaction_date)}
          theme={theme}
        />

        {transaction.notes ? (
          <>
            <Divider style={styles.divider} />
            <DetailRow
              icon="note-text-outline"
              label="Notes"
              value={transaction.notes}
              theme={theme}
            />
          </>
        ) : null}

        {transaction.is_essential !== null && transaction.is_essential !== undefined ? (
          <>
            <Divider style={styles.divider} />
            <DetailRow
              icon="tag-outline"
              label="Classification"
              value={transaction.is_essential === 1 ? 'Essential (Need)' : 'Discretionary (Want)'}
              theme={theme}
            />
          </>
        ) : null}
      </Surface>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="contained-tonal"
          icon="pencil"
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AddTransaction', { transactionId: transaction.id })}
        >
          Edit
        </Button>
        <Button
          mode="outlined"
          icon="delete"
          textColor={theme.colors.expense}
          style={[styles.actionBtn, { borderColor: theme.colors.expense }]}
          onPress={() => setShowDeleteConfirm(true)}
        >
          Delete
        </Button>
      </View>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showDeleteConfirm}
          onDismiss={() => setShowDeleteConfirm(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.onSurface }}>Confirm Delete</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Are you sure you want to delete this transaction of{' '}
              {formatPaiseToRupees(transaction.amount_paise)}? This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button textColor={theme.colors.expense} onPress={handleDelete}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const DetailRow = ({
  icon,
  label,
  value,
  theme,
}: {
  icon: string;
  label: string;
  value: string;
  theme: any;
}) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      <MaterialCommunityIcons name={icon as any} size={20} color={theme.colors.primary} />
      <Text variant="bodyMedium" style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </View>
    <Text variant="bodyLarge" style={[styles.detailValue, { color: theme.colors.onSurface }]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  amountText: {
    fontWeight: '800',
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  detailsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    marginLeft: 10,
  },
  detailValue: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  divider: {
    opacity: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 4,
  },
});
