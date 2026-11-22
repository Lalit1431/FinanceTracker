import { describe, test, expect } from '@jest/globals';
import {
  getCurrentMonthRange,
  getPreviousMonthRange,
  getLast30DaysRange,
  getCurrentYearRange,
  formatDisplayDate,
} from '../src/utils/dateUtils';

interface TestTransaction {
  id: number;
  transaction_date: string;
  amount: number;
  description: string;
}

const filterTransactionsByDate = (
  list: TestTransaction[],
  startDate?: string,
  endDate?: string
): TestTransaction[] => {
  return list.filter((t) => {
    if (startDate && t.transaction_date < startDate) return false;
    if (endDate && t.transaction_date > endDate) return false;
    return true;
  });
};

describe('Date Range Filtering Logic & Utility Tests', () => {
  const dummyTxns: TestTransaction[] = [
    { id: 1, transaction_date: '2026-10-15', amount: 500, description: 'October Grocery' },
    { id: 2, transaction_date: '2026-11-01', amount: 1500, description: 'Nov Start Rent' },
    { id: 3, transaction_date: '2026-11-10', amount: 200, description: 'Mid Nov Coffee' },
    { id: 4, transaction_date: '2026-11-20', amount: 800, description: 'Nov Fuel' },
    { id: 5, transaction_date: '2026-12-05', amount: 300, description: 'Dec Holiday' },
  ];

  test('filters transactions strictly within [startDate, endDate] inclusive', () => {
    const result = filterTransactionsByDate(dummyTxns, '2026-11-01', '2026-11-20');
    expect(result.map((r) => r.id)).toEqual([2, 3, 4]);
  });

  test('filters transactions with single day range (start === end)', () => {
    const result = filterTransactionsByDate(dummyTxns, '2026-11-10', '2026-11-10');
    expect(result.map((r) => r.id)).toEqual([3]);
    expect(result[0].description).toBe('Mid Nov Coffee');
  });

  test('filters transactions with only startDate (from date onward)', () => {
    const result = filterTransactionsByDate(dummyTxns, '2026-11-20');
    expect(result.map((r) => r.id)).toEqual([4, 5]);
  });

  test('filters transactions with only endDate (up to date)', () => {
    const result = filterTransactionsByDate(dummyTxns, undefined, '2026-11-01');
    expect(result.map((r) => r.id)).toEqual([1, 2]);
  });

  test('returns all transactions when no date range is provided', () => {
    const result = filterTransactionsByDate(dummyTxns, '', '');
    expect(result.length).toBe(5);
  });

  test('date range utility helpers produce valid ISO date strings (YYYY-MM-DD)', () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;

    const cur = getCurrentMonthRange();
    expect(cur.start).toMatch(isoRegex);
    expect(cur.end).toMatch(isoRegex);
    expect(cur.start <= cur.end).toBe(true);

    const prev = getPreviousMonthRange();
    expect(prev.start).toMatch(isoRegex);
    expect(prev.end).toMatch(isoRegex);
    expect(prev.start <= prev.end).toBe(true);

    const last30 = getLast30DaysRange();
    expect(last30.start).toMatch(isoRegex);
    expect(last30.end).toMatch(isoRegex);
    expect(last30.start <= last30.end).toBe(true);

    const year = getCurrentYearRange();
    expect(year.start).toMatch(isoRegex);
    expect(year.end).toMatch(isoRegex);
    expect(year.start <= year.end).toBe(true);
  });

  test('formatDisplayDate formats valid dates gracefully and leaves invalid dates intact', () => {
    expect(formatDisplayDate('2026-11-21')).toBe('21 Nov 2026');
    expect(formatDisplayDate('invalid-date')).toBe('invalid-date');
  });

  describe('History Filtered KPI Calculations', () => {
    interface HistoryItemTest {
      id: number;
      type?: 'INCOME' | 'EXPENSE';
      amount_paise: number;
      isTransfer: boolean;
      description?: string;
    }

    const computeFilteredKPIs = (items: HistoryItemTest[]) => {
      let income = 0;
      let expense = 0;
      let transfers = 0;

      for (const item of items) {
        if (item.isTransfer) {
          transfers += item.amount_paise;
        } else if (item.type === 'INCOME') {
          income += item.amount_paise;
        } else if (item.type === 'EXPENSE') {
          expense += item.amount_paise;
        }
      }

      return {
        totalIncomePaise: income,
        totalExpensePaise: expense,
        netPaise: income - expense,
        totalTransfersPaise: transfers,
        count: items.length,
      };
    };

    const mockDataset: HistoryItemTest[] = [
      { id: 1, type: 'INCOME', amount_paise: 5000000, isTransfer: false, description: 'Monthly Salary' },
      { id: 2, type: 'EXPENSE', amount_paise: 604100, isTransfer: false, description: 'Personal Loan EMI' },
      { id: 3, type: 'EXPENSE', amount_paise: 600000, isTransfer: false, description: 'Bachat Gat' },
      { id: 4, type: 'EXPENSE', amount_paise: 303000, isTransfer: false, description: 'Electricity Bill' },
      { id: 5, amount_paise: 1000000, isTransfer: true, description: 'ATM Cash Withdrawal' },
    ];

    test('calculates correct Income, Expense, and Net for All items', () => {
      const kpis = computeFilteredKPIs(mockDataset);
      expect(kpis.totalIncomePaise).toBe(5000000); // ₹50,000
      expect(kpis.totalExpensePaise).toBe(1507100); // ₹15,071
      expect(kpis.netPaise).toBe(3492900);         // ₹34,929
      expect(kpis.totalTransfersPaise).toBe(1000000); // ₹10,000
      expect(kpis.count).toBe(5);
    });

    test('calculates correct KPIs when filtered by Expense only', () => {
      const expensesOnly = mockDataset.filter((i) => !i.isTransfer && i.type === 'EXPENSE');
      const kpis = computeFilteredKPIs(expensesOnly);
      expect(kpis.totalIncomePaise).toBe(0);
      expect(kpis.totalExpensePaise).toBe(1507100);
      expect(kpis.netPaise).toBe(-1507100);
      expect(kpis.count).toBe(3);
    });

    test('calculates correct KPIs when search filter is applied (e.g. "Loan")', () => {
      const searchFiltered = mockDataset.filter(
        (i) => i.description && i.description.toLowerCase().includes('loan')
      );
      const kpis = computeFilteredKPIs(searchFiltered);
      expect(kpis.totalIncomePaise).toBe(0);
      expect(kpis.totalExpensePaise).toBe(604100);
      expect(kpis.netPaise).toBe(-604100);
      expect(kpis.count).toBe(1);
    });

    test('calculates correct KPIs when filtered by Transfers only', () => {
      const transfersOnly = mockDataset.filter((i) => i.isTransfer);
      const kpis = computeFilteredKPIs(transfersOnly);
      expect(kpis.totalIncomePaise).toBe(0);
      expect(kpis.totalExpensePaise).toBe(0);
      expect(kpis.netPaise).toBe(0);
      expect(kpis.totalTransfersPaise).toBe(1000000);
      expect(kpis.count).toBe(1);
    });
  });
});
