/**
 * Cashflow Type Definitions
 */

export type TransactionType = 'income' | 'expense';

export type RecordType = 
  | 'kaparo'
  | 'kalip'
  | 'teslimat'
  | 'pil'
  | 'filtre'
  | 'tamir'
  | 'diger';

export interface CashRecord {
  id: string;
  date: string;
  transactionType: TransactionType;
  recordType: RecordType;
  patientId?: string | null;
  patientName?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  amount: number;
  description?: string;
}

export interface CashRecordFormData {
  transactionType: TransactionType;
  recordType: RecordType;
  patientId?: string;
  patientName?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  amount: number;
  description?: string;
}

export interface CashflowStats {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
}

export interface CashflowFilters {
  startDate?: string;
  endDate?: string;
  transactionType?: TransactionType | '';
  recordType?: RecordType | '';
  search?: string;
}

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  kaparo: 'Kaparo',
  kalip: 'Kalıp',
  teslimat: 'Teslimat',
  pil: 'Pil',
  filtre: 'Filtre',
  tamir: 'Tamir',
  diger: 'Diğer',
};

export const DEFAULT_INCOME_TYPES: RecordType[] = ['kaparo', 'teslimat'];
export const DEFAULT_EXPENSE_TYPES: RecordType[] = ['kalip', 'pil', 'filtre', 'tamir', 'diger'];
