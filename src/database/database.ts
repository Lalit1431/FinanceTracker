import { Platform } from 'react-native';
import { getWebDb } from './webDatabase';

export interface DatabaseInterface {
  execSync(sql: string): void;
  runSync(sql: string, params?: any[]): { lastInsertRowId: number; changes: number };
  getFirstSync<T = any>(sql: string, params?: any[]): T | null;
  getAllSync<T = any>(sql: string, params?: any[]): T[];
  withTransactionSync<T = void>(task: () => T): T;
}

export const getDb = (): DatabaseInterface => {
  return getWebDb();
};

export const initDatabase = (): DatabaseInterface => {
  return getWebDb();
};
