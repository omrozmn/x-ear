import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Party } from '../../types/party';
import { PartyApiService } from '../../services/party/party-api.service';
import { PartyStorageService } from '../../services/party/party-storage.service';

// Type for API/legacy response that may have different field names
interface PartyLike {
  id?: string | null;
  firstName?: string | null;
  first_name?: string | null;
  lastName?: string | null;
  last_name?: string | null;
  name?: string | null;
  tcNumber?: string | null;
  tc_number?: string | null;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  birth_date?: string | null;
  status?: string | null;
  segment?: string | null;
  createdAt?: string | number | null;
  created_at?: string | number | null;
  updatedAt?: string | number | null;
  updated_at?: string | number | null;
  tags?: string[] | null | unknown; // Allow unknown for flexible API responses
  [key: string]: unknown;
}

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
    status: (data.status as 'active' | 'passive' | 'archived') || 'active',
    segment: (data.segment as 'NEW' | 'LOYAL' | 'VIP' | 'Risk') || 'NEW',
    createdAt: (data.createdAt || data.created_at || '').toString(),
    updatedAt: (data.updatedAt || data.updated_at || '').toString(),
    tags: Array.isArray(data.tags) ? data.tags : [],
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
        setParty(toParty(result as unknown as PartyLike));
      } else {
        // Fallback to local storage
        const localParty = await storageService.getPartyById(id);
        setParty(toParty(localParty as unknown as PartyLike));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));

      // Try local storage as fallback
      try {
        const localParty = await storageService.getPartyById(id);
        setParty(toParty(localParty as unknown as PartyLike));
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
      // Cast updates to match API requirements - using Record<string, unknown> is safer than any
      const result = await apiService.updateParty(party.id, updates as Record<string, unknown>);
      if (result) {
        const updatedParty = toParty(result as unknown as PartyLike);
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