/**
 * Patient Sync Service
 * @fileoverview Handles patient data synchronization between local storage and API
 * @version 1.0.0
 */

import type { PatientRead as OrvalPatient } from '@/api/generated/schemas';
import { indexedDBManager } from '../../utils/indexeddb';
import { outbox, OutboxOperation } from '../../utils/outbox';
import { listPatients } from '@/api/generated/patients/patients';
import type { Patient as LocalPatient } from '../../types/patient';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: SyncConflict[];
  lastSyncTime: string;
}

export interface SyncConflict {
  patientId: string;
  localVersion: LocalPatient;
  remoteVersion: OrvalPatient;
  conflictType: 'update' | 'delete' | 'create';
  resolution?: 'local' | 'remote' | 'merge';
}

export interface SyncOptions {
  force?: boolean;
  conflictResolution?: 'local' | 'remote' | 'prompt';
  batchSize?: number;
  since?: string;
}

export class PatientSyncService {
  private readonly SYNC_KEY = 'patient_last_sync';
  private readonly BATCH_SIZE = 50;
  private syncInProgress = false;

  async syncPatients(options: SyncOptions = {}): Promise<SyncResult> {
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

  async syncSinglePatient(patientId: string, options: SyncOptions = {}): Promise<boolean> {
    try {
      // Get local patient
      const localPatient = await indexedDBManager.getPatient(patientId);
      if (!localPatient) {
        throw new Error(`Patient ${patientId} not found locally`);
      }

      // Check if there are pending changes in outbox
      const pendingOperations = await outbox.getPendingOperations();
      const patientOperations = pendingOperations.filter(op =>
        op.endpoint.includes(`/patients/${patientId}`) ||
        (op.data && typeof op.data === 'object' && 'id' in op.data && op.data.id === patientId)
      );

      if (patientOperations.length > 0 && !options.force) {
        // Push pending changes first
        await this.pushPendingChanges([patientId]);
      }

      // Pull latest from server
      await this.pullPatientFromServer(patientId);

      return true;
    } catch (error) {
      console.error(`Failed to sync patient ${patientId}:`, error);
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
      return pendingOperations.filter(op => op.endpoint.includes('/patients')).length;
    } catch (error) {
      console.error('Failed to get pending sync count:', error);
      return 0;
    }
  }

  async hasPendingChanges(patientId?: string): Promise<boolean> {
    try {
      const pendingOperations = await outbox.getPendingOperations();

      if (patientId) {
        return pendingOperations.some(op =>
          op.endpoint.includes(`/patients/${patientId}`) ||
          (op.data && typeof op.data === 'object' && 'id' in op.data && op.data.id === patientId)
        );
      } else {
        return pendingOperations.some(op => op.endpoint.includes('/patients'));
      }
    } catch (error) {
      console.error('Failed to check pending changes:', error);
      return false;
    }
  }

  async resolveConflict(conflict: SyncConflict, resolution: 'local' | 'remote' | 'merge'): Promise<LocalPatient> {
    switch (resolution) {
      case 'local': {
        // Keep local version, push to server
        await this.pushPatientToServer(conflict.localVersion);
        return conflict.localVersion;
      }
      case 'remote': {
        // Keep remote version, update local
        await indexedDBManager.updatePatient(this.toLocalPatient(conflict.remoteVersion));
        return this.toLocalPatient(conflict.remoteVersion);
      }
      case 'merge': {
        // Merge both versions (last-write-wins for most fields)
        const merged = this.mergePatients(conflict.localVersion, conflict.remoteVersion);
        await indexedDBManager.updatePatient(merged);
        await this.pushPatientToServer(merged);
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

  private async pushPendingChanges(patientIds?: string[]): Promise<Partial<SyncResult>> {
    const result = { synced: 0, failed: 0, conflicts: [] as SyncConflict[] };

    try {
      const pendingOperations = await outbox.getPendingOperations();
      const patientOperations = pendingOperations.filter(op => {
        if (patientIds) {
          return patientIds.some(id =>
            op.endpoint.includes(`/patients/${id}`) ||
            (op.data && typeof op.data === 'object' && 'id' in op.data && op.data.id === id)
          );
        }
        return op.endpoint.includes('/patients');
      });

      for (const operation of patientOperations) {
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

      // Use Orval generated API for fetching patients
      const response = await listPatients({ per_page: batchSize });
      const patients = response.data;

      if (patients && patients.length > 0) {
        for (const remotePatient of patients) {
          try {
            const syncResult = await this.syncRemotePatient(remotePatient, options);
            if (syncResult.conflict) {
              result.conflicts!.push(syncResult.conflict);
            } else {
              result.synced!++;
            }
          } catch (error) {
            console.error('Failed to sync patient:', error);
            result.failed!++;
          }
        }
      }
    } catch (error) {
      console.error('Failed to pull remote changes:', error);
    }

    return result;
  }

  private async syncRemotePatient(remotePatient: OrvalPatient, options: SyncOptions): Promise<{ conflict?: SyncConflict }> {
    if (!remotePatient.id) {
      console.error('Remote patient missing ID, skipping sync');
      return {};
    }

    const localPatient = await indexedDBManager.getPatient(remotePatient.id);

    if (!localPatient) {
      // New patient from server
      await indexedDBManager.updatePatient(this.toLocalPatient(remotePatient));
      return {};
    }

    // Check for conflicts
    const hasLocalChanges = await this.hasPendingChanges(remotePatient.id);
    const isLocalNewer = new Date(localPatient.updatedAt || '') > new Date(remotePatient.updatedAt || '');

    if (hasLocalChanges || isLocalNewer) {
      // Conflict detected
      const conflict: SyncConflict = {
        patientId: remotePatient.id,
        localVersion: localPatient,
        remoteVersion: remotePatient,
        conflictType: 'update'
      };

      if (options.conflictResolution && options.conflictResolution !== 'prompt') {
        await this.resolveConflict(conflict, options.conflictResolution);
        return {};
      }

      return { conflict };
    }

    // No conflict, update local
    await indexedDBManager.updatePatient(this.toLocalPatient(remotePatient));
    return {};
  }

  private async processPendingOperation(operation: OutboxOperation): Promise<void> {
    // This would typically involve making API calls based on the operation
    // For now, we'll just log it as the actual API integration would be complex
    console.log('Processing pending operation:', operation.id, operation.method, operation.endpoint);
  }

  private async pushPatientToServer(patient: LocalPatient): Promise<void> {
    const orval = this.toOrvalPatient(patient);
    // Add operation to outbox for sync
    await outbox.addOperation({
      method: 'PUT',
      endpoint: `/api/patients/${orval.id}`,
      data: orval,
      headers: {
        'Idempotency-Key': `update-patient-${orval.id}-${Date.now()}`
      }
    });
  }

  private async pullPatientFromServer(patientId: string): Promise<void> {
    // Implementation would fetch patient from API
    // This is a placeholder for the actual API integration
    console.log('Pulling patient from server:', patientId);
  }

  private mergePatients(local: LocalPatient, remote: OrvalPatient): LocalPatient {
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
      } as LocalPatient;
    }
  }

  private toLocalPatient(remote: OrvalPatient): LocalPatient {
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
    } as LocalPatient;
  }

  private toOrvalPatient(local: LocalPatient): OrvalPatient {
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
    } as OrvalPatient;
  }

  private async updateLastSyncTime(): Promise<void> {
    try {
      await indexedDBManager.setCache(this.SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  async createPatient(patient: LocalPatient, _origin?: string): Promise<LocalPatient> {
    // 1. Save to local IndexedDB
    await indexedDBManager.updatePatient(patient);

    // 2. Add to Outbox for sync
    const orval = this.toOrvalPatient(patient);
    await outbox.addOperation({
      method: 'POST',
      endpoint: '/api/patients',
      data: orval,
      headers: {
        'Idempotency-Key': `create-patient-${patient.id}-${Date.now()}`
      }
    });

    // 3. Trigger sync if online (fire and forget)
    if (navigator.onLine) {
      this.syncPatients().catch(console.error);
    }

    return patient;
  }

  async updatePatient(patient: LocalPatient, _origin?: string): Promise<LocalPatient> {
    // 1. Update local IndexedDB
    await indexedDBManager.updatePatient(patient);

    // 2. Add to Outbox
    await this.pushPatientToServer(patient);

    // 3. Trigger sync if online
    if (navigator.onLine) {
      this.syncPatients().catch(console.error);
    }

    return patient;
  }

  async deletePatient(patientId: string, _origin?: string): Promise<void> {
    // 1. Delete from local IndexedDB
    await indexedDBManager.deletePatient(patientId);

    // 2. Add to Outbox
    await outbox.addOperation({
      method: 'DELETE',
      endpoint: `/api/patients/${patientId}`
    });

    // 3. Trigger sync if online
    if (navigator.onLine) {
      this.syncPatients().catch(console.error);
    }
  }
}

export const patientSyncService = new PatientSyncService();
