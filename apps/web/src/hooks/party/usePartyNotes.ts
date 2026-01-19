import { useState, useEffect, useCallback } from 'react';
import { partyApiService } from '../../services/party/party-api.service';

export interface PartyNote {
  id: string;
  partyId: string;
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
 * Hook for fetching and managing party notes
 */
export function usePartyNotes(partyId?: string) {
  const [notes, setNotes] = useState<PartyNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // Fetch notes for a party
  const fetchNotes = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await partyApiService.getNotes(id);
      setNotes((result?.data || []) as PartyNote[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notes on mount or when partyId changes
  useEffect(() => {
    if (partyId) {
      fetchNotes(partyId);
    } else {
      setNotes([]);
    }
  }, [partyId, fetchNotes]);

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