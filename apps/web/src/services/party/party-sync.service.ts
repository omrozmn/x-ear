/**
 * Party Sync Service
 * @fileoverview Handles party data synchronization between local storage and API
 * @version 1.0.0
 */

import type { PartyRead as OrvalParty } from '@/api/generated/schemas';
import { indexedDBManager } from '../../utils/indexeddb';
import { outbox, OutboxOperation } from '../../utils/outbox';
import { listParties } from '@/api/client/parties.client';
import type { Party as LocalParty } from '../../types/party';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: SyncConflict[];
  lastSyncTime: string;
}

export interface SyncConflict {
  partyId: string;
  localVersion: LocalParty;
  remoteVersion: OrvalParty;
  conflictType: 'update' | 'delete' | 'create';
  resolution?: 'local' | 'remote' | 'merge';
}

export interface SyncOptions {
  force?: boolean;
  conflictResolution?: 'local' | 'remote' | 'prompt';
  batchSize?: number;
  since?: string;
}

export class PartySyncService {
  private readonly SYNC_KEY = 'party_last_sync';
  private readonly BATCH_SIZE = 50;
  private syncInProgress = false;

  async syncParties(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      const result = await this.performSync(options);
      await this.updateLastSyncTime();
      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncSingleParty(partyId: string, options: SyncOptions = {}): Promise<boolean> {
    try {
      // Get local party
      const localParty = await indexedDBManager.getParty(partyId);
      if (!localParty) {
        throw new Error(`Party ${partyId} not found locally`);
      }

      // Check if there are pending changes in outbox
      const pendingOperations = await outbox.getPendingOperations();
      const partyOperations = pendingOperations.filter(op =>
        op.endpoint.includes(`/parties/${partyId}`) ||
        (op.data && typeof op.data === 'object' && 'id' in op.data && op.data.id === partyId)
      );

      if (partyOperations.length > 0 && !options.force) {
        // Push pending changes first
        await this.pushPendingChanges([partyId]);
      }

      // Pull latest from server
      await this.pullPartyFromServer(partyId);

      return true;
    } catch (error) {
      console.error(`Failed to sync party ${partyId}:`, error);
      return false;
    }
  }

  async getLastSyncTime(): Promise<string | null> {
    try {
      const lastSync = await indexedDBManager.getCache(this.SYNC_KEY);
      return typeof lastSync === 'string' ? lastSync : null;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      const pendingOperations = await outbox.getPendingOperations();
      return pendingOperations.filter(op => op.endpoint.includes('/parties')).length;
    } catch (error) {
      console.error('Failed to get pending sync count:', error);
      return 0;
    }
  }

  async hasPendingChanges(partyId?: string): Promise<boolean> {
    try {
      const pendingOperations = await outbox.getPendingOperations();

      if (partyId) {
        return pendingOperations.some(op =>
          op.endpoint.includes(`/parties/${partyId}`) ||
          (op.data && typeof op.data === 'object' && 'id' in op.data && op.data.id === partyId)
        );
      } else {
        return pendingOperations.some(op => op.endpoint.includes('/parties'));
      }
    } catch (error) {
      console.error('Failed to check pending changes:', error);
      return false;
    }
  }

  async resolveConflict(conflict: SyncConflict, resolution: 'local' | 'remote' | 'merge'): Promise<LocalParty> {
    switch (resolution) {
      case 'local': {
        // Keep local version, push to server
        await this.pushPartyToServer(conflict.localVersion);
        return conflict.localVersion;
      }
      case 'remote': {
        // Keep remote version, update local
        await indexedDBManager.updateParty(this.toLocalParty(conflict.remoteVersion));
        return this.toLocalParty(conflict.remoteVersion);
      }
      case 'merge': {
        // Merge both versions (last-write-wins for most fields)
        const merged = this.mergeParties(conflict.localVersion, conflict.remoteVersion);
        await indexedDBManager.updateParty(merged);
        await this.pushPartyToServer(merged);
        return merged;
      }
      default:
        throw new Error(`Invalid conflict resolution: ${resolution}`);
    }
  }

  private async performSync(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      synced: 0,
      failed: 0,
      conflicts: [],
      lastSyncTime: new Date().toISOString()
    };

    try {
      // Step 1: Push pending changes
      const pushResult = await this.pushPendingChanges();

      // Step 2: Pull remote changes
      const pullResult = await this.pullRemoteChanges(options);

      result.synced = (pushResult.synced || 0) + (pullResult.synced || 0);
      result.failed = (pushResult.failed || 0) + (pullResult.failed || 0);
      result.conflicts = [...(pushResult.conflicts || []), ...(pullResult.conflicts || [])];
      result.success = result.failed === 0 && result.conflicts.length === 0;

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
      return result;
    }
  }

