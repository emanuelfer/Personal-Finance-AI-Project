export interface Account {
  accountId: string;
  name: string;
  type: string; // CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT
  currency: string;
  balance: number;
  initialBalance?: number;
  version: number;
  updatedAt?: string;
}

export interface Transaction {
  transactionId: string;
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  merchant?: string;
  description?: string;
  receiptId?: string;
  transactionDate: string;
  owner?: string;
}

export interface MonthlyMetrics {
  yearMonth: string;
  total_income: number;
  total_expense: number;
  categories: Record<string, number>;
}

export interface ReceiptLineItem {
  description: string;
  price: number;
  quantity?: number;
}

export interface Receipt {
  receiptId: string;
  fileName: string;
  status: 'PENDING' | 'EXTRACTED' | 'RECONCILED' | 'FAILED';
  merchant?: string;
  totalAmount?: number;
  taxAmount?: number;
  receiptDate?: string;
  confidenceScore?: number;
  reconciledTransactionId?: string;
  lineItems?: ReceiptLineItem[];
  createdAt: string;
}

export interface Budget {
  budgetId: string;
  category: string;
  monthlyLimit: number;
  currentSpent: number;
  monthYear: string;
}

export interface EventEnvelope {
  eventId: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  payloadJson: string;
  metadataJson: string;
  occurredAt: string;
}

export interface ToolExecutionTrace {
  toolName: string;
  arguments: Record<string, any>;
  result: any;
}

export interface AdvisorResponse {
  reply: string;
  toolTraces: ToolExecutionTrace[];
  citations: string[];
  responseTimeMs: number;
  modelUsed?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  toolTraces?: ToolExecutionTrace[];
  citations?: string[];
  timestamp: Date;
  responseTimeMs?: number;
  modelUsed?: string;
}

// Spreadsheet Multi-User & Multi-Period Time Horizon Models
export interface HouseholdMember {
  id: string; // e.g. "member-1", "member-2"
  name: string; // Member display name
  icon: string; // e.g. "👨", "👩", "🧒", "👤", "💼"
  color: string; // tailwind color prefix: "indigo", "purple", "emerald", "amber", "rose", "sky", "cyan"
  baseInitialReserve: number;
  baseInitialCapitalGiro: number;
}

export type ExpenseOwner = string;
export type ProfileView = string; // 'CONSOLIDADO' or any member.id
export type TimeHorizon = 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

export interface SpreadsheetExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  owner: ExpenseOwner;
}

export interface MonthSpreadsheetData {
  id: string;
  monthIndex: number; // 0 (Jan) to 11 (Dez)
  monthName: string; // e.g. "Janeiro", "Fevereiro", ...
  year: number; // e.g. 2026, 2027
  yearMonth: string; // e.g. "2026-01", "2026-09"
  expenses: SpreadsheetExpenseItem[];
  income: number; // Total Rendimentos
  
  // Dynamic Multi-User dictionaries (keyed by member.id or member.name)
  userIncomes?: Record<string, number>;
  userCapitalGiro?: Record<string, number>;
  userInitialCash?: Record<string, number>;
  userManualFinalCash?: Record<string, number>;

  // Dynamic and legacy backward-compatible properties
  [key: string]: any;

  capitalGiro?: number; // Total Capital de Giro (Casal / Família)
  isInitialGiroManual?: boolean;
  initialCash: number; // Caixa Inicial / Reserva Total
  isInitialCashManual?: boolean;
  syncedToLedger?: boolean;
}

export interface YearSpreadsheetData {
  year: number;
  months: MonthSpreadsheetData[];
  members?: HouseholdMember[];
}

export interface PeriodColumn {
  id: string;
  title: string;
  subtitle?: string;
  monthIndices: number[]; // indices of months included (e.g. [8, 9] for Set-Out)
  isEditable: boolean;
}

export interface CatalogExpense {
  id: string;
  description: string;
  defaultAmount: number;
  owner: ExpenseOwner;
  category: string;
  icon?: string;
  createdAt?: string;
  updatedAt?: string;
}

