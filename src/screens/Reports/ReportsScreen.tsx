import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { Text, Surface, ProgressBar, Button, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import { useAppTheme } from '../../theme';
import { getDb } from '../../database/database';
import { formatPaiseToRupees } from '../../utils/currency';
import { getCurrentMonthRange } from '../../utils/dateUtils';
import { analyticsService, ChartCategoryData } from '../../services/analyticsService';
import { reportService } from '../../services/reportService';
import { DateRangeFilter } from '../../components/DateRangeFilter';

interface CategoryBreakdown {
  id: number;
  name: string;
  icon: string;
  color: string;
  total_paise: number;
}

export const ReportsScreen = () => {
  const theme = useAppTheme();
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

    setCategoryBreakdown(catRows);

    // Fetch Pie Chart distribution
    const chartData = analyticsService.getCategoryDistribution(
      start,
      end,
      reportType,
      theme.colors.onSurfaceVariant
    );
    setPieData(chartData);
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
              <View key={cat.id} style={styles.catRow}>
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
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <ProgressBar
                  progress={progress}
                  color={cat.color || (reportType === 'INCOME' ? theme.colors.income : theme.colors.primary)}
                  style={styles.progressBar}
                />
              </View>
            );
          })}
        </Surface>
      )}
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
});
