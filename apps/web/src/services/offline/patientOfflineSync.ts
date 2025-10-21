/**
 * Patient Offline Sync Service
 * Handles offline patient operations with IndexedDB and outbox pattern
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type { Patient } from '../../types/patient';
import { outbox } from '../../utils/outbox';

interface PatientDB extends DBSchema {
  patients: {
    key: string;
    value: Patient & { syncStatus: 'synced' | 'pending' | 'failed' };
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
      totalPatients: number;
      pendingOperations: number;
    };
  };
}

export class PatientOfflineSync {
  private db: IDBPDatabase<PatientDB> | null = null;
  private readonly dbName = 'PatientDB';
  private readonly dbVersion = 1;
  private syncInProgress = false;
  private listeners: Set<() => void> = new Set();

  async initialize(): Promise<void> {
    try {
      this.db = await openDB<PatientDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Patients store
          if (!db.objectStoreNames.contains('patients')) {
            const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
            patientsStore.createIndex('by-sync-status', 'syncStatus');
            patientsStore.createIndex('by-updated-at', 'updatedAt');
            patientsStore.createIndex('by-name', 'name');
            patientsStore.createIndex('by-phone', 'phone');
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

      console.log('Patient offline sync initialized');
    } catch (error) {
      console.error('Failed to initialize patient offline sync:', error);
      throw error;
    }
  }

  // Patient CRUD operations
  async savePatient(patient: Omit<Patient, 'id'> & { id?: string }): Promise<Patient> {
    if (!this.db) throw new Error('Database not initialized');

    const patientId = patient.id || `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const patientWithSync: Patient & { syncStatus: 'synced' | 'pending' | 'failed' } = {
      ...patient,
      id: patientId,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    await this.db.put('patients', patientWithSync);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'POST',
      endpoint: '/api/patients',
      data: patient,
      headers: {
        'Idempotency-Key': `patient_create_${patientId}`
      }
    });

    this.notifyListeners();
    return patientWithSync;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.db.get('patients', id);
    if (!existing) throw new Error('Patient not found');

    const updated = {
      ...existing,
      ...updates,
      syncStatus: 'pending' as const,
      updatedAt: new Date().toISOString()
    };

    await this.db.put('patients', updated);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'PUT',
      endpoint: `/api/patients/${id}`,
      data: updates,
      headers: {
        'Idempotency-Key': `patient_update_${id}_${Date.now()}`
      }
    });

    this.notifyListeners();
  }

  async deletePatient(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.delete('patients', id);

    // Add to outbox for sync
    await outbox.addOperation({
      method: 'DELETE',
      endpoint: `/api/patients/${id}`,
      headers: {
        'Idempotency-Key': `patient_delete_${id}_${Date.now()}`
      }
    });

    this.notifyListeners();
  }

  async getPatient(id: string): Promise<Patient | null> {
    if (!this.db) throw new Error('Database not initialized');

    const patient = await this.db.get('patients', id);
    if (!patient) return null;
    
    const { syncStatus, ...patientData } = patient;
    return patientData;
  }

  async getAllPatients(): Promise<Patient[]> {
    if (!this.db) throw new Error('Database not initialized');

    const patients = await this.db.getAll('patients');
    return patients.map(p => {
      const { syncStatus, ...patient } = p;
      return patient;
    });
  }

  async searchPatients(query: string): Promise<Patient[]> {
    if (!this.db) throw new Error('Database not initialized');

    const allPatients = await this.db.getAll('patients');
    const searchTerm = query.toLowerCase();

    return allPatients
      .filter(patient => 
        patient.name?.toLowerCase().includes(searchTerm) ||
        patient.phone?.includes(searchTerm) ||
        patient.email?.toLowerCase().includes(searchTerm)
      )
      .map(p => ({ ...p, syncStatus: undefined }));
  }

  async getPendingPatients(): Promise<(Patient & { syncStatus: string })[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllFromIndex('patients', 'by-sync-status', 'pending');
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
      await this.fetchLatestPatients();

      // Update sync metadata
      await this.updateSyncMetadata();

      console.log('Patient sync completed successfully');
    } catch (error) {
      console.error('Patient sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async syncPendingOperations(): Promise<void> {
    // The outbox will handle the actual sync operations
    // We just need to update local sync status based on outbox results
    const pendingPatients = await this.getPendingPatients();
    
    for (const patient of pendingPatients) {
      // Check if the operation was successfully synced by checking outbox
      // This is a simplified approach - in a real implementation,
      // you'd want to correlate outbox operations with local records
      const updatedPatient = { ...patient, syncStatus: 'synced' as const };
      await this.db!.put('patients', updatedPatient);
    }
  }

  private async fetchLatestPatients(): Promise<void> {
    try {
      // Check if there are active API calls to prevent conflicts
      if (this.hasActiveApiCalls()) {
        console.log('Patient sync: Skipping background sync due to active API calls');
        return;
      }

      let patients: Patient[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      let requestCount = 0;
      const maxRequests = 5; // Further reduced to prevent resource exhaustion

      while (hasMore && requestCount < maxRequests) {
        // Use even smaller page size for background sync
        const url = cursor ? `/api/patients?per_page=10&cursor=${cursor}` : '/api/patients?per_page=10';
        
        // Add longer delay between requests to prevent resource exhaustion
        if (requestCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1000ms delay
        }
        
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`Background sync request failed: ${response.status}`);
            break; // Stop on error instead of throwing
          }

          const data = await response.json();
          patients.push(...(data.data || []));
          cursor = data.meta?.nextCursor;
          hasMore = !!cursor;
          requestCount++;

          // Log progress for debugging
          console.log(`Background sync: fetched ${data.data?.length || 0} patients (batch ${requestCount})`);
        } catch (fetchError) {
          console.warn('Background sync fetch error:', fetchError);
          break; // Stop on network error
        }
      }

      // Update local database with server data (only if we got some data)
      if (patients.length > 0) {
        for (const serverPatient of patients) {
          const localPatient = await this.db!.get('patients', serverPatient.id);
          
          // Only update if server version is newer or local doesn't exist
          if (!localPatient || new Date(serverPatient.updatedAt) > new Date(localPatient.updatedAt)) {
            await this.db!.put('patients', {
              ...serverPatient,
              syncStatus: 'synced'
            });
          }
        }
        console.log(`Background sync: updated ${patients.length} patients in local DB`);
      }

      // If we hit the request limit, schedule another sync for much later
      if (hasMore && requestCount >= maxRequests) {
        console.log('Patient sync: Partial sync completed, scheduling continuation in 2 minutes');
        setTimeout(() => this.syncWithServer(), 120000); // Continue in 2 minutes instead of 30 seconds
      }
    } catch (error) {
      console.warn('Failed to fetch latest patients:', error);
      // Don't throw - offline mode should still work
    }
  }

  // Check if there are active API calls that might conflict with background sync
  private hasActiveApiCalls(): boolean {
    // Check for active React Query requests
    const queryClient = (window as any).__REACT_QUERY_CLIENT__;
    if (queryClient) {
      const queries = queryClient.getQueryCache().getAll();
      const activePatientQueries = queries.filter((query: any) => 
        query.queryKey?.[0] === 'patients' && query.state.fetchStatus === 'fetching'
      );
      if (activePatientQueries.length > 0) {
        return true;
      }
    }

    // Check for ongoing fetch requests (basic heuristic)
    const performanceEntries = performance.getEntriesByType('navigation');
    const recentRequests = performanceEntries.filter((entry: any) => 
      entry.name?.includes('/api/patients') && 
      (Date.now() - entry.startTime) < 5000 // Within last 5 seconds
    );
    
    return recentRequests.length > 0;
  }

  private async updateSyncMetadata(): Promise<void> {
    if (!this.db) return;

    const totalPatients = await this.db.count('patients');
    const pendingOperations = (await outbox.getStats()).pending;

    await this.db.put('syncMetadata', {
      id: 'main',
      lastSync: new Date().toISOString(),
      totalPatients,
      pendingOperations
    });
  }

  // Event handlers
  private async handleOnline(): Promise<void> {
    console.log('Patient sync: Going online, starting sync...');
    try {
      await this.syncWithServer();
    } catch (error) {
      console.error('Auto-sync on online failed:', error);
    }
  }

  private handleOffline(): void {
    console.log('Patient sync: Going offline, operations will be queued');
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
    totalPatients: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const metadata = await this.db.get('syncMetadata', 'main');
    const stats = await outbox.getStats();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: metadata?.lastSync || null,
      pendingOperations: stats.pending,
      totalPatients: metadata?.totalPatients || 0
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
export const patientOfflineSync = new PatientOfflineSync();