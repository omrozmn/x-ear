/**
 * Generated API Client Integration
 * This module provides the interface to the generated TypeScript client
 */

import { 
  PatientApi, 
  AppointmentApi, 
  DeviceApi, 
  HearingTestApi, 
  PatientNoteApi,
  Configuration,
  type Patient as GeneratedPatient,
  type Appointment as GeneratedAppointment,
  type Device as GeneratedDevice,
  type HearingTest as GeneratedHearingTest,
  type PatientNote as GeneratedPatientNote,
  type ApiResponse as GeneratedApiResponse
} from '../js/generated/index.js';

import { getApiConfig } from './config.js';
import type { 
  Patient, 
  ApiResponse,
  PaginationParams,
  SearchParams,
  PatientQueryParams,
  RequestOptions
} from './types.js';

// Create configuration for generated client
function createConfiguration(): Configuration {
  const config = getApiConfig();
  return {
    basePath: config.baseUrl,
    headers: {
      'Content-Type': 'application/json'
    }
  };
}

// Initialize API clients
const configuration = createConfiguration();
const patientApi = new PatientApi(configuration);
const appointmentApi = new AppointmentApi(configuration);
const deviceApi = new DeviceApi(configuration);
const hearingTestApi = new HearingTestApi(configuration);
const patientNoteApi = new PatientNoteApi(configuration);

export interface GeneratedApiClient {
  // Patient operations
  getPatients(params?: PatientQueryParams): Promise<ApiResponse<Patient[]>>;
  getPatient(id: string): Promise<ApiResponse<Patient>>;
  createPatient(patient: any): Promise<ApiResponse<Patient>>;
  updatePatient(id: string, patient: any): Promise<ApiResponse<Patient>>;
  deletePatient(id: string): Promise<ApiResponse<void>>;

  // Appointment operations
  getAppointments(params?: SearchParams): Promise<ApiResponse<any[]>>;
  getAppointment(id: string): Promise<ApiResponse<any>>;
  createAppointment(appointment: any): Promise<ApiResponse<any>>;
  updateAppointment(id: string, appointment: any): Promise<ApiResponse<any>>;
  deleteAppointment(id: string): Promise<ApiResponse<void>>;

  // Hearing test operations
  getHearingTests(patientId?: string): Promise<ApiResponse<any[]>>;
  getHearingTest(id: string): Promise<ApiResponse<any>>;
  createHearingTest(test: any): Promise<ApiResponse<any>>;
  updateHearingTest(id: string, test: any): Promise<ApiResponse<any>>;
  deleteHearingTest(id: string): Promise<ApiResponse<void>>;

  // Patient note operations
  getPatientNotes(patientId: string): Promise<ApiResponse<any[]>>;
  getPatientNote(id: string): Promise<ApiResponse<any>>;
  createPatientNote(patientId: string, note: any): Promise<ApiResponse<any>>;
  updatePatientNote(patientId: string, noteId: string, note: any): Promise<ApiResponse<any>>;
  deletePatientNote(patientId: string, noteId: string): Promise<ApiResponse<void>>;

  // Device operations
  getDevices(params?: SearchParams): Promise<ApiResponse<any[]>>;
  getDevice(id: string): Promise<ApiResponse<any>>;
  createDevice(device: any): Promise<ApiResponse<any>>;
  updateDevice(id: string, device: any): Promise<ApiResponse<any>>;
  deleteDevice(id: string): Promise<ApiResponse<void>>;
}

