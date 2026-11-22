import { Category, Account, Transaction, Budget, AppSetting, Transfer } from '../types';
import type { DatabaseInterface } from './database';

interface WebStorageData {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  transfers: Transfer[];
  budgets: Budget[];
  settings: Record<string, string>;
  schema_migrations: { version: number; name: string }[];
}

const STORAGE_KEY = 'offline_finance_manager_web_db_empty_v5';

const getInitialData = (): WebStorageData => {
  return {
    schema_migrations: [
      { version: 1, name: 'initial_schema' },
      { version: 2, name: 'create_transfers_table' },
    ],
    categories: [],
    accounts: [
      {
        id: 1,
        name: 'Cash in Hand',
        account_type: 'CASH',
        opening_balance_paise: 0,
        is_active: 1,
        icon: 'cash-multiple',
        color: '#10B981',
        created_at: new Date().toISOString(),
      },
    ],
    transactions: [],
    transfers: [],
    budgets: [],
    settings: {
      currency: 'INR',
      currency_symbol: '₹',
      theme_mode: 'system',
      date_format: 'DD/MM/YYYY',
      app_lock: 'none',
      default_period: 'current_month',
    },
  };
};

class WebDatabase implements DatabaseInterface {
  private data: WebStorageData;

  constructor() {
    this.data = this.load();
  }

  private load(): WebStorageData {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(STORAGE_KEY);
        if (item) {
          const parsed: WebStorageData = JSON.parse(item);
          if (!parsed.transfers) parsed.transfers = [];
          if (!parsed.accounts.some((a) => a.account_type === 'CASH')) {
            parsed.accounts.push({
              id: 1,
              name: 'Cash in Hand',
              account_type: 'CASH',
              opening_balance_paise: 0,
              is_active: 1,
              icon: 'cash-multiple',
              color: '#10B981',
              created_at: new Date().toISOString(),
            });
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    const initial = getInitialData();
    this.save(initial);
    return initial;
  }

  private save(data: WebStorageData) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // ignore
    }
  }

  execSync(sql: string): void {
    // Schema creation is no-op on web mock
    if (sql.includes('DELETE FROM transactions')) {
      this.data.transactions = [];
      this.save(this.data);
    }
    if (sql.includes('DELETE FROM categories')) {
      this.data.categories = [];
      this.save(this.data);
    }
    if (sql.includes('DELETE FROM accounts')) {
      this.data.accounts = [];
      this.save(this.data);
    }
    if (sql.includes('DELETE FROM budgets')) {
      this.data.budgets = [];
      this.save(this.data);
    }
  }

  withTransactionSync<T>(task: () => T): T {
    return task();
  }

