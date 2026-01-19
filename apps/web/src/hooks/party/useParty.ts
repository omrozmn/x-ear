import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Party } from '../../types/party';
import { PartyApiService } from '../../services/party/party-api.service';
import { PartyStorageService } from '../../services/party/party-storage.service';

// Type for API/legacy response that may have different field names
// We use any for a few fields because Orval types like PartyReadFirstName include null, 
// but our internal Party type expects string | undefined
type PartyLike = any;

// Helper to convert LegacyParty or API response to Party type
function toParty(data: PartyLike | null | undefined): Party | null {
  if (!data) return null;
  return {
    ...data, // Include all fields first
    id: data.id || '',
    firstName: data.firstName || data.first_name || (data.name ? data.name.split(' ')[0] : ''),
    lastName: data.lastName || data.last_name || (data.name ? data.name.split(' ').slice(1).join(' ') : ''),
    tcNumber: data.tcNumber || data.tc_number || '',
    phone: data.phone || '',
    email: data.email || undefined,
    birthDate: data.birthDate || data.birth_date || undefined,
    status: (data.status as any) || 'active',
    segment: (data.segment as any) || 'NEW',
    createdAt: (data.createdAt || data.created_at || '').toString(),
    updatedAt: (data.updatedAt || data.updated_at || '').toString(),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
  } as Party;
}

/**
 * Simplified useParty hook for individual party management
 * Provides basic operations for a single party
 */
export function useParty(partyId?: string) {
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(false);
  // Use Error | string | null so callers that expect Error.message don't break
  const [error, setError] = useState<Error | string | null>(null);

  // Memoize services to prevent recreation on every render
  const apiService = useMemo(() => new PartyApiService(), []);
  const storageService = useMemo(() => new PartyStorageService(), []);

  // Load party by ID
  const loadParty = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Try API first
      const result = await apiService.fetchParty(id);
      if (result) {
        // Convert API result to Party type
        setParty(toParty(result));
      } else {
        // Fallback to local storage
        const localParty = await storageService.getPartyById(id);
        setParty(toParty(localParty));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));

      // Try local storage as fallback
      try {
        const localParty = await storageService.getPartyById(id);
        setParty(toParty(localParty));
      } catch (localErr) {
        console.error('Failed to load from local storage:', localErr);
      }
    } finally {
      setLoading(false);
    }
  }, [apiService, storageService]);

  // Update party
  const updateParty = useCallback(async (updates: Partial<Party>) => {
    if (!party?.id) return null;

    setLoading(true);
    setError(null);

    try {
      const result = await apiService.updateParty(party.id, updates as any);
      if (result) {
        const updatedParty = toParty(result);
        setParty(updatedParty);
        return updatedParty;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [party, apiService]);

  // Delete party
  const deleteParty = useCallback(async () => {
    if (!party?.id) return false;

    setLoading(true);
    setError(null);

    try {
      const success = await apiService.deleteParty(party.id);
      if (success) {
        setParty(null);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setLoading(false);
    }
  }, [party, apiService]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load party on mount or when ID changes
  useEffect(() => {
    if (partyId) {
      loadParty(partyId);
    } else {
      setParty(null);
    }
  }, [partyId, loadParty]);

  return {
    // Data
    party,
    // Backwards-compatible alias
    data: party,

    // State
    loading,
    isLoading: loading,
    error,

    // Actions
    loadParty,
    updateParty,
    deleteParty,
    clearError
  };
}