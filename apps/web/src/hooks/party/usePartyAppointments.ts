import { useState, useEffect, useCallback, useMemo } from 'react';
import { PartyApiService } from '../../services/party/party-api.service';

export interface PartyAppointment {
  id: string;
  partyId: string;
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
 * Hook for fetching and managing party appointments
 */
export function usePartyAppointments(partyId?: string) {
  const [appointments, setAppointments] = useState<PartyAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const apiService = useMemo(() => new PartyApiService(), []);

  // Fetch appointments for a party
  const fetchAppointments = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getAppointments(id);
      setAppointments((result?.data || []) as PartyAppointment[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load appointments on mount or when partyId changes
  useEffect(() => {
    if (partyId) {
      fetchAppointments(partyId);
    } else {
      setAppointments([]);
    }
  }, [partyId, fetchAppointments]);

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