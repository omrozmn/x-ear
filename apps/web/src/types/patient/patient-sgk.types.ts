/**
 * Patient SGK Types
 * @fileoverview SGK insurance and workflow related types
 * @version 1.0.0
 */

import type { 
  SGKStatus, 
  InsuranceType, 
  EReceiptStatus 
} from './patient-base.types';

export interface SGKInfo {
  id: string;
  patientId: string;
  sgkNumber: string;
  insuranceType: 'sgk' | 'private' | 'none';
  isActive: boolean;
  validUntil?: Date;
  coverageDetails?: string;
  lastUpdated: Date;
}

// Commented out unused type to fix linter error
// export type SGKStatus = 'active' | 'inactive' | 'expired' | 'pending';

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

export interface EReceiptRecord {
  id: string;
  receiptNumber: string;
  date: string;
  materials: EReceiptMaterial[];
  totalAmount: number;
  vatAmount: number;
  status: EReceiptStatus;
  sgkSubmissionId?: string;
}

export interface EReceiptMaterial {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalPrice: number;
}

// SGK Document Types
export interface SGKDocument {
  id: string;
  type: SGKDocumentType;
  patientId: string;
  fileName: string;
  fileUrl: string;
  uploadDate: string;
  status: SGKDocumentStatus;
  extractedData?: SGKExtractedData;
  validationErrors?: string[];
}

export type SGKDocumentType = 
  | 'rapor' 
  | 'recete' 
  | 'fatura' 
  | 'onay-belgesi' 
  | 'diger';

export type SGKDocumentStatus = 
  | 'uploaded' 
  | 'processing' 
  | 'validated' 
  | 'rejected' 
  | 'submitted';

export interface SGKExtractedData {
  patientName?: string;
  tcNumber?: string;
  reportDate?: string;
  doctorName?: string;
  hospitalName?: string;
  diagnosis?: string;
  recommendedDevices?: string[];
  approvalNumber?: string;
  validUntil?: string;
}