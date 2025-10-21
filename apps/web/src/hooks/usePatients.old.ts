import { useState, useEffect, useCallback } from 'react';
import { 
  Patient, 
  PatientFilters, 
  PatientSearchResult, 
  PatientStats,
  PatientDevice,
  PatientNote,
  PatientCommunication,
  Communication,
  PatientMatchCandidate,
  PatientMatchRequest
} from '../types/patient';
import { patientService } from '../services/patient.service';

export interface UsePatients {
  // Data
  patients: Patient[];
  currentPatient: Patient | null;
  stats: PatientStats | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  createPatient: (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Patient | null>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<Patient | null>;
  deletePatient: (id: string) => Promise<boolean>;
  loadPatient: (id: string) => Promise<Patient | null>;
  searchPatients: (filters: PatientFilters) => Promise<PatientSearchResult>;
  refreshStats: () => Promise<void>;
  
  // Device management
  addDevice: (patientId: string, device: Omit<PatientDevice, 'id'>) => Promise<PatientDevice | null>;
  updateDevice: (patientId: string, deviceId: string, updates: Partial<PatientDevice>) => Promise<PatientDevice | null>;
  
  // Notes management
  addNote: (patientId: string, text: string, type?: PatientNote['type']) => Promise<PatientNote | null>;
  
  // Communication
  addCommunication: (patientId: string, communication: Omit<PatientCommunication, 'id'>) => Promise<PatientCommunication | null>;
  // Export
  exportPatient: (id: string) => Promise<string | null>;
  
  // Patient matching
  findMatches: (request: PatientMatchRequest) => Promise<PatientMatchCandidate[]>;
  
  // Utility
  validateTcNumber: (tcNumber: string, excludeId?: string) => Promise<boolean>;
  getHighPriorityPatients: () => Promise<Patient[]>;
}

export function usePatients(initialFilters?: PatientFilters): UsePatients {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadPatients(initialFilters);
    loadStats();
  }, []);

  // Listen for patient updates
  useEffect(() => {
    const handlePatientUpdated = (event: CustomEvent) => {
      const { patient } = event.detail;
      setPatients(prev => prev.map(p => p.id === patient.id ? patient : p));
      
      if (currentPatient && currentPatient.id === patient.id) {
        setCurrentPatient(patient);
      }
    };

    const handlePatientCreated = (event: CustomEvent) => {
      const { patient } = event.detail;
      setPatients(prev => [...prev, patient]);
    };

    const handlePatientDeleted = (event: CustomEvent) => {
      const { patient } = event.detail;
      setPatients(prev => prev.filter(p => p.id !== patient.id));
      
      if (currentPatient && currentPatient.id === patient.id) {
        setCurrentPatient(null);
      }
    };

    window.addEventListener('patient:updated', handlePatientUpdated as EventListener);
    window.addEventListener('patient:created', handlePatientCreated as EventListener);
    window.addEventListener('patient:deleted', handlePatientDeleted as EventListener);

    return () => {
      window.removeEventListener('patient:updated', handlePatientUpdated as EventListener);
      window.removeEventListener('patient:created', handlePatientCreated as EventListener);
      window.removeEventListener('patient:deleted', handlePatientDeleted as EventListener);
    };
  }, [currentPatient]);

  const loadPatients = useCallback(async (filters?: PatientFilters) => {
    try {
      setLoading(true);
      setError(null);
      const result = await patientService.getPatients(filters);
      setPatients(result.patients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const patientStats = await patientService.getPatientStats();
      setStats(patientStats);
    } catch (err) {
      console.error('Failed to load patient stats:', err);
    }
  }, []);

  const createPatient = useCallback(async (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient | null> => {
    try {
      setLoading(true);
      setError(null);
      const patient = await patientService.createPatient(data);
      await loadStats(); // Refresh stats
      return patient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>): Promise<Patient | null> => {
    try {
      setLoading(true);
      setError(null);
      const patient = await patientService.updatePatient(id, updates);
      await loadStats(); // Refresh stats
      return patient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  const deletePatient = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const success = await patientService.deletePatient(id);
      if (success) {
        await loadStats(); // Refresh stats
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  const loadPatient = useCallback(async (id: string): Promise<Patient | null> => {
    try {
      setLoading(true);
      setError(null);
      const patient = await patientService.getPatient(id);
      setCurrentPatient(patient);
      return patient;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patient');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPatients = useCallback(async (filters: PatientFilters): Promise<PatientSearchResult> => {
    try {
      setLoading(true);
      setError(null);
      const result = await patientService.getPatients(filters);
      setPatients(result.patients);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search patients');
      return {
        patients: [],
        total: 0,
        page: 1,
        pageSize: 0,
        hasMore: false
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  const addDevice = useCallback(async (patientId: string, device: Omit<PatientDevice, 'id'>): Promise<PatientDevice | null> => {
    try {
      setError(null);
      const patient = patients.find(p => p.id === patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }
      const updatedPatient = patientService.addDevice(patient, device);
      // Update the patient in the list
      setPatients(prev => prev.map(p => p.id === patientId ? updatedPatient : p));
      // Return the newly added device
      const newDevice = updatedPatient.devices?.find(d => !patient.devices?.some(pd => pd.id === d.id));
      return newDevice || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add device');
      return null;
    }
  }, [patients]);

  const updateDevice = useCallback(async (patientId: string, deviceId: string, updates: Partial<PatientDevice>): Promise<PatientDevice | null> => {
    try {
      setError(null);
      const patient = patients.find(p => p.id === patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }
      const updatedPatient = patientService.updateDevice(patient, deviceId, updates);
      // Update the patient in the list
      setPatients(prev => prev.map(p => p.id === patientId ? updatedPatient : p));
      // Return the updated device
      const updatedDevice = updatedPatient.devices?.find(d => d.id === deviceId);
      return updatedDevice || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update device');
      return null;
    }
  }, [patients]);

  const addNote = useCallback(async (patientId: string, text: string, type?: PatientNote['type']): Promise<PatientNote | null> => {
    try {
      setError(null);
      const patient = patients.find(p => p.id === patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }
      const noteData: Omit<PatientNote, 'id'> = {
        text,
        type: type || 'general',
        date: new Date().toISOString(),
        author: 'Current User', // This should come from auth context
        isPrivate: false
      };
      const updatedPatient = patientService.addNote(patient, noteData);
      // Update the patient in the list
      setPatients(prev => prev.map(p => p.id === patientId ? updatedPatient : p));
      // Return the newly added note
      const newNote = updatedPatient.notes?.find(n => !patient.notes?.some(pn => pn.id === n.id));
      return newNote || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
      return null;
    }
  }, [patients]);

  const addCommunication = useCallback(async (patientId: string, communication: Omit<PatientCommunication, 'id'>): Promise<PatientCommunication | null> => {
    try {
      setError(null);
      const patient = patients.find(p => p.id === patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }
      const updatedPatient = patientService.addCommunication(patient, communication as any);
      // Update the patient in the list
      setPatients(prev => prev.map(p => p.id === patientId ? updatedPatient : p));
      // Return the newly added communication
      const newCommunication = updatedPatient.communications?.find(c => !patient.communications?.some(pc => pc.id === c.id));
      return newCommunication || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add communication');
      return null;
    }
  }, [patients]);

  const exportPatient = useCallback(async (id: string): Promise<string | null> => {
    try {
      setError(null);
      const patient = await patientService.getPatient(id);
      if (!patient) return null;
      return JSON.stringify(patient, null, 2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export patient');
      return null;
    }
  }, []);

  const findMatches = useCallback(async (request: PatientMatchRequest): Promise<PatientMatchCandidate[]> => {
    try {
      setError(null);
      return await patientService.findMatches(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find matches');
      return [];
    }
  }, []);

  const validateTcNumber = useCallback(async (tcNumber: string, excludeId?: string): Promise<boolean> => {
    try {
      return await patientService.validateTcNumber(tcNumber, excludeId);
    } catch (err) {
      console.error('TC number validation failed:', err);
      return false;
    }
  }, []);

  const getHighPriorityPatients = useCallback(async (): Promise<Patient[]> => {
    try {
      return await patientService.getHighPriorityPatients();
    } catch (err) {
      console.error('Failed to get high priority patients:', err);
      return [];
    }
  }, []);

  return {
    // Data
    patients,
    currentPatient,
    stats,
    loading,
    error,
    
    // Actions
    createPatient,
    updatePatient,
    deletePatient,
    loadPatient,
    searchPatients,
    refreshStats,
    
    // Device management
    addDevice,
    updateDevice,
    
    // Notes management
    addNote,
    
    // Communication
    addCommunication,
  // Export
  exportPatient,
    
    // Patient matching
    findMatches,
    
    // Utility
    validateTcNumber,
    getHighPriorityPatients
  };
}

// Specialized hooks for common use cases
export function usePatient(id: string | null) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setPatient(null);
      return;
    }

    const loadPatient = async () => {
      try {
        setLoading(true);
        setError(null);
        const patientData = await patientService.getPatient(id);
        setPatient(patientData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load patient');
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [id]);

  // Listen for updates to this specific patient
  useEffect(() => {
    if (!id) return;

    const handlePatientUpdated = (event: CustomEvent) => {
      const { patient: updatedPatient } = event.detail;
      if (updatedPatient.id === id) {
        setPatient(updatedPatient);
      }
    };

    const handlePatientDeleted = (event: CustomEvent) => {
      const { patient: deletedPatient } = event.detail;
      if (deletedPatient.id === id) {
        setPatient(null);
      }
    };

    window.addEventListener('patient:updated', handlePatientUpdated as EventListener);
    window.addEventListener('patient:deleted', handlePatientDeleted as EventListener);

    return () => {
      window.removeEventListener('patient:updated', handlePatientUpdated as EventListener);
      window.removeEventListener('patient:deleted', handlePatientDeleted as EventListener);
    };
  }, [id]);

  return { patient, loading, error };
}

export function usePatientStats() {
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      setLoading(true);
      const patientStats = await patientService.getPatientStats();
      setStats(patientStats);
    } catch (err) {
      console.error('Failed to load patient stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Listen for patient changes to refresh stats
  useEffect(() => {
    const handlePatientChange = () => {
      refreshStats();
    };

    window.addEventListener('patient:created', handlePatientChange);
    window.addEventListener('patient:updated', handlePatientChange);
    window.addEventListener('patient:deleted', handlePatientChange);

    return () => {
      window.removeEventListener('patient:created', handlePatientChange);
      window.removeEventListener('patient:updated', handlePatientChange);
      window.removeEventListener('patient:deleted', handlePatientChange);
    };
  }, [refreshStats]);

  return { stats, loading, refreshStats };
}