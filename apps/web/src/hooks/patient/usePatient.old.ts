import { useState, useEffect, useCallback, useMemo } from 'react';
import { Patient } from '../../types/patient';
import { PatientApiService } from '../../services/patient/patient-api.service';
import { PatientStorageService } from '../../services/patient/patient-storage.service';
// import { patientSyncService } from '../../services/patient/patient-sync.service';

/**
 * usePatient Hook
 * Manages individual patient state, loading, and offline-first operations
 * Follows 500 LOC limit and single responsibility principle
 */
export function usePatient(patientId?: string) {
  // Services
  const apiService = useMemo(() => new PatientApiService(), []);
  const storageService = useMemo(() => new PatientStorageService(), []);
  const syncService = useMemo(() => new PatientSyncService(), []);

  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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
   * Load patient by ID
   */
  const loadPatient = useCallback(async (id: string, forceRefresh = false) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      // Try to load from local storage first
      let patientData = await storageService.getPatientById(id);

      // If online and force refresh, or patient not found locally, try API
      if ((isOnline && forceRefresh) || !patientData) {
        try {
          const apiPatient = await apiService.fetchPatient(id);
          if (apiPatient) {
            // Update local storage
            await storageService.updatePatient(apiPatient);
            patientData = apiPatient;
          }
        } catch (apiError) {
          // If API fails but we have local data, use it
          if (!patientData) {
            throw apiError;
          }
          console.warn('API failed, using cached data:', apiError);
        }
      }

      if (patientData) {
        setPatient(patientData);
        setLastUpdated(patientData.updatedAt);
      } else {
        throw new Error(`Patient with ID ${id} not found`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load patient';
      setError(errorMessage);
      console.error('Error loading patient:', err);
    } finally {
      setLoading(false);
    }
  }, [apiService, storageService, isOnline]);

  /**
   * Refresh patient from server
   */
  const refresh = useCallback(async () => {
    if (patient?.id) {
      await loadPatient(patient.id, true);
    }
  }, [patient?.id, loadPatient]);

  /**
   * Update patient data locally
   */
  const updatePatient = useCallback((updatedPatient: Patient) => {
    setPatient(updatedPatient);
    setLastUpdated(updatedPatient.updatedAt);
  }, []);

  /**
   * Clear patient data
   */
  const clearPatient = useCallback(() => {
    setPatient(null);
    setError(null);
    setLastUpdated(null);
  }, []);

  /**
   * Check if patient exists
   */
  const exists = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await storageService.patientExists(id);
    } catch (err) {
      console.error('Error checking patient existence:', err);
      return false;
    }
  }, [storageService]);

  /**
   * Get patient's device information
   */
  const getDevices = useCallback(() => {
    return patient?.devices || [];
  }, [patient?.devices]);

  /**
   * Get patient's notes
   */
  const getNotes = useCallback(() => {
    return patient?.notes || [];
  }, [patient?.notes]);

  /**
   * Get patient's installments
   */
  const getInstallments = useCallback(() => {
    return patient?.installments || [];
  }, [patient?.installments]);

  /**
   * Get patient's SGK information
   */
  const getSgkInfo = useCallback(() => {
    return patient?.sgkInfo || { hasInsurance: false };
  }, [patient?.sgkInfo]);

  /**
   * Get patient's appointments
   */
  const getAppointments = useCallback(() => {
    return patient?.appointments || [];
  }, [patient?.appointments]);

  /**
   * Get patient's communications
   */
  const getCommunications = useCallback(() => {
    return patient?.communications || [];
  }, [patient?.communications]);

  /**
   * Get patient's reports
   */
  const getReports = useCallback(() => {
    return patient?.reports || [];
  }, [patient?.reports]);

  /**
   * Check if patient has overdue payments
   */
  const hasOverduePayments = useCallback(() => {
    return (patient?.overdueAmount || 0) > 0;
  }, [patient?.overdueAmount]);

  /**
   * Check if patient is high priority
   */
  const isHighPriority = useCallback(() => {
    return (patient?.priorityScore || 0) >= 8;
  }, [patient?.priorityScore]);

  /**
   * Check if patient has devices
   */
  const hasDevices = useCallback(() => {
    return (patient?.devices?.length || 0) > 0;
  }, [patient?.devices]);

  /**
   * Check if patient has SGK insurance
   */
  const hasSgkInsurance = useCallback(() => {
    return patient?.sgkInfo?.hasInsurance || false;
  }, [patient?.sgkInfo]);

  /**
   * Get patient's full name
   */
  const getFullName = useCallback(() => {
    if (patient?.name) return patient.name;
    if (patient?.firstName || patient?.lastName) {
      return `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    }
    return 'Unknown Patient';
  }, [patient?.name, patient?.firstName, patient?.lastName]);

  /**
   * Get patient's display status
   */
  const getDisplayStatus = useCallback(() => {
    if (!patient) return 'Unknown';
    
    const statusMap = {
      active: 'Aktif',
      inactive: 'Pasif',
      archived: 'Arşivlenmiş'
    };
    
    return statusMap[patient.status] || patient.status;
  }, [patient?.status]);

  /**
   * Get patient's display segment
   */
  const getDisplaySegment = useCallback(() => {
    if (!patient) return 'Unknown';
    
    const segmentMap = {
      new: 'Yeni',
      trial: 'Deneme',
      purchased: 'Satın Alınmış',
      control: 'Kontrol',
      renewal: 'Yenileme'
    };
    
    return segmentMap[patient.segment] || patient.segment;
  }, [patient?.segment]);

  /**
   * Get patient's display label
   */
  const getDisplayLabel = useCallback(() => {
    if (!patient) return 'Unknown';
    
    const labelMap = {
      'yeni': 'Yeni',
      'arama-bekliyor': 'Arama Bekliyor',
      'randevu-verildi': 'Randevu Verildi',
      'deneme-yapildi': 'Deneme Yapıldı',
      'kontrol-hastasi': 'Kontrol Hastası',
      'satis-tamamlandi': 'Satış Tamamlandı'
    };
    
    return labelMap[patient.label] || patient.label;
  }, [patient?.label]);

  // Load patient when ID changes
  useEffect(() => {
    if (patientId) {
      loadPatient(patientId);
    } else {
      clearPatient();
    }
  }, [patientId, loadPatient, clearPatient]);

  // Memoized computed values
  const isLoaded = useMemo(() => {
    return patient !== null && !loading;
  }, [patient, loading]);

  const isEmpty = useMemo(() => {
    return patient === null && !loading && !error;
  }, [patient, loading, error]);

  return {
    // Data
    patient,
    lastUpdated,
    
    // State
    loading,
    error,
    isOnline,
    isLoaded,
    isEmpty,
    
    // Actions
    loadPatient,
    refresh,
    updatePatient,
    clearPatient,
    exists,
    
    // Getters
    getDevices,
    getNotes,
    getInstallments,
    getSgkInfo,
    getAppointments,
    getCommunications,
    getReports,
    getFullName,
    getDisplayStatus,
    getDisplaySegment,
    getDisplayLabel,
    
    // Computed properties
    hasOverduePayments,
    isHighPriority,
    hasDevices,
    hasSgkInsurance
  };
}