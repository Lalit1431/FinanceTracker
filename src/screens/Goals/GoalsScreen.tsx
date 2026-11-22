import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import {
  Text,
  Surface,
  ProgressBar,
  FAB,
  Portal,
  Modal,
  TextInput,
  Button,
  Chip,
  SegmentedButtons,
  Divider,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme';
import { goalRepository } from '../../database/goalRepository';
import { categoryRepository } from '../../database/categoryRepository';
import { transactionRepository } from '../../database/transactionRepository';
import { FinancialGoal, GoalType, Category, Transaction } from '../../types';
import { formatPaiseToRupees, parseRupeesToPaise } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/dateUtils';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const GoalsScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();

  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'LOAN' | 'INVESTMENT'>('ALL');
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('LOAN');
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [tenureMonthsStr, setTenureMonthsStr] = useState('12');
  const [monthlyTargetStr, setMonthlyTargetStr] = useState('');
  const [startDateStr, setStartDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  // Transactions Inspection Modal
  const [viewingGoal, setViewingGoal] = useState<FinancialGoal | null>(null);
  const [goalTransactions, setGoalTransactions] = useState<Transaction[]>([]);
  const [showTxnsModal, setShowTxnsModal] = useState(false);

  const loadData = () => {
    const list = goalRepository.getAll(false);
    setGoals(list);
    const allCats = categoryRepository.getAll(true);
    setCategories(allCats);
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  // Auto-calculate monthly target when total amount or tenure changes
  const handleTargetAmountChange = (text: string) => {
    setTargetAmountStr(text);
    const totalPaise = parseRupeesToPaise(text);
    const months = parseInt(tenureMonthsStr, 10) || 1;
    if (totalPaise > 0 && months > 0) {
      const monthlyPaise = Math.round(totalPaise / months);
      setMonthlyTargetStr((monthlyPaise / 100).toFixed(0));
    }
  };

  const handleTenureChange = (text: string) => {
    setTenureMonthsStr(text);
    const months = parseInt(text, 10) || 1;
    const totalPaise = parseRupeesToPaise(targetAmountStr);
    if (totalPaise > 0 && months > 0) {
      const monthlyPaise = Math.round(totalPaise / months);
      setMonthlyTargetStr((monthlyPaise / 100).toFixed(0));
    }
  };

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setName('');
    setGoalType('LOAN');
    setTargetAmountStr('');
    setTenureMonthsStr('12');
    setMonthlyTargetStr('');
    setStartDateStr(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');

    // Preselect an expense category if available
    const available = categories.filter((c) => c.type === 'EXPENSE');
    setSelectedCatId(available.length > 0 ? available[0].id : null);
    setModalVisible(true);
  };

  const handleOpenEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setGoalType(goal.goal_type);
    setSelectedCatId(goal.category_id);
    setTargetAmountStr((goal.target_amount_paise / 100).toString());
    setTenureMonthsStr(goal.tenure_months ? goal.tenure_months.toString() : '12');
    setMonthlyTargetStr((goal.monthly_target_paise / 100).toString());
    setStartDateStr(goal.start_date);
    setNotes(goal.notes || '');
    setModalVisible(true);
  };

  const handleSaveGoal = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a target name (e.g. HDFC Personal Loan)');
      return;
    }
    if (!selectedCatId) {
      Alert.alert('Validation Error', 'Please select a linked category');
      return;
    }

    const targetPaise = parseRupeesToPaise(targetAmountStr);
    if (targetPaise <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid total target amount');
      return;
    }

    const monthlyPaise = parseRupeesToPaise(monthlyTargetStr);
    if (monthlyPaise <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid monthly target amount');
      return;
    }

    const tenure = parseInt(tenureMonthsStr, 10) || null;

    try {
      if (editingGoal) {
        goalRepository.update(editingGoal.id, {
          name: name.trim(),
          goal_type: goalType,
          category_id: selectedCatId,
          target_amount_paise: targetPaise,
          monthly_target_paise: monthlyPaise,
          start_date: startDateStr.trim(),
          tenure_months: tenure,
          notes: notes.trim() || null,
        });
      } else {
        goalRepository.create({
          name: name.trim(),
          goal_type: goalType,
          category_id: selectedCatId,
          target_amount_paise: targetPaise,
          monthly_target_paise: monthlyPaise,
          start_date: startDateStr.trim(),
          tenure_months: tenure,
          notes: notes.trim() || null,
          is_active: 1,
        });
      }

      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save financial target');
    }
  };

  const handleDeleteGoal = (goal: FinancialGoal) => {
    Alert.alert(
      'Delete Target?',
      `Are you sure you want to delete "${goal.name}"? Your past transaction records will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            goalRepository.delete(goal.id);
            if (modalVisible) setModalVisible(false);
            loadData();
          },
        },
      ]
    );
  };

  const handleInspectTransactions = (goal: FinancialGoal) => {
    const txns = transactionRepository.getAll({
      categoryId: goal.category_id,
      startDate: goal.start_date,
    });
    setViewingGoal(goal);
    setGoalTransactions(txns);
    setShowTxnsModal(true);
  };

  // Filtered goals
  const filteredGoals = goals.filter((g) => {
    if (filterType === 'ALL') return true;
    return g.goal_type === filterType;
  });

  // Summary Metrics
  const activeLoans = goals.filter((g) => g.goal_type === 'LOAN');
  const activeInvestments = goals.filter((g) => g.goal_type === 'INVESTMENT');
  const totalLoanRemaining = activeLoans.reduce((sum, g) => sum + (g.remaining_paise ?? 0), 0);
  const totalMonthlyCommitment = goals.reduce((sum, g) => sum + g.monthly_target_paise, 0);
  const totalInvestedSoFar = activeInvestments.reduce((sum, g) => sum + (g.total_paid_paise ?? 0), 0);

  const availableCategories = categories.filter((c) => {
    if (goalType === 'LOAN') return c.type === 'EXPENSE';
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* KPI Banner */}
        <Surface style={[styles.summaryBanner, { backgroundColor: theme.colors.surface }]} elevation={2}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            FINANCIAL TARGETS OVERVIEW
          </Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Remaining Loan Debt
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.expense, fontWeight: '700' }}>
                {formatPaiseToRupees(totalLoanRemaining)}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {activeLoans.length} active loan{activeLoans.length === 1 ? '' : 's'}
              </Text>
            </View>

            <Divider style={styles.verticalDivider} />

            <View style={styles.kpiCol}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Monthly Commitment
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                {formatPaiseToRupees(totalMonthlyCommitment)}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                EMIs & SIP targets
              </Text>
            </View>

            <Divider style={styles.verticalDivider} />

            <View style={styles.kpiCol}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Total Invested
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.income, fontWeight: '700' }}>
                {formatPaiseToRupees(totalInvestedSoFar)}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                towards goals
              </Text>
            </View>
          </View>
        </Surface>

        {/* Filter Segmented Buttons */}
        <SegmentedButtons
          value={filterType}
          onValueChange={(val) => setFilterType(val as any)}
          buttons={[
            { value: 'ALL', label: 'All Targets' },
            { value: 'LOAN', label: 'Loans & EMIs', icon: 'bank' },
            { value: 'INVESTMENT', label: 'Investments', icon: 'trending-up' },
          ]}
          style={styles.segmentedButtons}
        />

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <Surface style={[styles.emptyBox, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <MaterialCommunityIcons name="flag-checkered" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 12 }}>
              No targets configured yet
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
              Set a monthly EMI target for loans or an investment goal. As you record transactions, progress is tracked automatically!
            </Text>
            <Button
              mode="contained"
              buttonColor={theme.colors.primary}
              icon="plus"
              style={{ marginTop: 16, borderRadius: 10 }}
              onPress={handleOpenCreate}
            >
              Set New Target
            </Button>
          </Surface>
        ) : (
          filteredGoals.map((goal) => {
            const isLoan = goal.goal_type === 'LOAN';
            const progress = (goal.progress_percentage ?? 0) / 100;
            const currentMonthPaid = goal.current_month_paid_paise ?? 0;
            const isMonthMet = currentMonthPaid >= goal.monthly_target_paise;
            const monthRemaining = Math.max(0, goal.monthly_target_paise - currentMonthPaid);

            return (
              <Surface key={goal.id} style={[styles.goalCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: `${goal.category_color || theme.colors.primary}20` }]}>
                    <MaterialCommunityIcons
                      name={(goal.category_icon as any) || (isLoan ? 'bank' : 'chart-line')}
                      size={24}
                      color={goal.category_color || theme.colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>
                        {goal.name}
                      </Text>
                    </View>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {goal.category_name} • Started {formatDisplayDate(goal.start_date)}
                    </Text>
                  </View>
                  <Chip
                    compact
                    style={{
                      height: 24,
                      backgroundColor: isLoan ? `${theme.colors.expense}18` : `${theme.colors.income}18`,
                    }}
                    textStyle={{
                      fontSize: 10,
                      lineHeight: 12,
                      fontWeight: '700',
                      color: isLoan ? theme.colors.expense : theme.colors.income,
                    }}
                  >
                    {isLoan ? 'LOAN PAYOFF' : 'INVESTMENT'}
                  </Chip>
                </View>

                {/* Progress Bar Section */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                      {isLoan ? 'Total Repaid' : 'Total Accumulated'}
                    </Text>
                    <Text variant="labelMedium" style={{ color: isLoan ? theme.colors.primary : theme.colors.income, fontWeight: '700' }}>
                      {goal.progress_percentage}%
                    </Text>
                  </View>
                  <ProgressBar
                    progress={progress}
                    color={isLoan ? theme.colors.primary : theme.colors.income}
                    style={styles.progressBar}
                  />
                  <View style={styles.progressSubtextRow}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Paid: {formatPaiseToRupees(goal.total_paid_paise ?? 0)}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Target: {formatPaiseToRupees(goal.target_amount_paise)}
                    </Text>
                  </View>
                </View>

                {/* Remaining Highlights */}
                <View style={[styles.statsBox, { backgroundColor: theme.colors.elevation.level1 }]}>
                  <View style={styles.statCol}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {isLoan ? 'Remaining Debt' : 'Remaining to Goal'}
                    </Text>
                    <Text variant="titleSmall" style={{ color: isLoan ? theme.colors.expense : theme.colors.primary, fontWeight: '700' }}>
                      {formatPaiseToRupees(goal.remaining_paise ?? 0)}
                    </Text>
                  </View>
                  <Divider style={styles.verticalDivider} />
                  <View style={styles.statCol}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Remaining Tenure
                    </Text>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                      ~{goal.remaining_months} months
                    </Text>
                  </View>
                </View>

                {/* Monthly Tracker Highlight */}
                <Surface style={[styles.monthlyStatusCard, { backgroundColor: isMonthMet ? `${theme.colors.income}15` : `${theme.colors.expense}12` }]} elevation={0}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons
                        name={isMonthMet ? 'check-decagram' : 'clock-alert-outline'}
                        size={20}
                        color={isMonthMet ? theme.colors.income : theme.colors.expense}
                      />
                      <Text variant="bodySmall" style={{ fontWeight: '700', marginLeft: 6, color: isMonthMet ? theme.colors.income : theme.colors.expense }}>
                        {isMonthMet ? 'This Month Target Paid!' : 'This Month Payment Pending'}
                      </Text>
                    </View>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Target: {formatPaiseToRupees(goal.monthly_target_paise)}/mo
                    </Text>
                  </View>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Paid this month: {formatPaiseToRupees(currentMonthPaid)}
                    {!isMonthMet && monthRemaining > 0 ? ` (${formatPaiseToRupees(monthRemaining)} remaining)` : ''}
                  </Text>
                </Surface>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <Button
                    mode="text"
                    compact
                    icon="format-list-bulleted"
                    textColor={theme.colors.primary}
                    onPress={() => handleInspectTransactions(goal)}
                  >
                    View Payments
                  </Button>
                  <View style={{ flex: 1 }} />
                  <IconButton icon="pencil-outline" size={18} onPress={() => handleOpenEdit(goal)} />
                  <IconButton icon="trash-can-outline" size={18} iconColor={theme.colors.error} onPress={() => handleDeleteGoal(goal)} />
                </View>
              </Surface>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        label="Set Target"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={handleOpenCreate}
      />

      {/* Add / Edit Goal Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modalBox, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {editingGoal ? 'Edit Target' : 'Set Loan / Investment Target'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, marginBottom: 12 }}>
              Link a category to automatically track monthly payments and overall debt reduction.
            </Text>

            {/* Target Type Toggle */}
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
              Target Type:
            </Text>
            <SegmentedButtons
              value={goalType}
              onValueChange={(val) => {
                setGoalType(val as GoalType);
                // Adjust selected category if needed
                const match = categories.filter((c) => val === 'LOAN' ? c.type === 'EXPENSE' : true);
                if (match.length > 0) setSelectedCatId(match[0].id);
              }}
              buttons={[
                { value: 'LOAN', label: 'Loan Payoff', icon: 'bank' },
                { value: 'INVESTMENT', label: 'Investment Goal', icon: 'trending-up' },
              ]}
              style={{ marginBottom: 12 }}
            />

            {/* Target Name */}
            <TextInput
              label="Target Name *"
              value={name}
              onChangeText={setName}
              placeholder={goalType === 'LOAN' ? 'e.g. HDFC Personal Loan, Car Loan' : 'e.g. Mutual Fund SIP, Bachat Gat'}
              mode="outlined"
              style={styles.modalInput}
            />

            {/* Category Selector */}
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, marginBottom: 6 }}>
              Select Linked Category *:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {availableCategories.map((c) => (
                  <Chip
                    key={c.id}
                    selected={selectedCatId === c.id}
                    onPress={() => setSelectedCatId(c.id)}
                    style={selectedCatId === c.id ? { backgroundColor: theme.colors.primaryContainer } : {}}
                    avatar={<MaterialCommunityIcons name={(c.icon as any) || 'circle'} size={18} color={c.color} />}
                  >
                    {c.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>

            {/* Target Total Amount */}
            <TextInput
              label={goalType === 'LOAN' ? 'Total Loan Principal (₹) *' : 'Total Investment Target (₹) *'}
              value={targetAmountStr}
              onChangeText={handleTargetAmountChange}
              keyboardType="numeric"
              placeholder="e.g. 200000"
              mode="outlined"
              style={styles.modalInput}
            />

            {/* Period / Tenure */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                label="Tenure (Months) *"
                value={tenureMonthsStr}
                onChangeText={handleTenureChange}
                keyboardType="numeric"
                placeholder="24"
                mode="outlined"
                style={[styles.modalInput, { flex: 1 }]}
              />

              <TextInput
                label="Monthly Target (₹) *"
                value={monthlyTargetStr}
                onChangeText={setMonthlyTargetStr}
                keyboardType="numeric"
                placeholder="8333"
                mode="outlined"
                style={[styles.modalInput, { flex: 1.3 }]}
              />
            </View>

            {/* Start Date */}
            <TextInput
              label="Start Date (YYYY-MM-DD)"
              value={startDateStr}
              onChangeText={setStartDateStr}
              placeholder="2026-11-01"
              mode="outlined"
              style={styles.modalInput}
            />

            {/* Notes */}
            <TextInput
              label="Notes / Account No. (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Loan A/C: 12345678, Branch: Pune"
              mode="outlined"
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button mode="contained" buttonColor={theme.colors.primary} onPress={handleSaveGoal}>
                {editingGoal ? 'Update Target' : 'Create Target'}
              </Button>
            </View>
          </ScrollView>
        </Modal>

        {/* Transactions Inspection Modal */}
        <Modal
          visible={showTxnsModal}
          onDismiss={() => setShowTxnsModal(false)}
          contentContainerStyle={[styles.modalBox, { backgroundColor: theme.colors.surface, maxHeight: '85%' }]}
        >
          {viewingGoal && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconCircle, { backgroundColor: `${viewingGoal.category_color || theme.colors.primary}20` }]}>
                  <MaterialCommunityIcons
                    name={(viewingGoal.category_icon as any) || 'bank'}
                    size={24}
                    color={viewingGoal.category_color || theme.colors.primary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {viewingGoal.name} Payments
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {goalTransactions.length} recorded transaction{goalTransactions.length === 1 ? '' : 's'} • Total Paid: {formatPaiseToRupees(viewingGoal.total_paid_paise ?? 0)}
                  </Text>
                </View>
                <IconButton icon="close" size={20} onPress={() => setShowTxnsModal(false)} />
              </View>

              <Divider style={{ marginVertical: 10 }} />

              {goalTransactions.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    No payment transactions recorded for this category yet
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={goalTransactions}
                  keyExtractor={(item) => item.id.toString()}
                  style={{ maxHeight: 320 }}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.txnCard, { backgroundColor: theme.colors.elevation.level1 }]}
                      onPress={() => {
                        setShowTxnsModal(false);
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
                        <Text variant="bodyMedium" style={{ color: viewingGoal.goal_type === 'LOAN' ? theme.colors.expense : theme.colors.income, fontWeight: '700' }}>
                          {formatPaiseToRupees(item.amount_paise)}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} style={{ marginTop: 2 }} />
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}

              <Divider style={{ marginVertical: 10 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Button mode="contained" buttonColor={theme.colors.primary} onPress={() => setShowTxnsModal(false)}>
                  Close
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  summaryBanner: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  kpiCol: {
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 10,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  emptyBox: {
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  goalCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressSubtextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statsBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
  },
  monthlyStatusCard: {
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
    borderRadius: 20,
    maxHeight: '90%',
  },
  modalInput: {
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 10,
  },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
});
