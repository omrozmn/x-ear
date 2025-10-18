import { BaseEntity, ContactInfo, Status } from './common';

export interface Patient extends BaseEntity {
  firstName: string;
  lastName: string;
  tcNumber: string;
  birthDate: string;
  gender: 'male' | 'female' | 'other';
  contactInfo: ContactInfo;
  status: Status;
  notes?: string;
  medicalHistory?: MedicalHistory[];
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