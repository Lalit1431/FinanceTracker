import { getDb } from '../database/database';
import { getCurrentMonthRange, getPreviousMonthRange } from '../utils/dateUtils';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface ExtendedKPIs {
  avgDailyExpensePaise: number;
  highestExpenseCategory: { name: string; amountPaise: number; color: string } | null;
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
}

export interface MonthlyTrendData {
  labels: string[];
  incomeRupees: number[];
  expenseRupees: number[];
}

export interface ChartCategoryData {
  name: string;
  amountRupees: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

export const CHART_PALETTES = {
  EXPENSE: [
    '#2563EB', // Vibrant Royal Blue
    '#F97316', // Bright Orange
    '#10B981', // Emerald Green
    '#8B5CF6', // Purple / Violet
    '#EF4444', // Crimson Red
    '#06B6D4', // Cyan
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
  ],
  INCOME: [
    '#10B981', // Emerald Green
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ],
};

export const analyticsService = {
  getExtendedKPIs: (): ExtendedKPIs => {
    const db = getDb();
    const current = getCurrentMonthRange();
    const previous = getPreviousMonthRange();

    // 1. Current month totals
    const curTotals = db.getFirstSync<{ income: number; expense: number }>(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_paise ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount_paise ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE transaction_date >= ? AND transaction_date <= ?;`,
      [current.start, current.end]
    );

    // 2. Previous month totals
    const prevTotals = db.getFirstSync<{ income: number; expense: number }>(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_paise ELSE 0 END), 0) AS income,
         COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount_paise ELSE 0 END), 0) AS expense
       FROM transactions
       WHERE transaction_date >= ? AND transaction_date <= ?;`,
      [previous.start, previous.end]
    );

    const curExpense = curTotals ? curTotals.expense : 0;
    const curIncome = curTotals ? curTotals.income : 0;
    const prevExpense = prevTotals ? prevTotals.expense : 0;
    const prevIncome = prevTotals ? prevTotals.income : 0;

    // Days elapsed in current month
    const today = new Date();
    const elapsedDays = Math.max(1, today.getDate());
    const avgDailyExpensePaise = Math.round(curExpense / elapsedDays);

    // Highest expense category this month
    const highestRow = db.getFirstSync<{ name: string; amount_paise: number; color: string }>(
      `SELECT c.name, c.color, SUM(t.amount_paise) AS amount_paise
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = 'EXPENSE' AND t.transaction_date >= ? AND t.transaction_date <= ?
       GROUP BY c.id
       ORDER BY amount_paise DESC
       LIMIT 1;`,
      [current.start, current.end]
    );

    const highestExpenseCategory = highestRow
      ? { name: highestRow.name, amountPaise: highestRow.amount_paise, color: highestRow.color }
      : null;

    // Percentage changes vs previous month
    const incomeChangePercent =
      prevIncome > 0 ? Math.round(((curIncome - prevIncome) / prevIncome) * 100) : null;
    const expenseChangePercent =
      prevExpense > 0 ? Math.round(((curExpense - prevExpense) / prevExpense) * 100) : null;

    return {
      avgDailyExpensePaise,
      highestExpenseCategory,
      incomeChangePercent,
      expenseChangePercent,
    };
  },

  getLast6MonthsTrends: (): MonthlyTrendData => {
    const db = getDb();
    const labels: string[] = [];
    const incomeRupees: number[] = [];
    const expenseRupees: number[] = [];

    const now = new Date();
    // 6 months ago up to current month
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      const monthLabel = format(monthDate, 'MMM');

      labels.push(monthLabel);

      const res = db.getFirstSync<{ income: number; expense: number }>(
        `SELECT 
           COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_paise ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount_paise ELSE 0 END), 0) AS expense
         FROM transactions
         WHERE transaction_date >= ? AND transaction_date <= ?;`,
        [start, end]
      );

      incomeRupees.push(res ? Math.round(res.income / 100) : 0);
      expenseRupees.push(res ? Math.round(res.expense / 100) : 0);
    }

    return {
      labels,
      incomeRupees,
      expenseRupees,
    };
  },

  getCategoryDistribution: (
    startDate: string,
    endDate: string,
    type: 'EXPENSE' | 'INCOME' = 'EXPENSE',
    legendFontColor: string = '#78909C'
  ): ChartCategoryData[] => {
    const db = getDb();
    const rows = db.getAllSync<{ name: string; amount_paise: number; color: string }>(
      `SELECT c.name, c.color, SUM(t.amount_paise) AS amount_paise
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.type = ? AND t.transaction_date >= ? AND t.transaction_date <= ?
       GROUP BY c.id
       ORDER BY amount_paise DESC
       LIMIT 6;`,
      [type, startDate, endDate]
    );

    const palette = type === 'INCOME' ? CHART_PALETTES.INCOME : CHART_PALETTES.EXPENSE;
    const usedColors = new Set<string>();

    return rows.map((r, index) => {
      let sliceColor = r.color;
      // If color is missing, default generic blue, or already used by another slice,
      // assign a distinct contrasting palette color so every section is clearly visible
      if (!sliceColor || sliceColor === '#1565C0' || usedColors.has(sliceColor)) {
        sliceColor = palette[index % palette.length];
      }
      usedColors.add(sliceColor);

      return {
        name: r.name,
        amountRupees: Math.round(r.amount_paise / 100),
        color: sliceColor,
        legendFontColor,
        legendFontSize: 11,
      };
    });
  },
};
