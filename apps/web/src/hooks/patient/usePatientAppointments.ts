import { useState, useEffect, useCallback, useMemo } from 'react';
import { PatientApiService } from '../../services/patient/patient-api.service';

export interface PatientAppointment {
  id: string;
  patientId: string;
  clinicianId?: string;
  branchId?: string;
  date: string;
  time: string;
  duration: number;
  appointmentType: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for fetching and managing patient appointments
 */
export function usePatientAppointments(patientId?: string) {
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const apiService = useMemo(() => new PatientApiService(), []);

  // Fetch appointments for a patient
  const fetchAppointments = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getAppointments(id);
      setAppointments((result?.data || []) as PatientAppointment[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load appointments on mount or when patientId changes
  useEffect(() => {
    if (patientId) {
      fetchAppointments(patientId);
    } else {
      setAppointments([]);
    }
  }, [patientId, fetchAppointments]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    appointments,
    data: appointments,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    fetchAppointments,
    clearError
  };
}