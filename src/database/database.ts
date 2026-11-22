import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';
import { seedDatabase } from './seeds';

export interface DatabaseInterface {
  execSync(sql: string): void;
  runSync(sql: string, params?: any[]): { lastInsertRowId: number; changes: number };
  getFirstSync<T = any>(sql: string, params?: any[]): T | null;
  getAllSync<T = any>(sql: string, params?: any[]): T[];
  withTransactionSync<T = void>(task: () => T): T;
}

const DB_NAME = 'finance_manager.db';
let databaseInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!databaseInstance) {
    databaseInstance = SQLite.openDatabaseSync(DB_NAME);
    databaseInstance.execSync('PRAGMA foreign_keys = ON;');
  }
  return databaseInstance;
};

export const initDatabase = (): SQLite.SQLiteDatabase => {
  const db = getDb();

  // Create schema_migrations table
  db.execSync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Get applied versions
  const appliedRows = db.getAllSync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r: { version: number }) => r.version));

  // Run pending migrations inside transaction
  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      db.withTransactionSync(() => {
        migration.up(db);
        db.runSync(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?);',
          [migration.version, migration.name]
        );
      });
    }
  }

  // Run seeds
  seedDatabase(db);

  return db;
};
