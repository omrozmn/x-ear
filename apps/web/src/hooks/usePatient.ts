/**
 * usePatient Hook
 * @fileoverview Custom hook for managing individual patient data
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Patient, PatientDevice, PatientNote, Communication } from '../types/patient';
import { patientService } from '../services/patient.service';
import { patientCacheService } from '../services/patient/patient-cache.service';
import { patientValidationService } from '../services/patient/patient-validation.service';
import { patientSyncService } from '../services/patient/patient-sync.service';

export interface UsePatientOptions {
  enableRealTimeSync?: boolean;
  cacheEnabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface UsePatientReturn {
  // Data
  patient: Patient | null;
  isLoading: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  error: string | null;
  
  // CRUD Operations
  updatePatient: (updates: Partial<Patient>) => Promise<Patient>;
  deletePatient: () => Promise<void>;
  
  // Device Management
  addDevice: (device: Omit<PatientDevice, 'id'>) => Promise<PatientDevice>;
  updateDevice: (deviceId: string, updates: Partial<PatientDevice>) => Promise<PatientDevice>;
  removeDevice: (deviceId: string) => Promise<void>;
  
  // Notes Management
  addNote: (noteText: string, type?: PatientNote['type']) => Promise<PatientNote>;
  updateNote: (noteId: string, updates: Partial<PatientNote>) => Promise<PatientNote>;
  removeNote: (noteId: string) => Promise<void>;
  
  // Communication Management
  addCommunication: (communication: Omit<Communication, 'id'>) => Promise<Communication>;
  
  // Data Management
  refreshPatient: () => Promise<void>;
  syncPatient: () => Promise<void>;
  
  // Utilities
  validatePatient: (patientData?: Partial<Patient>) => { isValid: boolean; errors: string[] };
  calculatePriorityScore: () => number;
}

export const usePatient = (
  patientId: string | null,
  options: UsePatientOptions = {}
): UsePatientReturn => {
  const {
    enableRealTimeSync = true,
    cacheEnabled = true,
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes instead of 30 seconds
  } = options;

  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patient data
  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      setIsLoading(false);
      return;
    }

    const loadPatient = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load from cache first if enabled
        if (cacheEnabled) {
          const cachedPatient = await patientCacheService.getCachedPatient(patientId);
          if (cachedPatient) {
            setPatient(cachedPatient);
            setIsLoading(false);
          }
        }

        // Load fresh data from service
        const freshPatient = await patientService.getPatient(patientId);
        if (freshPatient) {
          setPatient(freshPatient);
        } else {
          setError('Patient not found');
        }

      } catch (err) {
        console.error('Failed to load patient:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patient');
      } finally {
        setIsLoading(false);
      }
    };

    loadPatient();
  }, [patientId, cacheEnabled]);

  // Auto refresh setup
  useEffect(() => {
    if (!autoRefresh || !patientId) return;

    const interval = setInterval(async () => {
      try {
        const updatedPatient = await patientService.getPatient(patientId);
        if (updatedPatient) {
          setPatient(updatedPatient);
        }
      } catch (err) {
        console.error('Auto refresh failed:', err);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, patientId]);

  // Real-time sync setup
  useEffect(() => {
    if (!enableRealTimeSync || !patientId) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `patient_${patientId}`) {
        // Reload patient when storage changes
        patientService.getPatient(patientId).then(updatedPatient => {
          if (updatedPatient) {
            setPatient(updatedPatient);
          }
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [enableRealTimeSync, patientId]);

  // Update patient
  const updatePatient = useCallback(async (updates: Partial<Patient>): Promise<Patient> => {
    if (!patientId || !patient) {
      throw new Error('No patient loaded');
    }

    try {
      setIsSaving(true);
      setError(null);

      const updatedPatient = await patientService.updatePatient(patientId, updates);
      if (!updatedPatient) {
        throw new Error('Failed to update patient');
      }

      setPatient(updatedPatient);

      // Update cache if enabled
      if (cacheEnabled) {
        await patientCacheService.updateCachedPatient(updatedPatient);
      }

      // Sync to server
      if (enableRealTimeSync) {
        await patientSyncService.syncSinglePatient(patientId);
      }

      return updatedPatient;
    } catch (err) {
      console.error('Failed to update patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to update patient');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [patientId, patient, cacheEnabled, enableRealTimeSync]);

  // Delete patient
  const deletePatient = useCallback(async (): Promise<void> => {
    if (!patientId) {
      throw new Error('No patient loaded');
    }

    try {
      setIsSaving(true);
      setError(null);

      const success = await patientService.deletePatient(patientId);
      if (!success) {
        throw new Error('Failed to delete patient');
      }

      setPatient(null);

      // Remove from cache if enabled
      if (cacheEnabled) {
        await patientCacheService.removeCachedPatient(patientId);
      }

    } catch (err) {
      console.error('Failed to delete patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [patientId, cacheEnabled]);

  // Add device
  const addDevice = useCallback(async (device: Omit<PatientDevice, 'id'>): Promise<PatientDevice> => {
    if (!patientId) {
      throw new Error('No patient loaded');
    }

    try {
      setError(null);

      const newDevice = await patientService.addDevice(patientId, device);
      if (!newDevice) {
        throw new Error('Failed to add device');
      }

      // Update local patient state
      if (patient) {
        const updatedPatient = {
          ...patient,
          devices: [...(patient.devices || []), newDevice]
        };
        setPatient(updatedPatient);

        // Update cache if enabled
        if (cacheEnabled) {
          await patientCacheService.updateCachedPatient(updatedPatient);
        }
      }

      return newDevice;
    } catch (err) {
      console.error('Failed to add device:', err);
      setError(err instanceof Error ? err.message : 'Failed to add device');
      throw err;
    }
  }, [patientId, patient, cacheEnabled]);

  // Update device
  const updateDevice = useCallback(async (deviceId: string, updates: Partial<PatientDevice>): Promise<PatientDevice> => {
    if (!patientId) {
      throw new Error('No patient loaded');
    }

    try {
      setError(null);

      const updatedDevice = await patientService.updateDevice(patientId, deviceId, updates);
      if (!updatedDevice) {
        throw new Error('Failed to update device');
      }

      // Update local patient state
      if (patient) {
        const updatedPatient = {
          ...patient,
          devices: (patient.devices || []).map(d => d.id === deviceId ? updatedDevice : d)
        };
        setPatient(updatedPatient);

        // Update cache if enabled
        if (cacheEnabled) {
          await patientCacheService.updateCachedPatient(updatedPatient);
        }
      }

      return updatedDevice;
    } catch (err) {
      console.error('Failed to update device:', err);
      setError(err instanceof Error ? err.message : 'Failed to update device');
      throw err;
    }
  }, [patientId, patient, cacheEnabled]);

  // Remove device
  const removeDevice = useCallback(async (deviceId: string): Promise<void> => {
    if (!patientId || !patient) {
      throw new Error('No patient loaded');
    }

    try {
      setError(null);

      // Update local patient state
      const updatedPatient = {
        ...patient,
        devices: (patient.devices || []).filter(d => d.id !== deviceId)
      };
      setPatient(updatedPatient);

      // Update cache if enabled
      if (cacheEnabled) {
        await patientCacheService.updateCachedPatient(updatedPatient);
      }

    } catch (err) {
      console.error('Failed to remove device:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove device');
      throw err;
    }
  }, [patientId, patient, cacheEnabled]);

  // Add note
  const addNote = useCallback(async (noteText: string, type: PatientNote['type'] = 'general'): Promise<PatientNote> => {
    if (!patientId) {
      throw new Error('No patient loaded');
    }

    try {
      setError(null);

      const newNote = await patientService.addNote(patientId, noteText, type);
      if (!newNote) {
        throw new Error('Failed to add note');
      }

      // Update local patient state
      if (patient) {
        const updatedPatient = {
          ...patient,
          notes: [...(patient.notes || []), newNote]
        };
        setPatient(updatedPatient);

        // Update cache if enabled
        if (cacheEnabled) {
          await patientCacheService.updateCachedPatient(updatedPatient);
        }
      }

      return newNote;
    } catch (err) {
      console.error('Failed to add note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add note');
      throw err;
    }
  }, [patientId, patient, cacheEnabled]);

  // Update note
  const updateNote = useCallback(async (noteId: string, updates: Partial<PatientNote>): Promise<PatientNote> => {
    if (!patientId || !patient) {
      throw new Error('No patient loaded');
    }

    try {
      setError(null);

      const existingNote = patient.notes?.find(n => n.id === noteId);
      if (!existingNote) {
        throw new Error('Note not found');
      }

      const updatedNote: PatientNote = {
        ...existingNote,
        ...updates,
        date: new Date().toISOString()
      };

      // Update local patient state
      const updatedPatient = {
        ...patient,
        notes: (patient.notes || []).map(n => n.id === noteId ? updatedNote : n)
      };
      setPatient(updatedPatient);

      // Update cache if enabled
      if (cacheEnabled) {
        await patientCacheService.updateCachedPatient(updatedPatient);
      }

      return updatedNote;
    } catch (err) {
      console.error('Failed to update note:', err);
      setError(err instanceof Error ? err.message : 'Failed to update note');
      throw err;
    }
  }, [patientId, patient, cacheEnabled]);

  // Remove note
  const removeNote = useCallback(async (noteId: string): Promise<void> => {
    if (!patientId || !patient) {
      throw new Error('No patient loaded');
    }

    try {
      setError(null);

      // Update local patient state
      const updatedPatient = {
        ...patient,
        notes: (patient.notes || []).filter(n => n.id !== noteId)
      };
      setPatient(updatedPatient);

      // Update cache if enabled
      if (cacheEnabled) {
        await patientCacheService.updateCachedPatient(updatedPatient);
      }

    } catch (err) {
      console.error('Failed to remove note:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove note');
      throw err;
    }
  }, [patientId, patient, cacheEnabled]);

  // Add communication
  const addCommunication = useCallback(async (communication: Omit<Communication, 'id'>): Promise<Communication> => {
    if (!patientId) {
      throw new Error('No patient loaded');
    }

    try {
      setError(null);

      const newCommunication = await patientService.addCommunication(patientId, communication);
      if (!newCommunication) {
        throw new Error('Failed to add communication');
      }

      // Update local patient state
      if (patient) {
        const updatedPatient = {
          ...patient,
          communications: [...(patient.communications || []), newCommunication]
        };
        setPatient(updatedPatient);

        // Update cache if enabled
        if (cacheEnabled) {
          await patientCacheService.updateCachedPatient(updatedPatient);
        }
      }

      return newCommunication;
    } catch (err) {
      console.error('Failed to add communication:', err);
      setError(err instanceof Error ? err.message : 'Failed to add communication');
      throw err;
    }
  }, [patientId, patient, cacheEnabled]);

  // Refresh patient
  const refreshPatient = useCallback(async () => {
    if (!patientId) return;

    try {
      setIsLoading(true);
      setError(null);

      const freshPatient = await patientService.getPatient(patientId);
      if (freshPatient) {
        setPatient(freshPatient);
      } else {
        setError('Patient not found');
      }
    } catch (err) {
      console.error('Failed to refresh patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh patient');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  // Sync patient
  const syncPatient = useCallback(async () => {
    if (!patientId) return;

    try {
      setIsSyncing(true);
      setError(null);

      const success = await patientSyncService.syncSinglePatient(patientId);
      if (!success) {
        throw new Error('Sync failed');
      }

      // Refresh patient data after sync
      await refreshPatient();
    } catch (err) {
      console.error('Failed to sync patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync patient');
    } finally {
      setIsSyncing(false);
    }
  }, [patientId, refreshPatient]);

  // Validate patient
  const validatePatient = useCallback((patientData?: Partial<Patient>) => {
    const dataToValidate = patientData || patient;
    if (!dataToValidate) {
      return { isValid: false, errors: ['No patient data to validate'] };
    }

    const validation = patientValidationService.validatePatient(dataToValidate);
    return {
      isValid: validation.isValid,
      errors: validation.errors.map(e => e.message)
    };
  }, [patient]);

  // Calculate priority score
  const calculatePriorityScore = useCallback(() => {
    if (!patient) return 0;
    return patientService.calculatePriorityScore(patient);
  }, [patient]);

  return {
    // Data
    patient,
    isLoading,
    isSaving,
    isSyncing,
    error,
    
    // CRUD Operations
    updatePatient,
    deletePatient,
    
    // Device Management
    addDevice,
    updateDevice,
    removeDevice,
    
    // Notes Management
    addNote,
    updateNote,
    removeNote,
    
    // Communication Management
    addCommunication,
    
    // Data Management
    refreshPatient,
    syncPatient,
    
    // Utilities
    validatePatient,
    calculatePriorityScore
  };
};