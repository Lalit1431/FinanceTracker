import { getDb } from './database';
import { Account, AccountType } from '../types';

export const accountRepository = {
  getAll: (onlyActive = false): Account[] => {
    const db = getDb();
    const query = `
      SELECT 
        a.*,
        (
          a.opening_balance_paise 
          + COALESCE((SELECT SUM(amount_paise) FROM transactions WHERE account_id = a.id AND type = 'INCOME'), 0)
          - COALESCE((SELECT SUM(amount_paise) FROM transactions WHERE account_id = a.id AND type = 'EXPENSE'), 0)
          + COALESCE((SELECT SUM(amount_paise) FROM transfers WHERE to_account_id = a.id), 0)
          - COALESCE((SELECT SUM(amount_paise) FROM transfers WHERE from_account_id = a.id), 0)
        ) AS current_balance_paise
      FROM accounts a
      ${onlyActive ? 'WHERE a.is_active = 1' : ''}
      ORDER BY a.id ASC;
    `;
    return db.getAllSync<Account>(query);
  },

  getById: (id: number): Account | null => {
    const db = getDb();
    const query = `
      SELECT 
        a.*,
        (
          a.opening_balance_paise 
          + COALESCE((SELECT SUM(amount_paise) FROM transactions WHERE account_id = a.id AND type = 'INCOME'), 0)
          - COALESCE((SELECT SUM(amount_paise) FROM transactions WHERE account_id = a.id AND type = 'EXPENSE'), 0)
          + COALESCE((SELECT SUM(amount_paise) FROM transfers WHERE to_account_id = a.id), 0)
          - COALESCE((SELECT SUM(amount_paise) FROM transfers WHERE from_account_id = a.id), 0)
        ) AS current_balance_paise
      FROM accounts a
      WHERE a.id = ?;
    `;
    return db.getFirstSync<Account>(query, [id]);
  },

  getCashAccount: (): Account | null => {
    const db = getDb();
    const query = `
      SELECT 
        a.*,
        (
          a.opening_balance_paise 
          + COALESCE((SELECT SUM(amount_paise) FROM transactions WHERE account_id = a.id AND type = 'INCOME'), 0)
          - COALESCE((SELECT SUM(amount_paise) FROM transactions WHERE account_id = a.id AND type = 'EXPENSE'), 0)
          + COALESCE((SELECT SUM(amount_paise) FROM transfers WHERE to_account_id = a.id), 0)
          - COALESCE((SELECT SUM(amount_paise) FROM transfers WHERE from_account_id = a.id), 0)
        ) AS current_balance_paise
      FROM accounts a
      WHERE a.account_type = 'CASH' AND a.is_active = 1
      LIMIT 1;
    `;
    return db.getFirstSync<Account>(query);
  },

  ensureCashAccount: (): Account => {
    const existing = accountRepository.getCashAccount();
    if (existing) return existing;

    const id = accountRepository.create({
      name: 'Cash in Hand',
      account_type: 'CASH',
      opening_balance_paise: 0,
      icon: 'cash-multiple',
      color: '#10B981',
    });
    return accountRepository.getById(id)!;
  },

  create: (account: {
    name: string;
    account_type: AccountType;
    opening_balance_paise: number;
    icon?: string;
    color?: string;
  }): number => {
    const db = getDb();
    const result = db.runSync(
      `INSERT INTO accounts (name, account_type, opening_balance_paise, is_active, icon, color)
       VALUES (?, ?, ?, 1, ?, ?);`,
      [
        account.name,
        account.account_type,
        account.opening_balance_paise,
        account.icon ?? 'bank',
        account.color ?? '#1565C0',
      ]
    );
    return result.lastInsertRowId;
  },

  update: (
    id: number,
    data: Partial<Omit<Account, 'id' | 'created_at' | 'current_balance_paise'>>
  ): void => {
    const db = getDb();
    const current = accountRepository.getById(id);
    if (!current) throw new Error(`Account ${id} not found`);

    const updated = { ...current, ...data };
    db.runSync(
      `UPDATE accounts
       SET name = ?, account_type = ?, opening_balance_paise = ?, is_active = ?, icon = ?, color = ?, updated_at = (datetime('now', 'localtime'))
       WHERE id = ?;`,
      [
        updated.name,
        updated.account_type,
        updated.opening_balance_paise,
        updated.is_active,
        updated.icon,
        updated.color,
        id,
      ]
    );
  },

  toggleActive: (id: number, isActive: boolean): void => {
    const db = getDb();
    db.runSync(
      `UPDATE accounts SET is_active = ?, updated_at = (datetime('now', 'localtime')) WHERE id = ?;`,
      [isActive ? 1 : 0, id]
    );
  },
};
