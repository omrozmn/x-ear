/**
 * Core Party Types - Base Interface and Status Types
 * @fileoverview Core party data structures and status enums
 * @version 1.0.0
 */

// Import Orval PartyRead type
import type { PartyRead as OrvalParty } from '@/api/generated/schemas/partyRead';

// Re-export Orval Party types as Party types aliases
export type { PartyReadStatus as PartyStatus } from '@/api/generated/schemas/partyReadStatus';
export type { PartyReadGender as PartyGender } from '@/api/generated/schemas/partyReadGender';
export type SaleStatus = 'draft' | 'confirmed' | 'cancelled' | 'paid' | 'completed' | 'pending'; // Manual fallback

// Keep only essential types that are still needed
export type PartySegment = 'NEW' | 'TRIAL' | 'PURCHASED' | 'CONTROL' | 'RENEWAL' | 'EXISTING' | 'VIP';
export type PartyLabel =
  | 'yeni'
  | 'arama-bekliyor'
  | 'randevu-verildi'
  | 'deneme-yapildi'
  | 'kontrol-hastasi'
  | 'satis-tamamlandi';
export type PartyAcquisitionType =
  | 'tabela'
  | 'sosyal-medya'
  | 'tanitim'
  | 'referans'
  | 'diger';
export type PartyConversionStep =
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

// Address interface for typed address object access
export interface Address {
  city?: string;
  district?: string;
  fullAddress?: string;
  street?: string;
  postalCode?: string;
  country?: string;
}

// Payment Types
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'sgk' | 'installment';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'completed' | 'failed';

// Sale Types
// Sale Types - Use Orval generated SaleStatus
// export type SaleStatus = 'draft' | 'confirmed' | 'cancelled' | 'paid'; // Removed - using Orval type

// EReceipt Types
export type EReceiptStatus = 'draft' | 'sent' | 'approved' | 'rejected';

// Forward declarations for complex types (defined in other files)
export interface PartyDevice {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  serialNumberLeft?: string;
  serialNumberRight?: string;
  side: DeviceSide;
  ear?: DeviceSide;
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
  basePrice?: number;
  listPrice?: number;
  salePrice?: number;
  sgkReduction?: number;
  sgkSupport?: number;
  partyPayment?: number;
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
  assignmentId?: string;
  deviceId?: string;
  trialEndDate?: string;
  trialStartDate?: string;
  returnDate?: string;
  condition?: string;
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

  // Snake_case variants for backend compatibility
  delivery_status?: string;
  report_status?: string;
  is_loaner?: boolean;
  created_at?: string;
  assigned_date?: string;
  loaner_brand?: string;
  loaner_model?: string;
  ear_side?: string;
  sgk_support?: number;
  salePricePerItem?: number;
}

export interface PartyNote {
  id: string;
  text: string;
  date: string;
  author: string;
  type?: NoteType;
  isPrivate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartyCommunication {
  id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  content: string;
  status: CommunicationStatus;
  date: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

// SGK Info interface for typed access
export interface SGKInfo {
  sgkNumber?: string;
  number?: string;
  reportDate?: string;
  reportNo?: string;
  validityPeriod?: string;
  validityDate?: string;
  institution?: string;
  contributionAmount?: number;
  sgkCoverage?: number;
  coveragePercentage?: number;
  status?: string;
  // Index signature for compatibility with PartyReadSgkInfo
  [key: string]: unknown;
}

// Hearing Profile interface (extends base HearingProfileRead requirements)
export interface HearingProfile {
  id: string;
  partyId: string;
  sgkInfo?: SGKInfo;
  audiogramLeft?: Record<string, number>;
  audiogramRight?: Record<string, number>;
  hearingLossType?: string;
  recommendations?: string[];
  // Index signature for compatibility
  [key: string]: unknown;
}

// Extended Party type with additional fields needed by the application
export interface Party extends OrvalParty {
  // Computed properties
  age?: number; // Computed from birthDate
  devices?: PartyDevice[];
  notes?: PartyNote[];
  communications?: PartyCommunication[];
  tags?: string[]; // Overriding Orval's unknown typing
  hearingProfile?: HearingProfile;
  hearing_profile?: HearingProfile; // snake_case alias
  sgkInfo?: SGKInfo;
  roles?: Array<{ code: string; is_primary?: boolean }>; // Added for Role/Profile separation

  // Fields from legacy party.ts
  appointments?: any[]; // Avoiding circular dependency for now, or use 'Appointment[]' if imported
  sales?: any[]; // Use 'Sale[]' if imported
  reports?: any[]; // Use 'PartyReport[]' if imported
  ereceiptHistory?: any[]; // Use 'EReceiptRecord[]' if imported
  sgkWorkflow?: any; // Use 'SGKWorkflow' if imported
  customData?: any; // Added to match PartyRead and legacy adapter usage

  // Common snake_case aliases for convenience and backend compatibility
  first_name?: string | undefined;
  last_name?: string | undefined;
  tc_number?: string | undefined;
  birth_date?: string | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
  address_city?: string | undefined;
  address_district?: string | undefined;
  address_full?: string | undefined;
  priority_score?: number | undefined;
  sgk_info?: any;

  // UI helpers
  lastContactDate?: string;
  label?: string; // Legacy
  labels?: string[]; // Multiple labels
  branchId?: string; // Branch identifier
  branch?: string; // Legacy, use branchId/branchName from PartyRead

  // Address override if needed (PartyRead has address object usually)
  // Typescript might complain if PartyRead.address is different from this signature
  // address?: string | { ... }; 
}