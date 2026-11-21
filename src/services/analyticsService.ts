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

    return rows.map((r) => ({
      name: r.name,
      amountRupees: Math.round(r.amount_paise / 100),
      color: r.color || (type === 'INCOME' ? '#10B981' : '#1565C0'),
      legendFontColor,
      legendFontSize: 12,
    }));
  },
};
