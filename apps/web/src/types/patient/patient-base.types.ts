/**
 * Core Patient Types - Base Interface and Status Types
 * @fileoverview Core patient data structures and status enums
 * @version 1.0.0
 */

// Import Orval Patient type
import type { Patient as OrvalPatient } from '../../generated/orval-types';

// Re-export Orval Patient types
export type { PatientStatus, PatientGender, SaleStatus } from '../../generated/orval-types';

// Keep only essential types that are still needed
export type PatientSegment = 'NEW' | 'TRIAL' | 'PURCHASED' | 'CONTROL' | 'RENEWAL' | 'EXISTING' | 'VIP';
export type PatientLabel =
  | 'yeni'
  | 'arama-bekliyor'
  | 'randevu-verildi'
  | 'deneme-yapildi'
  | 'kontrol-hastasi'
  | 'satis-tamamlandi';
export type PatientAcquisitionType =
  | 'tabela'
  | 'sosyal-medya'
  | 'tanitim'
  | 'referans'
  | 'diger';
export type PatientConversionStep =
  | 'lead'
  | 'contacted'
  | 'appointment-scheduled'
  | 'visited'
  | 'trial-started'
  | 'trial-completed'
  | 'purchased'
  | 'delivered';

// Device Types
export type DeviceType = 'hearing_aid' | 'cochlear_implant' | 'bone_anchored' | (string & {});
export type DeviceSide = 'left' | 'right' | 'both';
export type DeviceStatus = 'active' | 'trial' | 'returned' | 'replaced' | 'assigned' | (string & {});

// SGK Types
export type SGKStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type InsuranceType = 'sgk' | 'private' | 'other';

// Note Types
export type NoteType = 'general' | 'clinical' | 'financial' | 'sgk';

// Communication Types
export type CommunicationType = 'sms' | 'email' | 'call' | 'whatsapp';
export type CommunicationDirection = 'inbound' | 'outbound';
export type CommunicationStatus = 'sent' | 'delivered' | 'read' | 'failed';

// Report Types
export type ReportType = 'audiogram' | 'battery' | 'device' | 'sgk' | 'medical';

// Appointment Types
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

// Payment Types
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'sgk' | 'installment';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'completed' | 'failed';

// Sale Types
// Sale Types - Use Orval generated SaleStatus
// export type SaleStatus = 'draft' | 'confirmed' | 'cancelled' | 'paid'; // Removed - using Orval type

// EReceipt Types
export type EReceiptStatus = 'draft' | 'sent' | 'approved' | 'rejected';

// Forward declarations for complex types (defined in other files)
export interface PatientDevice {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;
  side: DeviceSide;
  ear?: string;
  earSide?: string;
  type: DeviceType;
  status: DeviceStatus;
  purchaseDate?: string;
  assignedDate?: string;
  createdAt?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  batteryType?: string;
  price?: number;
  listPrice?: number;
  salePrice?: number;
  sgkReduction?: number;
  sgkSupport?: number;
  patientPayment?: number;
  netPayable?: number;
  downPayment?: number;
  sgkScheme?: string;
  sgkSupportType?: string;
  paymentMethod?: string;
  discountType?: string;
  discountValue?: number;
  assignmentUid?: string;
  barcode?: string;
  deviceName?: string;
  assignedBy?: string;
  reason?: string;
  notes?: string;
  saleId?: string;
  inventoryId?: string;
  deviceId?: string;
  trialEndDate?: string;
  deliveryStatus?: string;
  isLoaner?: boolean;
  loanerInventoryId?: string;
  loanerSerialNumber?: string;
  loanerSerialNumberLeft?: string;
  loanerSerialNumberRight?: string;
  loanerBrand?: string;
  loanerModel?: string;
  reportStatus?: string;
  settings?: Record<string, unknown> | boolean;
}

export interface PatientNote {
  id: string;
  text: string;
  date: string;
  author: string;
  type?: NoteType;
  isPrivate?: boolean;
}

export interface PatientCommunication {
  id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  content: string;
  status: CommunicationStatus;
  date: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

// Extended Patient type with additional fields needed by the application
export interface Patient extends OrvalPatient {
  // Computed properties
  age?: number; // Computed from birthDate
  devices?: PatientDevice[];
  notes?: PatientNote[];
  communications?: PatientCommunication[];
}