// Implementation of the generated client
export const generatedClient: GeneratedApiClient = {
  // Patient operations
  async getPatients(params?: PatientQueryParams): Promise<ApiResponse<Patient[]>> {
    try {
      const response = await patientApi.getPatients(params);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getPatients - ${error}`);
    }
  },

  async getPatient(id: string): Promise<ApiResponse<Patient>> {
    try {
      const response = await patientApi.getPatient(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getPatient - ${error}`);
    }
  },

  async createPatient(patient: any): Promise<ApiResponse<Patient>> {
    try {
      const response = await patientApi.createPatient(patient);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: createPatient - ${error}`);
    }
  },

  async updatePatient(id: string, patient: any): Promise<ApiResponse<Patient>> {
    try {
      const response = await patientApi.updatePatient(id, patient);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: updatePatient - ${error}`);
    }
  },

  async deletePatient(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await patientApi.deletePatient(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: deletePatient - ${error}`);
    }
  },

  // Appointment operations
  async getAppointments(params?: SearchParams): Promise<ApiResponse<any[]>> {
    try {
      const response = await appointmentApi.getAppointments(params);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getAppointments - ${error}`);
    }
  },

  async getAppointment(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await appointmentApi.getAppointment(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getAppointment - ${error}`);
    }
  },

  async createAppointment(appointment: any): Promise<ApiResponse<any>> {
    try {
      const response = await appointmentApi.createAppointment(appointment);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: createAppointment - ${error}`);
    }
  },

  async updateAppointment(id: string, appointment: any): Promise<ApiResponse<any>> {
    try {
      const response = await appointmentApi.updateAppointment(id, appointment);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: updateAppointment - ${error}`);
    }
  },

  async deleteAppointment(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await appointmentApi.deleteAppointment(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: deleteAppointment - ${error}`);
    }
  },

  // Hearing test operations
  async getHearingTests(patientId?: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await hearingTestApi.getHearingTests({ patientId });
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getHearingTests - ${error}`);
    }
  },

  async getHearingTest(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await hearingTestApi.getHearingTest(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getHearingTest - ${error}`);
    }
  },

  async createHearingTest(test: any): Promise<ApiResponse<any>> {
    try {
      const response = await hearingTestApi.createHearingTest(test);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: createHearingTest - ${error}`);
    }
  },

  async updateHearingTest(id: string, test: any): Promise<ApiResponse<any>> {
    try {
      const response = await hearingTestApi.updateHearingTest(id, test);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: updateHearingTest - ${error}`);
    }
  },

  async deleteHearingTest(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await hearingTestApi.deleteHearingTest(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: deleteHearingTest - ${error}`);
    }
  },

  // Patient note operations
  async getPatientNotes(patientId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await patientNoteApi.getPatientNotes(patientId);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getPatientNotes - ${error}`);
    }
  },

  async getPatientNote(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await patientNoteApi.getPatientNote(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getPatientNote - ${error}`);
    }
  },

  async createPatientNote(patientId: string, note: any): Promise<ApiResponse<any>> {
    try {
      const response = await patientNoteApi.createPatientNote({ ...note, patientId });
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: createPatientNote - ${error}`);
    }
  },

  async updatePatientNote(patientId: string, noteId: string, note: any): Promise<ApiResponse<any>> {
    try {
      const response = await patientNoteApi.updatePatientNote(noteId, { ...note, patientId });
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: updatePatientNote - ${error}`);
    }
  },

  async deletePatientNote(patientId: string, noteId: string): Promise<ApiResponse<void>> {
    try {
      const response = await patientNoteApi.deletePatientNote(noteId);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: deletePatientNote - ${error}`);
    }
  },

  // Device operations
  async getDevices(params?: SearchParams): Promise<ApiResponse<any[]>> {
    try {
      const response = await deviceApi.getDevices(params);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getDevices - ${error}`);
    }
  },

  async getDevice(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await deviceApi.getDevice(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: getDevice - ${error}`);
    }
  },

  async createDevice(device: any): Promise<ApiResponse<any>> {
    try {
      const response = await deviceApi.createDevice(device);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: createDevice - ${error}`);
    }
  },

  async updateDevice(id: string, device: any): Promise<ApiResponse<any>> {
    try {
      const response = await deviceApi.updateDevice(id, device);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: updateDevice - ${error}`);
    }
  },

  async deleteDevice(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await deviceApi.deleteDevice(id);
      return response;
    } catch (error) {
      throw new Error(`Generated client not implemented: deleteDevice - ${error}`);
    }
  }
};

// Check if generated client is available
export function hasGeneratedClient(): boolean {
  return true; // Now using the actual generated client
}