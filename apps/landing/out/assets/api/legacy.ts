// Legacy API Client Functions
// These functions maintain the existing fetch-based implementation

import { ApiResponse, Patient, PatientQueryParams } from './types';
import { getApiConfig } from './config';
import { buildUrl, buildHeaders, normalizeError } from './utils';

const config = getApiConfig();

// Legacy fetch wrapper with error handling
async function legacyFetch(url: string, options: RequestInit = {}): Promise<any> {
  const headers = buildHeaders(options.headers as Record<string, string>);
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as any).status = response.status;
    (error as any).response = response;
    throw error;
  }

  return response.json();
}

// Legacy Patient API functions
export async function legacyGetPatients(params?: PatientQueryParams): Promise<ApiResponse<Patient[]>> {
  try {
    const url = buildUrl(config.baseUrl, '/api/patients', params);
    const data = await legacyFetch(url);
    
    // Handle different response formats from backend
    let patients: Patient[] = [];
    if (Array.isArray(data)) {
      patients = data;
    } else if (data.patients && Array.isArray(data.patients)) {
      patients = data.patients;
    } else if (data.data && Array.isArray(data.data)) {
      patients = data.data;
    }
    
    return {
      success: true,
      data: patients,
      meta: data.meta,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function legacyGetPatient(id: string): Promise<ApiResponse<Patient>> {
  try {
    const url = buildUrl(config.baseUrl, `/api/patients/${id}`);
    const data = await legacyFetch(url);
    
    return {
      success: true,
      data: data.patient || data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function legacyCreatePatient(patient: Partial<Patient>): Promise<ApiResponse<Patient>> {
  try {
    const url = buildUrl(config.baseUrl, '/api/patients');
    const data = await legacyFetch(url, {
      method: 'POST',
      body: JSON.stringify(patient)
    });
    
    return {
      success: true,
      data: data.patient || data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function legacyUpdatePatient(id: string, patient: Partial<Patient>): Promise<ApiResponse<Patient>> {
  try {
    const url = buildUrl(config.baseUrl, `/api/patients/${id}`);
    const data = await legacyFetch(url, {
      method: 'PUT',
      body: JSON.stringify(patient)
    });
    
    return {
      success: true,
      data: data.patient || data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function legacyDeletePatient(id: string): Promise<ApiResponse<void>> {
  try {
    const url = buildUrl(config.baseUrl, `/api/patients/${id}`);
    await legacyFetch(url, { method: 'DELETE' });
    
    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

// Legacy Appointments API
export async function legacyGetAppointments(params?: any): Promise<ApiResponse<any[]>> {
  try {
    const url = buildUrl(config.baseUrl, '/api/appointments', params);
    const data = await legacyFetch(url);
    
    return {
      success: true,
      data: data.appointments || data,
      meta: data.meta,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

// Legacy Hearing Tests API
export async function legacyGetHearingTests(patientId?: string): Promise<ApiResponse<any[]>> {
  try {
    const endpoint = patientId ? `/api/patients/${patientId}/hearing-tests` : '/api/hearing-tests';
    const url = buildUrl(config.baseUrl, endpoint);
    const data = await legacyFetch(url);
    
    return {
      success: true,
      data: data.hearingTests || data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

// Legacy Patient Notes API
export async function legacyGetPatientNotes(patientId: string): Promise<ApiResponse<any[]>> {
  try {
    const url = buildUrl(config.baseUrl, `/api/patients/${patientId}/notes`);
    const data = await legacyFetch(url);
    
    return {
      success: true,
      data: data.notes || data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function legacyCreatePatientNote(patientId: string, note: any): Promise<ApiResponse<any>> {
  try {
    const url = buildUrl(config.baseUrl, `/api/patients/${patientId}/notes`);
    const data = await legacyFetch(url, {
      method: 'POST',
      body: JSON.stringify(note)
    });
    
    return {
      success: true,
      data: data.note || data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function legacyUpdatePatientNote(patientId: string, noteId: string, note: any): Promise<ApiResponse<any>> {
  try {
    const url = buildUrl(config.baseUrl, `/api/patients/${patientId}/notes/${noteId}`);
    const data = await legacyFetch(url, {
      method: 'PUT',
      body: JSON.stringify(note)
    });
    
    return {
      success: true,
      data: data.note || data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function legacyDeletePatientNote(patientId: string, noteId: string): Promise<ApiResponse<void>> {
  try {
    const url = buildUrl(config.baseUrl, `/api/patients/${patientId}/notes/${noteId}`);
    await legacyFetch(url, { method: 'DELETE' });
    
    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}

// Legacy Devices API
export async function legacyGetDevices(): Promise<ApiResponse<any[]>> {
  try {
    const url = buildUrl(config.baseUrl, '/api/devices');
    const data = await legacyFetch(url);
    
    return {
      success: true,
      data: data.devices || data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: normalizeError(error).message,
      timestamp: new Date().toISOString()
    };
  }
}