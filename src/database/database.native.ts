import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';
import { seedDatabase } from './seeds';
import type { DatabaseInterface } from './database';

const DB_NAME = 'finance_manager.db';
let databaseInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = (): DatabaseInterface => {
  if (!databaseInstance) {
    databaseInstance = SQLite.openDatabaseSync(DB_NAME);
    databaseInstance.execSync('PRAGMA foreign_keys = ON;');
  }
  return databaseInstance as DatabaseInterface;
};

export const initDatabase = (): DatabaseInterface => {
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
        migration.up(databaseInstance!);
        db.runSync(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?);',
          [migration.version, migration.name]
        );
      });
    }
  }

  // Run seeds
  seedDatabase(databaseInstance!);

  return db;
};
