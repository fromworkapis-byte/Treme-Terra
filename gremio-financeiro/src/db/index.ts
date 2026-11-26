// ===== DEXIE DATABASE (INDEXEDDB) =====
import Dexie, { type EntityTable } from 'dexie';
import type {
  User,
  Member,
  Account,
  Category,
  Entry,
  Expense,
  Transfer,
  MemberPayment,
  Attachment,
  AuditLog,
  Setting,
  UserRole,
  MilitaryRank,
  AccountType,
  CategoryType,
  PaymentMethod,
  EntityType,
  AuditAction,
} from '../types';

// ===== DATABASE CLASS =====
class GremioDatabase extends Dexie {
  users!: EntityTable<User, 'id'>;
  members!: EntityTable<Member, 'id'>;
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  transfers!: EntityTable<Transfer, 'id'>;
  memberPayments!: EntityTable<MemberPayment, 'id'>;
  attachments!: EntityTable<Attachment, 'id'>;
  auditLogs!: EntityTable<AuditLog, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor() {
    super('GremioFinanceiroDB');
    this.version(1).stores({
      users: 'id, email, role, isActive',
      members: 'id, rank, name, ordem, status, joinedAt',
      accounts: 'id, name, type, isActive',
      categories: 'id, name, type, isActive',
      entries: 'id, date, accountId, categoryId, createdById, amount',
      expenses: 'id, date, accountId, categoryId, createdById, amount',
      transfers: 'id, date, fromAccountId, toAccountId, createdById, amount',
      memberPayments: 'id, memberId, date, referenceMonth, recordedById',
      attachments: 'id, entityType, entityId, uploadedById',
      auditLogs: 'id, entityType, entityId, action, userId, createdAt',
      settings: 'key',
    });

    // Helper to convert to plain object for audit log
    const toPlain = (obj: Record<string, unknown>): Record<string, unknown> => JSON.parse(JSON.stringify(obj));

    // Hooks para auditoria automática
    this.entries.hook('creating', (primKey, obj, trans) => {
      this.auditLog('ENTRY', obj.id, 'CREATE', undefined, toPlain(obj), trans);
    });
    this.entries.hook('updating', (modifications, primKey, obj, trans) => {
      this.auditLog('ENTRY', primKey as string, 'UPDATE', toPlain(obj), toPlain({ ...obj, ...modifications }), trans);
    });
    this.entries.hook('deleting', (primKey, obj, trans) => {
      this.auditLog('ENTRY', primKey as string, 'DELETE', toPlain(obj), undefined, trans);
    });

    this.expenses.hook('creating', (primKey, obj, trans) => {
      this.auditLog('EXPENSE', obj.id, 'CREATE', undefined, toPlain(obj), trans);
    });
    this.expenses.hook('updating', (modifications, primKey, obj, trans) => {
      this.auditLog('EXPENSE', primKey as string, 'UPDATE', toPlain(obj), toPlain({ ...obj, ...modifications }), trans);
    });
    this.expenses.hook('deleting', (primKey, obj, trans) => {
      this.auditLog('EXPENSE', primKey as string, 'DELETE', toPlain(obj), undefined, trans);
    });

    this.transfers.hook('creating', (primKey, obj, trans) => {
      this.auditLog('TRANSFER', obj.id, 'CREATE', undefined, toPlain(obj), trans);
    });
    this.transfers.hook('updating', (modifications, primKey, obj, trans) => {
      this.auditLog('TRANSFER', primKey as string, 'UPDATE', toPlain(obj), toPlain({ ...obj, ...modifications }), trans);
    });
    this.transfers.hook('deleting', (primKey, obj, trans) => {
      this.auditLog('TRANSFER', primKey as string, 'DELETE', toPlain(obj), undefined, trans);
    });

    this.members.hook('creating', (primKey, obj, trans) => {
      this.auditLog('MEMBER', obj.id, 'CREATE', undefined, toPlain(obj), trans);
    });
    this.members.hook('updating', (modifications, primKey, obj, trans) => {
      this.auditLog('MEMBER', primKey as string, 'UPDATE', toPlain(obj), toPlain({ ...obj, ...modifications }), trans);
    });
    this.members.hook('deleting', (primKey, obj, trans) => {
      this.auditLog('MEMBER', primKey as string, 'DELETE', toPlain(obj), undefined, trans);
    });

    this.memberPayments.hook('creating', (primKey, obj, trans) => {
      this.auditLog('MEMBER_PAYMENT', obj.id, 'CREATE', undefined, toPlain(obj), trans);
    });
    this.memberPayments.hook('updating', (modifications, primKey, obj, trans) => {
      this.auditLog('MEMBER_PAYMENT', primKey as string, 'UPDATE', toPlain(obj), toPlain({ ...obj, ...modifications }), trans);
    });
    this.memberPayments.hook('deleting', (primKey, obj, trans) => {
      this.auditLog('MEMBER_PAYMENT', primKey as string, 'DELETE', toPlain(obj), undefined, trans);
    });

    this.accounts.hook('creating', (primKey, obj, trans) => {
      this.auditLog('ACCOUNT', obj.id, 'CREATE', undefined, toPlain(obj), trans);
    });
    this.accounts.hook('updating', (modifications, primKey, obj, trans) => {
      this.auditLog('ACCOUNT', primKey as string, 'UPDATE', toPlain(obj), toPlain({ ...obj, ...modifications }), trans);
    });
    this.accounts.hook('deleting', (primKey, obj, trans) => {
      this.auditLog('ACCOUNT', primKey as string, 'DELETE', toPlain(obj), undefined, trans);
    });

    this.categories.hook('creating', (primKey, obj, trans) => {
      this.auditLog('CATEGORY', obj.id, 'CREATE', undefined, toPlain(obj), trans);
    });
    this.categories.hook('updating', (modifications, primKey, obj, trans) => {
      this.auditLog('CATEGORY', primKey as string, 'UPDATE', toPlain(obj), toPlain({ ...obj, ...modifications }), trans);
    });
    this.categories.hook('deleting', (primKey, obj, trans) => {
      this.auditLog('CATEGORY', primKey as string, 'DELETE', toPlain(obj), undefined, trans);
    });

    this.users.hook('creating', (primKey, obj, trans) => {
      this.auditLog('USER', obj.id, 'CREATE', undefined, toPlain(obj), trans);
    });
    this.users.hook('updating', (modifications, primKey, obj, trans) => {
      this.auditLog('USER', primKey as string, 'UPDATE', toPlain(obj), toPlain({ ...obj, ...modifications }), trans);
    });
  }

