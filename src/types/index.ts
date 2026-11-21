export type TransactionType = 'INCOME' | 'EXPENSE';

export type AccountType = 'CASH' | 'BANK' | 'UPI' | 'WALLET' | 'CREDIT_CARD';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET' | 'OTHER';

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  is_active: number; // 1 or 0
  sort_order: number;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Account {
  id: number;
  name: string;
  account_type: AccountType;
  opening_balance_paise: number;
  is_active: number;
  icon: string;
  color: string;
  created_at: string;
  updated_at?: string | null;
  current_balance_paise?: number; // calculated field
}

export interface Transaction {
  id: number;
  type: TransactionType;
  category_id: number;
  account_id: number;
  amount_paise: number;
  transaction_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  description: string;
  notes?: string | null;
  is_essential?: number | null; // 1, 0, or null
  created_at: string;
  updated_at?: string | null;
  // Joined fields for display
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  account_name?: string;
}

export interface Transfer {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount_paise: number;
  transfer_date: string; // YYYY-MM-DD
  notes?: string | null;
  created_at: string;
  // Joined fields for display
  from_account_name?: string;
  from_account_icon?: string;
  to_account_name?: string;
  to_account_icon?: string;
}

export interface Budget {
  id: number;
  category_id: number;
  month: number; // 1 - 12
  year: number;
  amount_paise: number;
  created_at: string;
  updated_at?: string | null;
  // Computed fields
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  spent_paise?: number;
}

export interface AppSetting {
  setting_key: string;
  setting_value: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
