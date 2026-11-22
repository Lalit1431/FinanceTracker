import { describe, test, expect } from '@jest/globals';
import { FinancialGoal, GoalType } from '../src/types';

describe('Financial Goals & Loan Targets Calculation Logic', () => {
  interface MockTransaction {
    id: number;
    category_id: number;
    amount_paise: number;
    transaction_date: string;
  }

  const computeGoalMetrics = (
    goal: Omit<FinancialGoal, 'id' | 'created_at'>,
    transactions: MockTransaction[],
    currentMonthStart: string,
    currentMonthEnd: string
  ) => {
    // Total paid from start_date up to end_date (if specified)
    const totalPaidPaise = transactions
      .filter((t) => {
        if (t.category_id !== goal.category_id) return false;
        if (t.transaction_date < goal.start_date) return false;
        if (goal.end_date && t.transaction_date > goal.end_date) return false;
        return true;
      })
      .reduce((sum, t) => sum + t.amount_paise, 0);

    // Current month payment
    const currentMonthPaidPaise = transactions
      .filter((t) => {
        if (t.category_id !== goal.category_id) return false;
        return t.transaction_date >= currentMonthStart && t.transaction_date <= currentMonthEnd;
      })
      .reduce((sum, t) => sum + t.amount_paise, 0);

    const target = goal.target_amount_paise;
    const monthlyTarget = goal.monthly_target_paise;
    const remainingPaise = Math.max(0, target - totalPaidPaise);
    const progressPercentage = target > 0 ? Math.min(100, Math.round((totalPaidPaise / target) * 100)) : 0;
    const remainingMonths = monthlyTarget > 0 ? Math.ceil(remainingPaise / monthlyTarget) : 0;
    const isCurrentMonthMet = currentMonthPaidPaise >= monthlyTarget;
    const currentMonthRemainingPaise = Math.max(0, monthlyTarget - currentMonthPaidPaise);

    return {
      total_paid_paise: totalPaidPaise,
      current_month_paid_paise: currentMonthPaidPaise,
      remaining_paise: remainingPaise,
      progress_percentage: progressPercentage,
      remaining_months: remainingMonths,
      is_current_month_met: isCurrentMonthMet,
      current_month_remaining_paise: currentMonthRemainingPaise,
    };
  };

  const currentMonthStart = '2026-11-01';
  const currentMonthEnd = '2026-11-30';

  describe('Loan Payoff Tracking (e.g. Personal loan, Asha loan)', () => {
    test('calculates correct payoff progress and remaining debt', () => {
      const personalLoanGoal: Omit<FinancialGoal, 'id' | 'created_at'> = {
        name: 'Personal Loan Payoff',
        goal_type: 'LOAN',
        category_id: 10,
        target_amount_paise: 10000000, // ₹1,00,000 target
        monthly_target_paise: 604100,   // ₹6,041/month EMI
        start_date: '2026-08-01',
        tenure_months: 17,
        is_active: 1,
      };

      const txns: MockTransaction[] = [
        { id: 1, category_id: 10, amount_paise: 604100, transaction_date: '2026-08-10' },
        { id: 2, category_id: 10, amount_paise: 604100, transaction_date: '2026-09-10' },
        { id: 3, category_id: 10, amount_paise: 604100, transaction_date: '2026-10-10' },
        { id: 4, category_id: 10, amount_paise: 604100, transaction_date: '2026-11-05' },
      ];

      const metrics = computeGoalMetrics(personalLoanGoal, txns, currentMonthStart, currentMonthEnd);

      expect(metrics.total_paid_paise).toBe(2416400); // 4 * 604100 = ₹24,164
      expect(metrics.remaining_paise).toBe(7583600);   // ₹75,836 left to pay
      expect(metrics.progress_percentage).toBe(24);   // 24%
      expect(metrics.remaining_months).toBe(13);       // ceil(7583600 / 604100) = 13 months left
      expect(metrics.current_month_paid_paise).toBe(604100);
      expect(metrics.is_current_month_met).toBe(true);
      expect(metrics.current_month_remaining_paise).toBe(0);
    });

    test('correctly handles full debt payoff and clamps progress to 100%', () => {
      const ashaLoanGoal: Omit<FinancialGoal, 'id' | 'created_at'> = {
        name: 'Asha Loan Payoff',
        goal_type: 'LOAN',
        category_id: 11,
        target_amount_paise: 5000000, // ₹50,000
        monthly_target_paise: 500000,  // ₹5,000/month
        start_date: '2026-01-01',
        is_active: 1,
      };

      const txns: MockTransaction[] = [
        { id: 1, category_id: 11, amount_paise: 5200000, transaction_date: '2026-11-15' },
      ];

      const metrics = computeGoalMetrics(ashaLoanGoal, txns, currentMonthStart, currentMonthEnd);

      expect(metrics.total_paid_paise).toBe(5200000);
      expect(metrics.remaining_paise).toBe(0); // Clamped at 0
      expect(metrics.progress_percentage).toBe(100);
      expect(metrics.remaining_months).toBe(0);
      expect(metrics.is_current_month_met).toBe(true);
    });
  });

  describe('Monthly Investment / Savings Target Tracking (e.g. Bachat gat, Lic, Mutual Fund)', () => {
    test('tracks pending vs completed status for monthly investment target', () => {
      const bachatGatGoal: Omit<FinancialGoal, 'id' | 'created_at'> = {
        name: 'Bachat Gat Monthly Target',
        goal_type: 'INVESTMENT',
        category_id: 12,
        target_amount_paise: 7200000, // ₹72,000 annual target
        monthly_target_paise: 600000,  // ₹6,000/month
        start_date: '2026-01-01',
        tenure_months: 12,
        is_active: 1,
      };

      // Case 1: No payment in current month yet
      const txnsMonthPending: MockTransaction[] = [
        { id: 1, category_id: 12, amount_paise: 600000, transaction_date: '2026-10-05' },
      ];
      const pendingMetrics = computeGoalMetrics(bachatGatGoal, txnsMonthPending, currentMonthStart, currentMonthEnd);
      expect(pendingMetrics.current_month_paid_paise).toBe(0);
      expect(pendingMetrics.is_current_month_met).toBe(false);
      expect(pendingMetrics.current_month_remaining_paise).toBe(600000); // ₹6,000 needed

      // Case 2: Partial payment in current month
      const txnsPartial: MockTransaction[] = [
        { id: 1, category_id: 12, amount_paise: 600000, transaction_date: '2026-10-05' },
        { id: 2, category_id: 12, amount_paise: 350000, transaction_date: '2026-11-10' },
      ];
      const partialMetrics = computeGoalMetrics(bachatGatGoal, txnsPartial, currentMonthStart, currentMonthEnd);
      expect(partialMetrics.current_month_paid_paise).toBe(350000);
      expect(partialMetrics.is_current_month_met).toBe(false);
      expect(partialMetrics.current_month_remaining_paise).toBe(250000); // ₹2,500 needed

      // Case 3: Full payment in current month
      const txnsMet: MockTransaction[] = [
        ...txnsPartial,
        { id: 3, category_id: 12, amount_paise: 250000, transaction_date: '2026-11-20' },
      ];
      const metMetrics = computeGoalMetrics(bachatGatGoal, txnsMet, currentMonthStart, currentMonthEnd);
      expect(metMetrics.current_month_paid_paise).toBe(600000);
      expect(metMetrics.is_current_month_met).toBe(true);
      expect(metMetrics.current_month_remaining_paise).toBe(0);
    });

    test('ignores historical transactions prior to goal start_date', () => {
      const licGoal: Omit<FinancialGoal, 'id' | 'created_at'> = {
        name: 'LIC Policy 2026',
        goal_type: 'INVESTMENT',
        category_id: 15,
        target_amount_paise: 6308400, // ₹63,084
        monthly_target_paise: 525700,  // ₹5,257/month
        start_date: '2026-06-01',
        is_active: 1,
      };

      const txns: MockTransaction[] = [
        { id: 1, category_id: 15, amount_paise: 525700, transaction_date: '2026-01-10' }, // Before start_date -> ignored
        { id: 2, category_id: 15, amount_paise: 525700, transaction_date: '2026-05-10' }, // Before start_date -> ignored
        { id: 3, category_id: 15, amount_paise: 525700, transaction_date: '2026-06-10' }, // Valid
        { id: 4, category_id: 15, amount_paise: 525700, transaction_date: '2026-07-10' }, // Valid
      ];

      const metrics = computeGoalMetrics(licGoal, txns, currentMonthStart, currentMonthEnd);
      expect(metrics.total_paid_paise).toBe(1051400); // Only 2 transactions counted
      expect(metrics.remaining_paise).toBe(5257000);
      expect(metrics.progress_percentage).toBe(17);
    });
  });

  describe('Edge Cases and Safety Checks', () => {
    test('handles zero target or zero monthly target without errors', () => {
      const zeroGoal: Omit<FinancialGoal, 'id' | 'created_at'> = {
        name: 'Zero Target Edge Case',
        goal_type: 'INVESTMENT',
        category_id: 99,
        target_amount_paise: 0,
        monthly_target_paise: 0,
        start_date: '2026-01-01',
        is_active: 1,
      };

      const metrics = computeGoalMetrics(zeroGoal, [], currentMonthStart, currentMonthEnd);
      expect(metrics.progress_percentage).toBe(0);
      expect(metrics.remaining_months).toBe(0);
      expect(metrics.remaining_paise).toBe(0);
    });
  });
});
