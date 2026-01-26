/**
 * useParty Hook - Real API Implementation
 * 
 * This hook fetches party data from the backend API using Orval-generated hooks.
 * It replaces the previous mock implementation that returned hardcoded data.
 * 
 * Requirements: 1.1, 1.6 (Real Data Fetching)
 */

import { useGetParty } from '@/api/generated';
import type { PartyRead } from '@/api/generated/schemas';

export interface UsePartyReturn {
  // Core state
  party: PartyRead | null | undefined;
  data: PartyRead | null | undefined; // Alias for backward compatibility
  isLoading: boolean;
  error: Error | null;

  // Utility operations
  refetch: () => void;
}

/**
 * Hook to fetch a single party by ID from the backend API
 * 
 * @param partyId - The ID of the party to fetch
 * @returns Party data, loading state, error state, and refetch function
 * 
 * @example
 * ```tsx
 * const { party, isLoading, error, refetch } = useParty(partyId);
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
 * if (!party) return <EmptyState />;
 * 
 * return <PartyDetails party={party} />;
 * ```
 */
export const useParty = (partyId: string | null): UsePartyReturn => {
  // Use Orval-generated hook for real API calls
  const query = useGetParty(
    partyId || '', // Provide empty string if null to satisfy type requirements
    {
      query: {
        enabled: !!partyId, // Only fetch if partyId exists
        staleTime: 5 * 60 * 1000, // 5 minutes - party data doesn't change frequently
        retry: 3, // Retry failed requests up to 3 times
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
      }
    }
  );

  // Extract data from ResponseEnvelope
  const partyData = query.data?.data;

  return {
    party: partyData,
    data: partyData, // Backward compatibility alias
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch
  };
};
