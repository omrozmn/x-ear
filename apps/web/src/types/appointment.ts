// Appointment Types - Migrated from legacy appointments system

export type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show' 
  | 'rescheduled';

export type AppointmentType = 
  | 'consultation' 
  | 'hearing-test' 
  | 'device-trial' 
  | 'follow-up';

export interface Appointment {
  id: string;
  partyId: string;
  partyName?: string;
  
  // Date and time
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
  startTime?: string; // ISO string for calendar compatibility
  endTime?: string; // ISO string for calendar compatibility
  duration: number; // minutes, default 30
  
  // Appointment details
  title?: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  
  // Staff and location
  clinician?: string;
  clinicianId?: string;
  location?: string;
  branchId?: string;
  
  // Reminders and notifications
  reminderSent?: boolean;
  reminderDate?: string;
  
  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentFilters {
  partyId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  clinician?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AppointmentStats {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  byType: Record<AppointmentType, number>;
  byClinician: Record<string, number>;
  byBranch?: Record<string, number>;
}

export interface TimeSlot {
  time: string; // HH:MM format
  available: boolean;
  appointmentId?: string;
}

export interface AvailabilityRequest {
  date: string; // YYYY-MM-DD
  duration?: number; // minutes
  clinicianId?: string;
  branchId?: string;
}

export interface AvailabilityResponse {
  date: string;
  timeSlots: TimeSlot[];
  workingHours: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

export interface AppointmentReminder {
  id: string;
  appointmentId: string;
  partyId: string;
  reminderType: 'sms' | 'email' | 'call';
  scheduledFor: string; // ISO string
  sent: boolean;
  sentAt?: string;
  message?: string;
}

export interface AppointmentConflict {
  appointmentId: string;
  conflictType: 'time_overlap' | 'double_booking' | 'resource_conflict';
  conflictingAppointmentId?: string;
  message: string;
}

export interface RescheduleRequest {
  appointmentId: string;
  newDate: string;
  newTime: string;
  reason?: string;
}

export interface AppointmentSearchResult {
  appointments: Appointment[];
  total: number;
  hasMore: boolean;
}

// Calendar view types
export type CalendarView = 'month' | 'week' | 'day' | 'list';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    appointment: Appointment;
    partyName: string;
    status: AppointmentStatus;
    type: AppointmentType;
  };
}

// Bulk operations
export interface BulkAppointmentOperation {
  appointmentIds: string[];
  operation: 'cancel' | 'reschedule' | 'complete' | 'send_reminder';
  data?: {
    newDate?: string;
    newTime?: string;
    reason?: string;
    reminderType?: 'sms' | 'email';
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    appointmentId: string;
    error: string;
  }>;
}

// Form data types
export interface AppointmentFormData {
  partyId: string;
  date: string;
  time: string;
  duration: number;
  type: AppointmentType;
  title?: string;
  notes?: string;
  clinicianId?: string;
  branchId?: string;
  reminderEnabled?: boolean;
  reminderType?: 'sms' | 'email';
  reminderTime?: number; // minutes before appointment
}

// Validation types
export interface AppointmentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: AppointmentConflict[];
}

// Export utility type for creating new appointments
export type CreateAppointmentData = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

// Export utility type for updating appointments
export type UpdateAppointmentData = Partial<Omit<Appointment, 'id' | 'createdAt'>> & {
  id: string;
  updatedAt?: string;
};