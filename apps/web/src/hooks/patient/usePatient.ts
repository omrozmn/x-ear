import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Patient } from '../../api/generated/schemas';
import { PatientApiService } from '../../services/patient/patient-api.service';
import { PatientStorageService } from '../../services/patient/patient-storage.service';

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
        // API service returns Patient directly
        setPatient(result);
      } else {
        // Fallback to local storage
        const localPatient = await storageService.getPatientById(id);
        setPatient(localPatient);
      }
    } catch (err) {
  setError(err instanceof Error ? err : new Error(String(err)));
      
      // Try local storage as fallback
      try {
        const localPatient = await storageService.getPatientById(id);
        setPatient(localPatient);
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
        setPatient(result);
        return result;
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