// ===== DESPESAS FIXAS MENSAIS =====
import { db, getCurrentMonthYear, updateAllAccountBalances } from '../db';
import { CURRENT_USER } from './currentUser';
import type { Expense, FixedExpense } from '../types';

const SETTINGS_KEY = 'fixedExpenses';

export async function getFixedExpenses(): Promise<FixedExpense[]> {
  const row = await db.settings.get(SETTINGS_KEY);
  const value = (row?.value || {}) as { items?: FixedExpense[] };
  return value.items || [];
}

export async function saveFixedExpenses(items: FixedExpense[]): Promise<void> {
  await db.settings.put({
    key: SETTINGS_KEY,
    value: { items },
    description: 'Modelos de despesas fixas lançadas todo mês',
    updatedAt: new Date().toISOString(),
  });
}

export async function createFixedExpense(
  input: Omit<FixedExpense, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<FixedExpense> {
  const now = new Date().toISOString();
  const created: FixedExpense = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  const items = await getFixedExpenses();
  items.push(created);
  await saveFixedExpenses(items);
  return created;
}

export async function updateFixedExpense(id: string, data: Partial<FixedExpense>): Promise<void> {
  const items = await getFixedExpenses();
  const index = items.findIndex(item => item.id === id);
  if (index < 0) return;
  items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
  await saveFixedExpenses(items);
}

export async function deleteFixedExpense(id: string): Promise<void> {
  const items = await getFixedExpenses();
  await saveFixedExpenses(items.filter(item => item.id !== id));
}

function dueDateFor(template: FixedExpense, monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  const maxDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(1, template.day || 1), maxDay);
  return `${monthYear}-${String(day).padStart(2, '0')}`;
}

/**
 * Lança no mês atual as despesas fixas cuja data já chegou.
 * Cada modelo gera no máximo uma despesa por mês.
 */
export async function runFixedExpenses(): Promise<number> {
  const templates = await getFixedExpenses();
  if (templates.length === 0) return 0;

  const monthYear = getCurrentMonthYear();
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  let created = 0;

  for (const template of templates) {
    if (!template.isActive || template.lastGeneratedMonth === monthYear) continue;
    const date = dueDateFor(template, monthYear);
    if (date > today) continue;

    const duplicate = await db.expenses
      .filter(expense => expense.fixedExpenseId === template.id && expense.date.startsWith(monthYear))
      .first();

    if (!duplicate) {
      const now = new Date().toISOString();
      const expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = {
        date,
        description: template.description,
        amount: template.amount,
        paymentMethod: template.paymentMethod,
        accountId: template.accountId,
        categoryId: template.categoryId,
        createdById: template.createdById || CURRENT_USER.id,
        beneficiary: template.beneficiary,
        fixedExpenseId: template.id,
        notes: `Despesa fixa (${monthYear}) · fixedExpenseId:${template.id}`,
      };
      await db.expenses.add({ ...expense, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
      created++;
    }

    template.lastGeneratedMonth = monthYear;
    changed = true;
  }

  if (changed) await saveFixedExpenses(templates);
  if (created > 0) await updateAllAccountBalances();
  return created;
}