  private auditLog(
    entityType: AuditLog['entityType'],
    entityId: string,
    action: AuditAction,
    oldData: Record<string, unknown> | undefined,
    newData: Record<string, unknown> | undefined,
    trans: any
  ) {
    const toPlainObject = (obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
      if (!obj) return undefined;
      return JSON.parse(JSON.stringify(obj));
    };
    const log: AuditLog = {
      id: crypto.randomUUID(),
      entityType,
      entityId,
      action,
      userId: this.getCurrentUserId(),
      oldData: toPlainObject(oldData),
      newData: toPlainObject(newData),
      reason: action === 'DELETE' ? 'Exclusão manual' : undefined,
      ipAddress: 'local',
      userAgent: navigator.userAgent,
      createdAt: new Date().toISOString(),
    };
    trans.table('auditLogs').add(log);
  }

  private getCurrentUserId(): string {
    // TODO: pegar do context de auth
    return 'system';
  }
}

export const db = new GremioDatabase();

// Attach helper functions to db instance
db.updateAccountBalance = updateAccountBalance;
db.updateAllAccountBalances = updateAllAccountBalances;
db.recalculateAccountBalance = recalculateAccountBalance;

// ===== ANEXOS (COMPROVANTES) =====

export interface NewAttachmentInput {
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  entityType: EntityType;
  entityId: string;
  uploadedById?: string;
}

export async function addAttachment(input: NewAttachmentInput): Promise<Attachment> {
  const attachment: Attachment = {
    ...input,
    id: crypto.randomUUID(),
    uploadedById: input.uploadedById || 'system',
    createdAt: new Date().toISOString(),
  };
  await db.attachments.add(attachment);
  return attachment;
}

export async function getAttachments(entityType: EntityType, entityId: string): Promise<Attachment[]> {
  return db.attachments
    .where('entityId')
    .equals(entityId)
    .and(attachment => attachment.entityType === entityType)
    .toArray();
}

export async function deleteAttachment(id: string): Promise<void> {
  await db.attachments.delete(id);
}

// ===== PAGAMENTOS DE INTEGRANTES =====

export interface RecordMemberPaymentInput {
  memberId: string;
  monthYear: string;
  amount: number;
  date: string;
  notes?: string;
  recordedById?: string;
}

