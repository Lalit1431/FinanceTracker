import { getWebDb } from './webDatabase';
import type { DatabaseInterface } from './database';

export const getDb = (): DatabaseInterface => {
  return getWebDb();
};

export const initDatabase = (): DatabaseInterface => {
  return getWebDb();
};
