/**
 * Core Patient Types - Base Interface and Status Types
 * @fileoverview Core patient data structures and status enums
 * @version 1.0.0
 */

// Core Patient Status Types
export type PatientStatus = 'active' | 'inactive' | 'archived';
export type PatientSegment = 'new' | 'trial' | 'purchased' | 'control' | 'renewal' | 'existing' | 'vip';
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

// Core Patient Interface
export interface Patient {
  // Identity
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  tcNumber?: string;
  birthDate?: string;
  email?: string;
  address?: string;
  
  // Status and Classification
  status: PatientStatus;
  segment: PatientSegment;
  label: PatientLabel;
  acquisitionType: PatientAcquisitionType;
  
  // Tags and Priority
  tags: string[];
  priorityScore?: number;
  
  // Device Information (basic)
  deviceTrial?: boolean;
  trialDevice?: string;
  trialDate?: string;
  priceGiven?: boolean;
  purchased?: boolean;
  purchaseDate?: string;
  deviceType?: DeviceType;
  deviceModel?: string;
  
  // Financial Information (basic)
  overdueAmount?: number;
  
  // SGK Status (basic)
  sgkStatus?: SGKStatus;
  sgkSubmittedDate?: string;
  sgkDeadline?: string;
  deviceReportRequired?: boolean;
  batteryReportRequired?: boolean;
  batteryReportDue?: string;
  
  // Communication History (basic)
  lastContactDate?: string;
  lastAppointmentDate?: string;
  missedAppointments?: number;
  lastPriorityTaskDate?: string;
  renewalContactMade?: boolean;
  
  // Clinical Information (basic)
  assignedClinician?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  
  // Related Data (references to other types)
  devices: PatientDevice[];
  notes: PatientNote[];
  communications?: Communication[];
  reports?: PatientReport[];
  ereceiptHistory?: EReceiptRecord[];
  appointments?: Appointment[];
  installments?: Installment[];
  sales?: Sale[];
  sgkInfo: SGKInfo;
  sgkWorkflow?: SGKWorkflow;
}

// Device Types
export type DeviceType = 'hearing_aid' | 'cochlear_implant' | 'bone_anchored';
export type DeviceSide = 'left' | 'right' | 'both';
export type DeviceStatus = 'active' | 'trial' | 'returned' | 'replaced';

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
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

// Sale Types
export type SaleStatus = 'draft' | 'confirmed' | 'cancelled' | 'paid';

// EReceipt Types
export type EReceiptStatus = 'draft' | 'sent' | 'approved' | 'rejected';

// Forward declarations for complex types (defined in other files)
export interface PatientDevice {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  side: DeviceSide;
  type: DeviceType;
  status: DeviceStatus;
  purchaseDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  batteryType?: string;
  price?: number;
  sgkScheme?: boolean;
  settings?: Record<string, unknown>;
}

export interface PatientNote {
  id: string;
  text: string;
  date: string;
  author: string;
  type?: NoteType;
  isPrivate?: boolean;
}

// Re-export commonly used interfaces
export type { 
  Communication,
  PatientReport,
  Appointment,
  Installment,
  Sale
} from './patient-communication.types';

export type {
  EReceiptRecord,
  SGKInfo,
  SGKWorkflow
} from './patient-sgk.types';