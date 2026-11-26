// ===== HOOKS PARA DADOS FINANCEIROS =====
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  db, formatBRL, parseBRL, formatDateBR, getCurrentMonthYear, updateAllAccountBalances,
  addAttachment, getAttachments, deleteAttachment, recordMemberPayment, recordMemberPayments,
} from '../db';
import { fileToDataUrl } from '../lib/attachment';
import type { ParsedMember } from '../lib/memberImport';
import type {
  Entry, Expense, Transfer, Account, Category, Member, MemberPayment, FinancialFilters,
  MemberFilters, User, UserRole, EntityType,
} from '../types';

// Query Keys
export const queryKeys = {
  accounts: ['accounts'] as const,
  categories: (type?: 'INCOME' | 'EXPENSE') => ['categories', type] as const,
  entries: (filters?: FinancialFilters) => ['entries', filters] as const,
  expenses: (filters?: FinancialFilters) => ['expenses', filters] as const,
  transfers: (filters?: FinancialFilters) => ['transfers', filters] as const,
  members: (filters?: MemberFilters) => ['members', filters] as const,
  memberPayments: (memberId?: string, monthYear?: string) => ['memberPayments', memberId, monthYear] as const,
  dashboard: ['dashboard'] as const,
  monthlyEvolution: (year?: number) => ['monthlyEvolution', year] as const,
  yearlyComparison: ['yearlyComparison'] as const,
  categoryExpenses: (monthYear?: string) => ['categoryExpenses', monthYear] as const,
  attachments: (entityType: EntityType, entityId?: string) => ['attachments', entityType, entityId] as const,
};