  private async pushPendingChanges(partyIds?: string[]): Promise<Partial<SyncResult>> {
    const result = { synced: 0, failed: 0, conflicts: [] as SyncConflict[] };

    try {
      const pendingOperations = await outbox.getPendingOperations();
      const partyOperations = pendingOperations.filter(op => {
        if (partyIds) {
          return partyIds.some(id =>
            op.endpoint.includes(`/parties/${id}`) ||
            (op.data && typeof op.data === 'object' && 'id' in op.data && op.data.id === id)
          );
        }
        return op.endpoint.includes('/parties');
      });

      for (const operation of partyOperations) {
        try {
          await this.processPendingOperation(operation);
          result.synced++;
        } catch (error) {
          console.error(`Failed to process operation ${operation.id}:`, error);
          result.failed++;
        }
      }
    } catch (error) {
      console.error('Failed to push pending changes:', error);
    }

    return result;
  }

  private async pullRemoteChanges(options: SyncOptions): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      synced: 0,
      failed: 0,
      conflicts: []
    };

    try {
      const batchSize = options.batchSize || this.BATCH_SIZE;

      // Use Orval generated API for fetching parties
      const response = await listParties({ per_page: batchSize });
      const parties = response.data;

      if (parties && parties.length > 0) {
        for (const remoteParty of parties) {
          try {
            const syncResult = await this.syncRemoteParty(remoteParty, options);
            if (syncResult.conflict) {
              result.conflicts!.push(syncResult.conflict);
            } else {
              result.synced!++;
            }
          } catch (error) {
            console.error('Failed to sync party:', error);
            result.failed!++;
          }
        }
      }
    } catch (error) {
      console.error('Failed to pull remote changes:', error);
    }

    return result;
  }

  private async syncRemoteParty(remoteParty: OrvalParty, options: SyncOptions): Promise<{ conflict?: SyncConflict }> {
    if (!remoteParty.id) {
      console.error('Remote party missing ID, skipping sync');
      return {};
    }

    const localParty = await indexedDBManager.getParty(remoteParty.id);

    if (!localParty) {
      // New party from server
      await indexedDBManager.updateParty(this.toLocalParty(remoteParty));
      return {};
    }

    // Check for conflicts
    const hasLocalChanges = await this.hasPendingChanges(remoteParty.id);
    const isLocalNewer = new Date(localParty.updatedAt || '') > new Date(remoteParty.updatedAt || '');

    if (hasLocalChanges || isLocalNewer) {
      // Conflict detected
      const conflict: SyncConflict = {
        partyId: remoteParty.id,
        localVersion: localParty,
        remoteVersion: remoteParty,
        conflictType: 'update'
      };

      if (options.conflictResolution && options.conflictResolution !== 'prompt') {
        await this.resolveConflict(conflict, options.conflictResolution);
        return {};
      }

      return { conflict };
    }

    // No conflict, update local
    await indexedDBManager.updateParty(this.toLocalParty(remoteParty));
    return {};
  }

  private async processPendingOperation(operation: OutboxOperation): Promise<void> {
    // This would typically involve making API calls based on the operation
    // For now, we'll just log it as the actual API integration would be complex
    console.log('Processing pending operation:', operation.id, operation.method, operation.endpoint);
  }

  private async pushPartyToServer(party: LocalParty): Promise<void> {
    const orval = this.toOrvalParty(party);
    // Add operation to outbox for sync
    await outbox.addOperation({
      method: 'PUT',
      endpoint: `/api/parties/${orval.id}`,
      data: orval,
      headers: {
        'Idempotency-Key': `update-party-${orval.id}-${Date.now()}`
      }
    });
  }

  private async pullPartyFromServer(partyId: string): Promise<void> {
    // Implementation would fetch party from API
    // This is a placeholder for the actual API integration
    console.log('Pulling party from server:', partyId);
  }

  private mergeParties(local: LocalParty, remote: OrvalParty): LocalParty {
    // Simple last-write-wins merge strategy
    const localTime = new Date(local.updatedAt || '').getTime();
    const remoteTime = new Date(remote.updatedAt || '').getTime();

    if (localTime > remoteTime) {
      return { ...local, updatedAt: new Date().toISOString() };
    } else {
      return {
        ...local,
        firstName: remote.firstName ?? local.firstName,
        lastName: remote.lastName ?? local.lastName,
        phone: remote.phone ?? local.phone,
        email: remote.email ?? local.email,
        tcNumber: remote.tcNumber ?? local.tcNumber,
        status: remote.status ?? local.status,
        segment: (remote as unknown as { segment?: string }).segment ?? local.segment,
        updatedAt: new Date().toISOString()
      } as LocalParty;
    }
  }

  private toLocalParty(remote: OrvalParty): LocalParty {
    return {
      id: remote.id ?? '',
      firstName: remote.firstName ?? '',
      lastName: remote.lastName ?? '',
      phone: remote.phone ?? '',
      email: remote.email,
      tcNumber: remote.tcNumber ?? undefined,
      birthDate: remote.birthDate,
      createdAt: remote.createdAt ?? new Date().toISOString(),
      updatedAt: remote.updatedAt ?? new Date().toISOString(),
      status: remote.status,
      segment: (remote as unknown as { segment?: string }).segment
    } as LocalParty;
  }

  private toOrvalParty(local: LocalParty): OrvalParty {
    return {
      id: local.id,
      firstName: local.firstName || undefined,
      lastName: local.lastName || undefined,
      phone: local.phone,
      email: local.email,
      tcNumber: local.tcNumber ?? null,
      birthDate: local.birthDate,
      createdAt: local.createdAt,
      updatedAt: local.updatedAt,
      status: local.status,
      segment: local.segment
    } as OrvalParty;
  }

  private async updateLastSyncTime(): Promise<void> {
    try {
      await indexedDBManager.setCache(this.SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  async createParty(party: LocalParty, _origin?: string): Promise<LocalParty> {
    // 1. Save to local IndexedDB
    await indexedDBManager.updateParty(party);

    // 2. Add to Outbox for sync
    const orval = this.toOrvalParty(party);
    await outbox.addOperation({
      method: 'POST',
      endpoint: '/api/parties',
      data: orval,
      headers: {
        'Idempotency-Key': `create-party-${party.id}-${Date.now()}`
      }
    });

    // 3. Trigger sync if online (fire and forget)
    if (navigator.onLine) {
      this.syncParties().catch(console.error);
    }

    return party;
  }

  async updateParty(party: LocalParty, _origin?: string): Promise<LocalParty> {
    // 1. Update local IndexedDB
    await indexedDBManager.updateParty(party);

    // 2. Add to Outbox
    await this.pushPartyToServer(party);

    // 3. Trigger sync if online
    if (navigator.onLine) {
      this.syncParties().catch(console.error);
    }

    return party;
  }

  async deleteParty(partyId: string, _origin?: string): Promise<void> {
    // 1. Delete from local IndexedDB
    await indexedDBManager.deleteParty(partyId);

    // 2. Add to Outbox
    await outbox.addOperation({
      method: 'DELETE',
      endpoint: `/api/parties/${partyId}`
    });

    // 3. Trigger sync if online
    if (navigator.onLine) {
      this.syncParties().catch(console.error);
    }
  }
}

export const partySyncService = new PartySyncService();
