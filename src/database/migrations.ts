import { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db: SQLiteDatabase) => {
      // 1. Categories table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
          icon TEXT NOT NULL DEFAULT 'circle',
          color TEXT NOT NULL DEFAULT '#1565C0',
          is_active INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0,
          description TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
        CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
      `);

      // 2. Accounts table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          account_type TEXT NOT NULL CHECK (account_type IN ('CASH', 'BANK', 'UPI', 'WALLET', 'CREDIT_CARD')),
          opening_balance_paise INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          icon TEXT NOT NULL DEFAULT 'bank',
          color TEXT NOT NULL DEFAULT '#1565C0',
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT
        );
      `);

      // 3. Transactions table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
          category_id INTEGER NOT NULL REFERENCES categories(id),
          account_id INTEGER NOT NULL REFERENCES accounts(id),
          amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
          transaction_date TEXT NOT NULL,
          payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'CARD', 'NET_BANKING', 'WALLET', 'OTHER')),
          description TEXT NOT NULL,
          notes TEXT,
          is_essential INTEGER DEFAULT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_txn_type ON transactions(type);
        CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category_id);
        CREATE INDEX IF NOT EXISTS idx_txn_account ON transactions(account_id);
      `);

      // 4. Budgets table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
          year INTEGER NOT NULL,
          amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT,
          UNIQUE (category_id, month, year)
        );
      `);

      // 5. App Settings table
      db.execSync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          setting_key TEXT PRIMARY KEY,
          setting_value TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    name: 'create_transfers_table',
    up: (db: SQLiteDatabase) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS transfers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_account_id INTEGER NOT NULL REFERENCES accounts(id),
          to_account_id INTEGER NOT NULL REFERENCES accounts(id),
          amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
          transfer_date TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
        CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_account_id);
        CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_account_id);
        CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transfer_date);
      `);
    },
  },
];
