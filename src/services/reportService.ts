import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb } from '../database/database';
import { format } from 'date-fns';

export const reportService = {
  exportTransactionsToCSV: async (startDate: string, endDate: string): Promise<string> => {
    const db = getDb();

    const transactions = db.getAllSync<{
      id: number;
      type: string;
      amount_paise: number;
      transaction_date: string;
      payment_method: string;
      description: string;
      notes: string | null;
      is_essential: number | null;
      category_name: string;
      account_name: string;
    }>(
      `SELECT 
         t.id, t.type, t.amount_paise, t.transaction_date, t.payment_method,
         t.description, t.notes, t.is_essential,
         c.name AS category_name,
         a.name AS account_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       JOIN accounts a ON t.account_id = a.id
       WHERE t.transaction_date >= ? AND t.transaction_date <= ?
       ORDER BY t.transaction_date DESC, t.id DESC;`,
      [startDate, endDate]
    );

    // CSV Header
    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Category',
      'Account',
      'Amount (INR)',
      'Payment Method',
      'Description',
      'Notes',
      'Classification',
    ];

    const escapeCSV = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = transactions.map((t) => {
      const amountRupees = (t.amount_paise / 100).toFixed(2);
      const classification =
        t.is_essential === 1 ? 'Need (Essential)' : t.is_essential === 0 ? 'Want (Discretionary)' : '';

      return [
        t.id,
        t.transaction_date,
        t.type,
        escapeCSV(t.category_name),
        escapeCSV(t.account_name),
        amountRupees,
        t.payment_method,
        escapeCSV(t.description),
        escapeCSV(t.notes),
        classification,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const fileName = `Finance_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      return fileName;
    }

    const reportFile = new File(Paths.document, fileName);

    if (!reportFile.exists) {
      reportFile.create();
    }
    await reportFile.write(csvContent);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(reportFile.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export CSV Financial Report',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return reportFile.uri;
  },
};
