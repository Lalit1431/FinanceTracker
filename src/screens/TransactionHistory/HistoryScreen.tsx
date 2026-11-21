import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Searchbar, Chip, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { transactionRepository, TransactionFilter } from '../../database/transactionRepository';
import { transferRepository } from '../../database/transferRepository';
import { Transaction, TransactionType, Transfer } from '../../types';
import { formatPaiseToRupees } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/dateUtils';
import { DateRangeFilter } from '../../components/DateRangeFilter';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type HistoryItem =
  | ({ isTransfer: false } & Transaction)
  | ({ isTransfer: true } & Transfer);

export const HistoryScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const { refreshAll } = useFinanceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL' | 'TRANSFER'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchItems = () => {
    let txns: Transaction[] = [];
    let trs: Transfer[] = [];

    if (selectedType !== 'TRANSFER') {
      const filter: TransactionFilter = {
        searchQuery: searchQuery.trim() || undefined,
        type: selectedType === 'ALL' ? undefined : (selectedType as TransactionType),
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        limit: 100,
      };
      txns = transactionRepository.getAll(filter);
    }

    if (selectedType === 'ALL' || selectedType === 'TRANSFER') {
      trs = transferRepository.getAll({
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        limit: 50,
      });
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        trs = trs.filter(
          (t) =>
            (t.notes && t.notes.toLowerCase().includes(q)) ||
            (t.from_account_name && t.from_account_name.toLowerCase().includes(q)) ||
            (t.to_account_name && t.to_account_name.toLowerCase().includes(q))
        );
      }
    }

    const unified: HistoryItem[] = [
      ...txns.map((t) => ({ ...t, isTransfer: false as const })),
      ...trs.map((tr) => ({ ...tr, isTransfer: true as const })),
    ];

    unified.sort((a, b) => {
      const dateA = a.isTransfer ? a.transfer_date : a.transaction_date;
      const dateB = b.isTransfer ? b.transfer_date : b.transaction_date;
      return dateB.localeCompare(dateA);
    });

    setItems(unified);
  };

  useEffect(() => {
    if (isFocused) {
      fetchItems();
    }
  }, [isFocused, selectedType, searchQuery, startDate, endDate]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchItems();
    setIsRefreshing(false);
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    if (item.isTransfer) {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TransactionDetails', { transferId: item.id })}
        >
          <Surface style={[styles.txnCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={[styles.iconWrapper, { backgroundColor: '#0284C718' }]}>
              <MaterialCommunityIcons name="bank-transfer" size={24} color="#0284C7" />
            </View>

            <View style={styles.txnDetails}>
              <Text
                variant="bodyLarge"
                style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                numberOfLines={1}
              >
                {item.from_account_name} ➔ {item.to_account_name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.notes || 'ATM Cash Withdrawal / Transfer'}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {formatDisplayDate(item.transfer_date)}
              </Text>
            </View>

            <View style={styles.amountContainer}>
              <Text
                variant="titleMedium"
                style={[styles.amountText, { color: theme.colors.primary }]}
              >
                {formatPaiseToRupees(item.amount_paise)}
              </Text>
              <Chip
                compact
                style={{ height: 20, marginTop: 4, backgroundColor: '#0284C718' }}
                textStyle={{ fontSize: 10, lineHeight: 12, color: '#0284C7' }}
              >
                Transfer
              </Chip>
            </View>
          </Surface>
        </TouchableOpacity>
      );
    }

    // Normal Transaction
    const isIncome = item.type === 'INCOME';
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TransactionDetails', { transactionId: item.id })}
      >
        <Surface
          style={[styles.txnCard, { backgroundColor: theme.colors.surface }]}
          elevation={1}
        >
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${item.category_color ?? '#1565C0'}18` },
            ]}
          >
            <MaterialCommunityIcons
              name={(item.category_icon as any) || 'circle'}
              size={22}
              color={item.category_color ?? theme.colors.primary}
            />
          </View>

          <View style={styles.txnDetails}>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurface, fontWeight: '600' }}
              numberOfLines={1}
            >
              {item.description}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.category_name} • {item.account_name}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {formatDisplayDate(item.transaction_date)} • {item.payment_method}
            </Text>
          </View>

          <View style={styles.amountContainer}>
            <Text
              variant="titleMedium"
              style={[
                styles.amountText,
                { color: isIncome ? theme.colors.income : theme.colors.expense },
              ]}
            >
              {isIncome ? '+' : '-'} {formatPaiseToRupees(item.amount_paise)}
            </Text>
            {item.is_essential !== null && item.is_essential !== undefined && (
              <Chip
                compact
                style={{
                  height: 20,
                  marginTop: 4,
                  backgroundColor:
                    item.is_essential === 1
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                }}
                textStyle={{ fontSize: 10, lineHeight: 12 }}
              >
                {item.is_essential === 1 ? 'Need' : 'Want'}
              </Chip>
            )}
          </View>
        </Surface>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Searchbar
          placeholder="Search by description or notes"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
          iconColor={theme.colors.primary}
        />

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <Chip
            selected={selectedType === 'ALL'}
            onPress={() => setSelectedType('ALL')}
            style={styles.filterChip}
          >
            All
          </Chip>
          <Chip
            selected={selectedType === 'EXPENSE'}
            onPress={() => setSelectedType('EXPENSE')}
            style={styles.filterChip}
            icon="arrow-up"
          >
            Expense
          </Chip>
          <Chip
            selected={selectedType === 'INCOME'}
            onPress={() => setSelectedType('INCOME')}
            style={styles.filterChip}
            icon="arrow-down"
          >
            Income
          </Chip>
          <Chip
            selected={selectedType === 'TRANSFER'}
            onPress={() => setSelectedType('TRANSFER')}
            style={styles.filterChip}
            icon="bank-transfer"
          >
            Transfers
          </Chip>
        </View>

        {/* Date Range Filter */}
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          showAllOption={true}
        />
      </View>

      {/* Transaction & Transfer List */}
      <FlatList
        data={items}
        keyExtractor={(item) =>
          item.isTransfer ? `transfer-${item.id}` : `txn-${item.id}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-search-outline"
              size={54}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}
            >
              No transactions or transfers found matching your criteria.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 12,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txnDetails: {
    flex: 1,
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amountText: {
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
});
