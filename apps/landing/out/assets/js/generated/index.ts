/**
 * Generated API Client - Placeholder Implementation
 * This file serves as a placeholder until the actual client generation is resolved.
 */

// Basic types for the API client
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface Patient {
  id?: string;
  tcNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  gender?: 'M' | 'F';
  addressCity?: string;
  addressDistrict?: string;
  addressFull?: string;
  status?: 'active' | 'inactive';
  sgkInfo?: Record<string, any>;
  customData?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Appointment {
  id?: string;
  patientId: string;
  date: string;
  time: string;
  duration?: number;
  appointmentType?: string;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Device {
  id?: string;
  patientId?: string;
  serialNumber: string;
  brand: string;
  model: string;
  deviceType?: string;
  category?: string;
  ear?: 'left' | 'right' | 'both';
  status?: 'available' | 'assigned' | 'maintenance' | 'retired';
  price?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HearingTest {
  id?: string;
  patientId: string;
  testDate: string;
  testType?: string;
  results?: Record<string, any>;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientNote {
  id?: string;
  patientId: string;
  content: string;
  noteType?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Configuration interface
export interface Configuration {
  basePath?: string;
  apiKey?: string;
  accessToken?: string;
  headers?: Record<string, string>;
}

// API Classes - Placeholder implementations
export class PatientApi {
  constructor(private configuration?: Configuration) {}

  async getPatients(params?: any): Promise<ApiResponse<Patient[]>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async getPatient(id: string): Promise<ApiResponse<Patient>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async createPatient(patient: Omit<Patient, 'id'>): Promise<ApiResponse<Patient>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async updatePatient(id: string, patient: Partial<Patient>): Promise<ApiResponse<Patient>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async deletePatient(id: string): Promise<ApiResponse<void>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }
}

export class AppointmentApi {
  constructor(private configuration?: Configuration) {}

  async getAppointments(params?: any): Promise<ApiResponse<Appointment[]>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async getAppointment(id: string): Promise<ApiResponse<Appointment>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<ApiResponse<Appointment>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<ApiResponse<Appointment>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async deleteAppointment(id: string): Promise<ApiResponse<void>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }
}

export class DeviceApi {
  constructor(private configuration?: Configuration) {}

  async getDevices(params?: any): Promise<ApiResponse<Device[]>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async getDevice(id: string): Promise<ApiResponse<Device>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async createDevice(device: Omit<Device, 'id'>): Promise<ApiResponse<Device>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async updateDevice(id: string, device: Partial<Device>): Promise<ApiResponse<Device>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async deleteDevice(id: string): Promise<ApiResponse<void>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }
}

export class HearingTestApi {
  constructor(private configuration?: Configuration) {}

  async getHearingTests(params?: any): Promise<ApiResponse<HearingTest[]>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async getHearingTest(id: string): Promise<ApiResponse<HearingTest>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async createHearingTest(test: Omit<HearingTest, 'id'>): Promise<ApiResponse<HearingTest>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async updateHearingTest(id: string, test: Partial<HearingTest>): Promise<ApiResponse<HearingTest>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async deleteHearingTest(id: string): Promise<ApiResponse<void>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }
}

export class PatientNoteApi {
  constructor(private configuration?: Configuration) {}

  async getPatientNotes(patientId: string): Promise<ApiResponse<PatientNote[]>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async getPatientNote(id: string): Promise<ApiResponse<PatientNote>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async createPatientNote(note: Omit<PatientNote, 'id'>): Promise<ApiResponse<PatientNote>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async updatePatientNote(id: string, note: Partial<PatientNote>): Promise<ApiResponse<PatientNote>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }

  async deletePatientNote(id: string): Promise<ApiResponse<void>> {
    throw new Error('Generated client not yet implemented. Use legacy client.');
  }
}

// Default export with all APIs
export default {
  PatientApi,
  AppointmentApi,
  DeviceApi,
  HearingTestApi,
  PatientNoteApi,
};