// ===== ACCOUNTS =====
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => db.accounts.where('isActive').equals(true).toArray(),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['account', id],
    queryFn: () => db.accounts.get(id),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.accounts.add({ ...account, id, createdAt: now, updatedAt: now });
      return { ...account, id, createdAt: now, updatedAt: now };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Account> }) => {
      await db.accounts.update(id, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.accounts.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useRecalculateAccountBalances() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => updateAllAccountBalances(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
}

// ===== CATEGORIES =====
export function useCategories(type?: 'INCOME' | 'EXPENSE') {
  return useQuery({
    queryKey: queryKeys.categories(type),
    queryFn: () => {
      let query = db.categories.where('isActive').equals(true);
      if (type) query = query.and(c => c.type === type);
      return query.toArray();
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.categories.add({ ...category, id, createdAt: now, updatedAt: now });
      return { ...category, id, createdAt: now, updatedAt: now };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      await db.categories.update(id, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.categories.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

// ===== ENTRIES =====
export function useEntries(filters?: FinancialFilters) {
  return useQuery({
    queryKey: queryKeys.entries(filters),
    queryFn: async () => {
      let query = db.entries.orderBy('date').reverse();
      
      if (filters?.dateRange) {
        query = query.filter(e => e.date >= filters.dateRange!.start && e.date <= filters.dateRange!.end);
      }
      if (filters?.month && filters?.year) {
        const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
        const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
        query = query.filter(e => e.date >= start && e.date <= end);
      }
      if (filters?.categoryId) {
        query = query.filter(e => e.categoryId === filters.categoryId);
      }
      if (filters?.accountId) {
        query = query.filter(e => e.accountId === filters.accountId);
      }
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        query = query.filter(e => e.description.toLowerCase().includes(search));
      }

      const results = await query.toArray();
      
      // Populate relations
      const [accounts, categories] = await Promise.all([
        db.accounts.toArray(),
        db.categories.toArray(),
      ]);
      const accountMap = new Map(accounts.map(a => [a.id, a]));
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      
      return results.map(e => ({
        ...e,
        account: accountMap.get(e.accountId),
        category: categoryMap.get(e.categoryId),
      }));
    },
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const newEntry = { ...entry, id, createdAt: now, updatedAt: now };
      await db.entries.add(newEntry);
      // Atualizar saldo da conta
      await db.updateAccountBalance(entry.accountId);
      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Entry> }) => {
      const oldEntry = await db.entries.get(id);
      await db.entries.update(id, { ...data, updatedAt: new Date().toISOString() });
      // Recalcular saldos das contas afetadas
      if (oldEntry) {
        await db.updateAccountBalance(oldEntry.accountId);
        if (data.accountId && data.accountId !== oldEntry.accountId) {
          await db.updateAccountBalance(data.accountId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const entry = await db.entries.get(id);
      await db.entries.delete(id);
      if (entry) {
        await db.updateAccountBalance(entry.accountId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ===== EXPENSES =====
export function useExpenses(filters?: FinancialFilters) {
  return useQuery({
    queryKey: queryKeys.expenses(filters),
    queryFn: async () => {
      let query = db.expenses.orderBy('date').reverse();
      
      if (filters?.dateRange) {
        query = query.filter(e => e.date >= filters.dateRange!.start && e.date <= filters.dateRange!.end);
      }
      if (filters?.month && filters?.year) {
        const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
        const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
        query = query.filter(e => e.date >= start && e.date <= end);
      }
      if (filters?.categoryId) {
        query = query.filter(e => e.categoryId === filters.categoryId);
      }
      if (filters?.accountId) {
        query = query.filter(e => e.accountId === filters.accountId);
      }
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        query = query.filter(e => e.description.toLowerCase().includes(search));
      }

      const results = await query.toArray();
      
      // Populate relations
      const [accounts, categories] = await Promise.all([
        db.accounts.toArray(),
        db.categories.toArray(),
      ]);
      const accountMap = new Map(accounts.map(a => [a.id, a]));
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      
      return results.map(e => ({
        ...e,
        account: accountMap.get(e.accountId),
        category: categoryMap.get(e.categoryId),
      }));
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const newExpense = { ...expense, id, createdAt: now, updatedAt: now };
      await db.expenses.add(newExpense);
      // Atualizar saldo da conta
      await db.updateAccountBalance(expense.accountId);
      return newExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Expense> }) => {
      const oldExpense = await db.expenses.get(id);
      await db.expenses.update(id, { ...data, updatedAt: new Date().toISOString() });
      // Recalcular saldos das contas afetadas
      if (oldExpense) {
        await db.updateAccountBalance(oldExpense.accountId);
        if (data.accountId && data.accountId !== oldExpense.accountId) {
          await db.updateAccountBalance(data.accountId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const expense = await db.expenses.get(id);
      await db.expenses.delete(id);
      if (expense) {
        await db.updateAccountBalance(expense.accountId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ===== TRANSFERS =====
export function useTransfers(filters?: FinancialFilters) {
  return useQuery({
    queryKey: queryKeys.transfers(filters),
    queryFn: async () => {
      let query = db.transfers.orderBy('date').reverse();
      
      if (filters?.dateRange) {
        query = query.filter(t => t.date >= filters.dateRange!.start && t.date <= filters.dateRange!.end);
      }
      if (filters?.month && filters?.year) {
        const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
        const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
        query = query.filter(t => t.date >= start && t.date <= end);
      }
      if (filters?.accountId) {
        query = query.filter(t => t.fromAccountId === filters.accountId || t.toAccountId === filters.accountId);
      }

      const results = await query.toArray();
      
      // Populate relations
      const accounts = await db.accounts.toArray();
      const accountMap = new Map(accounts.map(a => [a.id, a]));
      
      return results.map(t => ({
        ...t,
        fromAccount: accountMap.get(t.fromAccountId),
        toAccount: accountMap.get(t.toAccountId),
      }));
    },
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transfer: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const newTransfer = { ...transfer, id, createdAt: now, updatedAt: now };
      await db.transfers.add(newTransfer);
      // Atualizar saldos das duas contas
      await Promise.all([
        db.updateAccountBalance(transfer.fromAccountId),
        db.updateAccountBalance(transfer.toAccountId),
      ]);
      return newTransfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const transfer = await db.transfers.get(id);
      await db.transfers.delete(id);
      if (transfer) {
        await Promise.all([
          db.updateAccountBalance(transfer.fromAccountId),
          db.updateAccountBalance(transfer.toAccountId),
        ]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transfer> }) => {
      const oldTransfer = await db.transfers.get(id);
      await db.transfers.update(id, { ...data, updatedAt: new Date().toISOString() });
      if (oldTransfer) {
        await Promise.all([
          db.updateAccountBalance(oldTransfer.fromAccountId),
          db.updateAccountBalance(oldTransfer.toAccountId),
        ]);
        if (data.fromAccountId && data.fromAccountId !== oldTransfer.fromAccountId) {
          await db.updateAccountBalance(data.fromAccountId);
        }
        if (data.toAccountId && data.toAccountId !== oldTransfer.toAccountId) {
          await db.updateAccountBalance(data.toAccountId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ===== MEMBERS =====
export function useMembers(filters?: MemberFilters) {
  return useQuery({
    queryKey: queryKeys.members(filters),
    queryFn: async () => {
      let query = db.members.orderBy('ordem');
      
      if (filters?.status) {
        query = query.filter(m => m.status === filters.status);
      }
      if (filters?.rank) {
        query = query.filter(m => m.rank === filters.rank);
      }
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        query = query.filter(m => m.name.toLowerCase().includes(search));
      }
      
      return query.toArray();
    },
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'ordem'> & { ordem?: number }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const lastOrder = (await db.members.orderBy('ordem').last())?.ordem || 0;
      const ordem = member.ordem ?? lastOrder + 1;
      await db.members.add({ ...member, ordem, id, createdAt: now, updatedAt: now });
      return { ...member, ordem, id, createdAt: now, updatedAt: now };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['memberPaymentStatus'] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Member> }) => {
      await db.members.update(id, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['memberPaymentStatus'] });
    },
  });
}

export function useCreateMembersBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (parsed: ParsedMember[]) => {
      return db.transaction('rw', db.members, async () => {
        let ordem = ((await db.members.orderBy('ordem').last())?.ordem || 0) + 1;
        const now = new Date().toISOString();
        const records: Member[] = parsed.map(member => ({
          id: crypto.randomUUID(),
          rank: member.rank,
          name: member.name,
          phone: member.phone,
          ordem: ordem++,
          status: 'ACTIVE',
          joinedAt: now.slice(0, 10),
          createdAt: now,
          updatedAt: now,
        }));
        await db.members.bulkAdd(records);
        return records.length;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['memberPaymentStatus'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReorderMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await db.transaction('rw', db.members, async () => {
        const existing = await db.members.toArray();
        const byId = new Map(existing.map(member => [member.id, member]));
        const now = new Date().toISOString();
        const updates = orderedIds.flatMap((id, index) => {
          const member = byId.get(id);
          return member ? [{ ...member, ordem: index + 1, updatedAt: now }] : [];
        });
        if (updates.length) await db.members.bulkPut(updates);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['memberPaymentStatus'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.members.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['memberPaymentStatus'] });
    },
  });
}

// ===== MEMBER PAYMENTS =====
export function useMemberPayments(memberId?: string, monthYear?: string) {
  return useQuery({
    queryKey: queryKeys.memberPayments(memberId, monthYear),
    queryFn: async () => {
      let query = db.memberPayments.orderBy('date').reverse();
      
      if (memberId) {
        query = query.filter(p => p.memberId === memberId);
      }
      if (monthYear) {
        query = query.filter(p => p.referenceMonth === monthYear);
      }
      
      return query.toArray();
    },
  });
}

export function useMemberPaymentStatus(monthYear: string) {
  return useQuery({
    queryKey: ['memberPaymentStatus', monthYear],
    queryFn: async () => {
      const [members, payments, receipts] = await Promise.all([
        db.members.where('status').equals('ACTIVE').toArray(),
        db.memberPayments.where('referenceMonth').equals(monthYear).toArray(),
        db.attachments.where('entityType').equals('MEMBER_PAYMENT').toArray(),
      ]);
      
      const paymentMap = new Map(payments.map(p => [p.memberId, p]));
      const receiptPaymentIds = new Set(receipts.map(attachment => attachment.entityId));
      
      return members.map(member => {
        const payment = paymentMap.get(member.id);
        return {
          member,
          paid: !!payment,
          paymentId: payment?.id,
          amount: payment?.amount || 0,
          date: payment?.date,
          notes: payment?.notes,
          hasReceipt: payment ? receiptPaymentIds.has(payment.id) : false,
        };
      });
    },
  });
}

function invalidatePayments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['memberPayments'] });
  queryClient.invalidateQueries({ queryKey: ['memberPaymentStatus'] });
}

export function useCreateMemberPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Omit<MemberPayment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.memberPayments.add({ ...payment, id, createdAt: now, updatedAt: now });
      return { ...payment, id, createdAt: now, updatedAt: now };
    },
    onSuccess: () => invalidatePayments(queryClient),
  });
}

export function useUpdateMemberPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MemberPayment> }) => {
      await db.memberPayments.update(id, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => invalidatePayments(queryClient),
  });
}

export function useDeleteMemberPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.memberPayments.delete(id);
    },
    onSuccess: () => invalidatePayments(queryClient),
  });
}

/** Cria ou atualiza o pagamento de um integrante em um mês (um registro por mês). */
export function useRecordMemberPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, monthYear, amount, date, notes, recordedById }: {
      memberId: string;
      monthYear: string;
      amount: number;
      date: string;
      notes?: string;
      recordedById?: string;
    }) => recordMemberPayment({ memberId, monthYear, amount, date, notes, recordedById }),
    onSuccess: () => invalidatePayments(queryClient),
  });
}

/** Registra vários integrantes de uma vez, mantendo um pagamento por mês. */
export function useRecordMemberPaymentsBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberIds, monthYear, amount, date, notes, recordedById }: {
      memberIds: string[];
      monthYear: string;
      amount: number;
      date: string;
      notes?: string;
      recordedById?: string;
    }) => recordMemberPayments({ memberIds, monthYear, amount, date, notes, recordedById }),
    onSuccess: () => invalidatePayments(queryClient),
  });
}

