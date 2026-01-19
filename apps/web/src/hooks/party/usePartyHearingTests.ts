import { useState, useEffect, useCallback, useMemo } from 'react';
import { PartyApiService } from '../../services/party/party-api.service';

export interface PartyHearingTest {
  id: string;
  partyId: string;
  testDate: string;
  testType: string;
  conductedBy?: string;
  results?: Record<string, any>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for fetching and managing party hearing tests
 */
export function usePartyHearingTests(partyId?: string) {
  const [hearingTests, setHearingTests] = useState<PartyHearingTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  const apiService = useMemo(() => new PartyApiService(), []);

  // Fetch hearing tests for a party
  const fetchHearingTests = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getHearingTests(id);
      setHearingTests((result?.data || []) as PartyHearingTest[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setHearingTests([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load hearing tests on mount or when partyId changes
  useEffect(() => {
    if (partyId) {
      fetchHearingTests(partyId);
    } else {
      setHearingTests([]);
    }
  }, [partyId, fetchHearingTests]);

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