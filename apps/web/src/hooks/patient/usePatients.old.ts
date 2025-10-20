// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Patient, PatientFilters, PatientSearchResult, PatientStats } from '../../types/patient';
import { PatientApiService } from '../../services/patient/patient-api.service';
import { PatientStorageService } from '../../services/patient/patient-storage.service';
// import { patientSyncService } from '../../services/patient/patient-sync.service';

/**
 * usePatients Hook
 * Manages patient list state, filtering, pagination, and offline-first operations
 * Follows 500 LOC limit and single responsibility principle
 */
export function usePatients(initialFilters?: PatientFilters) {
  // Services
  const apiService = useMemo(() => new PatientApiService(), []);
  const storageService = useMemo(() => new PatientStorageService(), []);
  // const syncService = useMemo(() => new PatientSyncService(), []);

  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PatientFilters>(initialFilters || {});
  const [searchResult, setSearchResult] = useState<PatientSearchResult>({
    patients: [],
    total: 0,
    page: 1,
    pageSize: 50,
    hasMore: false
  });
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Load patients from storage/API
   */
  const loadPatients = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline && forceRefresh) {
        // Force sync from server
        await syncService.forceSync();
      }

      // Load from local storage with filters
      const result = await storageService.searchPatients(filters);
      setSearchResult(result);
      setPatients(result.patients);

      // Load stats
      const patientStats = await calculateStats(result.patients);
      setStats(patientStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load patients';
      setError(errorMessage);
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, isOnline, storageService, syncService]);

  /**
   * Search patients with new filters
   */
  const searchPatients = useCallback(async (newFilters: PatientFilters) => {
    setFilters(newFilters);
    setLoading(true);
    setError(null);

    try {
      const result = await storageService.searchPatients(newFilters);
      setSearchResult(result);
      setPatients(result.patients);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search patients';
      setError(errorMessage);
      console.error('Error searching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [storageService]);

  /**
   * Load more patients (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!searchResult.hasMore || loading) return;

    setLoading(true);
    try {
      const nextPage = searchResult.page + 1;
      const newFilters = { ...filters, page: nextPage };
      
      const result = await storageService.searchPatients(newFilters);
      
      // Append new patients to existing list
      setPatients(prev => [...prev, ...result.patients]);
      setSearchResult(prev => ({
        ...result,
        patients: [...prev.patients, ...result.patients]
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more patients';
      setError(errorMessage);
      console.error('Error loading more patients:', err);
    } finally {
      setLoading(false);
    }
  }, [searchResult, loading, filters, storageService]);

  /**
   * Refresh patients from server
   */
  const refresh = useCallback(async () => {
    await loadPatients(true);
  }, [loadPatients]);

  /**
   * Clear filters and reload
   */
  const clearFilters = useCallback(async () => {
    const clearedFilters: PatientFilters = { page: 1, limit: 50 };
    await searchPatients(clearedFilters);
  }, [searchPatients]);

  /**
   * Update patient in local state
   */
  const updatePatientInState = useCallback((updatedPatient: Patient) => {
    setPatients(prev => 
      prev.map(p => p.id === updatedPatient.id ? updatedPatient : p)
    );
    
    setSearchResult(prev => ({
      ...prev,
      patients: prev.patients.map(p => p.id === updatedPatient.id ? updatedPatient : p)
    }));
  }, []);

  /**
   * Remove patient from local state
   */
  const removePatientFromState = useCallback((patientId: string) => {
    setPatients(prev => prev.filter(p => p.id !== patientId));
    
    setSearchResult(prev => ({
      ...prev,
      patients: prev.patients.filter(p => p.id !== patientId),
      total: prev.total - 1
    }));
  }, []);

  /**
   * Add patient to local state
   */
  const addPatientToState = useCallback((newPatient: Patient) => {
    setPatients(prev => [newPatient, ...prev]);
    
    setSearchResult(prev => ({
      ...prev,
      patients: [newPatient, ...prev.patients],
      total: prev.total + 1
    }));
  }, []);

  /**
   * Calculate patient statistics
   */
  const calculateStats = useCallback(async (patientList: Patient[]): Promise<PatientStats> => {
    const total = patientList.length;
    
    const byStatus = patientList.reduce((acc, patient) => {
      acc[patient.status] = (acc[patient.status] || 0) + 1;
      return acc;
    }, {} as Record<Patient['status'], number>);

    const bySegment = patientList.reduce((acc, patient) => {
      acc[patient.segment] = (acc[patient.segment] || 0) + 1;
      return acc;
    }, {} as Record<Patient['segment'], number>);

    const byLabel = patientList.reduce((acc, patient) => {
      acc[patient.label] = (acc[patient.label] || 0) + 1;
      return acc;
    }, {} as Record<Patient['label'], number>);

    const highPriority = patientList.filter(p => (p.priorityScore || 0) >= 8).length;
    const withDevices = patientList.filter(p => p.devices.length > 0).length;
    const sgkPending = patientList.filter(p => p.sgkStatus === 'pending').length;
    const overduePayments = patientList.filter(p => (p.overdueAmount || 0) > 0).length;

    return {
      total,
      byStatus,
      bySegment,
      byLabel,
      highPriority,
      withDevices,
      sgkPending,
      overduePayments
    };
  }, []);

  /**
   * Get sync status
   */
  const getSyncStatus = useCallback(async () => {
    return await syncService.getSyncStatus();
  }, [syncService]);

  // Load patients on mount and when filters change
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Memoized computed values
  const hasFilters = useMemo(() => {
    return !!(filters.search || filters.status || filters.segment || 
             filters.label || filters.acquisitionType || 
             (filters.tags && filters.tags.length > 0));
  }, [filters]);

  const isEmpty = useMemo(() => {
    return patients.length === 0 && !loading;
  }, [patients.length, loading]);

  return {
    // Data
    patients,
    searchResult,
    stats,
    filters,
    
    // State
    loading,
    error,
    isOnline,
    hasFilters,
    isEmpty,
    
    // Actions
    loadPatients,
    searchPatients,
    loadMore,
    refresh,
    clearFilters,
    updatePatientInState,
    removePatientFromState,
    addPatientToState,
    getSyncStatus,
    
    // Utilities
    setFilters
  };
}