// Party API Service - Simplified Version
import {
  ResponseMeta,
  PartyRead,
  PartyCreate,
  SaleCreate,
  SaleUpdate,
  PatientNoteCreate as PartyNoteCreate,
  SaleRead,
  PartyRead as LegacyParty,
  PartyCreate as CreatePartyRequest,
  PartyUpdate as UpdatePartyRequest
} from "@/api/generated/schemas";
import { unwrapArray, unwrapObject, unwrapProperty } from '../../utils/response-unwrap';
import {
  listParties,
  createParty,
  getParty,
  updateParty,
  deleteParty
} from '@/api/client/parties.client';
import { listAdminPartySales } from '@/api/client/parties.client';
import { createSales, updateSale } from '@/api/client/sales.client';
import { listPartyTimeline } from '@/api/client/parties.client';
import { listSgkDocuments as listPartySgkDocuments } from '@/api/client/sgk.client';
import { listPatientDocuments as listPartyDocuments } from '@/api/client/parties.client';
import {
  listHearingTests as listPartyHearingTests
} from '@/api/client/parties.client';
import {
  listPartyAppointments
} from '@/api/client/parties.client';
import {
  listPartyNotes,
  createPartyNotes,
  deletePartyNote
} from '@/api/client/parties.client';


// Use LegacyParty as the Party type in this service
type Party = LegacyParty;

// Use SaleRead as Sale type
type Sale = SaleRead;

// Request deduplication and caching
interface CacheEntry {
  data: Party[];
  timestamp: number;
  promise?: Promise<Party[]>;
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

export class PartyApiService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private ongoingRequests: Map<string, Promise<Party[]>> = new Map();
  private throttler = new RequestThrottler();

