import { describe, test, expect } from '@jest/globals';
import { formatPaiseToRupees, parseRupeesToPaise } from '../src/utils/currency';

describe('Financial Calculation & Currency Formatting Tests', () => {
  describe('formatPaiseToRupees', () => {
    test('formats positive whole amount correctly with en-IN separators', () => {
      expect(formatPaiseToRupees(100000)).toBe('₹1,000.00');
      expect(formatPaiseToRupees(4500000)).toBe('₹45,000.00');
      expect(formatPaiseToRupees(123456700)).toBe('₹12,34,567.00');
    });

    test('formats fractional paise amounts correctly', () => {
      expect(formatPaiseToRupees(10050)).toBe('₹100.50');
      expect(formatPaiseToRupees(5)).toBe('₹0.05');
      expect(formatPaiseToRupees(0)).toBe('₹0.00');
    });

    test('formats negative amounts correctly with negative sign prefix', () => {
      expect(formatPaiseToRupees(-50000)).toBe('-₹500.00');
      expect(formatPaiseToRupees(-10050)).toBe('-₹100.50');
    });

    test('respects showDecimals and showSymbol options', () => {
      expect(formatPaiseToRupees(50000, { showDecimals: false })).toBe('₹500');
      expect(formatPaiseToRupees(50000, { showSymbol: false })).toBe('500.00');
      expect(formatPaiseToRupees(50000, { showSymbol: false, showDecimals: false })).toBe('500');
    });
  });

  describe('parseRupeesToPaise', () => {
    test('converts whole strings to paise', () => {
      expect(parseRupeesToPaise('100')).toBe(10000);
      expect(parseRupeesToPaise('0')).toBe(0);
      expect(parseRupeesToPaise('45000')).toBe(4500000);
    });

    test('converts decimal strings to paise correctly without float error', () => {
      expect(parseRupeesToPaise('100.50')).toBe(10050);
      expect(parseRupeesToPaise('0.05')).toBe(5);
      expect(parseRupeesToPaise('99.99')).toBe(9999);
      expect(parseRupeesToPaise('100.5')).toBe(10050);
    });

    test('handles empty or malformed inputs gracefully', () => {
      expect(parseRupeesToPaise('')).toBe(0);
      expect(parseRupeesToPaise('abc')).toBe(0);
      expect(parseRupeesToPaise('₹1,500.25')).toBe(150025);
    });
  });

  describe('Savings Rate & KPI Edge Cases', () => {
    const calculateSavingsRate = (incomePaise: number, expensePaise: number): string => {
      const netSavingsPaise = incomePaise - expensePaise;
      if (incomePaise <= 0) return '---';
      const rate = ((netSavingsPaise / incomePaise) * 100).toFixed(1);
      return `${rate}%`;
    };

    test('handles zero income without division by zero', () => {
      expect(calculateSavingsRate(0, 50000)).toBe('---');
      expect(calculateSavingsRate(0, 0)).toBe('---');
    });

    test('calculates 100% savings rate when income only', () => {
      expect(calculateSavingsRate(100000, 0)).toBe('100.0%');
    });

    test('calculates 0% when income equals expense', () => {
      expect(calculateSavingsRate(50000, 50000)).toBe('0.0%');
    });

    test('calculates negative savings rate when expenses exceed income', () => {
      expect(calculateSavingsRate(50000, 80000)).toBe('-60.0%');
    });

    test('calculates typical savings rate accurately', () => {
      // 50,000 income, 30,000 expense -> 20,000 savings = 40%
      expect(calculateSavingsRate(5000000, 3000000)).toBe('40.0%');
    });
  });
});
