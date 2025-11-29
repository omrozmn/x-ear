// Main API Adapter - Strangler Pattern Implementation
// This serves as the single entry point for all API calls

import { ApiResponse, Patient, PatientQueryParams, ClientStatus } from './types';
import { getApiConfig, updateApiConfig } from './config';
import { shadowValidation } from './utils';
import { 
  legacyGetPatients, 
  legacyGetPatient, 
  legacyCreatePatient, 
  legacyUpdatePatient, 
  legacyDeletePatient,
  legacyGetAppointments,
  legacyGetHearingTests,
  legacyGetPatientNotes,
  legacyCreatePatientNote,
  legacyUpdatePatientNote,
  legacyDeletePatientNote,
  legacyGetDevices
} from './legacy';
import { generatedClient, hasGeneratedClient } from './generated';
import { 
  getMigrationFlags, 
  setMigrationFlags, 
  shouldUseGeneratedClient,
  setMigrationPhase,
  emergencyRollback,
  MIGRATION_PHASES
} from './migration-flags';

// Global type declarations
declare global {
  interface Window {
    API_BASE_URL?: string;
  }
}

// Get current configuration
const config = getApiConfig();

// Public API - These are the functions that the UI will call

// Patient Operations
export async function getPatients(params?: PatientQueryParams): Promise<ApiResponse<Patient[]>> {
  const flags = getMigrationFlags();
  const useGenerated = shouldUseGeneratedClient('GET', 'patients');
  
  if (useGenerated && hasGeneratedClient()) {
    const generatedPromise = generatedClient.getPatients(params);
    
    if (flags.enableShadowValidation) {
      const legacyPromise = legacyGetPatients(params);
      shadowValidation('getPatients', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyGetPatients(params);
}

export async function getPatient(id: string): Promise<ApiResponse<Patient>> {
  const flags = getMigrationFlags();
  const useGenerated = shouldUseGeneratedClient('GET', 'patients');
  
  if (useGenerated && hasGeneratedClient()) {
    const generatedPromise = generatedClient.getPatient(id);
    
    if (flags.enableShadowValidation) {
      const legacyPromise = legacyGetPatient(id);
      shadowValidation('getPatient', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyGetPatient(id);
}

export async function createPatient(patient: Partial<Patient>): Promise<ApiResponse<Patient>> {
  const flags = getMigrationFlags();
  const useGenerated = shouldUseGeneratedClient('POST', 'patients');
  
  if (useGenerated && hasGeneratedClient()) {
    const generatedPromise = generatedClient.createPatient(patient);
    
    if (flags.enableShadowValidation) {
      const legacyPromise = legacyCreatePatient(patient);
      shadowValidation('createPatient', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyCreatePatient(patient);
}

export async function updatePatient(id: string, patient: Partial<Patient>): Promise<ApiResponse<Patient>> {
  const flags = getMigrationFlags();
  const useGenerated = shouldUseGeneratedClient('PUT', 'patients');
  
  if (useGenerated && hasGeneratedClient()) {
    const generatedPromise = generatedClient.updatePatient(id, patient);
    
    if (flags.enableShadowValidation) {
      const legacyPromise = legacyUpdatePatient(id, patient);
      shadowValidation('updatePatient', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyUpdatePatient(id, patient);
}

export async function deletePatient(id: string): Promise<ApiResponse<void>> {
  const flags = getMigrationFlags();
  const useGenerated = shouldUseGeneratedClient('DELETE', 'patients');
  
  if (useGenerated && hasGeneratedClient()) {
    const generatedPromise = generatedClient.deletePatient(id);
    
    if (flags.enableShadowValidation) {
      const legacyPromise = legacyDeletePatient(id);
      shadowValidation('deletePatient', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyDeletePatient(id);
}

// Appointment Operations
export async function getAppointments(params?: any): Promise<ApiResponse<any[]>> {
  if (config.useGeneratedClient && hasGeneratedClient()) {
    const generatedPromise = generatedClient.getAppointments(params);
    
    if (config.enableShadowValidation) {
      const legacyPromise = legacyGetAppointments(params);
      shadowValidation('getAppointments', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyGetAppointments(params);
}

// Hearing Tests Operations
export async function getHearingTests(patientId?: string): Promise<ApiResponse<any[]>> {
  if (config.useGeneratedClient && hasGeneratedClient()) {
    const generatedPromise = generatedClient.getHearingTests(patientId);
    
    if (config.enableShadowValidation) {
      const legacyPromise = legacyGetHearingTests(patientId);
      shadowValidation('getHearingTests', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyGetHearingTests(patientId);
}

// Patient Notes Operations
export async function getPatientNotes(patientId: string): Promise<ApiResponse<any[]>> {
  if (config.useGeneratedClient && hasGeneratedClient()) {
    const generatedPromise = generatedClient.getPatientNotes(patientId);
    
    if (config.enableShadowValidation) {
      const legacyPromise = legacyGetPatientNotes(patientId);
      shadowValidation('getPatientNotes', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyGetPatientNotes(patientId);
}

export async function createPatientNote(patientId: string, note: any): Promise<ApiResponse<any>> {
  if (config.useGeneratedClient && hasGeneratedClient()) {
    const generatedPromise = generatedClient.createPatientNote(patientId, note);
    
    if (config.enableShadowValidation) {
      const legacyPromise = legacyCreatePatientNote(patientId, note);
      shadowValidation('createPatientNote', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyCreatePatientNote(patientId, note);
}

export async function updatePatientNote(patientId: string, noteId: string, note: any): Promise<ApiResponse<any>> {
  if (config.useGeneratedClient && hasGeneratedClient()) {
    const generatedPromise = generatedClient.updatePatientNote(patientId, noteId, note);
    
    if (config.enableShadowValidation) {
      const legacyPromise = legacyUpdatePatientNote(patientId, noteId, note);
      shadowValidation('updatePatientNote', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyUpdatePatientNote(patientId, noteId, note);
}

export async function deletePatientNote(patientId: string, noteId: string): Promise<ApiResponse<void>> {
  if (config.useGeneratedClient && hasGeneratedClient()) {
    const generatedPromise = generatedClient.deletePatientNote(patientId, noteId);
    
    if (config.enableShadowValidation) {
      const legacyPromise = legacyDeletePatientNote(patientId, noteId);
      shadowValidation('deletePatientNote', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyDeletePatientNote(patientId, noteId);
}

// Device Operations
export async function getDevices(): Promise<ApiResponse<any[]>> {
  if (config.useGeneratedClient && hasGeneratedClient()) {
    const generatedPromise = generatedClient.getDevices();
    
    if (config.enableShadowValidation) {
      const legacyPromise = legacyGetDevices();
      shadowValidation('getDevices', generatedPromise, legacyPromise);
    }
    
    return generatedPromise;
  }
  
  return legacyGetDevices();
}

// Configuration and status functions
export function getApiStatus(): ClientStatus {
  const flags = getMigrationFlags();
  return {
    useGeneratedClient: flags.useGeneratedClient,
    hasGeneratedClient: hasGeneratedClient(),
    enableShadowValidation: flags.enableShadowValidation,
    timestamp: new Date().toISOString()
  };
}

// Migration control functions
export function enableGeneratedClient(enable: boolean = true): void {
  setMigrationFlags({ useGeneratedClient: enable });
}

export function enableShadowValidation(enable: boolean = true): void {
  setMigrationFlags({ enableShadowValidation: enable });
}

// Export migration control functions
export { 
  setMigrationPhase, 
  emergencyRollback, 
  MIGRATION_PHASES,
  getMigrationFlags,
  setMigrationFlags
};