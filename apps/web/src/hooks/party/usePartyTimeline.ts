import { useState, useEffect, useCallback, useMemo } from 'react';
import { PartyApiService } from '../../services/party/party-api.service';

export interface TimelineEvent {
  id: string;
  partyId: string;
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
 * Hook for fetching and managing party timeline
 */
export function usePartyTimeline(partyId?: string) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | string | null>(null);

  // Memoize apiService to prevent unnecessary re-renders and API calls
  const apiService = useMemo(() => new PartyApiService(), []);

  // Fetch timeline for a party
  const fetchTimeline = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.getTimeline(id);
      setTimeline((result?.data || []) as TimelineEvent[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [apiService]);

  // Load timeline on mount or when partyId changes
  useEffect(() => {
    if (partyId) {
      fetchTimeline(partyId);
    } else {
      setTimeline([]);
    }
  }, [partyId, fetchTimeline]);

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