import { useState, useEffect, useCallback, useMemo } from 'react';
import { PatientApiService } from '../../services/patient/patient-api.service';

export interface TimelineEvent {
  id: string;
  patientId: string;
  eventType: 'appointment' | 'sale' | 'device_assignment' | 'note' | 'test' | 'payment' | 'hearing_test' | 'document' | 'activity';
  title: string;
  description?: string;
  eventDate: string;
  createdBy?: string;
  user?: string;
  source?: 'activity_log' | 'custom_data';
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  icon?: string;
  color?: string;
  category?: string;
  date?: string;
  time?: string;
  timestamp?: string;
  createdAt: string;
}

/**
 * Hook for fetching and managing patient timeline
 */
export function usePatientTimeline(patientId?: string) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // Memoize apiService to prevent unnecessary re-renders and API calls
  const apiService = useMemo(() => new PatientApiService(), []);

  // Fetch timeline for a patient
  const fetchTimeline = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getTimeline(id);
      setTimeline(result?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load timeline on mount or when patientId changes
  useEffect(() => {
    if (patientId) {
      fetchTimeline(patientId);
    } else {
      setTimeline([]);
    }
  }, [patientId, fetchTimeline]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    timeline,
    data: timeline,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    fetchTimeline,
    clearError
  };
}