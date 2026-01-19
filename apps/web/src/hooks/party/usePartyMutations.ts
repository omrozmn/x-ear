import { useState, useCallback, useMemo } from 'react';
import type { Party } from '../../types/party';
import type { Party as LocalParty } from '../../types/party/party-base.types';
import { indexedDBManager } from '../../utils/indexeddb';
import { PartySyncService } from '../../services/party/party-sync.service';

interface SyncStatus {
  pendingChanges: number;
  lastSync?: string;
  isOnline: boolean;
}
import { PartyStorageService } from '../../services/party/party-storage.service';

// Define request types locally - these match the PartySyncService expectations
interface PartyCreateRequest {
  firstName: string;
  lastName: string;
  phone: string;
  tcNumber?: string;
  birthDate?: string;
  email?: string;
  address?: string; // Mapped to addressFull
  addressFull?: string; // Direct mapping support
  status?: string;
  segment?: string;
  label?: string;
  acquisitionType?: string;
  tags?: string[];
  customData?: Record<string, unknown>;
}

interface PartyUpdateRequest extends Partial<PartyCreateRequest> {
  // Additional update-specific fields can be added here
}

/**
 * usePartyMutations Hook
 * Manages party CRUD operations with offline-first approach and optimistic updates
 * Follows 500 LOC limit and single responsibility principle
 */
