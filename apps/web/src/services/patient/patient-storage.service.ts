import { Patient, PatientFilters, PatientSearchResult } from '../../types/patient';
import { indexedDBManager } from '../../utils/indexeddb';

/**
 * Patient Storage Service
 * Handles IndexedDB operations for patient data with offline-first approach
 * Follows 500 LOC limit and single responsibility principle
 */
export class PatientStorageService {
  private readonly CACHE_KEY_PREFIX = 'patient_';

  constructor() {
    // Initialize IndexedDB manager
    this.init();
  }

  /**
   * Initialize IndexedDB for patient storage
   */
  async init(): Promise<void> {
    await indexedDBManager.init();
  }

  /**
   * Store patients in IndexedDB
   */
  async storePatients(patients: Patient[]): Promise<void> {
    await indexedDBManager.savePatients(patients);
  }

  /**
   * Get all patients from IndexedDB
   */
  async getAllPatients(): Promise<Patient[]> {
    return await indexedDBManager.getPatients();
  }

  /**
   * Get patient by ID from IndexedDB
   */
  async getPatientById(id: string): Promise<Patient | null> {
    const patients = await this.getAllPatients();
    return patients.find(p => p.id === id) || null;
  }

  /**
   * Search patients with filters
   */
  async searchPatients(filters: PatientFilters): Promise<PatientSearchResult> {
    const allPatients = await this.getAllPatients();
    let filteredPatients = allPatients;

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredPatients = filteredPatients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm) ||
        patient.phone.includes(searchTerm) ||
        patient.tcNumber?.includes(searchTerm) ||
        patient.email?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (filters.status) {
      filteredPatients = filteredPatients.filter(patient => patient.status === filters.status);
    }

    // Apply segment filter
    if (filters.segment) {
      filteredPatients = filteredPatients.filter(patient => patient.segment === filters.segment);
    }

    // Apply label filter
    if (filters.label) {
      filteredPatients = filteredPatients.filter(patient => patient.label === filters.label);
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filteredPatients = filteredPatients.filter(patient =>
        filters.tags!.some(tag => patient.tags.includes(tag))
      );
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

    return {
      patients: paginatedPatients,
      total: filteredPatients.length,
      page,
      pageSize: limit,
      hasMore: endIndex < filteredPatients.length
    };
  }

  /**
   * Update patient in IndexedDB
   */
  async updatePatient(patient: Patient): Promise<void> {
    const patients = await this.getAllPatients();
    const index = patients.findIndex(p => p.id === patient.id);
    
    if (index >= 0) {
      patients[index] = { ...patient, updatedAt: new Date().toISOString() };
    } else {
      patients.push({ ...patient, updatedAt: new Date().toISOString() });
    }
    
    await this.storePatients(patients);
  }

  /**
   * Delete patient from IndexedDB
   */
  async deletePatient(id: string): Promise<void> {
    const patients = await this.getAllPatients();
    const filteredPatients = patients.filter(p => p.id !== id);
    await this.storePatients(filteredPatients);
  }

  /**
   * Clear all patients from IndexedDB
   */
  async clearAllPatients(): Promise<void> {
    await this.storePatients([]);
  }

  /**
   * Get patient count
   */
  async getPatientCount(): Promise<number> {
    const patients = await this.getAllPatients();
    return patients.length;
  }

  /**
   * Check if patient exists
   */
  async patientExists(id: string): Promise<boolean> {
    const patient = await this.getPatientById(id);
    return patient !== null;
  }

  /**
   * Cache patient data with TTL
   */
  async cachePatientData(key: string, data: unknown, ttl?: number): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
    await indexedDBManager.setCache(cacheKey, data, ttl);
  }

  /**
   * Get cached patient data
   */
  async getCachedPatientData(key: string): Promise<unknown | null> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
    return await indexedDBManager.getCache(cacheKey);
  }

  /**
   * Clear cached patient data
   */
  async clearCachedPatientData(key: string): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
    await indexedDBManager.deleteCache(cacheKey);
  }
}