/**
 * Cria ou atualiza pagamentos garantindo no máximo um registro por
 * (integrante, mês). Usado tanto no registro individual quanto no lote.
 */
export async function recordMemberPayments(input: Omit<RecordMemberPaymentInput, 'memberId'> & {
  memberIds: string[];
}): Promise<string[]> {
  const memberIds = Array.from(new Set(input.memberIds));
  if (memberIds.length === 0) return [];

  const now = new Date().toISOString();
  const recordedById = input.recordedById || 'admin-001';

  return db.transaction('rw', db.memberPayments, async () => {
    const existing = await db.memberPayments
      .where('referenceMonth')
      .equals(input.monthYear)
      .toArray();
    const byMember = new Map(existing.map(payment => [payment.memberId, payment]));
    const ids: string[] = [];

    for (const memberId of memberIds) {
      const current = byMember.get(memberId);

      if (current) {
        await db.memberPayments.update(current.id, {
          amount: input.amount,
          date: input.date,
          notes: input.notes,
          updatedAt: now,
        });
        ids.push(current.id);
        continue;
      }

      const id = crypto.randomUUID();
      const created: MemberPayment = {
        id,
        memberId,
        referenceMonth: input.monthYear,
        date: input.date,
        amount: input.amount,
        notes: input.notes,
        recordedById,
        createdAt: now,
        updatedAt: now,
      };
      await db.memberPayments.add(created);
      byMember.set(memberId, created);
      ids.push(id);
    }

    return ids;
  });
}

export async function recordMemberPayment(input: RecordMemberPaymentInput): Promise<string> {
  const [id] = await recordMemberPayments({
    ...input,
    memberIds: [input.memberId],
  });
  return id;
}