  /**
   * Fetch all parties with caching
   */
  async fetchAllParties(perPage: number = 200): Promise<Party[]> {
    const cacheKey = `all_parties_${perPage}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    if (this.ongoingRequests.has(cacheKey)) {
      return this.ongoingRequests.get(cacheKey)!;
    }

    const promise = this._fetchAllPartiesInternal(perPage);
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
   * Fetch all parties (simplified implementation)
   */
  private async _fetchAllPartiesInternal(perPage: number = 200): Promise<Party[]> {
    try {
      const response = await listParties({ page: 1, per_page: perPage });
      const list = unwrapArray<PartyRead>(response);

      // Map Orval Party schema to local Party shape
      return list.map((p: PartyRead) => ({
        id: p.id,
        name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
        email: p.email || '',
        phone: p.phone || '',
        birth_date: p.birthDate || p.dob || '',
        created_at: p.createdAt?.toString() || '',
        updated_at: p.updatedAt?.toString() || ''
      })) as Party[];
    } catch (error) {
      console.error('❌ Error fetching parties:', error);
      throw error;
    }
  }

  /**
   * Get party sales using generated API client with throttling
   */
  async getSales(partyId: string): Promise<ApiEnvelope<Sale[]>> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await listAdminPartySales(partyId);
      });
      const salesArray = unwrapArray<Sale>(response);
      const res = response as unknown as { data?: { meta?: ResponseMeta } };

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

  invalidateCache(key: string = 'all_parties'): void {
    this.cache.delete(key);
  }

  async fetchParty(id: string): Promise<Party | null> {
    try {
      const response = await getParty(id);
      const payload = unwrapObject<Record<string, unknown>>(response);
      const partyData = (payload?.party as unknown as PartyRead) || (payload as unknown as PartyRead);
      if (partyData) {
        const p = partyData as PartyRead;
        return {
          id: p.id,
          name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
          email: p.email || '',
          phone: p.phone || '',
          birth_date: p.birthDate || p.dob || '',
          created_at: p.createdAt?.toString() || '',
          updated_at: p.updatedAt?.toString() || ''
        } as Party;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error fetching party ${id}:`, error);
      throw error;
    }
  }

  async createParty(partyData: CreatePartyRequest): Promise<Party> {
    try {
      const pData = partyData as unknown as Record<string, unknown>;
      const body: PartyCreate = {
        firstName: (pData.firstName as string) || (pData.name as string)?.split(' ')[0] || '',
        lastName: (pData.lastName as string) || (pData.name as string)?.split(' ').slice(1).join(' ') || '',
        phone: partyData.phone || '',
        email: partyData.email,
        birthDate: partyData.birthDate,
        tcNumber: pData.tcNumber as string
      };
      const response = await createParty(body);
      const payload = unwrapObject<Record<string, unknown>>(response);
      const newParty = payload?.party || payload;
      if (newParty) {
        this.invalidateCache();
        const p = newParty as PartyRead; // assuming response is PartyRead
        return {
          id: p.id,
          name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
          email: p.email || '',
          phone: p.phone || '',
          birth_date: p.birthDate || p.dob || '',
          created_at: p.createdAt?.toString() || '',
          updated_at: p.updatedAt?.toString() || ''
        } as Party;
      }
      throw new Error('Failed to create party');
    } catch (error) {
      console.error('❌ Error creating party:', error);
      throw error;
    }
  }

  async updateParty(id: string, updates: UpdatePartyRequest): Promise<Party | null> {
    try {
      const upds = updates as Record<string, unknown>;
      // Manual cast because PartyCreate might have slightly different names than UpdatePartyRequest
      const body: Partial<PartyCreate> = {
        firstName: upds.firstName as string,
        lastName: upds.lastName as string,
        phone: updates.phone as string || '',
        email: updates.email as string
      };
      const response = await updateParty(id, body as PartyCreate);
      const payload = unwrapObject<Record<string, unknown>>(response);
      const updatedParty = payload?.party || payload;
      if (updatedParty) {
        this.invalidateCache();
        const p = updatedParty as PartyRead;
        return {
          id: p.id,
          name: p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ').trim(),
          email: p.email || '',
          phone: p.phone || '',
          birth_date: p.birthDate || p.dob || '',
          created_at: p.createdAt?.toString() || '',
          updated_at: p.updatedAt?.toString() || ''
        } as Party;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error updating party ${id}:`, error);
      throw error;
    }
  }

  async deleteParty(id: string): Promise<boolean> {
    try {
      const response = await deleteParty(id);
      const success = unwrapProperty<boolean>(response, 'success', false);
      if (success) {
        this.invalidateCache();
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error deleting party ${id}:`, error);
      throw error;
    }
  }

  async createSale(partyId: string, saleData: unknown): Promise<{ data: Sale | null; success: boolean; warnings?: string[]; message?: string }> {
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

      const sData = saleData as Record<string, unknown>;
      const body: SaleCreate = {
        partyId: partyId,
        productId: productId,
        discountAmount: (sData.discount as number) || 0,
        paymentMethod: (sData.paymentMethod as string) || 'cash',
        notes: (sData.notes as string) || '',
        paidAmount: (sData.paidAmount as number),
        saleDate: (sData.saleDate as string),
        sgkCoverage: (sData.sgkAmount as number),
        reportStatus: (sData.reportStatus as string)
      } as unknown as SaleCreate;

      const response = await createSales(body);

      const payload = (response as unknown) as { data?: SaleRead; warnings?: string[]; message?: string };
      return { data: payload?.data ?? null, success: true, warnings: payload?.warnings, message: payload?.message };
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

  async getTimeline(partyId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await listPartyTimeline(partyId);
      const payload = unwrapObject<Record<string, unknown>>(response);
      return {
        data: unwrapArray<unknown>(response),
        success: true,
        meta: payload?.meta as ResponseMeta
      };
    } catch (error) {
      console.error('Failed to fetch party timeline:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch timeline'
      };
    }
  }

  async getSgk(partyId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await this.throttler.throttle(async () => {
        // SGK listing currently doesn't take partyId in generated sgk/sgk.ts
        // but it used to in the legacy call. For now using global list.
        return await listPartySgkDocuments();
      });
      return {
        data: unwrapArray<unknown>(response),
        success: true
      };
    } catch (error) {
      console.error(`Failed to fetch SGK documents for party ${partyId}:`, error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SGK documents'
      };
    }
  }

  async getAppointments(partyId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await listPartyAppointments(partyId);
      });

      const allAppointments = unwrapArray<Record<string, unknown>>(response);
      return {
        data: allAppointments,
        success: true
      };
    } catch (error) {
      console.error('Failed to fetch party appointments:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch appointments'
      };
    }
  }

  async getHearingTests(partyId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await listPartyHearingTests(partyId);
      return {
        data: unwrapArray<unknown>(response),
        success: true
      };
    } catch (error) {
      console.error('Failed to fetch party hearing tests:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch hearing tests'
      };
    }
  }

  async getNotes(partyId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await listPartyNotes(partyId);
      return {
        data: unwrapArray<unknown>(response),
        success: true,
        meta: unwrapObject<Record<string, unknown>>(response)?.meta as ResponseMeta
      };
    } catch (error) {
      console.error('Failed to fetch party notes:', error);
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notes'
      };
    }
  }

  async getDocuments(partyId: string): Promise<ApiEnvelope<unknown[]>> {
    try {
      const response = await listPartyDocuments(partyId);
      return {
        data: unwrapArray<unknown>(response),
        success: true,
        meta: unwrapObject<Record<string, unknown>>(response)?.meta as ResponseMeta
      };
    } catch (error) {
      console.error('Failed to fetch party documents:', error);
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

  async list(_filters: unknown): Promise<Party[]> {
    void _filters;
    return this.fetchAllParties();
  }

  async getParties(_params?: unknown): Promise<Party[]> {
    void _params;
    return this.fetchAllParties();
  }

  async createNote(partyId: string, noteData: unknown): Promise<unknown> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await createPartyNotes(partyId, noteData as PartyNoteCreate);
      });
      return {
        data: unwrapObject<unknown>(response),
        success: true
      };
    } catch (error) {
      console.error('Failed to create party note:', error);
      return {
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create note'
      };
    }
  }

  async deleteNote(partyId: string, noteId: string): Promise<unknown> {
    try {
      const response = await this.throttler.throttle(async () => {
        return await deletePartyNote(partyId, noteId);
      });
      return {
        data: unwrapObject<unknown>(response),
        success: true
      };
    } catch (error) {
      console.error('Failed to delete party note:', error);
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

export const partyApiService = new PartyApiService();
export default partyApiService;