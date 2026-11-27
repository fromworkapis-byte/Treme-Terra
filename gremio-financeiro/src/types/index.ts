// ===== TIPOS DO SISTEMA =====

export type UserRole = 'ADMIN' | 'TREASURER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Postos/graduações permitidos para novos cadastros.
export type AllowedMilitaryRank = 'SD_RC' | 'SD_ENG' | 'CB';

// Valores antigos continuam legíveis para não apagar cadastros já existentes.
export type LegacyMilitaryRank =
  | 'SD' | '3SG' | '2SG' | '1SG' | 'ST'
  | 'ASP' | '2TEN' | '1TEN' | 'CAP' | 'MAJ' | 'TC' | 'CEL' | 'GEN';

export type MilitaryRank = AllowedMilitaryRank | LegacyMilitaryRank;

export interface Member {
  id: string;
  rank: MilitaryRank;        // Post/Grad
  name: string;              // Nome completo
  ordem: number;             // Número de ordem (antiguidade) - OCULTO NA UI
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  joinedAt: string;          // Data de ingresso
  createdAt: string;
  updatedAt: string;
}

export type AccountType = 'CASH' | 'BANK' | 'PIX' | 'OTHER';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;           // Decimal como number (centavos internamente)
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'CASH' | 'PIX' | 'TRANSFER' | 'DEPOSIT' | 'CARD_DEBIT' | 'CARD_CREDIT' | 'BOLETO' | 'OTHER';

export interface Entry {
  id: string;
  date: string;              // YYYY-MM-DD
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  categoryId: string;
  createdById: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Populated
  account?: Account;
  category?: Category;
  createdBy?: User;
  attachments?: Attachment[];
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  accountId: string;
  categoryId: string;
  createdById: string;
  beneficiary?: string;      // Fornecedor
  receiptNumber?: string;    // Nº comprovante
  fixedExpenseId?: string;   // Despesa fixa que gerou este lançamento
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Populated
  account?: Account;
  category?: Category;
  createdBy?: User;
  attachments?: Attachment[];
}

export interface Transfer {
  id: string;
  date: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  createdById: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Populated
  fromAccount?: Account;
  toAccount?: Account;
  createdBy?: User;
}

export interface MemberPayment {
  id: string;
  memberId: string;
  date: string;
  amount: number;
  referenceMonth: string;    // YYYY-MM (mês de referência)
  recordedById: string;
  entryId?: string;          // Entrada no caixa gerada por este pagamento
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Populated
  member?: Member;
  recordedBy?: User;
}

export interface FixedExpense {
  id: string;
  description: string;
  amount: number;            // centavos
  day: number;               // dia do mês (1 a 31; ajustado para meses curtos)
  paymentMethod: PaymentMethod;
  accountId: string;
  categoryId: string;
  beneficiary?: string;
  isActive: boolean;
  lastGeneratedMonth?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type EntityType = 'ENTRY' | 'EXPENSE' | 'MEMBER_PAYMENT';

export interface Attachment {
  id: string;
  fileName: string;
  filePath: string;          // Base64 ou blob URL
  mimeType: string;
  fileSize: number;
  entityType: EntityType;
  entityId: string;
  uploadedById: string;
  createdAt: string;
  