// ===== ANEXOS =====
export function useAttachments(entityType: EntityType, entityId?: string) {
  return useQuery({
    queryKey: queryKeys.attachments(entityType, entityId),
    queryFn: () => getAttachments(entityType, entityId || ''),
    enabled: !!entityId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, entityType, entityId, uploadedById }: {
      file: File;
      entityType: EntityType;
      entityId: string;
      uploadedById?: string;
    }) => {
      const filePath = await fileToDataUrl(file);
      return addAttachment({
        fileName: file.name,
        filePath,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        entityType,
        entityId,
        uploadedById,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attachments(variables.entityType, variables.entityId),
      });
      if (variables.entityType === 'MEMBER_PAYMENT') {
        invalidatePayments(queryClient);
      }
      if (variables.entityType === 'EXPENSE') {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
      }
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      queryClient.invalidateQueries({ queryKey: ['memberPaymentStatus'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

// ===== DASHBOARD =====
export function useDashboardKPIs() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const [accounts, entries, expenses, transfers] = await Promise.all([
        db.accounts.toArray(),
        db.entries.toArray(),
        db.expenses.toArray(),
        db.transfers.toArray(),
      ]);
      
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = `${currentMonth}-01`;
      const monthEnd = `${currentMonth}-31`;
      
      const monthEntries = entries.filter(e => e.date >= monthStart && e.date <= monthEnd);
      const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
      
      const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
      const monthIncome = monthEntries.reduce((sum, e) => sum + e.amount, 0);
      const monthExpense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const monthResult = monthIncome - monthExpense;
      
      const cashAccount = accounts.find(a => a.type === 'CASH');
      const bankAccount = accounts.find(a => a.type === 'BANK');
      const pixAccount = accounts.find(a => a.type === 'PIX');
      
      return {
        totalBalance,
        monthIncome,
        monthExpense,
        monthResult,
        cashBalance: cashAccount?.balance || 0,
        bankBalance: bankAccount?.balance || 0,
        pixBalance: pixAccount?.balance || 0,
      };
    },
  });
}

export function useMonthlyEvolution(year?: number) {
  const targetYear = year || new Date().getFullYear();
  
  return useQuery({
    queryKey: queryKeys.monthlyEvolution(targetYear),
    queryFn: async () => {
      const [entries, expenses, transfers] = await Promise.all([
        db.entries.toArray(),
        db.expenses.toArray(),
        db.transfers.toArray(),
      ]);
      
      const months = Array.from({ length: 12 }, (_, i) => i + 1);
      
      return months.map(month => {
        const monthStr = `${targetYear}-${String(month).padStart(2, '0')}`;
        const monthStart = `${monthStr}-01`;
        const monthEnd = `${monthStr}-31`;
        
        const monthEntries = entries.filter(e => e.date >= monthStart && e.date <= monthEnd);
        const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
        const monthTransfersIn = transfers.filter(t => t.date >= monthStart && t.date <= monthEnd);
        
        const income = monthEntries.reduce((sum, e) => sum + e.amount, 0);
        const expense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Calcular saldo acumulado até este mês
        const prevMonths = months.filter(m => m <= month);
        let balance = 0;
        for (const m of prevMonths) {
          const ms = `${targetYear}-${String(m).padStart(2, '0')}`;
          const msStart = `${ms}-01`;
          const msEnd = `${ms}-31`;
          const me = entries.filter(e => e.date >= msStart && e.date <= msEnd);
          const mx = expenses.filter(e => e.date >= msStart && e.date <= msEnd);
          balance += me.reduce((s, e) => s + e.amount, 0) - mx.reduce((s, e) => s + e.amount, 0);
        }
        
        return {
          month: monthStr,
          income,
          expense,
          balance,
        };
      });
    },
  });
}

export function useYearlyComparison() {
  return useQuery({
    queryKey: queryKeys.yearlyComparison,
    queryFn: async () => {
      const [entries, expenses] = await Promise.all([
        db.entries.toArray(),
        db.expenses.toArray(),
      ]);
      
      const years = [...new Set([
        ...entries.map(e => Number(e.date.split('-')[0])),
        ...expenses.map(e => Number(e.date.split('-')[0])),
      ])].sort();
      
      return years.map(year => {
        const yearEntries = entries.filter(e => e.date.startsWith(String(year)));
        const yearExpenses = expenses.filter(e => e.date.startsWith(String(year)));
        
        const income = yearEntries.reduce((sum, e) => sum + e.amount, 0);
        const expense = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        return {
          year,
          income,
          expense,
          result: income - expense,
        };
      });
    },
  });
}

export function useCategoryExpenses(monthYear?: string) {
  const targetMonth = monthYear || getCurrentMonthYear();
  
  return useQuery({
    queryKey: queryKeys.categoryExpenses(targetMonth),
    queryFn: async () => {
      const [expenses, categories] = await Promise.all([
        db.expenses.toArray(),
        db.categories.where('type').equals('EXPENSE').toArray(),
      ]);
      
      const monthStart = `${targetMonth}-01`;
      const monthEnd = `${targetMonth}-31`;
      
      const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      
      const categoryTotals = new Map<string, number>();
      monthExpenses.forEach(e => {
        const cat = categoryMap.get(e.categoryId);
        const name = cat?.name || 'Sem categoria';
        const color = cat?.color || '#64748b';
        categoryTotals.set(name, (categoryTotals.get(name) || 0) + e.amount);
      });
      
      return Array.from(categoryTotals.entries())
        .map(([name, value]) => ({ name, value, color: categoryMap.get(categories.find(c => c.name === name)?.id || '')?.color || '#64748b' }))
        .sort((a, b) => b.value - a.value);
    },
  });
}

// ===== USERS =====
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => db.users.toArray(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const passwordHash = `dev-hash-${user.password}`;
      await db.users.add({ ...user, id, passwordHash, createdAt: now, updatedAt: now });
      return { ...user, id, passwordHash, createdAt: now, updatedAt: now };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      await db.users.update(id, { ...data, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await db.users.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}