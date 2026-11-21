import { getDb } from './database';

export const settingsRepository = {
  get: (key: string, defaultValue: string = ''): string => {
    const db = getDb();
    const row = db.getFirstSync<{ setting_value: string }>(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?;',
      [key]
    );
    return row ? row.setting_value : defaultValue;
  },

  set: (key: string, value: string): void => {
    const db = getDb();
    db.runSync(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value;`,
      [key, value]
    );
  },

  getAll: (): Record<string, string> => {
    const db = getDb();
    const rows = db.getAllSync<{ setting_key: string; setting_value: string }>(
      'SELECT setting_key, setting_value FROM app_settings;'
    );
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.setting_key] = r.setting_value;
    }
    return result;
  },
};