export function usePartyMutations() {
  // Services
  const syncService = useMemo(() => new PartySyncService(), []);
  const storageService = useMemo(() => new PartyStorageService(), []);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Generate idempotency key
  const generateIdempotencyKey = useCallback(() => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Create a new party
   */
  const createParty = useCallback(async (
    partyData: PartyCreateRequest,
    options?: { onSuccess?: (party: Party) => void; onError?: (error: Error) => void }
  ): Promise<Party | null> => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      const now = new Date().toISOString();
      const newId = crypto.randomUUID(); // Valid per useIdempotency check, or use fallback

      const newParty: LocalParty = {
        id: newId,
        firstName: partyData.firstName || '',
        lastName: partyData.lastName || '',
        phone: partyData.phone,
        email: partyData.email || '',
        tcNumber: partyData.tcNumber || undefined,
        birthDate: partyData.birthDate || undefined,
        status: (partyData.status as any) || 'active', // Cast needed if string vs Enum mismatch, or fix types
        segment: (partyData.segment as any) || 'NEW',
        acquisitionType: partyData.acquisitionType as any,
        tags: partyData.tags || [],
        addressFull: partyData.address || undefined, // Map simple address string to addressFull
        // Default required fields
        createdAt: now,
        updatedAt: now,
        // Empty relations
        devices: [],
        notes: [],
        communications: [],
        roles: []
      };

      const createdParty = await syncService.createParty(newParty, idempotencyKey);

      options?.onSuccess?.(createdParty as Party);
      return createdParty;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create party');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error creating party:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Update an existing party
   */
  const updateParty = useCallback(async (
    partyId: string,
    updates: PartyUpdateRequest,
    options?: { onSuccess?: (party: Party) => void; onError?: (error: Error) => void }
  ): Promise<Party | null> => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();

      // Need to fetch current party to merge updates, as syncService requires full object
      const currentParty = await indexedDBManager.getParty(partyId);
      if (!currentParty) {
        throw new Error(`Party ${partyId} not found locally`);
      }

      // Separate address (string) from other updates to avoid overwriting address (object) type
      const { address, ...otherUpdates } = updates;

      const updatedPartyData: LocalParty = {
        ...currentParty,
        ...otherUpdates,
        address: currentParty.address, // Explicitly preserve object type, ensuring validation passes
        addressFull: address || otherUpdates.addressFull || currentParty.addressFull,
        // Ensure strictly typed fields are handled if mismatch exists, but spread should work for Partial
        updatedAt: new Date().toISOString()
      };

      const updatedParty = await syncService.updateParty(updatedPartyData, idempotencyKey);

      options?.onSuccess?.(updatedParty as Party);
      return updatedParty;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update party');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error updating party:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Delete a party
   */
  const deleteParty = useCallback(async (
    partyId: string,
    options?: { onSuccess?: () => void; onError?: (error: Error) => void }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey();
      await syncService.deleteParty(partyId, idempotencyKey);

      options?.onSuccess?.();
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete party');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error deleting party:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Bulk create parties
   */
  const createParties = useCallback(async (
    partiesData: PartyCreateRequest[],
    options?: {
      onSuccess?: (parties: Party[]) => void;
      onError?: (error: Error) => void;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<Party[]> => {
    setLoading(true);
    setError(null);

    const createdParties: Party[] = [];
    const total = partiesData.length;

    try {
      for (let i = 0; i < partiesData.length; i++) {
        // The original line `const parties = await indexedDBManager.getParties();` was removed
        // as it was not used and the instruction implies a change to `indexedDBManager.getParty(id)`
        // which is not directly applicable here without an `id`.
        // Assuming the intent was to remove an unused line or a placeholder.
        const partyData = partiesData[i];
        const idempotencyKey = generateIdempotencyKey();

        try {
          const createdParty = await syncService.createParty(partyData as LocalParty, idempotencyKey);
          createdParties.push(createdParty as Party);
          options?.onProgress?.(i + 1, total);
        } catch (err) {
          console.error(`Failed to create party ${i + 1}:`, err);
          // Continue with other parties
        }
      }

      options?.onSuccess?.(createdParties);
      return createdParties;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create parties');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error creating parties:', err);
      return createdParties;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Bulk update parties
   */
  const updateParties = useCallback(async (
    updates: Array<{ id: string; data: PartyUpdateRequest }>,
    options?: {
      onSuccess?: (parties: Party[]) => void;
      onError?: (error: Error) => void;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<Party[]> => {
    setLoading(true);
    setError(null);

    const updatedParties: Party[] = [];
    const total = updates.length;

    try {
      for (let i = 0; i < updates.length; i++) {
        const { id, data } = updates[i];
        const idempotencyKey = generateIdempotencyKey();

        try {
          const fullParty = { ...data, id } as LocalParty;
          const updatedParty = await syncService.updateParty(fullParty, idempotencyKey);
          updatedParties.push(updatedParty as Party);
          options?.onProgress?.(i + 1, total);
        } catch (err) {
          console.error(`Failed to update party ${id}:`, err);
          // Continue with other parties
        }
      }

      options?.onSuccess?.(updatedParties);
      return updatedParties;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update parties');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error updating parties:', err);
      return updatedParties;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Bulk delete parties
   */
  const deleteParties = useCallback(async (
    partyIds: string[],
    options?: {
      onSuccess?: (deletedCount: number) => void;
      onError?: (error: Error) => void;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<number> => {
    setLoading(true);
    setError(null);

    let deletedCount = 0;
    const total = partyIds.length;

    try {
      for (let i = 0; i < partyIds.length; i++) {
        const partyId = partyIds[i];
        const idempotencyKey = generateIdempotencyKey();

        try {
          await syncService.deleteParty(partyId, idempotencyKey);
          deletedCount++;
          options?.onProgress?.(i + 1, total);
        } catch (err) {
          console.error(`Failed to delete party ${partyId}:`, err);
          // Continue with other parties
        }
      }

      options?.onSuccess?.(deletedCount);
      return deletedCount;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete parties');
      setError(error.message);
      options?.onError?.(error);
      console.error('Error deleting parties:', err);
      return deletedCount;
    } finally {
      setLoading(false);
    }
  }, [syncService, generateIdempotencyKey]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get sync status
   */
  const getSyncStatus = useCallback(async (): Promise<SyncStatus> => {
    try {
      const pendingCount = await syncService.getPendingSyncCount();
      const lastSync = await syncService.getLastSyncTime();
      return {
        pendingChanges: pendingCount,
        lastSync: lastSync || undefined,
        isOnline
      };
    } catch (err) {
      console.error('Error getting sync status:', err);
      return {
        pendingChanges: 0,
        isOnline
      };
    }
  }, [syncService, isOnline]);

  /**
   * Force sync with server
   */
  const forceSync = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      await syncService.syncParties({ force: true });
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sync');
      setError(error.message);
      console.error('Error syncing:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [syncService]);

  // Online status listener
  useState(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  return {
    // State
    loading,
    error,
    isOnline,

    // Single operations
    createParty,
    updateParty,
    deleteParty,

    // Bulk operations
    createParties,
    updateParties,
    deleteParties,

    // Utilities
    clearError,
    getSyncStatus,
    forceSync,
    generateIdempotencyKey
  };
}