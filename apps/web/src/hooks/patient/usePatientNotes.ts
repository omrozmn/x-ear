// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { PatientApiService } from '../../services/patient/patient-api.service';

export interface PatientNote {
  id: string;
  patientId: string;
  authorId: string;
  appointmentId?: string;
  noteType: 'clinical' | 'administrative' | 'follow_up' | 'general';
  category: 'general' | 'complaint' | 'treatment' | 'progress' | 'other';
  title: string;
  content: string;
  isPrivate: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for fetching and managing patient notes
 */
export function usePatientNotes(patientId?: string) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const apiService = new PatientApiService();

  // Fetch notes for a patient
  const fetchNotes = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getNotes(id);
      setNotes(result?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load notes on mount or when patientId changes
  useEffect(() => {
    if (patientId) {
      fetchNotes(patientId);
    } else {
      setNotes([]);
    }
  }, [patientId, fetchNotes]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    notes,
    data: notes,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    fetchNotes,
    clearError
  };
}