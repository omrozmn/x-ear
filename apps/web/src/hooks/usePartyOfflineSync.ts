/**
 * React Hook for Party Offline Sync
 * Provides reactive interface to party offline sync operations
 */

import { useState, useEffect, useCallback } from 'react';
import { Party } from '../types/party';
import { partyOfflineSync } from '../services/offline/partyOfflineSync';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: string | null;
  pendingOperations: number;
  totalParties: number;
}

interface UsePartyOfflineSyncReturn {
  // Data
  parties: Party[];
  syncStatus: SyncStatus;
  
  // Operations
  saveParty: (party: Omit<Party, 'id'> & { id?: string }) => Promise<Party>;
  updateParty: (id: string, updates: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;
  getParty: (id: string) => Promise<Party | null>;
  searchParties: (query: string) => Promise<Party[]>;
  
  // Sync operations
  syncWithServer: () => Promise<void>;
  refreshParties: () => Promise<void>;
  
  // Status
  isInitialized: boolean;
  error: string | null;
}

export const usePartyOfflineSync = (): UsePartyOfflineSyncReturn => {
  const [parties, setParties] = useState<Party[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    pendingOperations: 0,
    totalParties: 0
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the sync service
  useEffect(() => {
    const initialize = async () => {
      try {
        await partyOfflineSync.initialize();
        setIsInitialized(true);
        await refreshParties();
        await updateSyncStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize offline sync');
        console.error('Failed to initialize party offline sync:', err);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      partyOfflineSync.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Setup sync status listener
  useEffect(() => {
    if (!isInitialized) return;

    const handleSyncUpdate = () => {
      updateSyncStatus();
      refreshParties();
    };

    partyOfflineSync.addListener(handleSyncUpdate);

    return () => {
      partyOfflineSync.removeListener(handleSyncUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]); // refreshParties and updateSyncStatus are stable callbacks

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await partyOfflineSync.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('Failed to get sync status:', err);
    }
  }, []);

  // Refresh parties from local database
  const refreshParties = useCallback(async () => {
    try {
      const allParties = await partyOfflineSync.getAllParties();
      setParties(allParties);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh parties');
      console.error('Failed to refresh parties:', err);
    }
  }, []);

  // Party operations
  const saveParty = useCallback(async (party: Omit<Party, 'id'> & { id?: string }): Promise<Party> => {
    try {
      setError(null);
      const savedParty = await partyOfflineSync.saveParty(party);
      await refreshParties();
      await updateSyncStatus();
      return savedParty;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save party';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshParties, updateSyncStatus]);

  const updateParty = useCallback(async (id: string, updates: Partial<Party>): Promise<void> => {
    try {
      setError(null);
      await partyOfflineSync.updateParty(id, updates);
      await refreshParties();
      await updateSyncStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update party';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshParties, updateSyncStatus]);

  const deleteParty = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await partyOfflineSync.deleteParty(id);
      await refreshParties();
      await updateSyncStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete party';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshParties, updateSyncStatus]);

  const getParty = useCallback(async (id: string): Promise<Party | null> => {
    try {
      setError(null);
      return await partyOfflineSync.getParty(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get party';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const searchParties = useCallback(async (query: string): Promise<Party[]> => {
    try {
      setError(null);
      return await partyOfflineSync.searchParties(query);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search parties';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Sync operations
  const syncWithServer = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await partyOfflineSync.syncWithServer();
      await refreshParties();
      await updateSyncStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync with server';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshParties, updateSyncStatus]);

  return {
    // Data
    parties,
    syncStatus,
    
    // Operations
    saveParty,
    updateParty,
    deleteParty,
    getParty,
    searchParties,
    
    // Sync operations
    syncWithServer,
    refreshParties,
    
    // Status
    isInitialized,
    error
  };
};

export default usePartyOfflineSync;