// @ts-nocheck
/**
 * usePatients Hook
 * @fileoverview Custom hook for managing patient data with caching, search, and real-time updates
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Patient } from '../types/patient';
import { PatientSearchResult, PatientFilters } from '../types/patient/patient-search.types';
import { patientService } from '../services/patient.service';
import { patientSearchService } from '../services/patient/patient-search.service';
import { patientCacheService, SimpleCacheFilters } from '../services/patient/patient-cache.service';
import { patientValidationService } from '../services/patient/patient-validation.service';
import { patientSyncService } from '../services/patient/patient-sync.service';

export interface UsePatientsOptions {
  enableRealTimeSync?: boolean;
  cacheEnabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface UsePatientsReturn {
  // Data
  patients: Patient[];
  searchResults: PatientSearchResult | null;
  totalCount: number;
  isLoading: boolean;
  isSearching: boolean;
  isSyncing: boolean;
  error: string | null;

  // Search & Filter
  searchPatients: (filters: SimpleCacheFilters) => Promise<void>;
  clearSearch: () => void;
  applyFilters: (filters: SimpleCacheFilters) => void;

  // CRUD Operations
  createPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<Patient>;
  deletePatient: (id: string) => Promise<void>;

  // Data Management
  refreshPatients: () => Promise<void>;
  syncPatients: () => Promise<void>;
  clearCache: () => Promise<void>;

  // Utilities
  getPatientById: (id: string) => Patient | undefined;
  validatePatient: (patient: Partial<Patient>) => { isValid: boolean; errors: string[] };
}

export function usePatients(options: UsePatientsOptions = {}) {
  const {
    cacheEnabled = true,
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes instead of 30 seconds
    enableRealTimeSync = false
  } = options;

  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchResults, setSearchResults] = useState<PatientSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<SimpleCacheFilters>({});

  // Initialize patients data
  useEffect(() => {
    const initializePatients = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load patients from cache first if enabled
        if (cacheEnabled) {
          const cachedPatients = await patientCacheService.getCachedPatients();
          if (cachedPatients.length > 0) {
            setPatients(cachedPatients);
            setIsLoading(false);
          }
        }

        // Load fresh data from service
        const patientsResult = await patientService.getPatients({ limit: 10000 }); // Get all patients
        setPatients(patientsResult.patients);

      } catch (err) {
        console.error('Failed to initialize patients:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patients');
      } finally {
        setIsLoading(false);
      }
    };

    initializePatients();
  }, [cacheEnabled]);

  // Auto refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const updatedPatientsResult = await patientService.getPatients({ limit: 10000 }); // Get all patients
        setPatients(updatedPatientsResult.patients);
      } catch (err) {
        console.error('Auto refresh failed:', err);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Real-time sync setup
  useEffect(() => {
    if (!enableRealTimeSync) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith('patient_')) {
        // Reload patients when storage changes
        patientService.getPatients().then(result => {
          setPatients(result.patients);
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [enableRealTimeSync]);

  // Listen for patient CRUD events from patientService
  useEffect(() => {
    const handlePatientCreated = (event: CustomEvent) => {
      const { patient } = event.detail;
      setPatients(prev => [...prev, patient]);
    };

    const handlePatientUpdated = (event: CustomEvent) => {
      const { patient: updatedPatient } = event.detail;
      setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    };

    const handlePatientDeleted = (event: CustomEvent) => {
      const { id } = event.detail;
      setPatients(prev => prev.filter(p => p.id !== id));
    };

    const handlePatientsUpdated = (event: CustomEvent) => {
      const { patients: updatedPatients } = event.detail;
      setPatients(updatedPatients);
    };

    window.addEventListener('patient:created', handlePatientCreated as EventListener);
    window.addEventListener('patient:updated', handlePatientUpdated as EventListener);
    window.addEventListener('patient:deleted', handlePatientDeleted as EventListener);
    window.addEventListener('patients:updated', handlePatientsUpdated as EventListener);

    return () => {
      window.removeEventListener('patient:created', handlePatientCreated as EventListener);
      window.removeEventListener('patient:updated', handlePatientUpdated as EventListener);
      window.removeEventListener('patient:deleted', handlePatientDeleted as EventListener);
      window.removeEventListener('patients:updated', handlePatientsUpdated as EventListener);
    };
  }, []);

  // Search patients
  const searchPatients = useCallback(async (filters: SimpleCacheFilters) => {
    try {
      setIsSearching(true);
      setError(null);
      setCurrentFilters(filters);

      let results: PatientSearchResult;

      if (cacheEnabled && !filters.search) {
        // Use cache for simple filtering
        results = await patientCacheService.searchCachedPatients(filters);
      } else {
        // Use search service for complex queries
        const patientFilters = {
          search: filters.search,
          status: filters.status as "active" | "inactive" | "archived" | undefined,
          segment: filters.segment as "new" | "trial" | "purchased" | "control" | "renewal" | undefined,
          labels: filters.label ? [filters.label[0]] : undefined,
          hasDevice: filters.hasDevices,
          page: filters.page,
          limit: filters.limit
        };

        results = await patientSearchService.searchPatients(patients, patientFilters);
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [patients, cacheEnabled]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setCurrentFilters({});
  }, []);

  // Apply filters
  const applyFilters = useCallback((filters: SimpleCacheFilters) => {
    setCurrentFilters(filters);
    searchPatients(filters);
  }, [searchPatients]);

  // Create patient
  const createPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> => {
    try {
      setError(null);

      // Validate patient data
      const validation = patientValidationService.validatePatient(patientData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Create patient using service
      const newPatient = await patientService.createPatient(patientData);

      // Update local state
      setPatients(prev => [...prev, newPatient]);

      // Cache if enabled
      if (cacheEnabled) {
        await patientCacheService.updateCachedPatient(newPatient);
      }

      // Sync to server
      if (enableRealTimeSync) {
        await patientSyncService.syncSinglePatient(newPatient.id);
      }

      return newPatient;
    } catch (err) {
      console.error('Failed to create patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to create patient');
      throw err;
    }
  }, [cacheEnabled, enableRealTimeSync]);

  // Update patient
  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>): Promise<Patient> => {
    try {
      setError(null);

      const existingPatient = patients.find(p => p.id === id);
      if (!existingPatient) {
        throw new Error('Patient not found');
      }

      const updatedPatient = await patientService.updatePatient(id, updates);
      if (!updatedPatient) {
        throw new Error('Failed to update patient');
      }

      // Update local state
      setPatients(prev => prev.map(p => p.id === id ? updatedPatient : p));

      // Update cache if enabled
      if (cacheEnabled) {
        await patientCacheService.updateCachedPatient(updatedPatient);
      }

      // Sync to server
      if (enableRealTimeSync) {
        await patientSyncService.syncSinglePatient(id);
      }

      return updatedPatient;
    } catch (err) {
      console.error('Failed to update patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to update patient');
      throw err;
    }
  }, [patients, cacheEnabled, enableRealTimeSync]);

  // Delete patient
  const deletePatient = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);

      const success = await patientService.deletePatient(id);
      if (!success) {
        throw new Error('Failed to delete patient');
      }

      // Remove from local state
      setPatients(prev => prev.filter(p => p.id !== id));

      // Remove from cache if enabled
      if (cacheEnabled) {
        await patientCacheService.removeCachedPatient(id);
      }

      // Sync deletion to server
      if (enableRealTimeSync) {
        // This would typically mark for deletion in outbox
        console.log('Marking patient for deletion:', id);
      }
    } catch (err) {
      console.error('Failed to delete patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
      throw err;
    }
  }, [cacheEnabled, enableRealTimeSync]);

  // Refresh patients
  const refreshPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const freshPatientsResult = await patientService.getPatients({ limit: 10000 }); // Get all patients
      setPatients(freshPatientsResult.patients);

      // Re-apply current filters if any
      if (Object.keys(currentFilters).length > 0) {
        await searchPatients(currentFilters);
      }
    } catch (err) {
      console.error('Failed to refresh patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh patients');
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, searchPatients]);

  // Sync patients
  const syncPatients = useCallback(async () => {
    try {
      setIsSyncing(true);
      setError(null);

      const syncResult = await patientSyncService.syncPatients();

      if (syncResult.conflicts.length > 0) {
        console.warn('Sync conflicts detected:', syncResult.conflicts);
        // Handle conflicts - could show a modal or notification
      }

      // Refresh local data after sync
      await refreshPatients();
    } catch (err) {
      console.error('Failed to sync patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync patients');
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPatients]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      if (cacheEnabled) {
        await patientCacheService.clearCache();
        // Reload from API
        await refreshPatients();
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
    }
  }, [cacheEnabled, refreshPatients]);

  // Get patient by ID
  const getPatientById = useCallback((id: string): Patient | undefined => {
    return patients.find(p => p.id === id);
  }, [patients]);

  // Validate patient
  const validatePatient = useCallback((patient: Partial<Patient>) => {
    const validation = patientValidationService.validatePatient(patient);
    return {
      isValid: validation.isValid,
      errors: validation.errors.map(e => e.message)
    };
  }, []);

  // Memoized total count
  const totalCount = useMemo(() => {
    return searchResults ? searchResults.totalCount : patients.length;
  }, [searchResults, patients.length]);

  // Return in TanStack Query format for compatibility
  return {
    // TanStack Query compatible format
    data: {
      patients,
      total: totalCount,
      page: 1,
      pageSize: patients.length,
      hasMore: false
    },
    isLoading,
    error,
    refetch: refreshPatients,

    // Legacy direct access (for backward compatibility)
    patients,
    searchResults,
    totalCount,
    isSearching,
    isSyncing,

    // Search & Filter
    searchPatients,
    clearSearch,
    applyFilters,

    // CRUD Operations
    createPatient,
    updatePatient,
    deletePatient,

    // Data Management
    refreshPatients,
    syncPatients,
    clearCache,

    // Utilities
    getPatientById,
    validatePatient
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

    window.addEventListener('patient:updated', handlePatientUpdated as EventListener);
    return () => window.removeEventListener('patient:updated', handlePatientUpdated as EventListener);
  }, [id]);

  return { patient, loading, error };
}

export function usePatientDevices(patientId: string) {
  const [devices, setDevices] = useState<PatientDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await patientsGetPatientDevices(patientId);

      // API response structure: { success: boolean, data: PatientDevice[], meta: {...} }
      if (response.data?.success && Array.isArray(response.data.data)) {
        setDevices(response.data.data);
      } else {
        setDevices([]);
      }
    } catch (err) {
      console.error('Failed to fetch patient devices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Listen for device updates
  useEffect(() => {
    const handleDeviceUpdate = () => {
      fetchDevices();
    };

    window.addEventListener('device:assigned', handleDeviceUpdate);
    window.addEventListener('device:updated', handleDeviceUpdate);
    window.addEventListener('device:removed', handleDeviceUpdate);

    return () => {
      window.removeEventListener('device:assigned', handleDeviceUpdate);
      window.removeEventListener('device:updated', handleDeviceUpdate);
      window.removeEventListener('device:removed', handleDeviceUpdate);
    };
  }, [fetchDevices]);

  return {
    data: devices,
    isLoading: loading,
    error,
    refetch: fetchDevices
  };
}

// Export mutation hooks - These DON'T use the main hook
// Instead, they import services directly to avoid Rules of Hooks violations
export function useCreatePatient() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = useCallback(async (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await patientService.createPatient(data);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create patient');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending, isError: !!error, error };
}

export function useUpdatePatient() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = useCallback(async ({ patientId, updates }: { patientId: string; updates: Partial<Patient> }) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await patientService.updatePatient(patientId, updates);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update patient');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending, isError: !!error, error };
}

export function useDeletePatient() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = useCallback(async (patientId: string) => {
    setIsPending(true);
    setError(null);
    try {
      await patientService.deletePatient(patientId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete patient');
      setError(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending, isError: !!error, error };
}