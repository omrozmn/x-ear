/**
 * Party Offline Sync Service
 * Handles offline party operations with IndexedDB and outbox pattern
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { customInstance } from '../../api/orval-mutator';
import type { Party } from '../../types/party';
import { outbox } from '../../utils/outbox';

interface PartyDB extends DBSchema {
  parties: {
    key: string;
    value: Party & { syncStatus: 'synced' | 'pending' | 'failed' };
    indexes: {
      'by-sync-status': string;
      'by-updated-at': string;
      'by-name': string;
      'by-phone': string;
    };
  };
  syncMetadata: {
    key: string;
    value: {
      id: string;
      lastSync: string;
      totalParties: number;
      pendingOperations: number;
    };
  };
}

export class PartyOfflineSync {
  private db: IDBPDatabase<PartyDB> | null = null;
  private readonly dbName = 'PartyDB';
  private readonly dbVersion = 1;
  private syncInProgress = false;
  private listeners: Set<() => void> = new Set();

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<PartyDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Parties store
          if (!db.objectStoreNames.contains('parties')) {
            const partiesStore = db.createObjectStore('parties', { keyPath: 'id' });
            partiesStore.createIndex('by-sync-status', 'syncStatus');
            partiesStore.createIndex('by-updated-at', 'updatedAt');
            partiesStore.createIndex('by-name', 'name');
            partiesStore.createIndex('by-phone', 'phone');
          }

          // Sync metadata store
          if (!db.objectStoreNames.contains('syncMetadata')) {
            db.createObjectStore('syncMetadata', { keyPath: 'id' });
          }
        },
      });

      // Setup online/offline listeners
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Party offline sync initialized
    } catch (error) {
      console.error('Failed to initialize party offline sync:', error);
      throw error;
    }
  }

  // Party CRUD operations
  async saveParty(party: Omit<Party, 'id'> & { id?: string }): Promise<Party> {
    if (!this.db) throw new Error('Database not initialized');

    const partyId = party.id || `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const partyWithSync: Party & { syncStatus: 'synced' | 'pending' | 'failed' } = {
      ...party,
      id: partyId,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    await this.db.put('parties', partyWithSync);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'POST',
      endpoint: '/api/parties',
      data: party,
      headers: {
        'Idempotency-Key': `party_create_${partyId}`
      }
    });

    this.notifyListeners();
    return partyWithSync;
  }

  async updateParty(id: string, updates: Partial<Party>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.db.get('parties', id);
    if (!existing) throw new Error('Party not found');

    const updated = {
      ...existing,
      ...updates,
      syncStatus: 'pending' as const,
      updatedAt: new Date().toISOString()
    };

    await this.db.put('parties', updated);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'PUT',
      endpoint: `/api/parties/${id}`,
      data: updates,
      headers: {
        'Idempotency-Key': `party_update_${id}_${Date.now()}`
      }
    });

    this.notifyListeners();
  }

  async deleteParty(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('parties', id);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'DELETE',
      endpoint: `/api/parties/${id}`,
      headers: {
        'Idempotency-Key': `party_delete_${id}_${Date.now()}`
      }
    });

    this.notifyListeners();
  }

  async getParty(id: string): Promise<Party | null> {
    if (!this.db) throw new Error('Database not initialized');

    const party = await this.db.get('parties', id);
    if (!party) return null;

    const { syncStatus: _syncStatus, ...partyData } = party;
    return partyData;
  }

  async getAllParties(): Promise<Party[]> {
    if (!this.db) throw new Error('Database not initialized');

    const parties = await this.db.getAll('parties');
    return parties.map(p => {
      const { syncStatus: _syncStatus, ...party } = p;
      return party;
    });
  }

  async searchParties(query: string): Promise<Party[]> {
    if (!this.db) throw new Error('Database not initialized');

    const allParties = await this.db.getAll('parties');
    const searchTerm = query.toLowerCase();

    return allParties
      .filter(party => {
        const partyName = party.firstName && party.lastName ? `${party.firstName} ${party.lastName}` : '';
        return partyName.toLowerCase().includes(searchTerm) ||
          party.phone?.includes(searchTerm) ||
          party.email?.toLowerCase().includes(searchTerm);
      })
      .map(p => ({ ...p, syncStatus: undefined }));
  }

  async getPendingParties(): Promise<(Party & { syncStatus: string })[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllFromIndex('parties', 'by-sync-status', 'pending');
  }

  // Sync operations
  async syncWithServer(): Promise<void> {
    if (!navigator.onLine || this.syncInProgress) return;

    this.syncInProgress = true;
    this.notifyListeners();

    try {
      // First, sync pending operations via outbox
      await this.syncPendingOperations();

      // Then, fetch latest data from server
      await this.fetchLatestParties();

      // Update sync metadata
      await this.updateSyncMetadata();

      // Party sync completed
    } catch (error) {
      console.error('Party sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncPendingOperations(): Promise<void> {
    // The outbox will handle the actual sync operations
    // We just need to update local sync status based on outbox results
    const pendingParties = await this.getPendingParties();

    for (const party of pendingParties) {
      // Check if the operation was successfully synced by checking outbox
      // This is a simplified approach - in a real implementation,
      // you'd want to correlate outbox operations with local records
      const updatedParty = { ...party, syncStatus: 'synced' as const };
      await this.db!.put('parties', updatedParty);
    }
  }

  private async fetchLatestParties(): Promise<void> {
    try {
      // Check if there are active API calls to prevent conflicts
      if (this.hasActiveApiCalls()) {
        // Skipping background sync due to active API calls
        return;
      }

      const parties: Party[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      let requestCount = 0;
      const maxRequests = 5; // Further reduced to prevent resource exhaustion

      while (hasMore && requestCount < maxRequests) {
        // Use even smaller page size for background sync
        const url: string = cursor ? `/api/parties?per_page=10&cursor=${cursor}` : '/api/parties?per_page=10';

        // Add longer delay between requests to prevent resource exhaustion
        if (requestCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1000ms delay
        }

        try {
          const data = await customInstance<Record<string, unknown>>({ url, method: 'GET' }) as { data?: unknown[]; meta?: { nextCursor?: string } };
          const partyData = (data.data || []) as Party[];
          parties.push(...partyData);
          cursor = data.meta?.nextCursor ?? null;
          hasMore = !!cursor;
          requestCount++;

          // Log progress for debugging
          // Fetched batch
        } catch (fetchError) {
          console.warn('Background sync fetch error:', fetchError);
          break; // Stop on network error
        }
      }

      // Update local database with server data (only if we got some data)
      if (parties.length > 0) {
        for (const serverParty of parties) {
          const party = serverParty as Party;
          if (!party.id) continue; // Skip parties without ID

          const localParty = await this.db!.get('parties', party.id);

          // Only update if server version is newer or local doesn't exist
          if (!localParty || (party.updatedAt && localParty.updatedAt && new Date(party.updatedAt) > new Date(localParty.updatedAt))) {
            await this.db!.put('parties', {
              ...party,
              syncStatus: 'synced'
            });
          }
        }
        // Updated parties in local DB
      }

      // If we hit the request limit, schedule another sync for much later
      if (hasMore && requestCount >= maxRequests) {
        // Partial sync completed, scheduling continuation
        setTimeout(() => this.syncWithServer(), 120000); // Continue in 2 minutes instead of 30 seconds
      }
    } catch (error) {
      console.warn('Failed to fetch latest parties:', error);
      // Don't throw - offline mode should still work
    }
  }

  // Check if there are active API calls that might conflict with background sync
  private hasActiveApiCalls(): boolean {
    // Check for active React Query requests
    const queryClient = window.__REACT_QUERY_CLIENT__;
    if (queryClient) {
      const queries = queryClient.getQueryCache().getAll();
      const activePartyQueries = queries.filter((query) =>
        (query.queryKey as unknown[])?.[0] === 'parties' && query.state.fetchStatus === 'fetching'
      );
      if (activePartyQueries.length > 0) {
        return true;
      }
    }

    // Check for ongoing fetch requests (basic heuristic)
    const performanceEntries = performance.getEntriesByType('navigation');
    const recentRequests = performanceEntries.filter((entry) =>
      (entry as PerformanceEntry & { name: string }).name?.includes('/api/parties') &&
      (Date.now() - entry.startTime) < 5000 // Within last 5 seconds
    );

    return recentRequests.length > 0;
  }

  private async updateSyncMetadata(): Promise<void> {
    if (!this.db) return;

    const totalParties = await this.db.count('parties');
    const pendingOperations = (await outbox.getStats()).pending;

    await this.db.put('syncMetadata', {
      id: 'main',
      lastSync: new Date().toISOString(),
      totalParties,
      pendingOperations
    });
  }

  // Event handlers
  private async handleOnline(): Promise<void> {
    // Going online, starting sync
    try {
      await this.syncWithServer();
    } catch (error) {
      console.error('Auto-sync on online failed:', error);
    }
  }

  private handleOffline(): void {
    // Going offline, operations will be queued
    this.notifyListeners();
  }

  // Listener management
  addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Status getters
  get isOnline(): boolean {
    return navigator.onLine;
  }

  get isSyncing(): boolean {
    return this.syncInProgress;
  }

  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: string | null;
    pendingOperations: number;
    totalParties: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const metadata = await this.db.get('syncMetadata', 'main');
    const stats = await outbox.getStats();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: metadata?.lastSync || null,
      pendingOperations: stats.pending,
      totalParties: metadata?.totalParties || 0
    };
  }

  // Cleanup
  async destroy(): Promise<void> {
    this.listeners.clear();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Create and export singleton instance
export const partyOfflineSync = new PartyOfflineSync();