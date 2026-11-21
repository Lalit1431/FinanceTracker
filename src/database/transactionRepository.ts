import { getDb } from './database';
import { Transaction, TransactionType, PaymentMethod } from '../types';

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  categoryId?: number;
  accountId?: number;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export const transactionRepository = {
  create: (txn: {
    type: TransactionType;
    category_id: number;
    account_id: number;
    amount_paise: number;
    transaction_date: string;
    payment_method: PaymentMethod;
    description: string;
    notes?: string | null;
    is_essential?: number | null;
  }): number => {
    const db = getDb();
    const result = db.runSync(
      `INSERT INTO transactions (
        type, category_id, account_id, amount_paise, 
        transaction_date, payment_method, description, notes, is_essential
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        txn.type,
        txn.category_id,
        txn.account_id,
        txn.amount_paise,
        txn.transaction_date,
        txn.payment_method,
        txn.description,
        txn.notes ?? null,
        txn.is_essential ?? null,
      ]
    );
    return result.lastInsertRowId;
  },

  getById: (id: number): Transaction | null => {
    const db = getDb();
    const query = `
      SELECT 
        t.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        a.name AS account_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      WHERE t.id = ?;
    `;
    return db.getFirstSync<Transaction>(query, [id]);
  },

  getAll: (filter: TransactionFilter = {}): Transaction[] => {
    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.startDate) {
      conditions.push('t.transaction_date >= ?');
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push('t.transaction_date <= ?');
      params.push(filter.endDate);
    }
    if (filter.type) {
      conditions.push('t.type = ?');
      params.push(filter.type);
    }
    if (filter.categoryId) {
      conditions.push('t.category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.accountId) {
      conditions.push('t.account_id = ?');
      params.push(filter.accountId);
    }
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      conditions.push('(t.description LIKE ? OR t.notes LIKE ?)');
      const term = `%${filter.searchQuery.trim()}%`;
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filter.limit ? `LIMIT ${filter.limit}` : '';
    const offsetClause = filter.offset ? `OFFSET ${filter.offset}` : '';

    const query = `
      SELECT 
        t.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        a.name AS account_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts a ON t.account_id = a.id
      ${whereClause}
      ORDER BY t.transaction_date DESC, t.id DESC
      ${limitClause} ${offsetClause};
    `;

    return db.getAllSync<Transaction>(query, params);
  },

  getRecent: (limit = 10): Transaction[] => {
    return transactionRepository.getAll({ limit });
  },

  update: (
    id: number,
    txn: Partial<Omit<Transaction, 'id' | 'created_at'>>
  ): void => {
    const db = getDb();
    const current = transactionRepository.getById(id);
    if (!current) throw new Error(`Transaction ${id} not found`);

    const updated = { ...current, ...txn };
    db.runSync(
      `UPDATE transactions
       SET type = ?, category_id = ?, account_id = ?, amount_paise = ?,
           transaction_date = ?, payment_method = ?, description = ?, notes = ?,
           is_essential = ?, updated_at = (datetime('now', 'localtime'))
       WHERE id = ?;`,
      [
        updated.type,
        updated.category_id,
        updated.account_id,
        updated.amount_paise,
        updated.transaction_date,
        updated.payment_method,
        updated.description,
        updated.notes ?? null,
        updated.is_essential ?? null,
        id,
      ]
    );
  },

  delete: (id: number): void => {
    const db = getDb();
    db.runSync('DELETE FROM transactions WHERE id = ?;', [id]);
  },

  getKPIsForPeriod: (
    startDate: string,
    endDate: string
  ): {
    totalIncomePaise: number;
    totalExpensePaise: number;
    netSavingsPaise: number;
    savingsRatePercent: number | null;
  } => {
    const db = getDb();
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_paise ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount_paise ELSE 0 END), 0) AS total_expense
      FROM transactions
      WHERE transaction_date >= ? AND transaction_date <= ?;
    `;
    const result = db.getFirstSync<{ total_income: number; total_expense: number }>(
      query,
      [startDate, endDate]
    );

    const totalIncomePaise = result ? result.total_income : 0;
    const totalExpensePaise = result ? result.total_expense : 0;
    const netSavingsPaise = totalIncomePaise - totalExpensePaise;
    const savingsRatePercent =
      totalIncomePaise > 0
        ? Math.round(((netSavingsPaise / totalIncomePaise) * 100) * 10) / 10
        : null;

    return {
      totalIncomePaise,
      totalExpensePaise,
      netSavingsPaise,
      savingsRatePercent,
    };
  },
};
