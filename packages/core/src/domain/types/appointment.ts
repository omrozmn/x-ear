import { BaseEntity, Status } from './common';

export interface Appointment extends BaseEntity {
  patientId: string;
  doctorId?: string;
  date: string;
  time: string;
  duration: number; // in minutes
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  reminderSent?: boolean;
  cancellationReason?: string;
}

export type AppointmentType = 
  | 'consultation'
  | 'follow-up'
  | 'procedure'
  | 'emergency'
  | 'screening';

export type AppointmentStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export interface AppointmentCreateRequest {
  patientId: string;
  doctorId?: string;
  date: string;
  time: string;
  duration?: number;
  type: AppointmentType;
  notes?: string;
}

export interface AppointmentUpdateRequest extends Partial<AppointmentCreateRequest> {
  id: string;
  status?: AppointmentStatus;
  cancellationReason?: string;
}

export interface AppointmentSearchFilters {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  dateFrom?: string;
  dateTo?: string;
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
  doctorId?: string;
}