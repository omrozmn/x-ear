// Patient API Service - Simplified Version
import {
  ResponseMeta,
  PatientRead,
  PatientCreate,
  SaleCreate,
  SaleUpdate,
  PatientNoteCreate,
  SaleRead
} from "@/api/generated/schemas";
import { CreatePatientRequest, LegacyPatient, UpdatePatientRequest } from '../../api/client';
import { unwrapArray, unwrapObject, unwrapProperty } from '../../utils/response-unwrap';
import {
  listPatients,
  createPatients,
  getPatient,
  updatePatient,
  deletePatient
} from '@/api/generated/patients/patients';
import { listAdminPatientSales } from '@/api/generated/admin-patients/admin-patients';
import { createSales, updateSale } from '@/api/generated/sales/sales';
import { listTimeline } from '@/api/generated/timeline/timeline';
import { listPatientSgkDocuments } from '@/api/generated/sgk/sgk';
import { listPatientDocuments } from '@/api/generated/documents/documents';
import {
  listPatientAppointments,
  listPatientHearingTests,
  listPatientNotes,
  createPatientNotes,
  deletePatientNote
} from '@/api/generated/patient-subresources/patient-subresources';


// Use LegacyPatient as the Patient type in this service
type Patient = LegacyPatient;

// Use SaleRead as Sale type
type Sale = SaleRead;

// Request deduplication and caching
interface CacheEntry {

  data: Patient[];
  timestamp: number;
  promise?: Promise<Patient[]>;
}

type ApiEnvelope<T> = {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  meta?: ResponseMeta | Record<string, unknown>;
};

class RequestThrottler {
  private activeRequests = 0;
  private readonly maxConcurrentRequests = 3;
  private readonly requestQueue: Array<() => Promise<unknown>> = [];
  private readonly requestDelay = 100;

  async throttle<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          this.activeRequests++;
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          setTimeout(() => this.processQueue(), this.requestDelay);
        }
      });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.activeRequests < this.maxConcurrentRequests && this.requestQueue.length > 0) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  getQueueLength(): number {
    return this.requestQueue.length;
  }
}

