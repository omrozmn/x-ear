import { BaseEntity, ContactInfo, Status } from './common';

export interface Patient extends BaseEntity {
  firstName: string;
  lastName: string;
  tcNumber: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other';
  contactInfo: ContactInfo;
  status: Status;
  notes?: PatientNote[]; // Changed from string to PatientNote array
  medicalHistory?: MedicalHistory[];
  // Additional fields for compatibility
  devices?: PatientDevice[];
  communications?: PatientCommunication[];
}

export interface MedicalHistory extends BaseEntity {
  patientId: string;
  condition: string;
  diagnosis: string;
  treatment?: string;
  date: string;
  doctorId?: string;
  notes?: string;
}

export interface PatientDevice {
  id: string;
  brand: string;
  model: string;
  serialNumber?: string;
  side: 'left' | 'right' | 'both';
  type: 'hearing_aid' | 'cochlear_implant' | 'bone_anchored';
  status: 'active' | 'trial' | 'returned' | 'replaced';
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
  type?: 'general' | 'clinical' | 'financial' | 'sgk';
  isPrivate?: boolean;
}

export interface PatientCommunication {
  id: string;
  type: 'sms' | 'email' | 'call' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  date: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

export interface PatientCreateRequest {
  firstName: string;
  lastName: string;
  tcNumber: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other';
  contactInfo: ContactInfo;
  notes?: string;
}

export interface PatientUpdateRequest extends Partial<PatientCreateRequest> {
  id: string;
  status?: Status;
}

export interface PatientSearchFilters {
  search?: string;
  status?: Status;
  gender?: 'male' | 'female' | 'other';
  ageFrom?: number;
  ageTo?: number;
}