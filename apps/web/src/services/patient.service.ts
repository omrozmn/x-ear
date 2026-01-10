import {
  PatientFilters,
  PatientSearchResult,
  PatientStats,
  PatientDevice,
  PatientNote,
  PatientMatchCandidate,
  PatientMatchRequest,
  Communication,
  Patient
} from '../types/patient';
import {
  PatientRead as OrvalPatient,
  ResponseEnvelopeListPatientRead,
  ResponseEnvelopePatientRead
} from "@/api/generated/schemas";
import {
  listPatients,
  getPatient,
  createPatients,
  updatePatient,
  deletePatient
} from "@/api/generated";
import { outbox } from '../utils/outbox';
import { PATIENTS_DATA } from '../constants/storage-keys';
import { indexedDBManager } from '../utils/indexeddb';
import { AxiosResponse } from 'axios';
import { PatientService as CorePatientService } from '@x-ear/core';
import { convertOrvalToLegacyPatient } from '../types/patient/patient-adapter';

export class PatientService {
  private patients: Patient[] = [];
  private initialized = false;

  constructor() {
    // Don't initialize in constructor - wait for first use
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    // Initialize IndexedDB
    await indexedDBManager.init();

    await this.loadPatients();
    this.initialized = true;

    // Listen for storage changes (localStorage fallback only)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  // Ensure initialization before any operation
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === PATIENTS_DATA) {
      this.loadPatients();
    }
  }

  // Data persistence
  private async loadPatients(): Promise<void> {
    // First try to load from IndexedDB cache
    try {
      const cachedPatients = await indexedDBManager.getPatients();
      if (cachedPatients.length > 0) {
        this.patients = cachedPatients;

        // Optionally refresh from API in background
        this.refreshFromAPI().catch(error =>
          console.warn('Background API refresh failed:', error)
        );
        return;
      }
    } catch (error) {
      console.warn('Failed to load from IndexedDB, trying API:', error);
    }

    // If no cache, load from API regardless of manual token check. 
    // The apiClient interceptor handles auth headers and 401 retries automatically.
    try {
      await this.refreshFromAPI();
    } catch (err) {
      console.warn('Patient API refresh attempt failed', err);
    }
  }

  private async refreshFromAPI(): Promise<void> {
    // Try to page through backend API and aggregate patients into IndexedDB cache.
    // If anything fails, fall back to localStorage.
    try {
      const aggregated: Patient[] = [];
      let cursor: string | undefined;
      const perPage = 100;

      // Use cursor-based pagination for better performance with large datasets
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Call generated API client with proper typing
        const params: any = { per_page: perPage };
        if (cursor) {
          params.cursor = cursor;
        }


        // Orval's customInstance now returns the data directly (unwrapped)
        const payload = await listPatients(params);
        if (!payload || !Array.isArray(payload.data)) break;

        const chunk = payload.data || [];
        // Map Orval patient to local patient (handle nulls)
        const mappedChunk = chunk.map(p => ({
          ...p,
          tcNumber: p.tcNumber ?? undefined
        }));
        aggregated.push(...mappedChunk as any);

        // Check if there are more pages using cursor-based pagination
        // ResponseEnvelopeListPatientRead has 'meta' for pagination info
        const meta = payload.meta;
        if (!meta?.hasNext || !meta?.nextCursor) {
          break;
        }

        cursor = meta.nextCursor;

        // Safety check to prevent infinite loops
        if (chunk.length === 0) break;
      }

      if (aggregated.length > 0) {
        // Use Patient directly
        this.patients = aggregated;

        // Cache in IndexedDB
        await indexedDBManager.savePatients(aggregated as any);
      }
    } catch (error) {
      console.warn('API refresh failed, trying localStorage fallback:', error);

      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(PATIENTS_DATA);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.patients = Array.isArray(parsed) ? parsed : [];
        }
      } catch (fallbackError) {
        console.error('Both API and localStorage failed:', fallbackError);
        this.patients = [];
      }
    }
  }

  private async savePatients(): Promise<void> {
    try {
      // Save to IndexedDB as primary cache
      await indexedDBManager.savePatients(this.patients);

      // Keep a small fallback in localStorage (just metadata, not full data)
      const metadata = {
        count: this.patients.length,
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      await indexedDBManager.saveFallbackToLocalStorage(PATIENTS_DATA + '_meta', metadata);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('patients:updated', {
        detail: { patients: this.patients }
      }));
    } catch (error) {
      console.error('Failed to save patients to IndexedDB:', error);

      // Emergency fallback to localStorage (should be avoided)
      try {
        await indexedDBManager.saveFallbackToLocalStorage(PATIENTS_DATA, this.patients);
        console.warn('Used localStorage emergency fallback for patient data');
      } catch (fallbackError) {
        console.error('Failed to save patients even to localStorage fallback:', fallbackError);
      }
    }
  }

  // CRUD Operations
  async createPatient(patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    await this.ensureInitialized();
    try {

      // Validate required fields (TC number is optional per DB schema)
      if (!patientData.firstName?.trim()) {
        throw new Error('First name is required');
      }
      if (!patientData.lastName?.trim()) {
        throw new Error('Last name is required');
      }
      if (!patientData.phone?.trim()) {
        throw new Error('Patient phone is required');
      }

      // Validate TC number if provided
      if (patientData.tcNumber) {
        const isValidTc = await this.validateTcNumber(patientData.tcNumber);
        if (!isValidTc) {
          throw new Error('TC number already exists');
        }
      }

      // **CRITICAL: POST to backend API first!**
      const response = await createPatients(patientData as any) as any;

      // Extract data from wrapper if it exists, otherwise use response directly
      const userData = response?.data || response;
      const success = response?.success ?? (!!userData);

      if (!success || !userData) {
        throw new Error(response?.error || response?.message || 'Failed to create patient on server');
      }

      const createdPatient = convertOrvalToLegacyPatient(userData);

      // Update local cache
      this.patients.push(createdPatient);
      this.savePatients();

      // Dispatch events for UI update
      window.dispatchEvent(new CustomEvent('patient:created', {
        detail: { patient: createdPatient }
      }));

      return createdPatient;
    } catch (error) {
      console.error('Failed to create patient:', error);
      throw error instanceof Error ? error : new Error('Failed to create patient');
    }
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | null> {
    await this.ensureInitialized();
    try {

      if (!id?.trim()) {
        throw new Error('Patient ID is required');
      }

      const index = this.patients.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Patient not found');
      }

      // Validate TC number if being updated
      if (updates.tcNumber && updates.tcNumber !== this.patients[index].tcNumber) {
        const isValidTc = await this.validateTcNumber(updates.tcNumber, id);
        if (!isValidTc) {
          throw new Error('TC number already exists');
        }
      }

      // **CRITICAL: PUT to backend API first!**
      const response = await updatePatient(id, updates as any) as any;

      // Extract data from wrapper if it exists, otherwise use response directly
      const userData = response?.data || response;
      const success = response?.success ?? (!!userData);

      if (!success || !userData) {
        throw new Error(response?.error || response?.message || 'Failed to update patient on server');
      }

      const updatedPatient = convertOrvalToLegacyPatient(userData);

      // Update local cache
      this.patients[index] = updatedPatient;
      this.savePatients();

      // Dispatch events for UI update
      window.dispatchEvent(new CustomEvent('patient:updated', {
        detail: { patient: updatedPatient }
      }));

      return updatedPatient;
    } catch (error) {
      console.error('Failed to update patient:', error);
      throw error instanceof Error ? error : new Error('Failed to update patient');
    }
  }

  async deletePatient(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {

      if (!id?.trim()) {
        throw new Error('Patient ID is required');
      }

      const index = this.patients.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Patient not found');
      }

      const patient = this.patients[index];

      // **CRITICAL: DELETE from backend API first!**
      const response = await deletePatient(id) as any;
      const success = response?.success ?? (response?.status === 200 || response?.status === 204 || !!response);

      if (!success) {
        throw new Error(response?.error || response?.message || 'Failed to delete patient from server');
      }

      // Remove from local cache
      this.patients.splice(index, 1);
      this.savePatients();

      // Dispatch events for UI update
      window.dispatchEvent(new CustomEvent('patient:deleted', {
        detail: { id, patient }
      }));

      return true;
    } catch (error) {
      console.error('Failed to delete patient:', error);
      throw error instanceof Error ? error : new Error('Failed to delete patient');
    }
  }

  // Query operations
  async getPatient(id: string): Promise<Patient | null> {
    await this.ensureInitialized();
    try {

      if (!id?.trim()) {
        return null;
      }

      return this.patients.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Failed to get patient:', error);
      return null;
    }
  }

  async getPatients(filters: PatientFilters = {}): Promise<PatientSearchResult> {
    await this.ensureInitialized();
    try {

      let filteredPatients = [...this.patients];

      // Apply filters with error handling
      if (filters.search?.trim()) {
        const searchLower = filters.search.toLowerCase();
        filteredPatients = filteredPatients.filter(p =>
          (p.firstName && p.firstName.toLowerCase().includes(searchLower)) ||
          (p.lastName && p.lastName.toLowerCase().includes(searchLower)) ||
          p.phone.includes(filters.search!) ||
          (p.tcNumber && p.tcNumber.includes(filters.search!)) ||
          (p.email && p.email && p.email.toLowerCase().includes(searchLower))
        );
      }

      if (filters.status) {
        filteredPatients = filteredPatients.filter(p => p.status === filters.status);
      }

      if (filters.segment) {
        filteredPatients = filteredPatients.filter(p => p.segment === filters.segment);
      }

      if (filters.acquisitionType) {
        filteredPatients = filteredPatients.filter(p => p.acquisitionType === filters.acquisitionType);
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredPatients = filteredPatients.filter(p =>
          p.tags && filters.tags!.some(tag => p.tags!.includes(tag))
        );
      }

      if (filters.dateRange) {
        try {
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          filteredPatients = filteredPatients.filter(p => {
            const created = p.createdAt ? new Date(p.createdAt) : new Date(0);
            return created >= start && created <= end;
          });
        } catch (error) {
          console.warn('Invalid date range filter:', error);
        }
      }

      // Sort by creation date (newest first)
      filteredPatients.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      // Apply pagination
      const page = filters.page || 1;
      const pageSize = filters.limit || 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedPatients = filteredPatients.slice(startIndex, endIndex);
      const hasMore = endIndex < filteredPatients.length;

      return {
        patients: paginatedPatients,
        total: filteredPatients.length,
        page: page,
        pageSize: pageSize,
        hasMore: hasMore
      };
    } catch (error) {
      console.error('Failed to get patients:', error);
      return {
        patients: [],
        total: 0,
        page: 1,
        pageSize: 0,
        hasMore: false
      };
    }
  }

  async getPatientStats(): Promise<PatientStats> {
    await this.ensureInitialized();
    try {

      const stats: PatientStats = {
        total: this.patients.length,
        byStatus: {},
        bySegment: {}
      };

      this.patients.forEach(patient => {
        try {
          // Status counts
          if (patient.status) {
            stats.byStatus[patient.status] = (stats.byStatus[patient.status] || 0) + 1;
          }

          // Segment counts
          if (patient.segment) {
            stats.bySegment[patient.segment] = (stats.bySegment[patient.segment] || 0) + 1;
          }
        } catch (error) {
          console.warn('Error processing patient stats for patient:', patient.id, error);
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get patient stats:', error);
      // Return empty stats on error
      return {
        total: 0,
        byStatus: {},
        bySegment: {}
      };
    }
  }

  // Patient matching for OCR/document processing
  async findMatches(request: PatientMatchRequest): Promise<PatientMatchCandidate[]> {
    await this.init();

    const candidates: PatientMatchCandidate[] = [];

    for (const patient of this.patients) {
      const matchResult = this.calculatePatientMatch(request, patient);
      if (matchResult.score > 0.3) { // Minimum threshold
        candidates.push(matchResult);
      }
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, 10); // Return top 10 matches
  }

  private calculatePatientMatch(request: PatientMatchRequest, patient: Patient): PatientMatchCandidate {
    let score = 0;
    const matchedFields: string[] = [];

    // Exact TC number match (highest priority)
    if (request.tcNo && patient.tcNumber && request.tcNo === patient.tcNumber) {
      score += 0.8;
      matchedFields.push('tcNumber');
    }

    // Name similarity
    if (request.name && (patient.firstName || patient.lastName)) {
      const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      const nameSimilarity = this.calculateStringSimilarity(request.name, patientName);
      if (nameSimilarity > 0.6) {
        score += nameSimilarity * 0.4;
        matchedFields.push('name');
      }
    }

    // Birth date match
    if (request.birthDate && patient.birthDate) {
      if (request.birthDate === patient.birthDate) {
        score += 0.3;
        matchedFields.push('birthDate');
      }
    }

    // Phone number match
    if (request.phone && patient.phone) {
      const phoneSimilarity = this.calculateStringSimilarity(request.phone, patient.phone);
      if (phoneSimilarity > 0.8) {
        score += phoneSimilarity * 0.2;
        matchedFields.push('phone');
      }
    }

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (score >= 0.8) confidence = 'high';
    else if (score >= 0.6) confidence = 'medium';

    return {
      patient,
      score,
      matchedFields,
      confidence
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Utility methods
  private generateId(): string {
    return `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async validateTcNumber(tcNumber: string, excludePatientId?: string): Promise<boolean> {
    try {
      await this.init();

      if (!tcNumber?.trim()) {
        return false;
      }

      // Basic TC number validation (11 digits)
      if (!/^\d{11}$/.test(tcNumber)) {
        return false;
      }

      // Check for duplicates
      return !this.patients.some(p =>
        p.tcNumber === tcNumber && p.id !== excludePatientId
      );
    } catch (error) {
      console.error('Failed to validate TC number:', error);
      return false;
    }
  }

  // Bulk operations
  async bulkUpdatePatients(updates: Array<{ id: string; data: Partial<Patient> }>): Promise<Patient[]> {
    const updatedPatients: Patient[] = [];
    const errors: string[] = [];

    for (const update of updates) {
      try {
        if (!update.id?.trim()) {
          errors.push('Missing patient ID in bulk update');
          continue;
        }

        const patient = await this.updatePatient(update.id, update.data);
        if (patient) {
          updatedPatients.push(patient);
        }
      } catch (error) {
        errors.push(`Failed to update patient ${update.id}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Bulk update errors:', errors);
    }

    return updatedPatients;
  }

  // Export/Import
  async exportPatients(): Promise<string> {
    try {
      await this.init();
      return JSON.stringify(this.patients, null, 2);
    } catch (error) {
      console.error('Failed to export patients:', error);
      throw new Error('Failed to export patients');
    }
  }

  async importPatients(data: string): Promise<{ success: number; errors: string[] }> {
    try {
      await this.init();

      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid data format');
      }

      const results = { success: 0, errors: [] as string[] };

      for (const patientData of parsed) {
        try {
          await this.createPatient(patientData);
          results.success++;
        } catch (error) {
          results.errors.push(`Failed to import patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Bulk Upload (New P1 Feature)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async bulkUploadPatients(file: File): Promise<{ processed: number; success: number; errors: any[] }> {
    await this.ensureInitialized();
    try {
      // Use Orval-generated function
      const { bulkUploadPatients: bulkUploadPatientsApi } = await import('@/api/generated/patients/patients');
      const response = await bulkUploadPatientsApi({ file });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = response as any;

      // Refresh local cache after bulk upload
      await this.refreshFromAPI();

      return {
        success: result?.data?.success || false,
        processed: (result?.data?.created || 0) + (result?.data?.updated || 0),
        errors: result?.data?.errors || []
      };
    } catch (error) {
      console.error('Bulk upload failed:', error);
      throw error;
    }
  }

  /**
   * Calculate priority score for a patient
   */
  calculatePriorityScore(patient: Patient): number {
    let score = 0;

    // Age factor (elderly patients get higher priority)
    if (patient.birthDate) {
      const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
      if (age >= 65) score += 20;
      else if (age >= 50) score += 10;
    }

    // Missing information penalty
    if (!patient.phone || !patient.email) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Add a note to a patient
   */
  addNote(patient: Patient, note: Omit<PatientNote, 'id'>): Patient {
    const newNote: PatientNote = {
      ...note,
      id: this.generateId()
    };

    return {
      ...patient,
      notes: [...(patient.notes || []), newNote]
    };
  }

  /**
   * Update a device for a patient
   */
  updateDevice(patient: Patient, deviceId: string, updates: Partial<PatientDevice>): Patient {
    const devices = patient.devices || [];
    const updatedDevices = devices.map(device =>
      device.id === deviceId ? { ...device, ...updates } : device
    );

    return {
      ...patient,
      devices: updatedDevices
    };
  }

  /**
   * Add communication to a patient
   */
  addCommunication(patient: Patient, communication: Omit<Communication, 'id'>): Patient {
    const newCommunication = {
      ...communication,
      id: this.generateId(),
      date: communication.timestamp || new Date().toISOString()
    };

    return {
      ...patient,
      communications: [...(patient.communications || []), newCommunication]
    };
  }

  /**
   * Add device to a patient
   */
  addDevice(patient: Patient, device: Omit<PatientDevice, 'id'>): Patient {
    const newDevice: PatientDevice = {
      ...device,
      id: this.generateId()
    };

    return {
      ...patient,
      devices: [...(patient.devices || []), newDevice]
    };
  }

  /**
   * Get high priority patients
   */
  async getHighPriorityPatients(): Promise<Patient[]> {
    const allPatients = await this.getPatients();
    return allPatients.patients
      .filter(patient => this.calculatePriorityScore(patient) >= 50)
      .sort((a, b) => this.calculatePriorityScore(b) - this.calculatePriorityScore(a));
  }

  /**
   * Reset service state - clears in-memory cache and IndexedDB
   * MUST be called when user switches roles or tenants to prevent data leakage
   */
  async reset(): Promise<void> {
    // Clearing all patient cache for tenant isolation

    // Clear in-memory cache
    this.patients = [];
    this.initialized = false;

    // Clear IndexedDB
    try {
      await indexedDBManager.clearAll();
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
  }
}

// Singleton instance
export const patientService = new PatientService();

