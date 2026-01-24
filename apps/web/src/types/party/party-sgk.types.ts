/**
 * Party SGK Types
 * @fileoverview SGK insurance and workflow related types
 * @version 1.0.0
 */

import type { 
  EReceiptStatus 
} from './party-base.types';

export interface SGKInfo {
  id: string;
  partyId: string;
  sgkNumber: string;
  insuranceType: 'sgk' | 'private' | 'none';
  isActive: boolean;
  validUntil?: Date;
  coverageDetails?: string;
  lastUpdated: Date;
  hasInsurance?: boolean;
  insuranceNumber?: string;
  coveragePercentage?: number;
  approvalNumber?: string;
  approvalDate?: string;
  expiryDate?: string;
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
  partyId: string;
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
  partyName?: string;
  tcNumber?: string;
  reportDate?: string;
  doctorName?: string;
  hospitalName?: string;
  diagnosis?: string;
  recommendedDevices?: string[];
  approvalNumber?: string;
  validUntil?: string;
}