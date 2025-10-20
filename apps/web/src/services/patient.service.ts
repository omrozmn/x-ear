import { 
  Patient, 
  PatientFilters, 
  PatientSearchResult, 
  PatientStats, 
  PatientDevice, 
  PatientNote,
  PatientMatchCandidate,
  PatientMatchRequest,
  Communication
} from '../types/patient';
import { outbox } from '../utils/outbox';
import { PATIENTS_DATA } from '../constants/storage-keys';
import { 
  patientsGetPatients, 
  PatientsGetPatients200,
  Patient as OrvalPatient,
  PaginationInfo
} from '../generated/orval-api';
import { indexedDBManager } from '../utils/indexeddb';
import { AxiosResponse } from 'axios';
import { convertOrvalPatient } from './patient/patient-mappers';

export class PatientService {
  private patients: Patient[] = [];
  private initialized = false;

  constructor() {
    this.init();
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
        console.log(`📦 Loaded ${cachedPatients.length} patients from IndexedDB cache`);
        
        // Optionally refresh from API in background
        this.refreshFromAPI().catch(error => 
          console.warn('Background API refresh failed:', error)
        );
        return;
      }
    } catch (error) {
      console.warn('Failed to load from IndexedDB, trying API:', error);
    }

    // If no cache, load from API
    await this.refreshFromAPI();
  }

  private async refreshFromAPI(): Promise<void> {
    // Try to page through backend API and aggregate patients into IndexedDB cache.
    // If anything fails, fall back to localStorage.
    try {
      const aggregated: OrvalPatient[] = [];
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
        
        // eslint-disable-next-line no-await-in-loop
        const resp: AxiosResponse<PatientsGetPatients200> = await patientsGetPatients(params).catch((e: any) => { throw e; });
        const payload = resp?.data;
        if (!payload || !Array.isArray(payload.data)) break;

        const chunk = payload.data;
        aggregated.push(...chunk);

        // Check if there are more pages using cursor-based pagination
        const pagination = payload.pagination;
        if (!pagination?.hasNext || !pagination?.nextCursor) {
          break;
        }
        
        cursor = pagination.nextCursor;
        
        // Safety check to prevent infinite loops
        if (chunk.length === 0) break;
      }

      if (aggregated.length > 0) {
        // Convert OrvalPatient[] to Patient[] and cache
        const patients = aggregated.map(p => convertOrvalPatient(p as any));
        this.patients = patients;
        
        // Cache in IndexedDB
        await indexedDBManager.savePatients(patients);
        console.log(`🔄 Refreshed ${patients.length} patients from API and cached in IndexedDB`);
      }
    } catch (error) {
      console.warn('API refresh failed, trying localStorage fallback:', error);
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(PATIENTS_DATA);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.patients = Array.isArray(parsed) ? parsed : [];
          console.log(`📦 Loaded ${this.patients.length} patients from localStorage fallback`);
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

  private normalizePatientData(): void {
    this.patients = this.patients.map(patient => ({
      ...patient,
      name: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed Patient',
      tags: Array.isArray(patient.tags) ? patient.tags : [],
      devices: Array.isArray(patient.devices) ? patient.devices : [],
      notes: Array.isArray(patient.notes) ? patient.notes : [],
      communications: Array.isArray(patient.communications) ? patient.communications : [],
      reports: Array.isArray(patient.reports) ? patient.reports : [],
      ereceiptHistory: Array.isArray(patient.ereceiptHistory) ? patient.ereceiptHistory : [],
      sgkInfo: patient.sgkInfo || { hasInsurance: false },
      priorityScore: patient.priorityScore || this.calculatePriorityScore(patient)
    }));
  }

  // CRUD Operations
  async createPatient(patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> {
    try {
      await this.init();

      // Validate required fields
      if (!patientData.name?.trim()) {
        throw new Error('Patient name is required');
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

      // Validate SGK status if provided
      if (patientData.sgkStatus && !['pending', 'approved', 'rejected', 'paid'].includes(patientData.sgkStatus)) {
        throw new Error('Invalid SGK status format');
      }

      const patient: Patient = {
        id: this.generateId(),
        ...patientData,
        name: patientData.name || `${patientData.firstName || ''} ${patientData.lastName || ''}`.trim() || 'Unnamed Patient',
        tags: patientData.tags || [],
        devices: patientData.devices || [],
        notes: patientData.notes || [],
        communications: patientData.communications || [],
        reports: patientData.reports || [],
        ereceiptHistory: patientData.ereceiptHistory || [],
        sgkInfo: patientData.sgkInfo || { hasInsurance: false },
  priorityScore: this.calculatePriorityScore(patientData as any as Patient),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.patients.push(patient);
      this.savePatients();

      // Queue for sync
      try {
        await outbox.addOperation({
          method: 'POST',
          endpoint: '/api/patients',
          data: patient,
          priority: 'high'
        });
      } catch (error) {
        console.warn('Failed to queue patient creation for sync:', error);
      }

      // Dispatch events
      window.dispatchEvent(new CustomEvent('patient:created', {
        detail: { patient }
      }));

      return patient;
    } catch (error) {
      console.error('Failed to create patient:', error);
      throw error instanceof Error ? error : new Error('Failed to create patient');
    }
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient | null> {
    try {
      await this.init();

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

      const oldPatient = { ...this.patients[index] };
      const updatedPatient: Patient = {
        ...this.patients[index],
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
        priorityScore: this.calculatePriorityScore({
          ...this.patients[index],
          ...updates
        } as Patient)
      };

      this.patients[index] = updatedPatient;
      this.savePatients();

      // Queue for sync with If-Match header for optimistic locking
      try {
        await outbox.addOperation({
          method: 'PUT',
          endpoint: `/api/patients/${id}`,
          data: updates,
          headers: {
            'If-Match': oldPatient.updatedAt || new Date().toISOString()
          },
          priority: 'high'
        });
      } catch (error) {
        console.warn('Failed to queue patient update for sync:', error);
      }

      // Dispatch events
      window.dispatchEvent(new CustomEvent('patient:updated', {
        detail: { patient: updatedPatient, oldPatient, changes: updates }
      }));

      return updatedPatient;
    } catch (error) {
      console.error('Failed to update patient:', error);
      throw error instanceof Error ? error : new Error('Failed to update patient');
    }
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      await this.init();

      if (!id?.trim()) {
        throw new Error('Patient ID is required');
      }

      const index = this.patients.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Patient not found');
      }

      const patient = this.patients[index];
      this.patients.splice(index, 1);
      this.savePatients();

      // Queue for sync
      try {
        await outbox.addOperation({
          method: 'DELETE',
          endpoint: `/api/patients/${id}`,
          priority: 'normal'
        });
      } catch (error) {
        console.warn('Failed to queue patient deletion for sync:', error);
      }

      // Dispatch events
      window.dispatchEvent(new CustomEvent('patient:deleted', {
        detail: { patient }
      }));

      return true;
    } catch (error) {
      console.error('Failed to delete patient:', error);
      throw error instanceof Error ? error : new Error('Failed to delete patient');
    }
  }

  // Query operations
  async getPatient(id: string): Promise<Patient | null> {
    try {
      await this.init();
      
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
    try {
      await this.init();

      let filteredPatients = [...this.patients];

      // Apply filters with error handling
      if (filters.search?.trim()) {
        const searchLower = filters.search.toLowerCase();
        filteredPatients = filteredPatients.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.phone.includes(filters.search!) ||
          (p.tcNumber && p.tcNumber.includes(filters.search!)) ||
          (p.email && p.email.toLowerCase().includes(searchLower))
        );
      }

      if (filters.status) {
        filteredPatients = filteredPatients.filter(p => p.status === filters.status);
      }

      if (filters.segment) {
        filteredPatients = filteredPatients.filter(p => p.segment === filters.segment);
      }

      if (filters.label) {
        filteredPatients = filteredPatients.filter(p => p.label === filters.label);
      }

      if (filters.acquisitionType) {
        filteredPatients = filteredPatients.filter(p => p.acquisitionType === filters.acquisitionType);
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredPatients = filteredPatients.filter(p =>
          filters.tags!.some(tag => p.tags.includes(tag))
        );
      }

      if (filters.hasDevices !== undefined) {
        filteredPatients = filteredPatients.filter(p =>
          filters.hasDevices ? p.devices.length > 0 : p.devices.length === 0
        );
      }

      if (filters.sgkStatus) {
        filteredPatients = filteredPatients.filter(p => p.sgkStatus === filters.sgkStatus);
      }

      if (filters.priorityScore) {
        filteredPatients = filteredPatients.filter(p => {
          const score = p.priorityScore || 0;
          return (!filters.priorityScore!.min || score >= filters.priorityScore!.min) &&
                 (!filters.priorityScore!.max || score <= filters.priorityScore!.max);
        });
      }

      if (filters.dateRange) {
        try {
          const start = new Date(filters.dateRange.start);
          const end = new Date(filters.dateRange.end);
          filteredPatients = filteredPatients.filter(p => {
            const created = new Date(p.createdAt);
            return created >= start && created <= end;
          });
        } catch (error) {
          console.warn('Invalid date range filter:', error);
        }
      }

      // Sort by priority score (high to low) and then by name
      filteredPatients.sort((a, b) => {
        const scoreDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        // Add null check for name property
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'tr');
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
    try {
      await this.init();

      const stats: PatientStats = {
        total: this.patients.length,
        byStatus: { active: 0, inactive: 0, archived: 0 },
        bySegment: { new: 0, trial: 0, purchased: 0, control: 0, renewal: 0 },
        byLabel: {
          'yeni': 0,
          'arama-bekliyor': 0,
          'randevu-verildi': 0,
          'deneme-yapildi': 0,
          'kontrol-hastasi': 0,
          'satis-tamamlandi': 0
        },
        highPriority: 0,
        withDevices: 0,
        sgkPending: 0,
        overduePayments: 0
      };

      this.patients.forEach(patient => {
        try {
          // Status counts
          if (patient.status in stats.byStatus) {
            stats.byStatus[patient.status]++;
          }

          // Segment counts
          if (patient.segment in stats.bySegment) {
            stats.bySegment[patient.segment]++;
          }

          // Label counts
          if (patient.label in stats.byLabel) {
            stats.byLabel[patient.label]++;
          }

          // High priority (score >= 80)
          if ((patient.priorityScore || 0) >= 80) {
            stats.highPriority++;
          }

          // With devices
          if (patient.devices && patient.devices.length > 0) {
            stats.withDevices++;
          }

          // SGK pending
          if (patient.sgkStatus === 'pending') {
            stats.sgkPending++;
          }

          // Overdue payments (simplified check)
          if (patient.installments && patient.installments.some(i => 
            i.status === 'overdue' || (i.dueDate && new Date(i.dueDate) < new Date() && i.status === 'pending')
          )) {
            stats.overduePayments++;
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
        byStatus: { active: 0, inactive: 0, archived: 0 },
        bySegment: { new: 0, trial: 0, purchased: 0, control: 0, renewal: 0 },
        byLabel: {
          'yeni': 0,
          'arama-bekliyor': 0,
          'randevu-verildi': 0,
          'deneme-yapildi': 0,
          'kontrol-hastasi': 0,
          'satis-tamamlandi': 0
        },
        highPriority: 0,
        withDevices: 0,
        sgkPending: 0,
        overduePayments: 0
      };
    }
  }

  // Priority system
  calculatePriorityScore(patient: Patient): number {
    let score = 0;

    // Device trial without purchase (high priority)
    if (patient.deviceTrial && patient.priceGiven && !patient.purchased) {
      score += 100;
    }

    // Days since last contact
    if (patient.lastContactDate) {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(patient.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceContact > 30) score += Math.min(daysSinceContact, 50);
    }

    // Missed appointments
    if (patient.missedAppointments && patient.missedAppointments > 0) {
      score += patient.missedAppointments * 20;
    }

    // Overdue payments
    if (patient.overdueAmount && patient.overdueAmount > 0) {
      score += Math.min(patient.overdueAmount / 1000 * 10, 50);
    }

    // SGK status
    if (patient.sgkStatus === 'rejected') {
      score += 75;
    } else if (patient.sgkStatus === 'pending') {
      score += 25;
    }

    // Battery report due
    if (patient.batteryReportDue) {
      const dueDate = new Date(patient.batteryReportDue);
      const daysUntilDue = Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 30 && daysUntilDue >= 0) {
        score += 30 - daysUntilDue;
      } else if (daysUntilDue < 0) {
        score += Math.abs(daysUntilDue) * 2;
      }
    }

    return Math.round(score);
  }

  async getHighPriorityPatients(): Promise<Patient[]> {
    try {
      await this.init();
      return this.patients
        .filter(p => (p.priorityScore || 0) >= 80)
        .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
    } catch (error) {
      console.error('Failed to get high priority patients:', error);
      return [];
    }
  }

  async addDevice(patientId: string, device: Omit<PatientDevice, 'id'>): Promise<PatientDevice | null> {
    try {
      if (!patientId?.trim()) {
        throw new Error('Patient ID is required');
      }
      
      if (!device.type?.trim()) {
        throw new Error('Device type is required');
      }

      const patient = await this.getPatient(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const newDevice: PatientDevice = {
        id: this.generateId(),
        ...device
      };

      const updatedPatient = await this.updatePatient(patientId, {
        devices: [...patient.devices, newDevice]
      });

      return updatedPatient ? newDevice : null;
    } catch (error) {
      console.error('Failed to add device:', error);
      throw error instanceof Error ? error : new Error('Failed to add device');
    }
  }

  async updateDevice(patientId: string, deviceId: string, updates: Partial<PatientDevice>): Promise<PatientDevice | null> {
    try {
      if (!patientId?.trim() || !deviceId?.trim()) {
        throw new Error('Patient ID and Device ID are required');
      }

      const patient = await this.getPatient(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const deviceIndex = patient.devices.findIndex(d => d.id === deviceId);
      if (deviceIndex === -1) {
        throw new Error('Device not found');
      }

      const updatedDevice = { ...patient.devices[deviceIndex], ...updates };
      const updatedDevices = [...patient.devices];
      updatedDevices[deviceIndex] = updatedDevice;

      const updatedPatient = await this.updatePatient(patientId, {
        devices: updatedDevices
      });

      return updatedPatient ? updatedDevice : null;
    } catch (error) {
      console.error('Failed to update device:', error);
      throw error instanceof Error ? error : new Error('Failed to update device');
    }
  }

  async addNote(patientId: string, noteText: string, type: PatientNote['type'] = 'general'): Promise<PatientNote | null> {
    try {
      if (!patientId?.trim()) {
        throw new Error('Patient ID is required');
      }
      
      if (!noteText?.trim()) {
        throw new Error('Note text is required');
      }

      const patient = await this.getPatient(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const newNote: PatientNote = {
        id: this.generateId(),
        author: 'System', // TODO: Get from current user context
        date: new Date().toISOString(),
        text: noteText.trim(),
        type
      };

      const updatedPatient = await this.updatePatient(patientId, {
        notes: [...patient.notes, newNote]
      });

      return updatedPatient ? newNote : null;
    } catch (error) {
      console.error('Failed to add note:', error);
      throw error instanceof Error ? error : new Error('Failed to add note');
    }
  }

  async addCommunication(patientId: string, communication: Omit<Communication, 'id'>): Promise<Communication | null> {
    try {
      if (!patientId?.trim()) {
        throw new Error('Patient ID is required');
      }

      if (!communication.type || !communication.content?.trim()) {
        throw new Error('Communication type and content are required');
      }

      const patient = await this.getPatient(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      const newCommunication: Communication = {
        id: this.generateId(),
        ...communication,
        timestamp: new Date().toISOString()
      };

      const updatedPatient = await this.updatePatient(patientId, {
        communications: [...(patient.communications || []), newCommunication]
      });

      return updatedPatient ? newCommunication : null;
    } catch (error) {
      console.error('Failed to add communication:', error);
      throw error instanceof Error ? error : new Error('Failed to add communication');
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
    if (request.name && patient.name) {
      const nameSimilarity = this.calculateStringSimilarity(request.name, patient.name);
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

  private convertOrvalPatient(backendPatient: OrvalPatient): Patient {
    return {
      id: backendPatient.id || (backendPatient as any)._id || (backendPatient as any).patientId || '',
      name: `${backendPatient.firstName || ''} ${backendPatient.lastName || ''}`.trim() || 'Unnamed Patient',
      firstName: backendPatient.firstName || '',
      lastName: backendPatient.lastName || '',
      phone: backendPatient.phone || '',
      email: backendPatient.email || '',
      tcNumber: backendPatient.tcNumber || backendPatient.identityNumber || '',
      birthDate: backendPatient.birthDate || '',
      address: backendPatient.addressFull || 
               `${backendPatient.addressCity || ''} ${backendPatient.addressDistrict || ''}`.trim() || 
               undefined,
      status: (backendPatient.status || 'active').toLowerCase() as 'active' | 'inactive' | 'archived',
      segment: (backendPatient.segment || 'new') as 'new' | 'trial' | 'purchased' | 'control' | 'renewal',
      label: 'yeni' as const,
      acquisitionType: (backendPatient.acquisitionType || 'diger') as 'tabela' | 'sosyal-medya' | 'tanitim' | 'referans' | 'diger',
      tags: Array.isArray(backendPatient.tags) ? backendPatient.tags : [],
      devices: [],
      notes: [],
      communications: [],
      reports: [],
      ereceiptHistory: [],
      sgkInfo: { 
        hasInsurance: Boolean(backendPatient.sgkInfo), 
        ...backendPatient.sgkInfo 
      },
      sgkStatus: 'pending' as const,
      priorityScore: backendPatient.priorityScore || 0,
      createdAt: backendPatient.createdAt || new Date().toISOString(),
      updatedAt: backendPatient.updatedAt || new Date().toISOString()
    };
  }
}

// Singleton instance
export const patientService = new PatientService();