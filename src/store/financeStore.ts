import { create } from 'zustand';
import { Category, Account, Transaction } from '../types';
import { categoryRepository } from '../database/categoryRepository';
import { accountRepository } from '../database/accountRepository';
import { transactionRepository } from '../database/transactionRepository';
import { getCurrentMonthRange } from '../utils/dateUtils';

interface KPIState {
  totalIncomePaise: number;
  totalExpensePaise: number;
  netSavingsPaise: number;
  savingsRatePercent: number | null;
}

interface FinanceState {
  categories: Category[];
  accounts: Account[];
  recentTransactions: Transaction[];
  currentMonthKPIs: KPIState;
  isLoading: boolean;

  // Actions
  loadInitialData: () => void;
  refreshTransactions: () => void;
  refreshCategories: () => void;
  refreshAccounts: () => void;
  refreshKPIs: () => void;
  refreshAll: () => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  categories: [],
  accounts: [],
  recentTransactions: [],
  currentMonthKPIs: {
    totalIncomePaise: 0,
    totalExpensePaise: 0,
    netSavingsPaise: 0,
    savingsRatePercent: null,
  },
  isLoading: false,

  loadInitialData: () => {
    set({ isLoading: true });
    try {
      accountRepository.ensureCashAccount();
      get().refreshAll();
    } finally {
      set({ isLoading: false });
    }
  },

  refreshCategories: () => {
    const categories = categoryRepository.getAll();
    set({ categories });
  },

  refreshAccounts: () => {
    accountRepository.ensureCashAccount();
    const accounts = accountRepository.getAll();
    set({ accounts });
  },

  refreshTransactions: () => {
    const recentTransactions = transactionRepository.getRecent(15);
    set({ recentTransactions });
  },

  refreshKPIs: () => {
    const { start, end } = getCurrentMonthRange();
    const kpis = transactionRepository.getKPIsForPeriod(start, end);
    set({ currentMonthKPIs: kpis });
  },

  refreshAll: () => {
    get().refreshCategories();
    get().refreshAccounts();
    get().refreshTransactions();
    get().refreshKPIs();
  },
}));
