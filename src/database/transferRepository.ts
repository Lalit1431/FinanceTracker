import { getDb } from './database';
import { Transfer } from '../types';

export const transferRepository = {
  create: (transfer: {
    from_account_id: number;
    to_account_id: number;
    amount_paise: number;
    transfer_date: string;
    notes?: string | null;
  }): number => {
    const db = getDb();
    const result = db.runSync(
      `INSERT INTO transfers (from_account_id, to_account_id, amount_paise, transfer_date, notes)
       VALUES (?, ?, ?, ?, ?);`,
      [
        transfer.from_account_id,
        transfer.to_account_id,
        transfer.amount_paise,
        transfer.transfer_date,
        transfer.notes ?? null,
      ]
    );
    return result.lastInsertRowId;
  },

  getAll: (filter: { startDate?: string; endDate?: string; limit?: number } = {}): Transfer[] => {
    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.startDate) {
      conditions.push('tr.transfer_date >= ?');
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push('tr.transfer_date <= ?');
      params.push(filter.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit ?? 100;
    params.push(limit);

    const query = `
      SELECT 
        tr.*,
        fa.name AS from_account_name,
        fa.icon AS from_account_icon,
        ta.name AS to_account_name,
        ta.icon AS to_account_icon
      FROM transfers tr
      JOIN accounts fa ON tr.from_account_id = fa.id
      JOIN accounts ta ON tr.to_account_id = ta.id
      ${whereClause}
      ORDER BY tr.transfer_date DESC, tr.id DESC
      LIMIT ?;
    `;
    return db.getAllSync<Transfer>(query, params);
  },

  getById: (id: number): Transfer | null => {
    const db = getDb();
    const query = `
      SELECT 
        tr.*,
        fa.name AS from_account_name,
        fa.icon AS from_account_icon,
        ta.name AS to_account_name,
        ta.icon AS to_account_icon
      FROM transfers tr
      JOIN accounts fa ON tr.from_account_id = fa.id
      JOIN accounts ta ON tr.to_account_id = ta.id
      WHERE tr.id = ?;
    `;
    return db.getFirstSync<Transfer>(query, [id]);
  },

  update: (
    id: number,
    transfer: {
      from_account_id: number;
      to_account_id: number;
      amount_paise: number;
      transfer_date: string;
      notes?: string | null;
    }
  ): void => {
    const db = getDb();
    db.runSync(
      `UPDATE transfers
       SET from_account_id = ?, to_account_id = ?, amount_paise = ?, transfer_date = ?, notes = ?
       WHERE id = ?;`,
      [
        transfer.from_account_id,
        transfer.to_account_id,
        transfer.amount_paise,
        transfer.transfer_date,
        transfer.notes ?? null,
        id,
      ]
    );
  },

  delete: (id: number): void => {
    const db = getDb();
    db.runSync('DELETE FROM transfers WHERE id = ?;', [id]);
  },
};
