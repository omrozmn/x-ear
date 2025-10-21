// Re-export Orval Patient types
export type { Patient as OrvalPatient } from '../generated/orval-types';
export type { PatientStatus, PatientGender } from '../generated/orval-types';

// Import Orval Patient for extension
import type { Patient as OrvalPatient } from '../generated/orval-types';

// Use Orval Patient as the main Patient type for API compatibility
export type Patient = OrvalPatient;

// Keep legacy types that are still needed for compatibility
export interface PatientDevice {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  side: 'left' | 'right' | 'both';
  ear?: 'left' | 'right' | 'both' | 'bilateral'; // Alternative to side for legacy compatibility
  type: 'hearing_aid' | 'cochlear_implant' | 'bone_anchored';
  status: 'active' | 'trial' | 'returned' | 'replaced' | 'assigned' | 'defective';
  purchaseDate?: string;
  assignedDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  batteryType?: string;

  // Pricing information
  price?: number;
  listPrice?: number;
  salePrice?: number;
  sgkReduction?: number;
  patientPayment?: number;

  // Payment and SGK
  sgkScheme?: boolean;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'installment';

  // Trial information
  trialEndDate?: string;

  // Assignment details
  assignedBy?: string;
  reason?: 'new' | 'replacement' | 'upgrade' | 'trial' | 'warranty';
  notes?: string;

  settings?: Record<string, unknown>;
}

// Keep legacy types that are still needed for compatibility
export interface PatientDevice {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  side: 'left' | 'right' | 'both';
  ear?: 'left' | 'right' | 'both' | 'bilateral'; // Alternative to side for legacy compatibility
  type: 'hearing_aid' | 'cochlear_implant' | 'bone_anchored';
  status: 'active' | 'trial' | 'returned' | 'replaced' | 'assigned' | 'defective';
  purchaseDate?: string;
  assignedDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  batteryType?: string;

  // Pricing information
  price?: number;
  listPrice?: number;
  salePrice?: number;
  sgkReduction?: number;
  patientPayment?: number;

  // Payment and SGK
  sgkScheme?: boolean;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'installment';

  // Trial information
  trialEndDate?: string;

  // Assignment details
  assignedBy?: string;
  reason?: 'new' | 'replacement' | 'upgrade' | 'trial' | 'warranty';
  notes?: string;

  settings?: Record<string, unknown>;
}

export interface Installment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  saleId?: string;
  amount: number;
  date: string; // ISO
  method?: 'cash' | 'card' | 'bank_transfer' | 'sgk' | string;
  status?: 'pending' | 'completed' | 'failed';
  note?: string;
  createdAt?: string;
}

export interface Sale {
  id: string;
  productId?: string;
  patientId?: string;
  saleDate?: string; // ISO
  listPriceTotal?: number;
  discountAmount?: number;
  sgkCoverage?: number;
  totalAmount: number;
  paymentMethod?: string;
  status?: 'draft' | 'confirmed' | 'cancelled' | 'paid';
  notes?: string;
  payments?: PaymentRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SGKInfo {
  hasInsurance: boolean;
  insuranceNumber?: string;
  insuranceType?: 'sgk' | 'private' | 'other';
  coveragePercentage?: number;
  approvalNumber?: string;
  approvalDate?: string;
  expiryDate?: string;
}

export interface SGKWorkflow {
  currentStatus: string;
  statusHistory: SGKStatusEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SGKStatusEntry {
  status: string;
  timestamp: string;
  notes?: string;
  userId?: string;
}

export interface PatientNote {
  id: string;
  text: string;
  date: string;
  author: string;
  type?: 'general' | 'clinical' | 'financial' | 'sgk';
  isPrivate?: boolean;
}

export interface Communication {
  id: string;
  type: 'sms' | 'email' | 'call' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  templateId?: string;
  variables?: Record<string, unknown>;
}

export interface PatientReport {
  id: string;
  type: 'audiogram' | 'battery' | 'device' | 'sgk' | 'medical';
  title: string;
  content?: string;
  fileUrl?: string;
  createdAt: string;
  createdBy: string;
  validUntil?: string;
}

export interface EReceiptRecord {
  id: string;
  receiptNumber: string;
  date: string;
  materials: EReceiptMaterial[];
  totalAmount: number;
  vatAmount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  sgkSubmissionId?: string;
}

export interface Appointment {
  id: string;
  date: string; // ISO date
  note?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface EReceiptMaterial {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

// Patient search and filtering
export interface PatientFilters {
  search?: string;
  status?: Patient['status'];
  segment?: string;
  acquisitionType?: string;
  tags?: string[];
  dateRange?: { start: string; end: string };
  page?: number;
  limit?: number;
}

export interface PatientSearchResult {
  patients: Patient[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Patient statistics
export interface PatientStats {
  total: number;
  byStatus: Record<string, number>;
  bySegment: Record<string, number>;
}

// Patient matching for OCR/document processing
export interface PatientMatchCandidate {
  patient: Patient;
  score: number;
  matchedFields: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface PatientMatchRequest {
  name?: string;
  firstName?: string;
  lastName?: string;
  tcNo?: string;
  birthDate?: string;
  phone?: string;
  extractedText?: string;
}