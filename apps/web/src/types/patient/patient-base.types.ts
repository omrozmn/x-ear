/**
 * Core Patient Types - Base Interface and Status Types
 * @fileoverview Core patient data structures and status enums
 * @version 1.0.0
 */

// Re-export Orval Patient as the main Patient type
export type { Patient } from '../../generated/orval-types';

// Re-export Orval Patient types
export type { PatientStatus, PatientGender } from '../../generated/orval-types';

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