  runSync(sql: string, params: any[] = []): { lastInsertRowId: number; changes: number } {
    const s = sql.trim();

    if (s.includes('INSERT INTO categories')) {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const [name, type, icon, color, is_active, sort_order, desc] = params;
      this.data.categories.push({
        id,
        name,
        type,
        icon,
        color,
        is_active: is_active ?? 1,
        sort_order: sort_order ?? 0,
        description: desc ?? null,
        created_at: new Date().toISOString(),
      });
      this.save(this.data);
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.includes('UPDATE categories')) {
      if (params.length === 2 && s.includes('is_active = ?')) {
        const [isActive, id] = params;
        const cat = this.data.categories.find((c) => c.id === id);
        if (cat) cat.is_active = isActive;
      } else {
        const [name, icon, color, is_active, sort_order, desc, id] = params;
        const cat = this.data.categories.find((c) => c.id === id);
        if (cat) {
          cat.name = name;
          cat.icon = icon;
          cat.color = color;
          cat.is_active = is_active;
          cat.sort_order = sort_order;
          cat.description = desc;
        }
      }
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('DELETE FROM categories')) {
      const [id] = params;
      this.data.categories = this.data.categories.filter((c) => c.id !== id);
      this.data.budgets = this.data.budgets.filter((b) => b.category_id !== id);
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('INSERT INTO accounts')) {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const [name, account_type, opening_balance_paise, icon, color] = params;
      this.data.accounts.push({
        id,
        name,
        account_type,
        opening_balance_paise,
        is_active: 1,
        icon: icon ?? 'bank',
        color: color ?? '#1565C0',
        created_at: new Date().toISOString(),
      });
      this.save(this.data);
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.includes('UPDATE accounts')) {
      if (params.length === 2 && s.includes('is_active = ?')) {
        const [isActive, id] = params;
        const acc = this.data.accounts.find((a) => a.id === id);
        if (acc) acc.is_active = isActive;
      }
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('INSERT INTO transactions')) {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const [type, category_id, account_id, amount_paise, transaction_date, payment_method, description, notes, is_essential] = params;
      this.data.transactions.unshift({
        id,
        type,
        category_id,
        account_id,
        amount_paise,
        transaction_date,
        payment_method,
        description,
        notes: notes ?? null,
        is_essential: is_essential ?? null,
        created_at: new Date().toISOString(),
      });
      this.save(this.data);
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.includes('UPDATE transactions')) {
      const [type, category_id, account_id, amount_paise, transaction_date, payment_method, description, notes, is_essential, id] = params;
      const txn = this.data.transactions.find((t) => t.id === id);
      if (txn) {
        txn.type = type;
        txn.category_id = category_id;
        txn.account_id = account_id;
        txn.amount_paise = amount_paise;
        txn.transaction_date = transaction_date;
        txn.payment_method = payment_method;
        txn.description = description;
        txn.notes = notes ?? null;
        txn.is_essential = is_essential ?? null;
      }
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('DELETE FROM transactions')) {
      const [id] = params;
      this.data.transactions = this.data.transactions.filter((t) => t.id !== id);
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('INSERT INTO transfers')) {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const [from_account_id, to_account_id, amount_paise, transfer_date, notes] = params;
      this.data.transfers.unshift({
        id,
        from_account_id,
        to_account_id,
        amount_paise,
        transfer_date,
        notes: notes ?? null,
        created_at: new Date().toISOString(),
      });
      this.save(this.data);
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.includes('UPDATE transfers')) {
      const [from_account_id, to_account_id, amount_paise, transfer_date, notes, id] = params;
      const tr = this.data.transfers.find((t) => t.id === id);
      if (tr) {
        tr.from_account_id = from_account_id;
        tr.to_account_id = to_account_id;
        tr.amount_paise = amount_paise;
        tr.transfer_date = transfer_date;
        tr.notes = notes ?? null;
      }
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('DELETE FROM transfers')) {
      const [id] = params;
      this.data.transfers = this.data.transfers.filter((tr) => tr.id !== id);
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('INSERT INTO budgets')) {
      const [category_id, month, year, amount_paise] = params;
      const existing = this.data.budgets.find(
        (b) => b.category_id === category_id && b.month === month && b.year === year
      );
      if (existing) {
        existing.amount_paise = amount_paise;
      } else {
        this.data.budgets.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          category_id,
          month,
          year,
          amount_paise,
          created_at: new Date().toISOString(),
        });
      }
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('DELETE FROM budgets')) {
      const [id] = params;
      this.data.budgets = this.data.budgets.filter((b) => b.id !== id);
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('INSERT INTO app_settings')) {
      const [key, val] = params;
      this.data.settings[key] = String(val);
      this.save(this.data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  getFirstSync<T>(sql: string, params: any[] = []): T | null {
    const list = this.getAllSync<T>(sql, params);
    return list.length > 0 ? list[0] : null;
  }

  getAllSync<T>(sql: string, params: any[] = []): T[] {
    const s = sql.trim();

    if (s.includes('FROM schema_migrations')) {
      return this.data.schema_migrations as any;
    }

    if (s.includes('SELECT COUNT(*) as count FROM categories')) {
      return [{ count: this.data.categories.length }] as any;
    }

    if (s.includes('SELECT COUNT(*) as count FROM accounts')) {
      return [{ count: this.data.accounts.length }] as any;
    }

    if (s.includes('SELECT COUNT(*) as count FROM app_settings')) {
      return [{ count: Object.keys(this.data.settings).length }] as any;
    }

    if (s.includes('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?')) {
      const [catId] = params;
      const count = this.data.transactions.filter((t) => t.category_id === catId).length;
      return [{ count }] as any;
    }

    if (s.includes('FROM app_settings WHERE setting_key = ?')) {
      const [key] = params;
      const val = this.data.settings[key];
      return val !== undefined ? ([{ setting_value: val }] as any) : [];
    }

    if (s.includes('SELECT setting_key, setting_value FROM app_settings')) {
      return Object.entries(this.data.settings).map(([k, v]) => ({
        setting_key: k,
        setting_value: v,
      })) as any;
    }

    if (s.includes('FROM categories WHERE id = ?')) {
      const [id] = params;
      return this.data.categories.filter((c) => c.id === id) as any;
    }

    if (s.includes('FROM categories WHERE type = ?')) {
      const [type] = params;
      let list = this.data.categories.filter((c) => c.type === type);
      if (s.includes('is_active = 1')) {
        list = list.filter((c) => c.is_active === 1);
      }
      return list as any;
    }

    if (s.includes('FROM categories')) {
      let list = this.data.categories;
      if (s.includes('is_active = 1')) {
        list = list.filter((c) => c.is_active === 1);
      }
      return list as any;
    }

    if (s.includes('FROM accounts WHERE a.id = ?') || s.includes('FROM accounts a WHERE a.id = ?')) {
      const [id] = params;
      const acc = this.data.accounts.find((a) => a.id === id);
      if (!acc) return [];
      const balance = this.calculateAccountBalance(acc);
      return [{ ...acc, current_balance_paise: balance }] as any;
    }

    if (s.includes('FROM accounts')) {
      let list = this.data.accounts;
      if (s.includes('WHERE a.is_active = 1') || s.includes('WHERE is_active = 1')) {
        list = list.filter((a) => a.is_active === 1);
      }
      return list.map((a) => ({
        ...a,
        current_balance_paise: this.calculateAccountBalance(a),
      })) as any;
    }

    // Transactions
    if (s.includes('FROM transactions t') && s.includes('WHERE t.id = ?')) {
      const [id] = params;
      const t = this.data.transactions.find((tx) => tx.id === id);
      if (!t) return [];
      const cat = this.data.categories.find((c) => c.id === t.category_id);
      const acc = this.data.accounts.find((a) => a.id === t.account_id);
      return [
        {
          ...t,
          category_name: cat?.name,
          category_icon: cat?.icon,
          category_color: cat?.color,
          account_name: acc?.name,
        },
      ] as any;
    }

    // KPI total_income / total_expense
    if (s.includes('COALESCE(SUM(CASE WHEN type = \'INCOME\'')) {
      const [start, end] = params;
      let income = 0;
      let expense = 0;
      for (const t of this.data.transactions) {
        if ((!start || t.transaction_date >= start) && (!end || t.transaction_date <= end)) {
          if (t.type === 'INCOME') income += t.amount_paise;
          if (t.type === 'EXPENSE') expense += t.amount_paise;
        }
      }
      return [{ income, expense, total_income: income, total_expense: expense }] as any;
    }

    // Top categories breakdown (Expense or Income)
    if (s.includes('GROUP BY c.id') && s.includes('SUM(t.amount_paise)')) {
      const isIncome = s.includes("t.type = 'INCOME'") || params.includes('INCOME');
      const targetType = isIncome ? 'INCOME' : 'EXPENSE';
      const dateParams = params.filter((p) => typeof p === 'string' && p.includes('-'));
      const start = dateParams[0];
      const end = dateParams[1];
      const catMap: Record<number, number> = {};
      for (const t of this.data.transactions) {
        if (
          t.type === targetType &&
          (!start || t.transaction_date >= start) &&
          (!end || t.transaction_date <= end)
        ) {
          catMap[t.category_id] = (catMap[t.category_id] || 0) + t.amount_paise;
        }
      }
      const result = Object.entries(catMap)
        .map(([catIdStr, sum]) => {
          const c = this.data.categories.find((cat) => cat.id === Number(catIdStr));
          return {
            id: Number(catIdStr),
            name: c?.name || 'Other',
            icon: c?.icon || 'circle',
            color: c?.color || (targetType === 'INCOME' ? '#10B981' : '#1565C0'),
            amount_paise: sum,
            total_paise: sum,
          };
        })
        .sort((a, b) => b.total_paise - a.total_paise);
      return result as any;
    }

    // Transactions list
    if (s.includes('FROM transactions t')) {
      let list = this.data.transactions.map((t) => {
        const cat = this.data.categories.find((c) => c.id === t.category_id);
        const acc = this.data.accounts.find((a) => a.id === t.account_id);
        return {
          ...t,
          category_name: cat?.name || 'Category',
          category_icon: cat?.icon || 'circle',
          category_color: cat?.color || '#1565C0',
          account_name: acc?.name || 'Account',
        };
      });

      // Filter params
      let pIdx = 0;
      if (s.includes('t.transaction_date >= ?')) {
        const d = params[pIdx++];
        list = list.filter((t) => t.transaction_date >= d);
      }
      if (s.includes('t.transaction_date <= ?')) {
        const d = params[pIdx++];
        list = list.filter((t) => t.transaction_date <= d);
      }
      if (s.includes('t.type = ?')) {
        const tp = params[pIdx++];
        list = list.filter((t) => t.type === tp);
      }
      if (s.includes('t.category_id = ?')) {
        const cid = params[pIdx++];
        list = list.filter((t) => t.category_id === cid);
      }
      if (s.includes('t.account_id = ?')) {
        const aid = params[pIdx++];
        list = list.filter((t) => t.account_id === aid);
      }
      if (s.includes('LIKE ?')) {
        const term = String(params[pIdx++] || '').replace(/%/g, '').toLowerCase();
        list = list.filter(
          (t) =>
            t.description.toLowerCase().includes(term) ||
            (t.notes && t.notes.toLowerCase().includes(term))
        );
      }

      list.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
      return list as any;
    }

    // Budgets
    if (s.includes('FROM budgets b')) {
      const [month, year] = params;
      const list = this.data.budgets.filter((b) => b.month === month && b.year === year);
      return list.map((b) => {
        const cat = this.data.categories.find((c) => c.id === b.category_id);
        const spent = this.data.transactions
          .filter(
            (t) =>
              t.category_id === b.category_id &&
              t.type === 'EXPENSE' &&
              new Date(t.transaction_date).getMonth() + 1 === month &&
              new Date(t.transaction_date).getFullYear() === year
          )
          .reduce((sum, t) => sum + t.amount_paise, 0);

        return {
          ...b,
          category_name: cat?.name || 'Category',
          category_icon: cat?.icon || 'circle',
          category_color: cat?.color || '#1565C0',
          spent_paise: spent,
        };
      }) as any;
    }

    // Transfers
    if (s.includes('FROM transfers')) {
      let list = this.data.transfers.map((tr) => {
        const fa = this.data.accounts.find((a) => a.id === tr.from_account_id);
        const ta = this.data.accounts.find((a) => a.id === tr.to_account_id);
        return {
          ...tr,
          from_account_name: fa?.name || 'Account',
          from_account_icon: fa?.icon || 'bank',
          to_account_name: ta?.name || 'Account',
          to_account_icon: ta?.icon || 'bank',
        };
      });

      if (s.includes('WHERE tr.id = ?')) {
        const [id] = params;
        list = list.filter((tr) => tr.id === id);
      }

      let trIdx = 0;
      if (s.includes('tr.transfer_date >= ?')) {
        const d = params[trIdx++];
        list = list.filter((tr) => tr.transfer_date >= d);
      }
      if (s.includes('tr.transfer_date <= ?')) {
        const d = params[trIdx++];
        list = list.filter((tr) => tr.transfer_date <= d);
      }

      list.sort((a, b) => b.transfer_date.localeCompare(a.transfer_date) || b.id - a.id);
      return list as any;
    }

    return [] as any;
  }

  private calculateAccountBalance(account: Account): number {
    let balance = account.opening_balance_paise;
    for (const t of this.data.transactions) {
      if (t.account_id === account.id) {
        if (t.type === 'INCOME') balance += t.amount_paise;
        if (t.type === 'EXPENSE') balance -= t.amount_paise;
      }
    }
    if (this.data.transfers) {
      for (const tr of this.data.transfers) {
        if (tr.to_account_id === account.id) balance += tr.amount_paise;
        if (tr.from_account_id === account.id) balance -= tr.amount_paise;
      }
    }
    return balance;
  }
}

let webDbInstance: WebDatabase | null = null;

export const getWebDb = (): DatabaseInterface => {
  if (!webDbInstance) {
    webDbInstance = new WebDatabase();
  }
  return webDbInstance;
};