  uploadedBy?: User;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'TRANSFER';

export interface AuditLog {
  id: string;
  entityType: EntityType | 'TRANSFER' | 'MEMBER' | 'MEMBER_PAYMENT' | 'ACCOUNT' | 'CATEGORY' | 'USER';
  entityId: string;
  action: AuditAction;
  userId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  
  user?: User;
}

export interface Setting {
  key: string;
  value: Record<string, unknown>;
  description?: string;
  updatedAt: string;
}

// ===== FILTROS E QUERIES =====

export interface DateRange {
  start: string;
  end: string;
}

export interface FinancialFilters {
  dateRange?: DateRange;
  month?: number;
  year?: number;
  categoryId?: string;
  accountId?: string;
  type?: 'ENTRY' | 'EXPENSE' | 'TRANSFER';
  responsibleId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MemberFilters {
  status?: 'ACTIVE' | 'INACTIVE';
  rank?: MilitaryRank;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ===== RELATÓRIOS =====

export interface ReportSummary {
  initialBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalTransfers: number;
  finalBalance: number;
  period: { start: string; end: string };
}

export interface ReportDetail {
  date: string;
  description: string;
  category: string;
  type: 'ENTRY' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  account: string;
  responsible: string;
  beneficiary?: string;
  receiptNumber?: string;
}

export interface AccountabilityReport {
  unitName: string;
  period: { month: number; year: number };
  generatedAt: string;
  generatedBy: string;
  summary: ReportSummary;
  details: ReportDetail[];
  membersStatus: MemberPaymentStatus[];
}

export interface MemberPaymentStatus {
  member: Member;
  paidMonths: string[];      // YYYY-MM
  pendingMonths: string[];   // YYYY-MM
  totalPaid: number;
  lastPayment?: string;
}

// ===== DASHBOARD =====

export interface DashboardKPIs {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  monthResult: number;
  cashBalance: number;
  bankBalance: number;
  pixBalance: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface MonthlyEvolution {
  month: string;    // YYYY-MM
  income: number;
  expense: number;
  balance: number;
}

export interface YearlyComparison {
  year: number;
  income: number;
  expense: number;
  result: number;
}

// ===== CONSTANTES =====

export const ALLOWED_MILITARY_RANKS: { value: AllowedMilitaryRank; label: string; order: number }[] = [
  { value: 'SD_RC', label: 'Soldado Recruta', order: 1 },
  { value: 'SD_ENG', label: 'Soldado Engajado', order: 2 },
  { value: 'CB', label: 'Cabo', order: 3 },
];

/** Mantido como alias para compatibilidade com código antigo. */
export const MILITARY_RANKS = ALLOWED_MILITARY_RANKS;

const LEGACY_RANK_LABELS: Record<LegacyMilitaryRank, string> = {
  SD: 'Soldado (cadastro antigo)',
  '3SG': '3º Sargento (cadastro antigo)',
  '2SG': '2º Sargento (cadastro antigo)',
  '1SG': '1º Sargento (cadastro antigo)',
  ST: 'Subtenente (cadastro antigo)',
  ASP: 'Aspirante (cadastro antigo)',
  '2TEN': '2º Tenente (cadastro antigo)',
  '1TEN': '1º Tenente (cadastro antigo)',
  CAP: 'Capitão (cadastro antigo)',
  MAJ: 'Major (cadastro antigo)',
  TC: 'Tenente-Coronel (cadastro antigo)',
  CEL: 'Coronel (cadastro antigo)',
  GEN: 'General (cadastro antigo)',
};

export function isAllowedMilitaryRank(rank: string): rank is AllowedMilitaryRank {
  return ALLOWED_MILITARY_RANKS.some(item => item.value === rank);
}

export function militaryRankLabel(rank: string): string {
  const allowed = ALLOWED_MILITARY_RANKS.find(item => item.value === rank);
  if (allowed) return allowed.label;
  return LEGACY_RANK_LABELS[rank as LegacyMilitaryRank] || rank;
}

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'CASH', label: 'Caixa Físico', icon: 'wallet' },
  { value: 'BANK', label: 'Conta Bancária', icon: 'credit-card' },
  { value: 'PIX', label: 'PIX', icon: 'smartphone' },
  { value: 'OTHER', label: 'Outras', icon: 'building' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'DEPOSIT', label: 'Depósito' },
  { value: 'CARD_DEBIT', label: 'Cartão Débito' },
  { value: 'CARD_CREDIT', label: 'Cartão Crédito' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OTHER', label: 'Outros' },
];

export const INCOME_CATEGORIES = [
  'Mensalidades',
  'Contribuições',
  'Doações',
  'Eventos',
  'Festas',
  'Vendas',
  'Outros Recebimentos',
];

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Eventos',
  'Festas',
  'Materiais',
  'Manutenção',
  'Equipamentos',
  'Serviços',
  'Transporte',
  'Outros Gastos',
];

export const UNIT_NAME = '1ª Companhia de Fuzileiros - Treme Terra';
export const UNIT_SHORT_NAME = '1ª CFz - Treme Terra';