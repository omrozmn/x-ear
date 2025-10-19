// IndexedDB utility for patient data caching
// Replaces localStorage usage to comply with rule: "Large data/binary in localStorage ❌"

import { Patient } from '../types/patient';

const DB_NAME = 'XEarPatientDB';
const DB_VERSION = 1;
const PATIENTS_STORE = 'patients';
const CACHE_STORE = 'cache';

interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create patients store
        if (!db.objectStoreNames.contains(PATIENTS_STORE)) {
          const patientsStore = db.createObjectStore(PATIENTS_STORE, { keyPath: 'id' });
          patientsStore.createIndex('tcNumber', 'tcNumber', { unique: false });
          patientsStore.createIndex('status', 'status', { unique: false });
          patientsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create cache store for general caching
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    return this.db;
  }

  // Patient-specific methods
  async savePatients(patients: Patient[]): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PATIENTS_STORE], 'readwrite');
    const store = transaction.objectStore(PATIENTS_STORE);

    // Clear existing patients
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Add new patients
    for (const patient of patients) {
      await new Promise<void>((resolve, reject) => {
        const addRequest = store.add(patient);
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getPatients(): Promise<Patient[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PATIENTS_STORE], 'readonly');
    const store = transaction.objectStore(PATIENTS_STORE);

    return new Promise<Patient[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPatient(id: string): Promise<Patient | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PATIENTS_STORE], 'readonly');
    const store = transaction.objectStore(PATIENTS_STORE);

    return new Promise<Patient | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePatient(patient: Patient): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PATIENTS_STORE], 'readwrite');
    const store = transaction.objectStore(PATIENTS_STORE);

    return new Promise<void>((resolve, reject) => {
      const request = store.put(patient);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deletePatient(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([PATIENTS_STORE], 'readwrite');
    const store = transaction.objectStore(PATIENTS_STORE);

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // General cache methods
  async setCache(key: string, data: unknown, ttl?: number): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE);

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl
    };

    return new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(key: string): Promise<unknown | null> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CACHE_STORE], 'readonly');
    const store = transaction.objectStore(CACHE_STORE);

    return new Promise<unknown | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
          // Expired, delete and return null
          this.deleteCache(key);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction([CACHE_STORE], 'readwrite');
    const store = transaction.objectStore(CACHE_STORE);

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Fallback to localStorage for critical UI state only
  async fallbackToLocalStorage(key: string): Promise<unknown | null> {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to read from localStorage fallback:', error);
      return null;
    }
  }

  async saveFallbackToLocalStorage(key: string, data: unknown): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage fallback:', error);
    }
  }
}

export const indexedDBManager = new IndexedDBManager();