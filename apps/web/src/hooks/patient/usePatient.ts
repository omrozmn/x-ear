import { useState, useEffect, useCallback } from 'react';
import { Patient } from '../../types/patient';
import { PatientApiService } from '../../services/patient/patient-api.service';
import { PatientStorageService } from '../../services/patient/patient-storage.service';

/**
 * Simplified usePatient hook for individual patient management
 * Provides basic operations for a single patient
 */
export function usePatient(patientId?: string) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = new PatientApiService();
  const storageService = new PatientStorageService();

  // Load patient by ID
  const loadPatient = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Try API first
      const result = await apiService.fetchPatient(id);
      if (result) {
        setPatient(result as unknown as Patient);
      } else {
        // Fallback to local storage
        const localPatient = await storageService.getPatientById(id);
        setPatient(localPatient);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient');
      
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
    if (!patient) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.updatePatient(patient.id, updates);
      if (result) {
        setPatient(result as unknown as Patient);
        return result as unknown as Patient;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
      return null;
    } finally {
      setLoading(false);
    }
  }, [patient, apiService]);

  // Delete patient
  const deletePatient = useCallback(async () => {
    if (!patient) return false;
    
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
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
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
    }
  }, [patientId, loadPatient]);

  return {
    // Data
    patient,
    
    // State
    loading,
    error,
    
    // Actions
    loadPatient,
    updatePatient,
    deletePatient,
    clearError
  };
}