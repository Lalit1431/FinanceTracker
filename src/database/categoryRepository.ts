import { getDb } from './database';
import { Category, TransactionType } from '../types';

export const categoryRepository = {
  getAll: (onlyActive = false): Category[] => {
    const db = getDb();
    const query = onlyActive
      ? 'SELECT * FROM categories WHERE is_active = 1 ORDER BY type ASC, sort_order ASC, name ASC;'
      : 'SELECT * FROM categories ORDER BY type ASC, sort_order ASC, name ASC;';
    return db.getAllSync<Category>(query);
  },

  getByType: (type: TransactionType, onlyActive = true): Category[] => {
    const db = getDb();
    const query = onlyActive
      ? 'SELECT * FROM categories WHERE type = ? AND is_active = 1 ORDER BY sort_order ASC, name ASC;'
      : 'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC, name ASC;';
    return db.getAllSync<Category>(query, [type]);
  },

  getById: (id: number): Category | null => {
    const db = getDb();
    return db.getFirstSync<Category>('SELECT * FROM categories WHERE id = ?;', [id]);
  },

  create: (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>): number => {
    const db = getDb();
    const result = db.runSync(
      `INSERT INTO categories (name, type, icon, color, is_active, sort_order, description)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        category.name,
        category.type,
        category.icon,
        category.color,
        category.is_active,
        category.sort_order,
        category.description ?? null,
      ]
    );
    return result.lastInsertRowId;
  },

  update: (
    id: number,
    data: Partial<Omit<Category, 'id' | 'created_at'>>
  ): void => {
    const db = getDb();
    const current = categoryRepository.getById(id);
    if (!current) throw new Error(`Category ${id} not found`);

    const updated = { ...current, ...data };
    db.runSync(
      `UPDATE categories 
       SET name = ?, icon = ?, color = ?, is_active = ?, sort_order = ?, description = ?, updated_at = (datetime('now', 'localtime'))
       WHERE id = ?;`,
      [
        updated.name,
        updated.icon,
        updated.color,
        updated.is_active,
        updated.sort_order,
        updated.description ?? null,
        id,
      ]
    );
  },

  toggleActive: (id: number, isActive: boolean): void => {
    const db = getDb();
    db.runSync(
      `UPDATE categories 
       SET is_active = ?, updated_at = (datetime('now', 'localtime'))
       WHERE id = ?;`,
      [isActive ? 1 : 0, id]
    );
  },

  getUsageCount: (id: number): number => {
    const db = getDb();
    const result = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?;',
      [id]
    );
    return result?.count ?? 0;
  },

  delete: (id: number): void => {
    const db = getDb();
    db.withTransactionSync(() => {
      db.runSync('DELETE FROM budgets WHERE category_id = ?;', [id]);
      db.runSync('DELETE FROM categories WHERE id = ?;', [id]);
    });
  },
};
