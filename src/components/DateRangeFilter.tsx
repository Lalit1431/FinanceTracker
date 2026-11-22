import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Chip, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';
import {
  getCurrentMonthRange,
  getPreviousMonthRange,
  getLast30DaysRange,
  getCurrentYearRange,
  formatDisplayDate,
} from '../utils/dateUtils';

export type DatePreset = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR' | 'CUSTOM';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onRangeChange: (start: string, end: string) => void;
  showAllOption?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onRangeChange,
  showAllOption = true,
}) => {
  const theme = useAppTheme();
  const [activePreset, setActivePreset] = useState<DatePreset>(
    startDate || endDate ? 'CUSTOM' : showAllOption ? 'ALL' : 'THIS_MONTH'
  );
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [isCustomExpanded, setIsCustomExpanded] = useState(activePreset === 'CUSTOM');

  const handleSelectPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset === 'ALL') {
      setIsCustomExpanded(false);
      setCustomStart('');
      setCustomEnd('');
      onRangeChange('', '');
    } else if (preset === 'THIS_MONTH') {
      setIsCustomExpanded(false);
      const range = getCurrentMonthRange();
      setCustomStart(range.start);
      setCustomEnd(range.end);
      onRangeChange(range.start, range.end);
    } else if (preset === 'LAST_MONTH') {
      setIsCustomExpanded(false);
      const range = getPreviousMonthRange();
      setCustomStart(range.start);
      setCustomEnd(range.end);
      onRangeChange(range.start, range.end);
    } else if (preset === 'LAST_30_DAYS') {
      setIsCustomExpanded(false);
      const range = getLast30DaysRange();
      setCustomStart(range.start);
      setCustomEnd(range.end);
      onRangeChange(range.start, range.end);
    } else if (preset === 'THIS_YEAR') {
      setIsCustomExpanded(false);
      const range = getCurrentYearRange();
      setCustomStart(range.start);
      setCustomEnd(range.end);
      onRangeChange(range.start, range.end);
    } else if (preset === 'CUSTOM') {
      setIsCustomExpanded(true);
    }
  };

  const handleCustomApply = () => {
    onRangeChange(customStart.trim(), customEnd.trim());
  };

  const handleClear = () => {
    setActivePreset('ALL');
    setCustomStart('');
    setCustomEnd('');
    setIsCustomExpanded(false);
    onRangeChange('', '');
  };

  return (
    <View style={styles.container}>
      {/* Preset Chips */}
      <View style={styles.presetRow}>
        {showAllOption && (
          <Chip
            selected={activePreset === 'ALL'}
            onPress={() => handleSelectPreset('ALL')}
            style={styles.presetChip}
            compact
          >
            All Dates
          </Chip>
        )}
        <Chip
          selected={activePreset === 'THIS_MONTH'}
          onPress={() => handleSelectPreset('THIS_MONTH')}
          style={styles.presetChip}
          compact
        >
          This Month
        </Chip>
        <Chip
          selected={activePreset === 'LAST_MONTH'}
          onPress={() => handleSelectPreset('LAST_MONTH')}
          style={styles.presetChip}
          compact
        >
          Last Month
        </Chip>
        <Chip
          selected={activePreset === 'LAST_30_DAYS'}
          onPress={() => handleSelectPreset('LAST_30_DAYS')}
          style={styles.presetChip}
          compact
        >
          Last 30 Days
        </Chip>
        <Chip
          selected={activePreset === 'CUSTOM'}
          onPress={() => handleSelectPreset('CUSTOM')}
          style={styles.presetChip}
          icon="calendar-range"
          compact
        >
          Custom
        </Chip>
      </View>

      {/* Custom Date Range Inputs Box */}
      {isCustomExpanded && (
        <Surface style={[styles.customBox, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={styles.dateInputsRow}>
            <View style={styles.inputWrapper}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                From Date (YYYY-MM-DD)
              </Text>
              <TextInput
                value={customStart}
                onChangeText={(val) => {
                  setCustomStart(val);
                  if (val.length === 10) {
                    onRangeChange(val, customEnd);
                  }
                }}
                placeholder="2026-11-01"
                mode="outlined"
                dense
                style={styles.dateInput}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                left={<TextInput.Icon icon="calendar-arrow-right" />}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                To Date (YYYY-MM-DD)
              </Text>
              <TextInput
                value={customEnd}
                onChangeText={(val) => {
                  setCustomEnd(val);
                  if (val.length === 10) {
                    onRangeChange(customStart, val);
                  }
                }}
                placeholder="2026-11-30"
                mode="outlined"
                dense
                style={styles.dateInput}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                left={<TextInput.Icon icon="calendar-arrow-left" />}
              />
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            <Button
              mode="text"
              compact
              textColor={theme.colors.onSurfaceVariant}
              onPress={handleClear}
            >
              Clear
            </Button>
            <Button
              mode="contained"
              compact
              buttonColor={theme.colors.primary}
              onPress={handleCustomApply}
              style={{ borderRadius: 8 }}
            >
              Apply Filter
            </Button>
          </View>
        </Surface>
      )}

      {/* Active Filter Indicator Badge */}
      {(startDate || endDate) && activePreset !== 'ALL' && (
        <View style={styles.activeBadgeRow}>
          <MaterialCommunityIcons name="filter-check-outline" size={16} color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.primary, marginLeft: 6, fontWeight: '600' }}>
            Filtered:{' '}
            {startDate ? formatDisplayDate(startDate) : 'Start'}{' '}
            ➔{' '}
            {endDate ? formatDisplayDate(endDate) : 'Today'}
          </Text>
          <TouchableOpacity onPress={handleClear} style={{ marginLeft: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  presetChip: {
    borderRadius: 14,
    height: 32,
  },
  customBox: {
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
  },
  dateInput: {
    fontSize: 14,
    height: 40,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  activeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
});
