import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Surface, Button, TextInput, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppTheme } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { getDb } from '../../database/database';
import { format } from 'date-fns';

export const BackupRestoreScreen = () => {
  const theme = useAppTheme();
  const { refreshAll } = useFinanceStore();

  const [restoreJson, setRestoreJson] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const db = getDb();

      const categories = db.getAllSync('SELECT * FROM categories;');
      const accounts = db.getAllSync('SELECT * FROM accounts;');
      const transactions = db.getAllSync('SELECT * FROM transactions;');
      const budgets = db.getAllSync('SELECT * FROM budgets;');
      const settings = db.getAllSync('SELECT * FROM app_settings;');

      const backupData = {
        app: 'Offline Personal Finance Manager',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: {
          categories,
          accounts,
          transactions,
          budgets,
          settings,
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileName = `FinanceManager_Backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Backup Created', 'Backup downloaded to your computer');
        return;
      }

      const backupFile = new File(Paths.document, fileName);
      if (!backupFile.exists) {
        backupFile.create();
      }
      await backupFile.write(jsonStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupFile.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Financial Backup',
        });
      } else {
        Alert.alert('Backup Created', `Saved to ${backupFile.uri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Could not export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExecuteRestore = () => {
    setShowRestoreDialog(false);
    if (!restoreJson.trim()) {
      Alert.alert('Error', 'Please paste the backup JSON payload to restore');
      return;
    }

    try {
      const parsed = JSON.parse(restoreJson);
      if (!parsed.data || !parsed.data.categories || !parsed.data.transactions) {
        throw new Error('Invalid backup file structure');
      }

      const db = getDb();

      db.withTransactionSync(() => {
        // Clear existing tables
        db.execSync('DELETE FROM transactions;');
        db.execSync('DELETE FROM budgets;');
        db.execSync('DELETE FROM accounts;');
        db.execSync('DELETE FROM categories;');

        // Restore categories
        for (const c of parsed.data.categories) {
          db.runSync(
            `INSERT INTO categories (id, name, type, icon, color, is_active, sort_order, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [c.id, c.name, c.type, c.icon, c.color, c.is_active, c.sort_order, c.description ?? null]
          );
        }

        // Restore accounts
        for (const a of parsed.data.accounts) {
          db.runSync(
            `INSERT INTO accounts (id, name, account_type, opening_balance_paise, is_active, icon, color)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [a.id, a.name, a.account_type, a.opening_balance_paise, a.is_active, a.icon, a.color]
          );
        }

        // Restore transactions
        for (const t of parsed.data.transactions) {
          db.runSync(
            `INSERT INTO transactions (id, type, category_id, account_id, amount_paise, transaction_date, payment_method, description, notes, is_essential)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              t.id,
              t.type,
              t.category_id,
              t.account_id,
              t.amount_paise,
              t.transaction_date,
              t.payment_method,
              t.description,
              t.notes ?? null,
              t.is_essential ?? null,
            ]
          );
        }

        // Restore budgets
        if (parsed.data.budgets) {
          for (const b of parsed.data.budgets) {
            db.runSync(
              `INSERT INTO budgets (id, category_id, month, year, amount_paise)
               VALUES (?, ?, ?, ?, ?);`,
              [b.id, b.category_id, b.month, b.year, b.amount_paise]
            );
          }
        }
      });

      refreshAll();
      setRestoreJson('');
      Alert.alert('Success', 'Financial data restored successfully!');
    } catch (err: any) {
      Alert.alert('Restore Error', err.message || 'Failed to restore data. No changes made.');
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Notice Card */}
      <Surface style={[styles.infoCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={1}>
        <View style={styles.infoHeader}>
          <MaterialCommunityIcons name="information-outline" size={24} color={theme.colors.primary} />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700', marginLeft: 8 }}
          >
            Offline Data Safety
          </Text>
        </View>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onPrimaryContainer, marginTop: 6, lineHeight: 18 }}
        >
          Since your app runs 100% offline without remote cloud servers, exporting your data
          periodically ensures you will never lose historical entries if you change devices.
        </Text>
      </Surface>

      {/* Export Section */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Create & Share Backup
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Generate a portable JSON backup containing all categories, accounts, transactions, and budgets.
        </Text>
        <Button
          mode="contained"
          icon="export-variant"
          loading={isExporting}
          onPress={handleExportBackup}
          style={styles.actionButton}
          buttonColor={theme.colors.primary}
        >
          Export Backup File
        </Button>
      </Surface>

      {/* Restore Section */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Restore From Backup
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Paste the JSON content of a previously exported backup file to restore your database.
        </Text>

        <TextInput
          label="Backup JSON Data"
          value={restoreJson}
          onChangeText={setRestoreJson}
          mode="outlined"
          numberOfLines={4}
          multiline
          placeholder='{"app": "Offline Personal Finance Manager", ...}'
          style={styles.jsonInput}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
        />

        <Button
          mode="contained-tonal"
          icon="restore"
          onPress={() => setShowRestoreDialog(true)}
          style={styles.actionButton}
          disabled={!restoreJson.trim()}
        >
          Validate & Restore
        </Button>
      </Surface>

      {/* Restore Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showRestoreDialog}
          onDismiss={() => setShowRestoreDialog(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.onSurface }}>Confirm Full Restore</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Restoring a backup will replace your current local transactions and accounts with the
              data from the backup. Are you sure you want to proceed?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button textColor={theme.colors.expense} onPress={handleExecuteRestore}>
              Confirm Restore
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 14,
    borderRadius: 12,
  },
  jsonInput: {
    marginTop: 12,
  },
});
