import { SQLiteDatabase } from 'expo-sqlite';

export const seedDatabase = (db: SQLiteDatabase) => {
  // 1. Ensure default "Cash in Hand" account is always present
  const cashAccResult = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM accounts WHERE account_type = 'CASH';"
  );
  const cashCount = cashAccResult ? cashAccResult.count : 0;
  if (cashCount === 0) {
    db.runSync(
      `INSERT INTO accounts (name, account_type, opening_balance_paise, is_active, icon, color)
       VALUES (?, ?, ?, 1, ?, ?);`,
      ['Cash in Hand', 'CASH', 0, 'cash-multiple', '#10B981']
    );
  }

  // 2. Only initialize essential app settings, no dummy categories or transactions
  const settingsCountResult = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM app_settings;'
  );
  const settingsCount = settingsCountResult ? settingsCountResult.count : 0;

  if (settingsCount === 0) {
    const defaultSettings: Record<string, string> = {
      currency: 'INR',
      currency_symbol: '₹',
      theme_mode: 'system',
      date_format: 'DD/MM/YYYY',
      app_lock: 'none',
      default_period: 'current_month',
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      db.runSync(
        `INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?);`,
        [key, value]
      );
    }
  }
};
