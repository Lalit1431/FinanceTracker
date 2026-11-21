import { getDb } from './database';
import { Budget } from '../types';

export const budgetRepository = {
  getForMonth: (month: number, year: number): Budget[] => {
    const db = getDb();
    const query = `
      SELECT 
        b.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        COALESCE((
          SELECT SUM(t.amount_paise)
          FROM transactions t
          WHERE t.category_id = b.category_id
            AND t.type = 'EXPENSE'
            AND strftime('%m', t.transaction_date) = printf('%02d', b.month)
            AND strftime('%Y', t.transaction_date) = printf('%04d', b.year)
        ), 0) AS spent_paise
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.month = ? AND b.year = ?
      ORDER BY c.name ASC;
    `;
    return db.getAllSync<Budget>(query, [month, year]);
  },

  upsert: (categoryId: number, month: number, year: number, amountPaise: number): void => {
    const db = getDb();
    db.runSync(
      `INSERT INTO budgets (category_id, month, year, amount_paise)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(category_id, month, year) DO UPDATE SET
         amount_paise = excluded.amount_paise,
         updated_at = (datetime('now', 'localtime'));`,
      [categoryId, month, year, amountPaise]
    );
  },

  delete: (id: number): void => {
    const db = getDb();
    db.runSync('DELETE FROM budgets WHERE id = ?;', [id]);
  },
};
