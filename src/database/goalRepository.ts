import { getDb } from './database';
import { FinancialGoal } from '../types';
import { getCurrentMonthRange } from '../utils/dateUtils';

export const goalRepository = {
  getAll: (onlyActive = false): FinancialGoal[] => {
    const db = getDb();
    const curMonth = getCurrentMonthRange();

    const activeClause = onlyActive ? 'WHERE g.is_active = 1' : '';
    const query = `
      SELECT 
        g.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        COALESCE((
          SELECT SUM(t.amount_paise)
          FROM transactions t
          WHERE t.category_id = g.category_id
            AND t.transaction_date >= g.start_date
            AND (g.end_date IS NULL OR t.transaction_date <= g.end_date)
        ), 0) AS total_paid_paise,
        COALESCE((
          SELECT SUM(t.amount_paise)
          FROM transactions t
          WHERE t.category_id = g.category_id
            AND t.transaction_date >= ?
            AND t.transaction_date <= ?
        ), 0) AS current_month_paid_paise
      FROM financial_goals g
      JOIN categories c ON g.category_id = c.id
      ${activeClause}
      ORDER BY g.is_active DESC, g.goal_type ASC, g.created_at DESC;
    `;

    const rows = db.getAllSync<FinancialGoal>(query, [curMonth.start, curMonth.end]);

    return rows.map((g) => {
      const totalPaid = g.total_paid_paise ?? 0;
      const target = g.target_amount_paise;
      const monthlyTarget = g.monthly_target_paise;
      const remainingPaise = Math.max(0, target - totalPaid);
      const progressPercentage = target > 0 ? Math.min(100, Math.round((totalPaid / target) * 100)) : 0;
      const remainingMonths = monthlyTarget > 0 ? Math.ceil(remainingPaise / monthlyTarget) : 0;

      return {
        ...g,
        total_paid_paise: totalPaid,
        current_month_paid_paise: g.current_month_paid_paise ?? 0,
        progress_percentage: progressPercentage,
        remaining_paise: remainingPaise,
        remaining_months: remainingMonths,
      };
    });
  },

  getById: (id: number): FinancialGoal | null => {
    const all = goalRepository.getAll(false);
    return all.find((g) => g.id === id) || null;
  },

  create: (goal: Omit<FinancialGoal, 'id' | 'created_at' | 'updated_at'>): number => {
    const db = getDb();
    const result = db.runSync(
      `INSERT INTO financial_goals (
        name, goal_type, category_id, target_amount_paise,
        monthly_target_paise, start_date, end_date, tenure_months, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        goal.name,
        goal.goal_type,
        goal.category_id,
        goal.target_amount_paise,
        goal.monthly_target_paise,
        goal.start_date,
        goal.end_date ?? null,
        goal.tenure_months ?? null,
        goal.notes ?? null,
        goal.is_active ?? 1,
      ]
    );
    return result.lastInsertRowId;
  },

  update: (id: number, data: Partial<FinancialGoal>): void => {
    const db = getDb();
    const current = goalRepository.getById(id);
    if (!current) throw new Error(`Goal ${id} not found`);

    const updated = { ...current, ...data };
    db.runSync(
      `UPDATE financial_goals
       SET name = ?, goal_type = ?, category_id = ?, target_amount_paise = ?,
           monthly_target_paise = ?, start_date = ?, end_date = ?, tenure_months = ?,
           notes = ?, is_active = ?, updated_at = (datetime('now', 'localtime'))
       WHERE id = ?;`,
      [
        updated.name,
        updated.goal_type,
        updated.category_id,
        updated.target_amount_paise,
        updated.monthly_target_paise,
        updated.start_date,
        updated.end_date ?? null,
        updated.tenure_months ?? null,
        updated.notes ?? null,
        updated.is_active,
        id,
      ]
    );
  },

  delete: (id: number): void => {
    const db = getDb();
    db.runSync('DELETE FROM financial_goals WHERE id = ?;', [id]);
  },
};
