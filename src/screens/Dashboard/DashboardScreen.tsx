import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, Surface, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarChart } from 'react-native-chart-kit';
import { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { formatPaiseToRupees } from '../../utils/currency';
import { getCurrentMonthRange, formatDisplayDate } from '../../utils/dateUtils';
import { analyticsService, ExtendedKPIs, MonthlyTrendData } from '../../services/analyticsService';
import { goalRepository } from '../../database/goalRepository';
import { FinancialGoal } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DashboardScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const { currentMonthKPIs, accounts, recentTransactions, refreshAll } = useFinanceStore();
  const { monthName } = getCurrentMonthRange();

  const [extendedKPIs, setExtendedKPIs] = useState<ExtendedKPIs | null>(null);
  const [trendData, setTrendData] = useState<MonthlyTrendData | null>(null);
  const [dashboardGoals, setDashboardGoals] = useState<FinancialGoal[]>([]);

  const loadData = () => {
    refreshAll();
    const ext = analyticsService.getExtendedKPIs();
    setExtendedKPIs(ext);
    const trends = analyticsService.getLast6MonthsTrends();
    setTrendData(trends);
    const goalsList = goalRepository.getAll(true);
    setDashboardGoals(goalsList);
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const totalBalancePaise = accounts.reduce(
    (sum, acc) => sum + (acc.current_balance_paise ?? 0),
    0
  );

  const screenWidth = Dimensions.get('window').width;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Banner Card */}
      <Surface
        style={[
          styles.balanceCard,
          {
            backgroundColor: theme.dark ? theme.colors.surface : theme.colors.primary,
            borderColor: theme.colors.primaryContainer,
          },
        ]}
        elevation={3}
      >
        <View style={styles.bannerHeader}>
          <View>
            <Text
              variant="labelMedium"
              style={{ color: theme.dark ? theme.colors.onSurfaceVariant : '#BBDEFB' }}
            >
              TOTAL NET BALANCE
            </Text>
            <Text
              variant="headlineMedium"
              style={[
                styles.totalBalanceText,
                { color: theme.dark ? theme.colors.onSurface : '#FFFFFF' },
              ]}
            >
              {formatPaiseToRupees(totalBalancePaise)}
            </Text>
          </View>
          <View style={styles.periodBadge}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={14}
              color={theme.dark ? theme.colors.primary : '#FFFFFF'}
            />
            <Text
              variant="labelSmall"
              style={{
                color: theme.dark ? theme.colors.primary : '#FFFFFF',
                marginLeft: 4,
                fontWeight: '600',
              }}
            >
              {monthName}
            </Text>
          </View>
        </View>

        {/* Quick Add Actions */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
            onPress={() => navigation.navigate('AddTransaction', undefined)}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.quickButtonText}>+ Add Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: 'rgba(255,255,255,0.18)', marginLeft: 8 }]}
            onPress={() => navigation.navigate('AddTransaction', { initialType: 'TRANSFER' })}
          >
            <MaterialCommunityIcons name="bank-transfer" size={18} color="#FFFFFF" />
            <Text style={styles.quickButtonText}>Withdraw Cash</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      {/* KPI Cards Grid */}
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Monthly Overview ({monthName})
      </Text>

      <View style={styles.kpiGrid}>
        {/* Income Card */}
        <Card
          style={[styles.kpiCard, { backgroundColor: theme.colors.surface }]}
          mode="elevated"
        >
          <Card.Content style={styles.kpiContent}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="arrow-down-bold" size={20} color={theme.colors.income} />
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Total Income
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.kpiValue, { color: theme.colors.income }]}
              numberOfLines={1}
            >
              {formatPaiseToRupees(currentMonthKPIs.totalIncomePaise)}
            </Text>
          </Card.Content>
        </Card>

        {/* Expense Card */}
        <Card
          style={[styles.kpiCard, { backgroundColor: theme.colors.surface }]}
          mode="elevated"
        >
          <Card.Content style={styles.kpiContent}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.expenseContainer }]}>
              <MaterialCommunityIcons name="arrow-up-bold" size={20} color={theme.colors.expense} />
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Total Expense
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.kpiValue, { color: theme.colors.expense }]}
              numberOfLines={1}
            >
              {formatPaiseToRupees(currentMonthKPIs.totalExpensePaise)}
            </Text>
          </Card.Content>
        </Card>

        {/* Net Savings Card */}
        <Card
          style={[styles.kpiCard, { backgroundColor: theme.colors.surface }]}
          mode="elevated"
        >
          <Card.Content style={styles.kpiContent}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor:
                    currentMonthKPIs.netSavingsPaise >= 0
                      ? theme.colors.savingsContainer
                      : theme.colors.expenseContainer,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={currentMonthKPIs.netSavingsPaise >= 0 ? 'piggy-bank' : 'alert-circle-outline'}
                size={20}
                color={
                  currentMonthKPIs.netSavingsPaise >= 0
                    ? theme.colors.savings
                    : theme.colors.expense
                }
              />
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Net Savings
            </Text>
            <Text
              variant="titleMedium"
              style={[
                styles.kpiValue,
                {
                  color:
                    currentMonthKPIs.netSavingsPaise >= 0
                      ? theme.colors.savings
                      : theme.colors.expense,
                },
              ]}
              numberOfLines={1}
            >
              {formatPaiseToRupees(currentMonthKPIs.netSavingsPaise)}
            </Text>
          </Card.Content>
        </Card>

        {/* Savings Rate Card */}
        <Card
          style={[styles.kpiCard, { backgroundColor: theme.colors.surface }]}
          mode="elevated"
        >
          <Card.Content style={styles.kpiContent}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name="percent" size={20} color={theme.colors.primary} />
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Savings Rate
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.kpiValue, { color: theme.colors.primary }]}
              numberOfLines={1}
            >
              {currentMonthKPIs.savingsRatePercent !== null
                ? `${currentMonthKPIs.savingsRatePercent}%`
                : '---'}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Extended Analytics Metrics Card */}
      {extendedKPIs && (
        <Surface style={[styles.extendedCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            SPENDING INTELLIGENCE
          </Text>

          <View style={styles.extRow}>
            <View style={styles.extCol}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Daily Avg Expense
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                {formatPaiseToRupees(extendedKPIs.avgDailyExpensePaise)}
              </Text>
            </View>

            <Divider style={styles.verticalDivider} />

            <View style={styles.extCol}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Top Expense Category
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>
                {extendedKPIs.highestExpenseCategory ? extendedKPIs.highestExpenseCategory.name : 'None'}
              </Text>
            </View>
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <View style={styles.extRow}>
            <View style={styles.extCol}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Income vs Last Month
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  fontWeight: '700',
                  color:
                    extendedKPIs.incomeChangePercent === null
                      ? theme.colors.onSurfaceVariant
                      : extendedKPIs.incomeChangePercent >= 0
                      ? theme.colors.savings
                      : theme.colors.expense,
                }}
              >
                {extendedKPIs.incomeChangePercent !== null
                  ? `${extendedKPIs.incomeChangePercent >= 0 ? '+' : ''}${extendedKPIs.incomeChangePercent}%`
                  : 'N/A'}
              </Text>
            </View>

            <Divider style={styles.verticalDivider} />

            <View style={styles.extCol}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Expense vs Last Month
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  fontWeight: '700',
                  color:
                    extendedKPIs.expenseChangePercent === null
                      ? theme.colors.onSurfaceVariant
                      : extendedKPIs.expenseChangePercent <= 0
                      ? theme.colors.savings
                      : theme.colors.expense,
                }}
              >
                {extendedKPIs.expenseChangePercent !== null
                  ? `${extendedKPIs.expenseChangePercent >= 0 ? '+' : ''}${extendedKPIs.expenseChangePercent}%`
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </Surface>
      )}

      {/* Visual Bar Chart: 6 Months Expense Trend (Shown if any expenses recorded) */}
      {trendData && trendData.labels.length > 0 && trendData.expenseRupees.some((v) => v > 0) && (
        <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 4 }}>
            6-Month Expense Trends
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Monthly spending history (₹)
          </Text>

          <BarChart
            data={{
              labels: trendData.labels,
              datasets: [
                {
                  data: trendData.expenseRupees,
                },
              ],
            }}
            width={screenWidth - 48}
            height={200}
            yAxisLabel="₹"
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: () => theme.colors.primary,
              labelColor: () => theme.colors.onSurfaceVariant,
              barPercentage: 0.6,
            }}
            style={{
              borderRadius: 12,
              paddingRight: 16,
            }}
            showValuesOnTopOfBars={false}
            fromZero={true}
          />
        </Surface>
      )}

      {/* Loans & Monthly Targets Card */}
      <Surface style={[styles.goalsCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="flag-checkered" size={22} color={theme.colors.primary} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginLeft: 8 }}>
              Loans & Target Commitments
            </Text>
          </View>
          <Button
            compact
            mode="text"
            textColor={theme.colors.primary}
            onPress={() => navigation.navigate('Goals')}
          >
            {dashboardGoals.length > 0 ? 'Manage' : '+ Set Target'}
          </Button>
        </View>

        {dashboardGoals.length === 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Track your personal loans, EMIs, and monthly investment targets with automatic payment tracking.
          </Text>
        ) : (
          <View style={{ marginTop: 6 }}>
            {dashboardGoals.slice(0, 3).map((g) => {
              const isLoan = g.goal_type === 'LOAN';
              const curPaid = g.current_month_paid_paise ?? 0;
              const isMet = curPaid >= g.monthly_target_paise;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={styles.dashboardGoalRow}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('Goals')}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                      {g.name}
                    </Text>
                    <Text variant="labelSmall" style={{ color: isMet ? theme.colors.income : theme.colors.expense, fontWeight: '700' }}>
                      {isMet ? '✅ Paid This Month' : `⏳ ${formatPaiseToRupees(Math.max(0, g.monthly_target_paise - curPaid))} Pending`}
                    </Text>
                  </View>
                  <View style={[styles.dashboardProgressBarTrack, { backgroundColor: theme.colors.elevation.level2 }]}>
                    <View
                      style={[
                        styles.dashboardProgressBarFill,
                        {
                          width: `${Math.min(100, g.progress_percentage ?? 0)}%`,
                          backgroundColor: isLoan ? theme.colors.primary : theme.colors.income,
                        },
                      ]}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatPaiseToRupees(g.total_paid_paise ?? 0)} of {formatPaiseToRupees(g.target_amount_paise)} ({g.progress_percentage}%)
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Target: {formatPaiseToRupees(g.monthly_target_paise)}/mo
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Surface>

      {/* Accounts List Section */}
      <View style={styles.sectionHeaderRow}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Accounts & Wallets
        </Text>
        <Button
          compact
          mode="text"
          textColor={theme.colors.primary}
          onPress={() => navigation.navigate('Accounts')}
        >
          Manage
        </Button>
      </View>

      {accounts.length === 0 ? (
        <Surface style={[styles.emptyBox, { backgroundColor: theme.colors.surface, marginBottom: 16 }]} elevation={1}>
          <MaterialCommunityIcons name="wallet-outline" size={36} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
            No accounts or wallets added yet
          </Text>
          <Button
            mode="contained-tonal"
            compact
            onPress={() => navigation.navigate('Accounts')}
            style={{ marginTop: 10, borderRadius: 8 }}
          >
            + Add Account / Wallet
          </Button>
        </Surface>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountScroll}>
          {accounts.map((acc) => (
            <Surface
              key={acc.id}
              style={[
                styles.accountChipCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              elevation={1}
            >
              <View style={[styles.accIconBg, { backgroundColor: `${acc.color}20` }]}>
                <MaterialCommunityIcons
                  name={(acc.icon as any) || 'bank'}
                  size={22}
                  color={acc.color}
                />
              </View>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
                numberOfLines={1}
              >
                {acc.name}
              </Text>
              <Text
                variant="labelLarge"
                style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 2 }}
              >
                {formatPaiseToRupees(acc.current_balance_paise ?? 0)}
              </Text>
            </Surface>
          ))}
        </ScrollView>
      )}

      {/* Recent Transactions Section */}
      <View style={styles.sectionHeaderRow}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Recent Transactions
        </Text>
        <Button
          compact
          mode="text"
          textColor={theme.colors.primary}
          onPress={() => navigation.navigate('MainTabs', { screen: 'History' })}
        >
          See All
        </Button>
      </View>

      {recentTransactions.length === 0 ? (
        <Surface
          style={[styles.emptyBox, { backgroundColor: theme.colors.surface }]}
          elevation={1}
        >
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={40}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
          >
            No transactions yet this month
          </Text>
          <Button
            mode="contained"
            style={{ marginTop: 12, borderRadius: 8 }}
            buttonColor={theme.colors.primary}
            onPress={() => navigation.navigate('AddTransaction', undefined)}
          >
            Record First Transaction
          </Button>
        </Surface>
      ) : (
        recentTransactions.slice(0, 5).map((txn) => (
          <TouchableOpacity
            key={txn.id}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('TransactionDetails', { transactionId: txn.id })}
          >
            <Surface
              style={[styles.txnRow, { backgroundColor: theme.colors.surface }]}
              elevation={1}
            >
              <View
                style={[
                  styles.txnIconCircle,
                  { backgroundColor: `${txn.category_color ?? '#1565C0'}18` },
                ]}
              >
                <MaterialCommunityIcons
                  name={(txn.category_icon as any) || 'circle'}
                  size={20}
                  color={txn.category_color ?? theme.colors.primary}
                />
              </View>

              <View style={styles.txnCenter}>
                <Text
                  variant="bodyLarge"
                  style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                  numberOfLines={1}
                >
                  {txn.description}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {txn.category_name} • {formatDisplayDate(txn.transaction_date)}
                </Text>
              </View>

              <View style={styles.txnRight}>
                <Text
                  variant="bodyLarge"
                  style={{
                    color: txn.type === 'INCOME' ? theme.colors.income : theme.colors.expense,
                    fontWeight: '700',
                  }}
                >
                  {txn.type === 'INCOME' ? '+' : '-'} {formatPaiseToRupees(txn.amount_paise)}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {txn.account_name}
                </Text>
              </View>
            </Surface>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  totalBalanceText: {
    fontWeight: '800',
    marginTop: 4,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  quickActionRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
  },
  kpiContent: {
    padding: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontWeight: '700',
    marginTop: 4,
  },
  extendedCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  extRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  extCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  verticalDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 8,
  },
  chartCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  accountScroll: {
    marginBottom: 16,
  },
  accountChipCard: {
    padding: 14,
    borderRadius: 16,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 1,
  },
  accIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  txnIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txnCenter: {
    flex: 1,
  },
  txnRight: {
    alignItems: 'flex-end',
  },
  goalsCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  dashboardGoalRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  dashboardProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  dashboardProgressBarFill: {
    height: 6,
    borderRadius: 3,
  },
});
