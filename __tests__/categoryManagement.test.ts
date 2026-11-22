import { describe, test, expect } from '@jest/globals';

interface Category {
  id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  is_active: number;
}

interface Transaction {
  id: number;
  category_id: number;
  amount_paise: number;
  type: 'INCOME' | 'EXPENSE';
}

interface Budget {
  id: number;
  category_id: number;
  amount_paise: number;
}

describe('Category Management (Edit, Delete, and Usage Validation) Tests', () => {
  let categories: Category[] = [
    { id: 1, name: 'Electricity', type: 'EXPENSE', icon: 'cart-outline', color: '#1565C0', is_active: 1 },
    { id: 2, name: 'Lic', type: 'EXPENSE', icon: 'plus-box', color: '#1565C0', is_active: 1 },
    { id: 3, name: 'Salary', type: 'INCOME', icon: 'cash-multiple', color: '#2E7D32', is_active: 1 },
    { id: 4, name: 'Unused Test Category', type: 'EXPENSE', icon: 'circle', color: '#8E24AA', is_active: 1 },
  ];

  let transactions: Transaction[] = [
    { id: 101, category_id: 1, amount_paise: 120000, type: 'EXPENSE' },
    { id: 102, category_id: 1, amount_paise: 80000, type: 'EXPENSE' },
    { id: 103, category_id: 3, amount_paise: 5000000, type: 'INCOME' },
  ];

  let budgets: Budget[] = [
    { id: 201, category_id: 4, amount_paise: 200000 },
  ];

  const getUsageCount = (categoryId: number): number => {
    return transactions.filter((t) => t.category_id === categoryId).length;
  };

  const updateCategory = (
    id: number,
    data: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'is_active'>>
  ): Category => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) throw new Error(`Category ${id} not found`);
    Object.assign(cat, data);
    return cat;
  };

  const deleteCategory = (id: number): boolean => {
    const usage = getUsageCount(id);
    if (usage > 0) {
      throw new Error(`Cannot delete category with ${usage} linked transactions`);
    }
    // Delete linked budgets
    budgets = budgets.filter((b) => b.category_id !== id);
    // Delete category
    categories = categories.filter((c) => c.id !== id);
    return true;
  };

  test('successfully edits category name, icon, and color', () => {
    const updated = updateCategory(1, {
      name: 'Electricity & Utility Bills',
      icon: 'lightning-bolt-outline',
      color: '#F57C00',
    });

    expect(updated.name).toBe('Electricity & Utility Bills');
    expect(updated.icon).toBe('lightning-bolt-outline');
    expect(updated.color).toBe('#F57C00');
  });

  test('can toggle category active state without affecting transactions', () => {
    const disabled = updateCategory(2, { is_active: 0 });
    expect(disabled.is_active).toBe(0);

    const reenabled = updateCategory(2, { is_active: 1 });
    expect(reenabled.is_active).toBe(1);
  });

  test('correctly counts transactions linked to a category', () => {
    expect(getUsageCount(1)).toBe(2);
    expect(getUsageCount(2)).toBe(0); // Lic has 0 transactions
    expect(getUsageCount(3)).toBe(1); // Salary has 1 transaction
    expect(getUsageCount(4)).toBe(0); // Unused Test Category has 0
  });

  test('prevents deletion if category has linked transactions', () => {
    expect(() => deleteCategory(1)).toThrow(
      'Cannot delete category with 2 linked transactions'
    );
    expect(categories.find((c) => c.id === 1)).toBeDefined();
  });

  test('safely deletes category and associated budgets when 0 transactions exist', () => {
    expect(categories.find((c) => c.id === 4)).toBeDefined();
    expect(budgets.find((b) => b.category_id === 4)).toBeDefined();

    const result = deleteCategory(4);
    expect(result).toBe(true);

    expect(categories.find((c) => c.id === 4)).toBeUndefined();
    expect(budgets.find((b) => b.category_id === 4)).toBeUndefined();
  });

  test('assigns distinct colors when all categories share default blue color', () => {
    const rawCategories = [
      { name: 'Personal loan', color: '#1565C0' },
      { name: 'Bachat gat', color: '#1565C0' },
      { name: 'Lic', color: '#1565C0' },
      { name: 'Other expense', color: '#1565C0' },
      { name: 'Electricity', color: '#1565C0' },
      { name: 'Hospitals and medicine', color: '#1565C0' },
    ];

    const palette = [
      '#2563EB', '#F97316', '#10B981', '#8B5CF6',
      '#EF4444', '#06B6D4', '#F59E0B', '#EC4899',
    ];

    const usedColors = new Set<string>();
    const assignedColors = rawCategories.map((r, index) => {
      let sliceColor = r.color;
      if (!sliceColor || sliceColor === '#1565C0' || usedColors.has(sliceColor)) {
        sliceColor = palette[index % palette.length];
      }
      usedColors.add(sliceColor);
      return sliceColor;
    });

    // Verify all 6 assigned colors are unique
    const uniqueAssigned = new Set(assignedColors);
    expect(uniqueAssigned.size).toBe(6);
    expect(assignedColors[0]).toBe('#2563EB');
    expect(assignedColors[1]).toBe('#F97316');
    expect(assignedColors[2]).toBe('#10B981');
    expect(assignedColors[3]).toBe('#8B5CF6');
    expect(assignedColors[4]).toBe('#EF4444');
    expect(assignedColors[5]).toBe('#06B6D4');
  });
});