export class PatientApiService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private ongoingRequests: Map<string, Promise<Patient[]>> = new Map();
  private throttler = new RequestThrottler();

  /**
   * Fetch all patients with caching
   */
  async fetchAllPatients(perPage: number = 200): Promise<Patient[]> {
    const cacheKey = `all_patients_${perPage}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    if (this.ongoingRequests.has(cacheKey)) {
      return this.ongoingRequests.get(cacheKey)!;
    }

    const promise = this._fetchAllPatientsInternal(perPage);
    this.ongoingRequests.set(cacheKey, promise);

    try {
      const data = await promise;
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } finally {
      this.ongoingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch all patients (simplified implementation)
   */
  private async _fetchAllPatientsInternal(perPage: number = 200): Promise<Patient[]> {
    try {
      const response = await listPatients({ page: 1, per_page: perPage });
      // Orval response unwrapping - check if data is directly valid or nested
      const rawData = (response as unknown) as any;
      const list = Array.isArray(rawData) ? rawData : (rawData?.data?.data || rawData?.data || []);

      // Map Orval Patient schema to local Patient shape
      return list.map((p: PatientRead) => ({
        id: p.id,
        name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
        email: p.email || '',
        phone: p.phone || '',
        birth_date: p.birthDate || p.dob || '',
        created_at: p.createdAt?.toString() || '',
        updated_at: p.updatedAt?.toString() || ''
      })) as Patient[];
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      throw error;
    }
  }

  /**
   * Get patient sales using generated API client with throttling
   */
  async getSales(patientId: string): Promise<ApiEnvelope<Sale[]>> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await listAdminPatientSales(patientId);
      });
      const res = response as unknown as { data?: { data?: Sale[]; meta?: ResponseMeta } };
      // Unwrap logic depends on backend response structure. Orval might already return parsed JSON.
      // Assuming response is the standard envelope or array
      const salesArray = Array.isArray(response) ? response : (res.data?.data || (response as any).data || []);

      return {
        data: salesArray as Sale[],
        success: true,
        message: 'Sales data retrieved successfully',
        meta: res.data?.meta
      };
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
      return {
        data: [],
        success: false,
        message: 'Failed to fetch sales data'
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(key: string = 'all_patients'): void {
    this.cache.delete(key);
  }

  async fetchPatient(id: string): Promise<Patient | null> {
    try {
      const response = await getPatient(id);
      const payload = unwrapObject<any>(response);
      const patientData = payload?.patient || payload;
      if (patientData) {
        const p = patientData as PatientRead;
        return {
          id: p.id,
          name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
          email: p.email || '',
          phone: p.phone || '',
          birth_date: p.birthDate || p.dob || '',
          created_at: p.createdAt?.toString() || '',
          updated_at: p.updatedAt?.toString() || ''
        } as Patient;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error fetching patient ${id}:`, error);
      throw error;
    }
  }

  async createPatient(patientData: CreatePatientRequest): Promise<Patient> {
    try {
      const body: PatientCreate = {
        firstName: (patientData as any).firstName || (patientData as any).name?.split(' ')[0] || '',
        lastName: (patientData as any).lastName || (patientData as any).name?.split(' ').slice(1).join(' ') || '',
        phone: patientData.phone || '',
        email: patientData.email,
        birthDate: (patientData as any).birthDate || patientData.birth_date,
        tcNumber: (patientData as any).tcNumber
      };
      const response = await createPatients(body);
      const payload = unwrapObject<any>(response);
      const newPatient = payload?.patient || payload;
      if (newPatient) {
        this.invalidateCache();
        const p = newPatient as PatientRead; // assuming response is PatientRead
        return {
          id: p.id,
          name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
          email: p.email || '',
          phone: p.phone || '',
          birth_date: p.birthDate || p.dob || '',
          created_at: p.createdAt?.toString() || '',
          updated_at: p.updatedAt?.toString() || ''
        } as Patient;
      }
      throw new Error('Failed to create patient');
    } catch (error) {
      console.error('❌ Error creating patient:', error);
      throw error;
    }
  }

  async updatePatient(id: string, updates: UpdatePatientRequest): Promise<Patient | null> {
    try {
      const body: Partial<PatientCreate> = {
        firstName: (updates as any).firstName,
        lastName: (updates as any).lastName,
        phone: updates.phone,
        email: updates.email,
        birthDate: (updates as any).birthDate || updates.birth_date,
        tcNumber: (updates as any).tcNumber
      };
      const response = await updatePatient(id, body as any);
      const payload = unwrapObject<any>(response);
      const updatedPatient = payload?.patient || payload;
      if (updatedPatient) {
        this.invalidateCache();
        const p = updatedPatient as PatientRead;
        return {
          id: p.id,
          name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
          email: p.email || '',
          phone: p.phone || '',
          birth_date: p.birthDate || p.dob || '',
          created_at: p.createdAt?.toString() || '',
          updated_at: p.updatedAt?.toString() || ''
        } as Patient;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error updating patient ${id}:`, error);
      throw error;
    }
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      const response = await deletePatient(id);
      const success = unwrapProperty<boolean>(response, 'success', false);
      if (success) {
        this.invalidateCache();
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error deleting patient ${id}:`, error);
      throw error;
    }
  }

  async createSale(patientId: string, saleData: unknown): Promise<any> {
    try {
      // Extract product ID and basic fields from saleData
      let productId: string | undefined = (saleData as Record<string, unknown>)?.productId as string | undefined;
      const devices = (saleData as Record<string, unknown>)?.devices as unknown[] | undefined;

      if (!productId && Array.isArray(devices) && devices.length > 0) {
        const first = devices[0] as Record<string, unknown>;
        productId = (first.inventoryId as string | undefined) || (first.id as string | undefined);
      }

      if (!productId) {
        throw new Error('Product ID is required for sale creation');
      }

      const body: SaleCreate = {
        patientId: patientId,
        productId: productId,
        discountAmount: ((saleData as Record<string, unknown>)?.discount as number) || 0,
        paymentMethod: ((saleData as Record<string, unknown>)?.paymentMethod as any) || 'cash',
        notes: ((saleData as Record<string, unknown>)?.notes as any) || '',
        paidAmount: ((saleData as Record<string, unknown>)?.paidAmount as any),
        saleDate: ((saleData as Record<string, unknown>)?.saleDate as any),
        sgkCoverage: ((saleData as Record<string, unknown>)?.sgkAmount as any),
        reportStatus: ((saleData as Record<string, unknown>)?.reportStatus as any)
      } as unknown as SaleCreate;

      const response = await createSales(body);

      const payload = (response as unknown) as { data?: unknown };
      return { data: payload?.data ?? null, success: true };
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  }

  async updateSale(saleId: string, updates: SaleUpdate): Promise<ApiEnvelope<unknown>> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await updateSale(saleId, updates);
      });
      const payload = (response as unknown) as { data?: unknown };
      return {
        data: payload?.data ?? null,
        success: true,
        message: 'Sale updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating sale:', error);
      return {
        data: null,
        success: false,
        message: 'Failed to update sale'
      };
    }
  }

  async getTimeline(patientId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await listTimeline({ patient_id: patientId } as any);
      const payload = unwrapObject<any>(response);
      return {
        data: unwrapArray<unknown>(response),
        success: true,
        meta: payload?.meta
      };
    } catch (error) {
      console.error('Failed to fetch patient timeline:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch timeline'
      };
    }
  }

  async getSgk(patientId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await listPatientSgkDocuments(patientId);
      });
      return {
        data: unwrapArray<unknown>(response),
        success: true
      };
    } catch (error) {
      console.error('Failed to fetch patient SGK documents:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SGK documents'
      };
    }
  }

  async getAppointments(patientId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await this.throttler.throttle(async () => {
        // Direct endpoint for patient appointments
        return await listPatientAppointments(patientId);
      });

      const allAppointments = unwrapArray<any>(response);
      return {
        data: allAppointments,
        success: true
      };
    } catch (error) {
      console.error('Failed to fetch patient appointments:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch appointments'
      };
    }
  }

  async getHearingTests(patientId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await listPatientHearingTests(patientId);
      return {
        data: unwrapArray<unknown>(response),
        success: true
      };
    } catch (error) {
      console.error('Failed to fetch patient hearing tests:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch hearing tests'
      };
    }
  }

  async getNotes(patientId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await listPatientNotes(patientId);
      return {
        data: unwrapArray<unknown>(response),
        success: true,
        meta: unwrapObject<any>(response)?.meta
      };
    } catch (error) {
      console.error('Failed to fetch patient notes:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notes'
      };
    }
  }

  async getDocuments(patientId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await listPatientDocuments(patientId);
      return {
        data: unwrapArray<unknown>(response),
        success: true,
        meta: unwrapObject<any>(response)?.meta
      };
    } catch (error) {
      console.error('Failed to fetch patient documents:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch documents'
      };
    }
  }

  async bulkUpload(formData: unknown): Promise<unknown> {
    void formData;
    return { data: [], success: false, message: 'Not implemented in simplified version' };
  }

  async search(searchParams: unknown): Promise<unknown> {
    void searchParams;
    return { data: [], success: true };
  }

  async exportCsv(_filters: unknown): Promise<unknown> {
    void _filters;
    return { data: [], success: true, message: 'Export not available in simplified version' };
  }

  async list(_filters: unknown): Promise<Patient[]> {
    void _filters;
    return this.fetchAllPatients();
  }

  async getPatients(_params?: unknown): Promise<Patient[]> {
    void _params;
    return this.fetchAllPatients();
  }

  async createNote(patientId: string, noteData: unknown): Promise<unknown> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await createPatientNotes(patientId, noteData as PatientNoteCreate);
      });
      return {
        data: (response as any).data,
        success: true
      };
    } catch (error) {
      console.error('Failed to create patient note:', error);
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create note'
      };
    }
  }

  async deleteNote(patientId: string, noteId: string): Promise<unknown> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await deletePatientNote(patientId, noteId);
      });
      return {
        data: (response as any).data,
        success: true
      };
    } catch (error) {
      console.error('Failed to delete patient note:', error);
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete note'
      };
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export const patientApiService = new PatientApiService();