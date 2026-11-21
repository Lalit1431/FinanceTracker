import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import { budgetRepository } from '../../database/budgetRepository';
import { categoryRepository } from '../../database/categoryRepository';
import { Budget, Category } from '../../types';
import { formatPaiseToRupees, parseRupeesToPaise } from '../../utils/currency';

export const BudgetsScreen = () => {
  const theme = useAppTheme();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [amountStr, setAmountStr] = useState('');

  const loadData = () => {
    const list = budgetRepository.getForMonth(currentMonth, currentYear);
    setBudgets(list);
    const expCats = categoryRepository.getByType('EXPENSE', true);
    setCategories(expCats);
    if (expCats.length > 0 && !selectedCatId) {
      setSelectedCatId(expCats[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBudget = () => {
    if (!selectedCatId) {
      Alert.alert('Error', 'Please select an expense category');
      return;
    }

    const amountPaise = parseRupeesToPaise(amountStr);
    if (amountPaise <= 0) {
      Alert.alert('Error', 'Please enter a budget amount greater than ₹0');
      return;
    }

    try {
      budgetRepository.upsert(selectedCatId, currentMonth, currentYear, amountPaise);
      setAmountStr('');
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save budget');
    }
  };

  const handleDeleteBudget = (id: number) => {
    budgetRepository.delete(id);
    loadData();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="bullseye-arrow"
              size={54}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}
            >
              No category budgets set for this month.
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}
            >
              Tap the button below to define your first spending limit.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const spent = item.spent_paise ?? 0;
          const budget = item.amount_paise;
          const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
          const progress = Math.min(spent / budget, 1);
          const remaining = budget - spent;

          let statusColor = theme.colors.budgetOk;
          let statusText = 'On Track';

          if (percentUsed >= 100) {
            statusColor = theme.colors.budgetOver;
            statusText = 'Over Budget!';
          } else if (percentUsed >= 75) {
            statusColor = theme.colors.budgetWarn;
            statusText = 'Near Limit';
          }

          return (
            <Surface style={[styles.budgetCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${item.category_color ?? '#1565C0'}18` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={(item.category_icon as any) || 'circle'}
                      size={20}
                      color={item.category_color ?? theme.colors.primary}
                    />
                  </View>
                  <View>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                      {item.category_name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: statusColor, fontWeight: '600' }}>
                      {percentUsed.toFixed(0)}% used • {statusText}
                    </Text>
                  </View>
                </View>

                <Button
                  compact
                  mode="text"
                  textColor={theme.colors.expense}
                  onPress={() => handleDeleteBudget(item.id)}
                >
                  Remove
                </Button>
              </View>

              <ProgressBar
                progress={progress}
                color={statusColor}
                style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}
              />

              <View style={styles.cardFooter}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Spent: <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>{formatPaiseToRupees(spent)}</Text>
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Limit: <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>{formatPaiseToRupees(budget)}</Text>
                </Text>
              </View>
              <Text
                variant="labelSmall"
                style={{
                  marginTop: 4,
                  color: remaining >= 0 ? theme.colors.onSurfaceVariant : theme.colors.expense,
                }}
              >
                {remaining >= 0
                  ? `${formatPaiseToRupees(remaining)} left to spend`
                  : `${formatPaiseToRupees(Math.abs(remaining))} over limit`}
              </Text>
            </Surface>
          );
        }}
      />

      <FAB
        icon="plus"
        label="Set Budget"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => setModalVisible(true)}
      />

      {/* Add / Update Budget Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modalBox, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Set Monthly Budget
          </Text>

          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Select Expense Category:
          </Text>
          <View style={styles.catScroll}>
            {categories.map((c) => (
              <Chip
                key={c.id}
                selected={selectedCatId === c.id}
                onPress={() => setSelectedCatId(c.id)}
                style={[
                  styles.catChip,
                  selectedCatId === c.id && { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                {c.name}
              </Chip>
            ))}
          </View>

          <TextInput
            label="Monthly Limit (₹) *"
            value={amountStr}
            onChangeText={setAmountStr}
            keyboardType="decimal-pad"
            mode="outlined"
            placeholder="e.g. 5000"
            style={styles.modalInput}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          <View style={styles.modalActions}>
            <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button mode="contained" buttonColor={theme.colors.primary} onPress={handleSaveBudget}>
              Save Budget
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  budgetCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginTop: 12,
  },
  catScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  catChip: {
    borderRadius: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
});
