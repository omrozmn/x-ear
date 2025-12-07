import { useState, useEffect, useCallback } from 'react';
import { PatientApiService } from '../../services/patient/patient-api.service';

export interface PatientHearingTest {
  id: string;
  patientId: string;
  testDate: string;
  testType: string;
  conductedBy?: string;
  results?: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for fetching and managing patient hearing tests
 */
export function usePatientHearingTests(patientId?: string) {
  const [hearingTests, setHearingTests] = useState<PatientHearingTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const apiService = new PatientApiService();

  // Fetch hearing tests for a patient
  const fetchHearingTests = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getHearingTests(id);
      setHearingTests(result?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setHearingTests([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load hearing tests on mount or when patientId changes
  useEffect(() => {
    if (patientId) {
      fetchHearingTests(patientId);
    } else {
      setHearingTests([]);
    }
  }, [patientId, fetchHearingTests]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    hearingTests,
    data: hearingTests,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    fetchHearingTests,
    clearError
  };
}