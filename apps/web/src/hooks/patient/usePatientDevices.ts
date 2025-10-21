// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { PatientDevice } from '../../types/patient';

/**
 * Hook for managing patient devices
 * Since devices are included in the patient object, this hook extracts and manages them
 */
export function usePatientDevices(patientId?: string, devices?: PatientDevice[]) {
  const [patientDevices, setPatientDevices] = useState<PatientDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // Update devices when patient devices change
  useEffect(() => {
    if (devices) {
      setPatientDevices(devices);
    } else {
      setPatientDevices([]);
    }
  }, [devices]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    devices: patientDevices,
    data: patientDevices,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    clearError
  };
}