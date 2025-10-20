/**
 * React Hook for Patient Offline Sync
 * Provides reactive interface to patient offline sync operations
 */

import { useState, useEffect, useCallback } from 'react';
import { Patient } from '../types/patient';
import { patientOfflineSync } from '../services/offline/patientOfflineSync';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: string | null;
  pendingOperations: number;
  totalPatients: number;
}

interface UsePatientOfflineSyncReturn {
  // Data
  patients: Patient[];
  syncStatus: SyncStatus;
  
  // Operations
  savePatient: (patient: Omit<Patient, 'id'> & { id?: string }) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatient: (id: string) => Promise<Patient | null>;
  searchPatients: (query: string) => Promise<Patient[]>;
  
  // Sync operations
  syncWithServer: () => Promise<void>;
  refreshPatients: () => Promise<void>;
  
  // Status
  isInitialized: boolean;
  error: string | null;
}

export const usePatientOfflineSync = (): UsePatientOfflineSyncReturn => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingOperations: 0,
    totalPatients: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the sync service
  useEffect(() => {
    const initialize = async () => {
      try {
        await patientOfflineSync.initialize();
        setIsInitialized(true);
        await refreshPatients();
        await updateSyncStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize offline sync');
        console.error('Failed to initialize patient offline sync:', err);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      patientOfflineSync.destroy();
    };
  }, []);

  // Setup sync status listener
  useEffect(() => {
    if (!isInitialized) return;

    const handleSyncUpdate = () => {
      updateSyncStatus();
      refreshPatients();
    };

    patientOfflineSync.addListener(handleSyncUpdate);

    return () => {
      patientOfflineSync.removeListener(handleSyncUpdate);
    };
  }, [isInitialized]);

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await patientOfflineSync.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('Failed to get sync status:', err);
    }
  }, []);

  // Refresh patients from local database
  const refreshPatients = useCallback(async () => {
    try {
      const allPatients = await patientOfflineSync.getAllPatients();
      setPatients(allPatients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh patients');
      console.error('Failed to refresh patients:', err);
    }
  }, []);

  // Patient operations
  const savePatient = useCallback(async (patient: Omit<Patient, 'id'> & { id?: string }): Promise<Patient> => {
    try {
      setError(null);
      const savedPatient = await patientOfflineSync.savePatient(patient);
      await refreshPatients();
      await updateSyncStatus();
      return savedPatient;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save patient';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshPatients, updateSyncStatus]);

  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>): Promise<void> => {
    try {
      setError(null);
      await patientOfflineSync.updatePatient(id, updates);
      await refreshPatients();
      await updateSyncStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update patient';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshPatients, updateSyncStatus]);

  const deletePatient = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await patientOfflineSync.deletePatient(id);
      await refreshPatients();
      await updateSyncStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete patient';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshPatients, updateSyncStatus]);

  const getPatient = useCallback(async (id: string): Promise<Patient | null> => {
    try {
      setError(null);
      return await patientOfflineSync.getPatient(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get patient';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const searchPatients = useCallback(async (query: string): Promise<Patient[]> => {
    try {
      setError(null);
      return await patientOfflineSync.searchPatients(query);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search patients';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Sync operations
  const syncWithServer = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await patientOfflineSync.syncWithServer();
      await refreshPatients();
      await updateSyncStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync with server';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshPatients, updateSyncStatus]);

  return {
    // Data
    patients,
    syncStatus,
    
    // Operations
    savePatient,
    updatePatient,
    deletePatient,
    getPatient,
    searchPatients,
    
    // Sync operations
    syncWithServer,
    refreshPatients,
    
    // Status
    isInitialized,
    error
  };
};

export default usePatientOfflineSync;