// ===== SEED DATA =====
export async function seedDatabase() {
  const userCount = await db.users.count();
  if (userCount > 0) return; // Já seedado

  const now = new Date().toISOString();

  // Admin user
  await db.users.add({
    id: 'admin-001',
    email: 'admin@gremio.local',
    passwordHash: 'dev-admin-hash', // Gremio@2026!Admin
    name: 'Administrador do Sistema',
    role: 'ADMIN',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // Contas iniciais
  await db.accounts.bulkAdd([
    { id: 'acc-cash', name: 'Caixa Físico', type: 'CASH', balance: 0, isActive: true, description: 'Dinheiro em espécie na tesouraria', createdAt: now, updatedAt: now },
    { id: 'acc-bank', name: 'Conta Bancária', type: 'BANK', balance: 0, isActive: true, description: 'Conta corrente do grêmio', createdAt: now, updatedAt: now },
    { id: 'acc-pix', name: 'PIX', type: 'PIX', balance: 0, isActive: true, description: 'Chave PIX do grêmio', createdAt: now, updatedAt: now },
  ]);

  // Categorias de Entrada
  const incomeCategories = [
    { name: 'Mensalidades', color: '#3b82f6' },
    { name: 'Contribuições', color: '#10b981' },
    { name: 'Doações', color: '#8b5cf6' },
    { name: 'Eventos', color: '#f97316' },
    { name: 'Festas', color: '#ec4899' },
    { name: 'Vendas', color: '#22c55e' },
    { name: 'Outros Recebimentos', color: '#64748b' },
  ];

  await db.categories.bulkAdd(
    incomeCategories.map((c, i) => ({
      id: `cat-inc-${i + 1}`,
      name: c.name,
      type: 'INCOME' as CategoryType,
      color: c.color,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }))
  );

  // Categorias de Despesa
  const expenseCategories = [
    { name: 'Alimentação', color: '#ef4444' },
    { name: 'Eventos', color: '#f97316' },
    { name: 'Festas', color: '#ec4899' },
    { name: 'Materiais', color: '#22c55e' },
    { name: 'Manutenção', color: '#eab308' },
    { name: 'Equipamentos', color: '#8b5cf6' },
    { name: 'Serviços', color: '#3b82f6' },
    { name: 'Transporte', color: '#06b6d4' },
    { name: 'Outros Gastos', color: '#64748b' },
  ];

  await db.categories.bulkAdd(
    expenseCategories.map((c, i) => ({
      id: `cat-exp-${i + 1}`,
      name: c.name,
      type: 'EXPENSE' as CategoryType,
      color: c.color,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }))
  );

  // Configurações iniciais
  await db.settings.bulkAdd([
    { key: 'unitName', value: '1ª Companhia de Fuzileiros - Treme Terra', description: 'Nome da unidade', updatedAt: now },
    { key: 'unitShortName', value: '1ª CFz - Treme Terra', description: 'Nome abreviado', updatedAt: now },
    { key: 'currency', value: 'BRL', description: 'Moeda', updatedAt: now },
    { key: 'dateFormat', value: 'DD/MM/YYYY', description: 'Formato de data', updatedAt: now },
    { key: 'firstAccess', value: true, description: 'Primeiro acesso - trocar senha', updatedAt: now },
  ]);

  console.log('✅ Banco de dados populado com dados iniciais');
}

// ===== HELPERS DE CÁLCULO =====

export async function recalculateAccountBalance(accountId: string): Promise<number> {
  const [entries, expenses, transfersIn, transfersOut] = await Promise.all([
    db.entries.where('accountId').equals(accountId).toArray(),
    db.expenses.where('accountId').equals(accountId).toArray(),
    db.transfers.where('toAccountId').equals(accountId).toArray(),
    db.transfers.where('fromAccountId').equals(accountId).toArray(),
  ]);

  const income = entries.reduce((sum, e) => sum + e.amount, 0);
  const expense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const transferIn = transfersIn.reduce((sum, t) => sum + t.amount, 0);
  const transferOut = transfersOut.reduce((sum, t) => sum + t.amount, 0);

  return income - expense + transferIn - transferOut;
}

export async function updateAccountBalance(accountId: string): Promise<void> {
  const balance = await recalculateAccountBalance(accountId);
  await db.accounts.update(accountId, { balance, updatedAt: new Date().toISOString() });
}

export async function updateAllAccountBalances(): Promise<void> {
  const accounts = await db.accounts.toArray();
  await Promise.all(accounts.map(a => updateAccountBalance(a.id)));
}

// ===== FORMATAÇÃO =====

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
}

export function parseBRL(value: string): number {
  // Remove R$, espaços, pontos de milhar, substitui vírgula por ponto
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Math.round(num * 100); // Retorna centavos
}

export function formatDateBR(dateStr: string): string {
  // dateStr: YYYY-MM-DD
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function parseDateBR(dateStr: string): string {
  // DD/MM/YYYY -> YYYY-MM-DD
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function formatMonthYear(monthYear: string): string {
  // YYYY-MM -> MM/YYYY
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
}

export function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month-2 porque getMonth é 0-indexed
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getNextMonthYear(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ===== EXPORTAÇÃO/IMPORTAÇÃO BACKUP =====

export interface BackupData {
  version: number;
  timestamp: string;
  users: User[];
  members: Member[];
  accounts: Account[];
  categories: Category[];
  entries: Entry[];
  expenses: Expense[];
  transfers: Transfer[];
  memberPayments: MemberPayment[];
  attachments: Attachment[];
  auditLogs: AuditLog[];
  settings: Setting[];
}

export async function exportBackup(): Promise<BackupData> {
  const [users, members, accounts, categories, entries, expenses, transfers, memberPayments, attachments, auditLogs, settings] = await Promise.all([
    db.users.toArray(),
    db.members.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
    db.entries.toArray(),
    db.expenses.toArray(),
    db.transfers.toArray(),
    db.memberPayments.toArray(),
    db.attachments.toArray(),
    db.auditLogs.toArray(),
    db.settings.toArray(),
  ]);

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    users,
    members,
    accounts,
    categories,
    entries,
    expenses,
    transfers,
    memberPayments,
    attachments,
    auditLogs,
    settings,
  };
}

export async function importBackup(data: BackupData): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    // Limpar tabelas (exceto admin user)
    await Promise.all([
      db.members.clear(),
      db.accounts.clear(),
      db.categories.clear(),
      db.entries.clear(),
      db.expenses.clear(),
      db.transfers.clear(),
      db.memberPayments.clear(),
      db.attachments.clear(),
      db.auditLogs.clear(),
      db.settings.clear(),
    ]);

    // Restaurar dados
    await Promise.all([
      db.members.bulkAdd(data.members),
      db.accounts.bulkAdd(data.accounts),
      db.categories.bulkAdd(data.categories),
      db.entries.bulkAdd(data.entries),
      db.expenses.bulkAdd(data.expenses),
      db.transfers.bulkAdd(data.transfers),
      db.memberPayments.bulkAdd(data.memberPayments),
      db.attachments.bulkAdd(data.attachments),
      db.auditLogs.bulkAdd(data.auditLogs),
      db.settings.bulkAdd(data.settings),
    ]);
  });
}