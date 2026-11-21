import { describe, test, expect } from '@jest/globals';
import { formatPaiseToRupees, parseRupeesToPaise } from '../src/utils/currency';

interface Account {
  id: number;
  name: string;
  type: string;
  openingBalancePaise: number;
}

interface Transaction {
  accountId: number;
  amountPaise: number;
  type: 'INCOME' | 'EXPENSE';
}

interface Transfer {
  fromAccountId: number;
  toAccountId: number;
  amountPaise: number;
}

const computeAccountBalance = (
  account: Account,
  transactions: Transaction[],
  transfers: Transfer[]
): number => {
  let balance = account.openingBalancePaise;
  for (const t of transactions) {
    if (t.accountId === account.id) {
      if (t.type === 'INCOME') balance += t.amountPaise;
      if (t.type === 'EXPENSE') balance -= t.amountPaise;
    }
  }
  for (const tr of transfers) {
    if (tr.toAccountId === account.id) balance += tr.amountPaise;
    if (tr.fromAccountId === account.id) balance -= tr.amountPaise;
  }
  return balance;
};

describe('Cash Wallet and ATM Withdrawal Transfer Logic Tests', () => {
  const bankAccount: Account = {
    id: 1,
    name: 'HDFC Bank',
    type: 'BANK',
    openingBalancePaise: 5000000, // ₹50,000
  };

  const cashWallet: Account = {
    id: 2,
    name: 'Cash in Hand',
    type: 'CASH',
    openingBalancePaise: 100000, // ₹1,000
  };

  test('Cash withdrawal (Bank -> Cash) transfers funds without distorting expenses', () => {
    const transactions: Transaction[] = [];
    const transfers: Transfer[] = [
      {
        fromAccountId: bankAccount.id,
        toAccountId: cashWallet.id,
        amountPaise: 500000, // ₹5,000 withdrawn from ATM
      },
    ];

    const bankBal = computeAccountBalance(bankAccount, transactions, transfers);
    const cashBal = computeAccountBalance(cashWallet, transactions, transfers);

    // Bank should be 50,000 - 5,000 = 45,000
    expect(bankBal).toBe(4500000);
    expect(formatPaiseToRupees(bankBal)).toBe('₹45,000.00');

    // Cash should be 1,000 + 5,000 = 6,000
    expect(cashBal).toBe(600000);
    expect(formatPaiseToRupees(cashBal)).toBe('₹6,000.00');

    // Total net worth remains unchanged
    expect(bankBal + cashBal).toBe(bankAccount.openingBalancePaise + cashWallet.openingBalancePaise);
  });

  test('Cash expense deducts specifically from Cash wallet balance', () => {
    const transfers: Transfer[] = [
      {
        fromAccountId: bankAccount.id,
        toAccountId: cashWallet.id,
        amountPaise: 500000, // ₹5,000 withdrawn
      },
    ];

    const transactions: Transaction[] = [
      {
        accountId: cashWallet.id,
        amountPaise: 35000, // ₹350 spent on groceries in cash
        type: 'EXPENSE',
      },
      {
        accountId: cashWallet.id,
        amountPaise: 5000, // ₹50 spent on tea in cash
        type: 'EXPENSE',
      },
    ];

    const bankBal = computeAccountBalance(bankAccount, transactions, transfers);
    const cashBal = computeAccountBalance(cashWallet, transactions, transfers);

    // Bank remains untouched at ₹45,000
    expect(bankBal).toBe(4500000);

    // Cash: 1,000 + 5,000 - 350 - 50 = ₹5,600
    expect(cashBal).toBe(560000);
    expect(formatPaiseToRupees(cashBal)).toBe('₹5,600.00');
  });

  test('Total net worth correctly combines bank, cash, and expenses', () => {
    const transfers: Transfer[] = [
      {
        fromAccountId: bankAccount.id,
        toAccountId: cashWallet.id,
        amountPaise: 1000000, // ₹10,000
      },
    ];

    const transactions: Transaction[] = [
      {
        accountId: cashWallet.id,
        amountPaise: 150000, // ₹1,500 cash expense
        type: 'EXPENSE',
      },
    ];

    const totalOpening = bankAccount.openingBalancePaise + cashWallet.openingBalancePaise; // 51,000
    const bankBal = computeAccountBalance(bankAccount, transactions, transfers);
    const cashBal = computeAccountBalance(cashWallet, transactions, transfers);

    // 51,000 - 1,500 = 49,500
    expect(bankBal + cashBal).toBe(totalOpening - 150000);
    expect(formatPaiseToRupees(bankBal + cashBal)).toBe('₹49,500.00');
  });
});
