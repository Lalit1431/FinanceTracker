import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import {
  Text,
  Surface,
  SegmentedButtons,
  FAB,
  Switch,
  Portal,
  Modal,
  TextInput,
  Button,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { categoryRepository } from '../../database/categoryRepository';
import { Category, TransactionType } from '../../types';

const PRESET_COLORS = [
  '#1565C0', '#0288D1', '#00897B', '#2E7D32',
  '#43A047', '#F57C00', '#E53935', '#D81B60',
  '#8E24AA', '#5E35B1', '#3949AB', '#546E7A',
];

const PRESET_ICONS = [
  'cart-outline', 'silverware-fork-knife', 'home-outline', 'gas-station-outline',
  'lightning-bolt-outline', 'hospital-box-outline', 'school-outline', 'movie-open-outline',
  'shopping-outline', 'cash-multiple', 'storefront-outline', 'laptop',
  'gift-outline', 'chart-line', 'credit-card-outline', 'car-outline',
];

export const CategoriesScreen = () => {
  const theme = useAppTheme();
  const { refreshCategories } = useFinanceStore();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0]);

  const loadData = () => {
    const list = categoryRepository.getByType(type, false);
    setCategories(list);
  };

  useEffect(() => {
    loadData();
  }, [type]);

  const handleToggleActive = (cat: Category) => {
    const nextState = cat.is_active === 1 ? false : true;
    categoryRepository.toggleActive(cat.id, nextState);
    loadData();
    refreshCategories();
  };

  const handleCreateCategory = () => {
    if (!newCatName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      categoryRepository.create({
        name: newCatName.trim(),
        type,
        icon: selectedIcon,
        color: selectedColor,
        is_active: 1,
        sort_order: categories.length + 1,
      });

      setNewCatName('');
      setModalVisible(false);
      loadData();
      refreshCategories();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save category');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <SegmentedButtons
          value={type}
          onValueChange={(val) => setType(val as TransactionType)}
          buttons={[
            { value: 'EXPENSE', label: 'Expense Categories', icon: 'arrow-up' },
            { value: 'INCOME', label: 'Income Categories', icon: 'arrow-down' },
          ]}
        />
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
            <MaterialCommunityIcons name="shape-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No {type.toLowerCase()} categories created yet.
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Tap '+ Add Category' below to create your first one.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Surface
            style={[
              styles.itemCard,
              {
                backgroundColor: theme.colors.surface,
                opacity: item.is_active === 1 ? 1 : 0.6,
              },
            ]}
            elevation={1}
          >
            <View style={[styles.iconWrapper, { backgroundColor: `${item.color}20` }]}>
              <MaterialCommunityIcons
                name={(item.icon as any) || 'circle'}
                size={22}
                color={item.color}
              />
            </View>

            <View style={styles.itemInfo}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                {item.name}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.is_active === 1 ? 'Active' : 'Disabled (Hidden from new forms)'}
              </Text>
            </View>

            <Switch
              value={item.is_active === 1}
              onValueChange={() => handleToggleActive(item)}
              color={theme.colors.primary}
            />
          </Surface>
        )}
      />

      <FAB
        icon="plus"
        label="Add Category"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => setModalVisible(true)}
      />

      {/* Add Category Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modalBox, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            New {type === 'INCOME' ? 'Income' : 'Expense'} Category
          </Text>

          <TextInput
            label="Category Name *"
            value={newCatName}
            onChangeText={setNewCatName}
            mode="outlined"
            style={styles.modalInput}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          {/* Color Picker */}
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Choose Color:
          </Text>
          <View style={styles.paletteRow}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.selectedDot,
                ]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>

          {/* Icon Picker */}
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
            Choose Icon:
          </Text>
          <View style={styles.iconRow}>
            {PRESET_ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                style={[
                  styles.iconOption,
                  selectedIcon === ic && {
                    backgroundColor: theme.colors.primaryContainer,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setSelectedIcon(ic)}
              >
                <MaterialCommunityIcons
                  name={ic as any}
                  size={20}
                  color={selectedIcon === ic ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button textColor={theme.colors.onSurfaceVariant} onPress={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button mode="contained" buttonColor={theme.colors.primary} onPress={handleCreateCategory}>
              Create
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    padding: 16,
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    borderRadius: 16,
  },
  modalBox: {
    margin: 20,
    padding: 20,
    borderRadius: 18,
  },
  modalInput: {
    marginVertical: 12,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  selectedDot: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  iconOption: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
});
