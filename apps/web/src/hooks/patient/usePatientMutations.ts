import { useState, useCallback, useMemo } from 'react';
import type { Patient } from '../../types/patient';
import type { Patient as LocalPatient } from '../../types/patient/patient-base.types';
import { PatientSyncService } from '../../services/patient/patient-sync.service';
import { PatientStorageService } from '../../services/patient/patient-storage.service';

// Define request types locally - these match the PatientSyncService expectations
interface PatientCreateRequest {
  firstName?: string;
  lastName?: string;
  phone: string;
  tcNumber?: string;
  birthDate?: string;
  email?: string;
  address?: string;
  status?: string;
  segment?: string;
  label?: string;
  acquisitionType?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
}

interface PatientUpdateRequest extends Partial<PatientCreateRequest> {
  // Additional update-specific fields can be added here
}

/**
 * usePatientMutations Hook
 * Manages patient CRUD operations with offline-first approach and optimistic updates
 * Follows 500 LOC limit and single responsibility principle
 */
export function usePatientMutations() {
  // Services
  const syncService = useMemo(() => new PatientSyncService(), []);
  const storageService = useMemo(() => new PatientStorageService(), []);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Generate idempotency key
  const generateIdempotencyKey = useCallback(() => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Create a new patient
   */
  const createPatient = useCallback(async (
    patientData: PatientCreateRequest,
    options?: { onSuccess?: (patient: Patient) => void; onError?: (error: Error) => void }
  ): Promise<Patient | null> => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      const createdPatient = await syncService.createPatient(patientData as Partial<LocalPatient>, idempotencyKey);
      
      options?.onSuccess?.(createdPatient as Patient);
      return createdPatient;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create patient');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error creating patient:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Update an existing patient
   */
  const updatePatient = useCallback(async (
    patientId: string,
    updates: PatientUpdateRequest,
    options?: { onSuccess?: (patient: Patient) => void; onError?: (error: Error) => void }
  ): Promise<Patient | null> => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      const updatedPatient = await syncService.updatePatient(patientId, updates as Partial<LocalPatient>, idempotencyKey);
      
      options?.onSuccess?.(updatedPatient as Patient);
      return updatedPatient;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update patient');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error updating patient:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Delete a patient
   */
  const deletePatient = useCallback(async (
    patientId: string,
    options?: { onSuccess?: () => void; onError?: (error: Error) => void }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await syncService.deletePatient(patientId, idempotencyKey);
      
      options?.onSuccess?.();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete patient');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error deleting patient:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Bulk create patients
   */
  const createPatients = useCallback(async (
    patientsData: PatientCreateRequest[],
    options?: { 
      onSuccess?: (patients: Patient[]) => void; 
      onError?: (error: Error) => void;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<Patient[]> => {
    setLoading(true);
    setError(null);

    const createdPatients: Patient[] = [];
    const total = patientsData.length;

    try {
      for (let i = 0; i < patientsData.length; i++) {
        const patientData = patientsData[i];
        const idempotencyKey = generateIdempotencyKey();
        
        try {
          const createdPatient = await syncService.createPatient(patientData as Partial<LocalPatient>, idempotencyKey);
          createdPatients.push(createdPatient as Patient);
          options?.onProgress?.(i + 1, total);
        } catch (err) {
          console.error(`Failed to create patient ${i + 1}:`, err);
          // Continue with other patients
        }
      }

      options?.onSuccess?.(createdPatients);
      return createdPatients;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create patients');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error creating patients:', err);
      return createdPatients;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Bulk update patients
   */
  const updatePatients = useCallback(async (
    updates: Array<{ id: string; data: PatientUpdateRequest }>,
    options?: { 
      onSuccess?: (patients: Patient[]) => void; 
      onError?: (error: Error) => void;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<Patient[]> => {
    setLoading(true);
    setError(null);

    const updatedPatients: Patient[] = [];
    const total = updates.length;

    try {
      for (let i = 0; i < updates.length; i++) {
        const { id, data } = updates[i];
        const idempotencyKey = generateIdempotencyKey();
        
        try {
          const updatedPatient = await syncService.updatePatient(id, data as Partial<LocalPatient>, idempotencyKey);
          updatedPatients.push(updatedPatient as Patient);
          options?.onProgress?.(i + 1, total);
        } catch (err) {
          console.error(`Failed to update patient ${id}:`, err);
          // Continue with other patients
        }
      }

      options?.onSuccess?.(updatedPatients);
      return updatedPatients;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update patients');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error updating patients:', err);
      return updatedPatients;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Bulk delete patients
   */
  const deletePatients = useCallback(async (
    patientIds: string[],
    options?: { 
      onSuccess?: (deletedCount: number) => void; 
      onError?: (error: Error) => void;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<number> => {
    setLoading(true);
    setError(null);

    let deletedCount = 0;
    const total = patientIds.length;

    try {
      for (let i = 0; i < patientIds.length; i++) {
        const patientId = patientIds[i];
        const idempotencyKey = generateIdempotencyKey();
        
        try {
          await syncService.deletePatient(patientId, idempotencyKey);
          deletedCount++;
          options?.onProgress?.(i + 1, total);
        } catch (err) {
          console.error(`Failed to delete patient ${patientId}:`, err);
          // Continue with other patients
        }
      }

      options?.onSuccess?.(deletedCount);
      return deletedCount;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete patients');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error deleting patients:', err);
      return deletedCount;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get sync status
   */
  const getSyncStatus = useCallback(async () => {
    return await syncService.getSyncStatus();
  }, [syncService]);

  /**
   * Force sync with server
   */
  const forceSync = useCallback(async () => {
    setLoading(true);
    try {
      await syncService.forceSync();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sync');
      setError(error.message);
      console.error('Error syncing:', err);
    } finally {
      setLoading(false);
    }
  }, [syncService]);

  // Online status listener
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  return {
    // State
    loading,
    error,
    isOnline,
    
    // Single operations
    createPatient,
    updatePatient,
    deletePatient,
    
    // Bulk operations
    createPatients,
    updatePatients,
    deletePatients,
    
    // Utilities
    clearError,
    getSyncStatus,
    forceSync,
    generateIdempotencyKey
  };
}