import { Patient } from '../../../../../types/patient/patient-base.types';
import { Sale, PaymentRecord } from '../../../../../types/patient/patient-communication.types';
import { PaymentRecord as OrvalPaymentRecord } from '../../../../../generated/orval-types';

export interface PromissoryNote {
  id: string;
  noteNumber: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'active' | 'paid' | 'partial' | 'overdue';
  referenceNumber?: string;
  notes?: string;
  saleId: string;
}

export interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  sale: Sale;
  onPaymentCreate: (paymentData: OrvalPaymentRecord) => void;
  onPromissoryPaymentCreate?: (paymentData: OrvalPaymentRecord) => void;
  onCreatePromissoryNote?: (noteData: Record<string, unknown>) => void;
}

export interface PaymentFormData {
  amount: number;
  method: 'cash' | 'credit' | 'bank_transfer' | 'check';
  installmentIds: string[];
  generateReceipt: boolean;
  notes?: string;
  // Credit card fields
  cardLast4?: string;
  cardType?: string;
  transactionId?: string;
  // Bank transfer fields
  bankName?: string;
  accountNumber?: string;
  referenceNumber?: string;
  // Check fields
  checkNumber?: string;
  checkDate?: string;
  checkBank?: string;
}

export interface PromissoryNoteFormData {
  noteNumber: string;
  amount: number;
  dueDate: string;
  notes: string;
}

export interface CollectionState {
  activeTab: 'payments' | 'promissory';
  paymentMethod: 'cash' | 'credit' | 'bank_transfer' | 'check';
  showCreatePromissoryForm: boolean;
  paymentAmount: number;
  selectedInstallments: string[];
  error: string | null;
  success: string | null;
  isLoading: boolean;
  generateReceipt: boolean;
  collectingNoteId: string | null;
  promissoryPaymentAmount: number;
  promissoryPaymentMethod: 'cash' | 'credit' | 'bank_transfer' | 'check';
}

export interface PaymentCalculations {
  totalPaid: number;
  remainingBalance: number;
  pendingInstallments: PaymentRecord[];
  overdueInstallments: PaymentRecord[];
}