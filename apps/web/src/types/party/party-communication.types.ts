/**
 * Party Communication Types
 * @fileoverview Communication, reports, and related data structures
 * @version 1.0.0
 */

import type {
  CommunicationType,
  CommunicationDirection,
  CommunicationStatus,
  ReportType,
  AppointmentStatus,
  PaymentMethod,
  PaymentStatus,
  SaleStatus
} from './party-base.types';

export interface Communication {
  id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  content: string;
  timestamp: string;
  status: CommunicationStatus;
  templateId?: string;
  variables?: Record<string, unknown>;
}

export interface PartyReport {
  id: string;
  type: ReportType;
  title: string;
  content?: string;
  fileUrl?: string;
  createdAt: string;
  createdBy: string;
  validUntil?: string;
}

export interface Appointment {
  id: string;
  date: string; // ISO date
  note?: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface Installment {
  id: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  saleId?: string;
  amount: number;
  date: string; // ISO
  method?: PaymentMethod | string;
  status?: PaymentStatus;
  note?: string;
  createdAt?: string;
}

export interface Sale {
  id?: string;
  partyId: string; // Required in Orval type
  productId?: string;
  saleDate?: string; // ISO
  totalAmount: number; // Required in both
  listPriceTotal?: number;
  discountAmount?: number;
  finalAmount?: number; // Total after discounts and SGK
  paidAmount?: number; // Total amount paid so far
  remainingAmount?: number; // Calculated: finalAmount - paidAmount
  sgkCoverage?: number;
  partyPayment?: number; // From Orval type
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'partial' | 'completed' | 'cancelled'; // Payment status
  status?: SaleStatus;
  notes?: string;
  payments?: PaymentRecord[]; // Additional field for local use
  devices?: unknown[]; // Device details from assignments - flexible type for runtime data
  soldBy?: string;
  paymentRecords?: unknown[]; // Payment records from PaymentRecord table - flexible type for runtime data
  createdAt?: string;
  updatedAt?: string;
}

// Communication types for party management
export interface CommunicationRecord {
  id: string;
  partyId: string;
  type: 'email' | 'sms' | 'call' | 'letter';
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
}

export interface CommunicationPreferences {
  preferredMethod: 'call' | 'sms' | 'email' | 'whatsapp';
  allowMarketing: boolean;
  allowReminders: boolean;
  allowEmergency: boolean;
}

// Commented out unused exports to fix linter errors
// export enum EReceiptStatus {
//   PENDING = 'pending',
//   SENT = 'sent',
//   DELIVERED = 'delivered',
//   FAILED = 'failed'
// }

// export enum InsuranceType {
//   SGK = 'sgk',
//   PRIVATE = 'private',
//   NONE = 'none'
// }