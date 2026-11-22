import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, TextInput, Portal, Dialog, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useAppTheme } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { getDb } from '../../database/database';
import { format } from 'date-fns';

interface ParsedBackup {
  fileName: string;
  payload: any;
  categoriesCount: number;
  accountsCount: number;
  transactionsCount: number;
  transfersCount: number;
  budgetsCount: number;
  goalsCount?: number;
  exportedAt?: string;
}

export const BackupRestoreScreen = () => {
  const theme = useAppTheme();
  const { refreshAll } = useFinanceStore();

  const [restoreJson, setRestoreJson] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<ParsedBackup | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const db = getDb();

      const categories = db.getAllSync('SELECT * FROM categories;');
      const accounts = db.getAllSync('SELECT * FROM accounts;');
      const transactions = db.getAllSync('SELECT * FROM transactions;');
      const transfers = db.getAllSync('SELECT * FROM transfers;');
      const budgets = db.getAllSync('SELECT * FROM budgets;');
      const goals = db.getAllSync('SELECT * FROM financial_goals;');
      const settings = db.getAllSync('SELECT * FROM app_settings;');

      const backupData = {
        app: 'Offline Personal Finance Manager',
        version: '1.0.1',
        exportedAt: new Date().toISOString(),
        data: {
          categories,
          accounts,
          transactions,
          transfers,
          budgets,
          goals,
          settings,
        },
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileName = `FinanceManager_Backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;

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

  const validateAndPrepareBackup = (parsed: any, fileName: string): ParsedBackup => {
    if (!parsed || !parsed.data || !parsed.data.categories || !parsed.data.transactions) {
      throw new Error('Invalid backup file. Missing essential categories or transactions data.');
    }

    return {
      fileName,
      payload: parsed,
      categoriesCount: parsed.data.categories?.length || 0,
      accountsCount: parsed.data.accounts?.length || 0,
      transactionsCount: parsed.data.transactions?.length || 0,
      transfersCount: parsed.data.transfers?.length || 0,
      budgetsCount: parsed.data.budgets?.length || 0,
      goalsCount: (parsed.data.goals || parsed.data.financial_goals)?.length || 0,
      exportedAt: parsed.exportedAt,
    };
  };

  const handlePickBackupFile = async () => {
    setIsPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      // Read file content
      let textContent = '';
      try {
        const fileRef = new File(asset.uri);
        textContent = await fileRef.text();
      } catch {
        const response = await fetch(asset.uri);
        textContent = await response.text();
      }

      if (!textContent.trim()) {
        throw new Error('Selected backup file is empty');
      }

      const parsed = JSON.parse(textContent);
      const validated = validateAndPrepareBackup(parsed, asset.name || 'Selected Backup');
      setSelectedBackup(validated);
      setRestoreJson(textContent);
    } catch (err: any) {
      Alert.alert('File Read Error', err.message || 'Could not load backup file');
    } finally {
      setIsPickingFile(false);
    }
  };

  const handleExecuteRestore = () => {
    setShowRestoreDialog(false);

    let parsedToRestore = selectedBackup?.payload;
    if (!parsedToRestore) {
      if (!restoreJson.trim()) {
        Alert.alert('Error', 'Please select a backup file or paste the backup JSON payload to restore');
        return;
      }
      try {
        parsedToRestore = JSON.parse(restoreJson);
      } catch {
        Alert.alert('Error', 'Invalid JSON payload');
        return;
      }
    }

    try {
      if (!parsedToRestore.data || !parsedToRestore.data.categories || !parsedToRestore.data.transactions) {
        throw new Error('Invalid backup file structure');
      }

      const db = getDb();

      db.withTransactionSync(() => {
        // Clear existing tables in reverse dependency order
        db.execSync('DELETE FROM financial_goals;');
        db.execSync('DELETE FROM transactions;');
        db.execSync('DELETE FROM transfers;');
        db.execSync('DELETE FROM budgets;');
        db.execSync('DELETE FROM accounts;');
        db.execSync('DELETE FROM categories;');

        // Restore categories
        for (const c of parsedToRestore.data.categories) {
          db.runSync(
            `INSERT INTO categories (id, name, type, icon, color, is_active, sort_order, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [c.id, c.name, c.type, c.icon, c.color, c.is_active ?? 1, c.sort_order ?? 0, c.description ?? null]
          );
        }

        // Restore accounts
        for (const a of parsedToRestore.data.accounts) {
          db.runSync(
            `INSERT INTO accounts (id, name, account_type, opening_balance_paise, is_active, icon, color)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [a.id, a.name, a.account_type, a.opening_balance_paise, a.is_active ?? 1, a.icon ?? 'bank', a.color ?? '#1565C0']
          );
        }

        // Restore transfers
        if (parsedToRestore.data.transfers) {
          for (const tr of parsedToRestore.data.transfers) {
            db.runSync(
              `INSERT INTO transfers (id, from_account_id, to_account_id, amount_paise, transfer_date, notes)
               VALUES (?, ?, ?, ?, ?, ?);`,
              [tr.id, tr.from_account_id, tr.to_account_id, tr.amount_paise, tr.transfer_date, tr.notes ?? null]
            );
          }
        }

        // Restore transactions
        for (const t of parsedToRestore.data.transactions) {
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
        if (parsedToRestore.data.budgets) {
          for (const b of parsedToRestore.data.budgets) {
            db.runSync(
              `INSERT INTO budgets (id, category_id, month, year, amount_paise)
               VALUES (?, ?, ?, ?, ?);`,
              [b.id, b.category_id, b.month, b.year, b.amount_paise]
            );
          }
        }

        // Restore financial goals
        const goalsList = parsedToRestore.data.goals || parsedToRestore.data.financial_goals;
        if (goalsList) {
          for (const g of goalsList) {
            db.runSync(
              `INSERT INTO financial_goals (id, name, goal_type, category_id, target_amount_paise, monthly_target_paise, start_date, end_date, tenure_months, notes, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                g.id,
                g.name,
                g.goal_type,
                g.category_id,
                g.target_amount_paise,
                g.monthly_target_paise,
                g.start_date,
                g.end_date ?? null,
                g.tenure_months ?? null,
                g.notes ?? null,
                g.is_active ?? 1,
              ]
            );
          }
        }
      });

      refreshAll();
      const txCount = parsedToRestore.data.transactions.length;
      const catCount = parsedToRestore.data.categories.length;
      const goalsCount = (parsedToRestore.data.goals || parsedToRestore.data.financial_goals)?.length || 0;
      setSelectedBackup(null);
      setRestoreJson('');
      Alert.alert(
        'Success',
        `Financial data restored successfully!\n\n• ${txCount} Transactions restored\n• ${catCount} Categories restored${goalsCount > 0 ? `\n• ${goalsCount} Goals & Loans restored` : ''}`
      );
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
          <MaterialCommunityIcons name="shield-check-outline" size={24} color={theme.colors.primary} />
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
          periodically ensures you will never lose historical entries if you change devices or upgrade.
        </Text>
      </Surface>

      {/* Export Section */}
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Create & Share Backup
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Generate a portable JSON backup containing all categories, accounts, transactions, transfers, and budgets.
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
          Restore From Phone File
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Select a backup file (.json) stored on your phone (Downloads, WhatsApp, or Google Drive) to restore your database.
        </Text>

        {/* File Picker Button */}
        <Button
          mode="contained"
          icon="folder-open-outline"
          loading={isPickingFile}
          onPress={handlePickBackupFile}
          style={styles.actionButton}
          buttonColor={theme.colors.primary}
        >
          Select Backup File from Phone
        </Button>

        {/* Selected File Card Preview */}
        {selectedBackup && (
          <Surface
            style={[
              styles.previewBox,
              { backgroundColor: theme.colors.elevation.level2, borderColor: theme.colors.primary },
            ]}
            elevation={1}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.fileIconCircle, { backgroundColor: `${theme.colors.primary}20` }]}>
                <MaterialCommunityIcons name="file-document-outline" size={26} color={theme.colors.primary} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>
                  {selectedBackup.fileName}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  {selectedBackup.transactionsCount} txns • {selectedBackup.categoriesCount} categories • {selectedBackup.accountsCount} accounts
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                mode="contained"
                icon="restore"
                buttonColor={theme.colors.income}
                textColor="#FFFFFF"
                style={{ flex: 1, borderRadius: 10 }}
                onPress={() => setShowRestoreDialog(true)}
              >
                Restore This File
              </Button>
              <Button
                mode="outlined"
                textColor={theme.colors.onSurfaceVariant}
                style={{ borderRadius: 10 }}
                onPress={handlePickBackupFile}
              >
                Change
              </Button>
            </View>
          </Surface>
        )}

        {/* Manual Paste JSON Toggle */}
        <TouchableOpacity
          onPress={() => setShowManualInput(!showManualInput)}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}
        >
          <MaterialCommunityIcons
            name={showManualInput ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.colors.primary}
          />
          <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 4 }}>
            {showManualInput ? 'Hide manual JSON input' : 'Or paste raw JSON manually'}
          </Text>
        </TouchableOpacity>

        {showManualInput && (
          <View style={{ marginTop: 10 }}>
            <TextInput
              label="Backup JSON Data"
              value={restoreJson}
              onChangeText={(text) => {
                setRestoreJson(text);
                setSelectedBackup(null);
              }}
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
              Validate & Restore Pasted JSON
            </Button>
          </View>
        )}
      </Surface>

      {/* Restore Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showRestoreDialog}
          onDismiss={() => setShowRestoreDialog(false)}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Confirm Full Restore
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Restoring this backup will replace all current transactions and accounts with data from the backup:
              {'\n\n'}
              {selectedBackup ? (
                <>
                  • {selectedBackup.categoriesCount} Categories{'\n'}
                  • {selectedBackup.accountsCount} Accounts{'\n'}
                  • {selectedBackup.transactionsCount} Transactions{'\n'}
                  • {selectedBackup.transfersCount} Transfers{'\n'}
                  • {selectedBackup.budgetsCount} Budgets{'\n'}
                  {selectedBackup.goalsCount ? `• ${selectedBackup.goalsCount} Financial Goals / Loans\n` : ''}{'\n'}
                </>
              ) : null}
              Are you sure you want to proceed?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button textColor={theme.colors.error} onPress={handleExecuteRestore}>
              Confirm & Restore
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
  previewBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  fileIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jsonInput: {
    marginTop: 8,
  },
});
