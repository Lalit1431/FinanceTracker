import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert, TouchableOpacity, FlatList } from 'react-native';
import { Text, Surface, ProgressBar, Button, SegmentedButtons, Modal, Portal, Divider, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { PieChart } from 'react-native-chart-kit';
import { useAppTheme } from '../../theme';
import { getDb } from '../../database/database';
import { transactionRepository } from '../../database/transactionRepository';
import { Transaction } from '../../types';
import { formatPaiseToRupees } from '../../utils/currency';
import { getCurrentMonthRange, formatDisplayDate } from '../../utils/dateUtils';
import { analyticsService, ChartCategoryData, CHART_PALETTES } from '../../services/analyticsService';
import { reportService } from '../../services/reportService';
import { DateRangeFilter } from '../../components/DateRangeFilter';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CategoryBreakdown {
  id: number;
  name: string;
  icon: string;
  color: string;
  total_paise: number;
}

export const ReportsScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();

  const initialMonth = getCurrentMonthRange();
  const [reportType, setReportType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [startDate, setStartDate] = useState(initialMonth.start);
  const [endDate, setEndDate] = useState(initialMonth.end);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [pieData, setPieData] = useState<ChartCategoryData[]>([]);
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  // Category Records Modal State
  const [selectedCategory, setSelectedCategory] = useState<CategoryBreakdown | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const handleCategoryClick = (cat: CategoryBreakdown) => {
    const start = startDate || initialMonth.start;
    const end = endDate || initialMonth.end;

    const txns = transactionRepository.getAll({
      categoryId: cat.id,
      startDate: start,
      endDate: end,
      type: reportType,
    });

    setSelectedCategory(cat);
    setCategoryTransactions(txns);
    setShowCategoryModal(true);
  };

  const fetchReportData = () => {
    const start = startDate || initialMonth.start;
    const end = endDate || initialMonth.end;
    const db = getDb();

    // Fetch totals
    const totals = db.getFirstSync<{ income: number; expense: number }>(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_paise ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount_paise ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE transaction_date >= ? AND transaction_date <= ?;`,
      [start, end]
    );

    setTotalIncome(totals ? totals.income : 0);
    setTotalExpense(totals ? totals.expense : 0);

    // Fetch breakdown by category (either EXPENSE or INCOME)
    const catRows = db.getAllSync<CategoryBreakdown>(
      `SELECT 
         c.id, c.name, c.icon, c.color,
         SUM(t.amount_paise) AS total_paise
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
       GROUP BY c.id
       ORDER BY total_paise DESC;`,
      [reportType, start, end]
    );

    // Fetch Pie Chart distribution
    const chartData = analyticsService.getCategoryDistribution(
      start,
      end,
      reportType,
      theme.colors.onSurfaceVariant
    );
    setPieData(chartData);

    // Map chart colors to category breakdown rows for visual consistency
    const colorByName = new Map<string, string>();
    chartData.forEach((item) => colorByName.set(item.name, item.color));

    const palette = CHART_PALETTES[reportType];
    const enrichedRows = catRows.map((cat, idx) => ({
      ...cat,
      color:
        colorByName.get(cat.name) ||
        (cat.color && cat.color !== '#1565C0' ? cat.color : palette[idx % palette.length]),
    }));

    setCategoryBreakdown(enrichedRows);
  };

  useEffect(() => {
    if (isFocused) {
      fetchReportData();
    }
  }, [isFocused, reportType, startDate, endDate]);

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const start = startDate || initialMonth.start;
      const end = endDate || initialMonth.end;
      await reportService.exportTransactionsToCSV(start, end);
    } catch (err: any) {
      Alert.alert('CSV Export Error', err.message || 'Failed to export CSV report');
    } finally {
      setIsExportingCSV(false);
    }
  };

  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '---';

  const currentTotal = reportType === 'INCOME' ? totalIncome : totalExpense;
  const screenWidth = Dimensions.get('window').width;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onRangeChange={(start, end) => {
          setStartDate(start || initialMonth.start);
          setEndDate(end || initialMonth.end);
        }}
        showAllOption={false}
      />

      {/* Summary Highlights Card */}
      <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.summaryHeader}>
          <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Performance Summary
          </Text>
          <Button
            mode="outlined"
            compact
            icon="file-delimited-outline"
            loading={isExportingCSV}
            onPress={handleExportCSV}
            textColor={theme.colors.primary}
            style={{ borderRadius: 8, borderColor: theme.colors.primary }}
          >
            Export CSV
          </Button>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              TOTAL INCOME
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.income, fontWeight: '700' }}>
              {formatPaiseToRupees(totalIncome)}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              TOTAL EXPENSE
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.expense, fontWeight: '700' }}>
              {formatPaiseToRupees(totalExpense)}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              NET SAVINGS
            </Text>
            <Text
              variant="titleMedium"
              style={{
                color: netSavings >= 0 ? theme.colors.savings : theme.colors.expense,
                fontWeight: '700',
              }}
            >
              {formatPaiseToRupees(netSavings)}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              SAVINGS RATE
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {savingsRate !== '---' ? `${savingsRate}%` : '---'}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Report Mode Segment (Expense Reports vs Income Reports) */}
      <SegmentedButtons
        value={reportType}
        onValueChange={(val) => setReportType(val as 'EXPENSE' | 'INCOME')}
        buttons={[
          {
            value: 'EXPENSE',
            label: 'Expense Reports',
            icon: 'arrow-up-circle',
            style: reportType === 'EXPENSE' ? { backgroundColor: theme.colors.expenseContainer } : {},
          },
          {
            value: 'INCOME',
            label: 'Income Reports',
            icon: 'arrow-down-circle',
            style: reportType === 'INCOME' ? { backgroundColor: theme.colors.incomeContainer } : {},
          },
        ]}
        style={styles.segmentedButtons}
      />

      {/* Visual Pie Chart: Category Distribution */}
      {pieData.length > 0 && (
        <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 4 }}>
            {reportType === 'INCOME' ? 'Income Distribution' : 'Spending Distribution'}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            {reportType === 'INCOME'
              ? 'Top income sources for selected period'
              : 'Top expense categories for selected period'}
          </Text>

          <PieChart
            data={pieData}
            width={screenWidth - 48}
            height={200}
            chartConfig={{
              color: () => (reportType === 'INCOME' ? theme.colors.income : theme.colors.primary),
            }}
            accessor="amountRupees"
            backgroundColor="transparent"
            paddingLeft="10"
            absolute
          />
        </Surface>
      )}

      {/* Category Breakdown Table */}
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        {reportType === 'INCOME' ? 'Income by Category / Source' : 'Expense by Category'}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -6, marginBottom: 12 }}>
        Tap any category to view its individual transactions
      </Text>

      {categoryBreakdown.length === 0 ? (
        <Surface style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <MaterialCommunityIcons
            name={reportType === 'INCOME' ? 'cash-plus' : 'chart-pie'}
            size={40}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No {reportType.toLowerCase()}s recorded for this period
          </Text>
        </Surface>
      ) : (
        <Surface style={[styles.breakdownCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
          {categoryBreakdown.map((cat) => {
            const percentage =
              currentTotal > 0 ? (cat.total_paise / currentTotal) * 100 : 0;
            const progress = currentTotal > 0 ? cat.total_paise / currentTotal : 0;

            return (
              <TouchableOpacity
                key={cat.id}
                style={styles.catRow}
                activeOpacity={0.7}
                onPress={() => handleCategoryClick(cat)}
              >
                <View style={styles.catHeader}>
                  <View style={styles.catLeft}>
                    <View
                      style={[
                        styles.catIconCircle,
                        { backgroundColor: `${cat.color || (reportType === 'INCOME' ? '#10B981' : '#1565C0')}18` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={(cat.icon as any) || (reportType === 'INCOME' ? 'cash' : 'circle')}
                        size={18}
                        color={cat.color || (reportType === 'INCOME' ? theme.colors.income : theme.colors.primary)}
                      />
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                    >
                      {cat.name}
                    </Text>
                  </View>
                  <View style={styles.catRight}>
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: reportType === 'INCOME' ? theme.colors.income : theme.colors.expense,
                        fontWeight: '700',
                      }}
                    >
                      {formatPaiseToRupees(cat.total_paise)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {percentage.toFixed(1)}%
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                        style={{ marginLeft: 2 }}
                      />
                    </View>
                  </View>
                </View>

                <ProgressBar
                  progress={progress}
                  color={cat.color || (reportType === 'INCOME' ? theme.colors.income : theme.colors.primary)}
                  style={styles.progressBar}
                />
              </TouchableOpacity>
            );
          })}
        </Surface>
      )}

      {/* Category Transactions Modal */}
      <Portal>
        <Modal
          visible={showCategoryModal}
          onDismiss={() => setShowCategoryModal(false)}
          contentContainerStyle={[
            styles.categoryModalBox,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {selectedCategory && (
            <View>
              {/* Modal Header */}
              <View style={styles.modalCategoryHeader}>
                <View
                  style={[
                    styles.catIconCircleLarge,
                    { backgroundColor: `${selectedCategory.color}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(selectedCategory.icon as any) || 'circle'}
                    size={28}
                    color={selectedCategory.color}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {selectedCategory.name}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {categoryTransactions.length} transaction{categoryTransactions.length === 1 ? '' : 's'} • Total: {formatPaiseToRupees(selectedCategory.total_paise)}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => setShowCategoryModal(false)}
                />
              </View>

              <Divider style={{ marginVertical: 10 }} />

              {/* Transactions List */}
              {categoryTransactions.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    No transactions found for this period
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={categoryTransactions}
                  keyExtractor={(item) => item.id.toString()}
                  style={{ maxHeight: 340 }}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.txnModalCard, { backgroundColor: theme.colors.elevation.level1 }]}
                      onPress={() => {
                        setShowCategoryModal(false);
                        navigation.navigate('TransactionDetails', { transactionId: item.id });
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                          {item.description}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                          {formatDisplayDate(item.transaction_date)} • {item.account_name} ({item.payment_method})
                        </Text>
                        {item.notes ? (
                          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginTop: 1 }}>
                            Note: {item.notes}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text
                          variant="bodyMedium"
                          style={{
                            color: item.type === 'INCOME' ? theme.colors.income : theme.colors.expense,
                            fontWeight: '700',
                          }}
                        >
                          {item.type === 'INCOME' ? '+' : '-'}{formatPaiseToRupees(item.amount_paise)}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={{ marginTop: 2 }} />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}

              <Divider style={{ marginVertical: 10 }} />

              {/* Modal Actions */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Button
                  mode="contained"
                  buttonColor={theme.colors.primary}
                  onPress={() => setShowCategoryModal(false)}
                >
                  Close
                </Button>
              </View>
            </View>
          )}
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
    paddingBottom: 32,
  },
  summaryCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    width: '48%',
    padding: 10,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  chartCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyCard: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownCard: {
    borderRadius: 18,
    padding: 16,
  },
  catRow: {
    marginBottom: 14,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  catIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  catRight: {
    alignItems: 'flex-end',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  categoryModalBox: {
    margin: 20,
    padding: 18,
    borderRadius: 20,
    maxHeight: '85%',
  },
  modalCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconCircleLarge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnModalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
});
