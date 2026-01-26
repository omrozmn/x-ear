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
import type { Party } from '../types/party';

export interface UsePartyReturn {
  // Core state
  party: Party | null | undefined;
  data: Party | null | undefined; // Alias for backward compatibility
  isLoading: boolean;
  error: Error | null;

  // Utility operations
  refetch: () => void;
}

/**
 * Convert PartyRead (API schema) to Party (app type)
 * Handles null values and type conversions
 */
function toParty(partyRead: PartyRead | null | undefined): Party | null {
  if (!partyRead) return null;
  
  return {
    ...partyRead,
    // Convert null to undefined for optional string fields
    firstName: partyRead.firstName ?? undefined,
    lastName: partyRead.lastName ?? undefined,
    email: partyRead.email ?? undefined,
    phone: partyRead.phone ?? undefined,
    tcNumber: partyRead.tcNumber ?? undefined,
    birthDate: partyRead.birthDate ?? undefined,
    address: partyRead.address ?? undefined,
    // Ensure required fields have defaults
    createdAt: partyRead.createdAt ?? new Date().toISOString(),
    updatedAt: partyRead.updatedAt ?? new Date().toISOString(),
  } as Party;
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
export const useParty = (partyId: string | null | undefined): UsePartyReturn => {
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

  // Extract data from ResponseEnvelope and convert to Party type
  const partyData = toParty(query.data?.data);

  return {
    party: partyData,
    data: partyData, // Backward compatibility alias
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch
  };
};
