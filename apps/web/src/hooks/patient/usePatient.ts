import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Patient } from '../../types/patient';
import { PatientApiService } from '../../services/patient/patient-api.service';
import { PatientStorageService } from '../../services/patient/patient-storage.service';

// Type for API/legacy response that may have different field names
type PatientLike = Partial<Patient> & {
  first_name?: string;
  last_name?: string;
  tc_number?: string;
  birth_date?: string;
  created_at?: string;
  updated_at?: string;
  name?: string;
};

// Helper to convert LegacyPatient or API response to Patient type
function toPatient(data: PatientLike | null | undefined): Patient | null {
  if (!data) return null;
  return {
    id: data.id || '',
    firstName: data.firstName || data.first_name || (data.name ? data.name.split(' ')[0] : ''),
    lastName: data.lastName || data.last_name || (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
    tcNumber: data.tcNumber || data.tc_number || '',
    phone: data.phone || '',
    email: data.email,
    birthDate: data.birthDate || data.birth_date,
    status: data.status,
    segment: data.segment,
    createdAt: data.createdAt || data.created_at,
    updatedAt: data.updatedAt || data.updated_at,
    ...data, // Include any additional fields
  } as Patient;
}

/**
 * Simplified usePatient hook for individual patient management
 * Provides basic operations for a single patient
 */
export function usePatient(patientId?: string) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  // Use Error | string | null so callers that expect Error.message don't break
  const [error, setError] = useState<Error | string | null>(null);

  // Memoize services to prevent recreation on every render
  const apiService = useMemo(() => new PatientApiService(), []);
  const storageService = useMemo(() => new PatientStorageService(), []);

  // Load patient by ID
  const loadPatient = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try API first
      const result = await apiService.fetchPatient(id);
      if (result) {
        // Convert API result to Patient type
        setPatient(toPatient(result));
      } else {
        // Fallback to local storage
        const localPatient = await storageService.getPatientById(id);
        setPatient(toPatient(localPatient));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));

      // Try local storage as fallback
      try {
        const localPatient = await storageService.getPatientById(id);
        setPatient(toPatient(localPatient));
      } catch (localErr) {
        console.error('Failed to load from local storage:', localErr);
      }
    } finally {
      setLoading(false);
    }
  }, [apiService, storageService]);

  // Update patient
  const updatePatient = useCallback(async (updates: Partial<Patient>) => {
    if (!patient?.id) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.updatePatient(patient.id, updates);
      if (result) {
        const updatedPatient = toPatient(result);
        setPatient(updatedPatient);
        return updatedPatient;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [patient, apiService]);

  // Delete patient
  const deletePatient = useCallback(async () => {
    if (!patient?.id) return false;

    setLoading(true);
    setError(null);

    try {
      const success = await apiService.deletePatient(patient.id);
      if (success) {
        setPatient(null);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setLoading(false);
    }
  }, [patient, apiService]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load patient on mount or when ID changes
  useEffect(() => {
    if (patientId) {
      loadPatient(patientId);
    } else {
      setPatient(null);
    }
  }, [patientId, loadPatient]);

  return {
    // Data
    patient,
    // Backwards-compatible alias
    data: patient,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    loadPatient,
    updatePatient,
    deletePatient,
    clearError
  };
}