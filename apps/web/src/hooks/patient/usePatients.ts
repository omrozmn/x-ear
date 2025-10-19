import { useState, useEffect, useMemo, useCallback } from 'react';
import { Patient, PatientFilters, PatientSearchResult, PatientStats } from '../../types/patient';
import { PatientApiService } from '../../services/patient/patient-api.service';
import { PatientStorageService } from '../../services/patient/patient-storage.service';

/**
 * Simplified usePatients hook for patient management
 * Provides basic CRUD operations without complex sync logic
 */
export function usePatients() {
  const apiService = useMemo(() => new PatientApiService(), []);
  const storageService = useMemo(() => new PatientStorageService(), []);

  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchResult, setSearchResult] = useState<PatientSearchResult>({
    patients: [],
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false
  });
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [filters, setFilters] = useState<PatientFilters>({
    search: '',
    status: undefined,
    segment: undefined,
    label: undefined,
    acquisitionType: undefined,
    dateRange: { start: '', end: '' },
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load patients
  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to load from API first
      const result = await apiService.searchPatients(filters);
      if (result) {
        setSearchResult(result);
        setPatients(result.patients);
      } else {
        // Fallback to local storage
        const localResult = await storageService.searchPatients(filters);
        setSearchResult(localResult);
        setPatients(localResult.patients);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load patients');
      
      // Try local storage as fallback
      try {
        const localResult = await storageService.searchPatients(filters);
        setSearchResult(localResult);
        setPatients(localResult.patients);
      } catch (localErr) {
        console.error('Failed to load from local storage:', localErr);
      }
    } finally {
      setLoading(false);
    }
  }, [apiService, storageService, filters]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const statsData = await apiService.getPatientStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [apiService]);

  // Create patient
  const createPatient = useCallback(async (patientData: Partial<Patient>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.createPatient(patientData);
      if (result) {
        // Update local state
        setPatients(prev => [result, ...prev]);
        await loadPatients(); // Refresh the list
        return result;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiService, loadPatients]);

  // Update patient
  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.updatePatient(id, updates);
      if (result) {
        // Update local state
        setPatients(prev => prev.map(p => p.id === id ? result : p));
        return result;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update patient');
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Delete patient
  const deletePatient = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const success = await apiService.deletePatient(id);
      if (success) {
        // Update local state
        setPatients(prev => prev.filter(p => p.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete patient');
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Search patients
  const searchPatients = useCallback(async (searchFilters: PatientFilters) => {
    setFilters(searchFilters);
  }, []);

  // Load more patients (pagination)
  const loadMore = useCallback(async () => {
    if (!searchResult.hasMore || loading) return;
    
    setLoading(true);
    try {
      const nextPage = searchResult.page + 1;
      const result = await apiService.searchPatients({
        ...filters,
        page: nextPage
      });
      
      if (result) {
        setSearchResult(prev => ({
          ...result,
          patients: [...prev.patients, ...result.patients]
        }));
        setPatients(prev => [...prev, ...result.patients]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more patients');
    } finally {
      setLoading(false);
    }
  }, [apiService, filters, searchResult, loading]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial load
  useEffect(() => {
    loadPatients();
    loadStats();
  }, [loadPatients, loadStats]);

  // Reload when filters change
  useEffect(() => {
    loadPatients();
  }, [filters]);

  return {
    // Data
    patients,
    searchResult,
    stats,
    filters,
    
    // State
    loading,
    error,
    
    // Actions
    createPatient,
    updatePatient,
    deletePatient,
    searchPatients,
    loadMore,
    clearError,
    
    // Setters
    setFilters
  };
}