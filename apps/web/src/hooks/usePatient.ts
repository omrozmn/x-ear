import { useState, useEffect, useCallback } from 'react';
import { Patient, PatientDevice, PatientNote, PatientCommunication } from '../types/patient';
import { mockServices } from '../api/mock-services';

export interface UsePatientOptions {
  enableRealTimeSync?: boolean;
  cacheEnabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePatientReturn {
  // Core state
  patient: Patient | null;
  isLoading: boolean;
  isSaving: boolean;
  isSyncing: boolean;
  error: string | null;

  // Core operations
  updatePatient: (updates: Partial<Patient>) => Promise<Patient>;
  deletePatient: () => Promise<void>;

  // Device operations
  addDevice: (device: Omit<PatientDevice, 'id'>) => Promise<PatientDevice>;
  updateDevice: (deviceId: string, updates: Partial<PatientDevice>) => Promise<PatientDevice>;
  removeDevice: (deviceId: string) => Promise<void>;

  // Note operations
  addNote: (noteText: string, type?: PatientNote['type']) => Promise<PatientNote>;
  updateNote: (noteId: string, updates: Partial<PatientNote>) => Promise<PatientNote>;
  removeNote: (noteId: string) => Promise<void>;

  // Communication operations
  addCommunication: (communication: Omit<PatientCommunication, 'id'>) => Promise<PatientCommunication>;

  // Utility operations
  refreshPatient: () => Promise<void>;
  syncPatient: () => Promise<void>;

  // Validation and scoring
  validatePatient: (patientData?: Partial<Patient>) => { isValid: boolean; errors: string[] };
  calculatePriorityScore: () => number;
}

export const usePatient = (
  patientId: string | null,
  options: UsePatientOptions = {}
): UsePatientReturn => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patient data
  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      return;
    }

    const loadPatient = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const mockPatient: Patient = {
          id: patientId,
          email: 'mock@example.com',
          phone: '555-0123',
          birthDate: '1990-01-01',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tcNumber: '12345678901',
          firstName: 'Mock',
          lastName: 'Patient',
          devices: []
        };
        setPatient(mockPatient);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patient');
      } finally {
        setIsLoading(false);
      }
    };

    loadPatient();
  }, [patientId]);

  // Update patient
  const updatePatient = useCallback(async (updates: Partial<Patient>): Promise<Patient> => {
    if (!patient) throw new Error('No patient loaded');
    
    setIsSaving(true);
    setError(null);
    
    try {
      const updatedPatient = { ...patient, ...updates };
      setPatient(updatedPatient);
      return updatedPatient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [patient]);

  // Delete patient
  const deletePatient = useCallback(async (): Promise<void> => {
    if (!patient) throw new Error('No patient loaded');
    
    setIsSaving(true);
    setError(null);
    
    try {
      setPatient(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [patient]);

  // Add device
  const addDevice = useCallback(async (device: Omit<PatientDevice, 'id'>): Promise<PatientDevice> => {
    if (!patient) throw new Error('No patient loaded');
    
    const newDevice: PatientDevice = {
      ...device,
      id: Date.now().toString()
    };
    
    const updatedPatient = {
      ...patient,
      devices: [...(patient.devices || []), newDevice]
    };
    
    setPatient(updatedPatient);
    return newDevice;
  }, [patient]);

  // Update device
  const updateDevice = useCallback(async (deviceId: string, updates: Partial<PatientDevice>): Promise<PatientDevice> => {
    if (!patient) throw new Error('No patient loaded');
    
    const devices = patient.devices || [];
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    
    if (deviceIndex === -1) throw new Error('Device not found');
    
    const updatedDevice = { ...devices[deviceIndex], ...updates };
    const updatedDevices = [...devices];
    updatedDevices[deviceIndex] = updatedDevice;
    
    setPatient({ ...patient, devices: updatedDevices });
    return updatedDevice;
  }, [patient]);

  // Remove device
  const removeDevice = useCallback(async (deviceId: string): Promise<void> => {
    if (!patient) throw new Error('No patient loaded');
    
    const updatedDevices = (patient.devices || []).filter(d => d.id !== deviceId);
    setPatient({ ...patient, devices: updatedDevices });
  }, [patient]);

  // Add note
  const addNote = useCallback(async (noteText: string, type: PatientNote['type'] = 'general'): Promise<PatientNote> => {
    const newNote: PatientNote = {
      id: Date.now().toString(),
      text: noteText,
      date: new Date().toISOString(),
      author: 'Current User',
      type,
      createdAt: new Date().toISOString()
    };
    
    return newNote;
  }, [patient]);

  // Update note
  const updateNote = useCallback(async (noteId: string, updates: Partial<PatientNote>): Promise<PatientNote> => {
    const updatedNote: PatientNote = {
      id: noteId,
      text: updates.text || '',
      date: updates.date || new Date().toISOString(),
      author: updates.author || 'Current User',
      type: updates.type || 'general',
      createdAt: updates.createdAt || new Date().toISOString()
    };
    
    return updatedNote;
  }, [patient]);

  // Remove note
  const removeNote = useCallback(async (noteId: string): Promise<void> => {
    // Mock implementation
  }, []);

  // Add communication
  const addCommunication = useCallback(async (communication: Omit<PatientCommunication, 'id'>): Promise<PatientCommunication> => {
    const newCommunication: PatientCommunication = {
      ...communication,
      id: Date.now().toString()
    };
    
    return newCommunication;
  }, []);

  // Refresh patient
  const refreshPatient = useCallback(async (): Promise<void> => {
    if (!patientId) return;
    
    setIsLoading(true);
    try {
      // Mock refresh
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  // Sync patient
  const syncPatient = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      // Mock sync
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Validate patient
  const validatePatient = useCallback((patientData?: Partial<Patient>) => {
    const data = patientData || patient;
    const errors: string[] = [];
    
    if (!data?.firstName) errors.push('First name is required');
    if (!data?.lastName) errors.push('Last name is required');
    if (!data?.email) errors.push('Email is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [patient]);

  // Calculate priority score
  const calculatePriorityScore = useCallback((): number => {
    if (!patient) return 0;
    
    let score = 0;
    // Use priorityScore if available, otherwise calculate based on other factors
    if (patient.priorityScore) {
      score = patient.priorityScore;
    } else {
      // Calculate based on status or other available properties
      if (patient.status === 'LEAD') score += 1;
      else if (patient.status === 'TRIAL') score += 2;
      else if (patient.status === 'CUSTOMER') score += 3;
    }
    
    return score;
  }, [patient]);

  return {
    patient,
    isLoading,
    isSaving,
    isSyncing,
    error,
    updatePatient,
    deletePatient,
    addDevice,
    updateDevice,
    removeDevice,
    addNote,
    updateNote,
    removeNote,
    addCommunication,
    refreshPatient,
    syncPatient,
    validatePatient,
    calculatePriorityScore
  };
};