/**
 * Patient API Service
 * @fileoverview API communication for patient data
 * @version 1.0.0
 */

import { AxiosResponse } from 'axios';
import { 
  PatientsGetPatients200,
  Patient as OrvalPatient,
  PaginationInfo
} from "../../api/generated/api.schemas";
import { getPatients } from "../../api/generated/patients/patients";
import { getSales } from "../../api/generated/sales/sales";
import { getTimeline } from "../../api/generated/timeline/timeline";
import { getAppointments } from "../../api/generated/appointments/appointments";
import type { Patient } from '../../types/patient';

// Request deduplication and caching
interface CacheEntry {
  data: OrvalPatient[];
  timestamp: number;
  promise?: Promise<OrvalPatient[]>;
}

// Request throttling to prevent resource exhaustion
class RequestThrottler {
  private activeRequests = 0;
  private readonly maxConcurrentRequests = 3; // Reduced from default
  private readonly requestQueue: Array<() => Promise<any>> = [];
  private readonly requestDelay = 100; // 100ms between requests

  async throttle<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeRequest = async () => {
        if (this.activeRequests >= this.maxConcurrentRequests) {
          // Queue the request
          this.requestQueue.push(executeRequest);
          return;
        }

        this.activeRequests++;
        
        try {
          // Add small delay to prevent resource exhaustion
          if (this.activeRequests > 1) {
            await new Promise(resolve => setTimeout(resolve, this.requestDelay));
          }
          
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          
          // Process next request in queue
          const nextRequest = this.requestQueue.shift();
          if (nextRequest) {
            setTimeout(nextRequest, this.requestDelay);
          }
        }
      };

      executeRequest();
    });
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
  private ongoingRequests: Map<string, Promise<OrvalPatient[]>> = new Map();
  private throttler = new RequestThrottler();

  /**
   * Fetch all patients from API using cursor-based pagination with deduplication
   */
  async fetchAllPatients(): Promise<OrvalPatient[]> {
    const cacheKey = 'all_patients';
    
    // Check if there's an ongoing request
    const ongoingRequest = this.ongoingRequests.get(cacheKey);
    if (ongoingRequest) {
      console.log('🔄 Reusing ongoing fetchAllPatients request');
      return ongoingRequest;
    }

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log('📦 Using cached patients data');
      return cached.data;
    }

    // Create new request
    const requestPromise = this._fetchAllPatientsInternal();
    this.ongoingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } finally {
      // Clean up ongoing request
      this.ongoingRequests.delete(cacheKey);
    }
  }

  /**
   * Internal method to actually fetch patients from API
   */
  private async _fetchAllPatientsInternal(): Promise<OrvalPatient[]> {
    const aggregated: OrvalPatient[] = [];
    let cursor: string | undefined;
    const perPage = 25; // Further reduced to prevent resource exhaustion

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const params: any = { per_page: perPage };
        if (cursor) {
          params.cursor = cursor;
        }
        
        // Use throttler to prevent resource exhaustion
        // eslint-disable-next-line no-await-in-loop
        const response: AxiosResponse<PatientsGetPatients200> = await this.throttler.throttle(() => 
          getPatients().patientsGetPatients(params)
        );

        if (!response.data?.data) {
          console.warn('⚠️ No data in response:', response);
          break;
        }

        aggregated.push(...response.data.data);
        console.log(`📥 Fetched ${response.data.data.length} patients (total: ${aggregated.length})`);

        // Check if we have more data
        const pagination = response.data.pagination;
        if (!pagination?.nextCursor) {
          console.log('✅ Reached end of patient data');
          break;
        }

        cursor = pagination.nextCursor;

        // Safety limit to prevent infinite loops and resource exhaustion
        if (aggregated.length >= 5000) { // Reduced from 10000
          console.warn('⚠️ Reached safety limit of 5000 patients');
          break;
        }

        // Add delay between requests to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log(`✅ Successfully fetched ${aggregated.length} patients`);
      return aggregated;
    } catch (error) {
      console.error('❌ Error fetching patients:', error);
      throw error;
    }
  }

  /**
   * Get patient sales (real API implementation)
   */
  async getSales(patientId: string): Promise<any> {
    try {
      // Use throttler to prevent resource exhaustion
      const response = await this.throttler.throttle(() => 
        getSales().salesListSales()
      );
      
      // Ensure response.data is an array before filtering
      let salesData: any[] = [];
      if (response && Array.isArray(response)) {
        salesData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        salesData = response.data;
      } else {
        console.warn('⚠️ Sales response data is not an array:', response);
        salesData = [];
      }
      
      // Filter sales by patient ID
      const patientSales = salesData.filter((sale: any) => 
        sale.patientId === patientId || sale.patient_id === patientId
      );
      
      return {
        success: true,
        data: patientSales,
        meta: { total: patientSales.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get sales for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache manually (useful for data refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Patient cache cleared');
  }

  /**
   * Invalidate cache for specific key
   */
  invalidateCache(key: string = 'all_patients'): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache invalidated for key: ${key}`);
  }

  /**
   * Fetch single patient by ID
   */
  async fetchPatient(id: string): Promise<OrvalPatient | null> {
    try {
      // This would be implemented when the API endpoint exists
      // const resp = await patientsGetPatient({ id });
      // return resp.data;
      
      // For now, fetch all and find the specific one
  const allPatients = await this.fetchAllPatients();
  return allPatients.find(p => p.id === id) || null;
      
    } catch (error) {
      console.error(`❌ Failed to fetch patient ${id}:`, error);
      return null;
    }
  }

  /**
   * Create new patient via API
   */
  async createPatient(patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrvalPatient> {
    try {
      // This would be implemented when the API endpoint exists
      // const resp = await patientsCreatePatient({ data: patientData });
      // return resp.data;
      
      // For now, simulate API response
      const newPatient: OrvalPatient = ({
        ...(patientData as any),
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any) as OrvalPatient;
      
      return newPatient;
      
    } catch (error) {
      console.error('❌ Failed to create patient:', error);
      throw error;
    }
  }

  /**
   * Update patient via API
   */
  async updatePatient(id: string, updates: Partial<Patient>): Promise<OrvalPatient | null> {
    try {
      // This would be implemented when the API endpoint exists
      // const resp = await patientsUpdatePatient({ id, data: updates });
      // return resp.data;
      
      // For now, simulate API response
      const existingPatient = await this.fetchPatient(id);
      if (!existingPatient) {
        return null;
      }
      
      const updatedPatient: OrvalPatient = ({
        ...(existingPatient as any),
        ...(updates as any),
        updatedAt: new Date().toISOString()
      } as any) as OrvalPatient;
      
      return updatedPatient;
      
    } catch (error) {
      console.error(`❌ Failed to update patient ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete patient via API
   */
  async deletePatient(id: string): Promise<boolean> {
    try {
      // This would be implemented when the API endpoint exists
      // await patientsDeletePatient({ id });
      // return true;
      
      // For now, simulate successful deletion
      console.log(`🗑️ Simulated deletion of patient ${id}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to delete patient ${id}:`, error);
      return false;
    }
  }

  /**
   * Create new sale for patient
   */
  async createSale(patientId: string, saleData: any): Promise<any> {
    try {
      const salesApi = getSales();
      const response = await salesApi.salesCreateSale({
        patientId,
        productId: saleData.productId,
        saleDate: saleData.saleDate,
        paymentMethod: saleData.paymentMethod,
        paymentStatus: saleData.paymentStatus || 'pending',
        status: saleData.status || 'pending',
        totalAmount: saleData.totalAmount,
        finalAmount: saleData.finalAmount,
        discountAmount: saleData.discountAmount || 0,
        paidAmount: saleData.paidAmount || 0,
        sgkCoverage: saleData.sgkCoverage || 0,
        sgkScheme: saleData.sgkScheme,
        sgkGroup: saleData.sgkGroup,
        notes: saleData.notes,
        devices: saleData.devices || []
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to create sale for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Update existing sale
   */
  async updateSale(saleId: string, updates: any): Promise<any> {
    try {
      const salesApi = getSales();
      const response = await salesApi.salesUpdateSale(saleId, {
        patientId: updates.patientId,
        productId: updates.productId,
        saleDate: updates.saleDate,
        paymentMethod: updates.paymentMethod,
        paymentStatus: updates.paymentStatus,
        status: updates.status,
        totalAmount: updates.totalAmount,
        finalAmount: updates.finalAmount,
        discountAmount: updates.discountAmount,
        paidAmount: updates.paidAmount,
        sgkCoverage: updates.sgkCoverage,
        sgkScheme: updates.sgkScheme,
        sgkGroup: updates.sgkGroup,
        notes: updates.notes,
        devices: updates.devices
      });

      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to update sale ${saleId}:`, error);
      throw error;
    }
  }

  /**
   * Get patient timeline (real API implementation)
   */
  async getTimeline(patientId: string): Promise<any> {
    try {
      // Use throttler to prevent resource exhaustion
      const response = await this.throttler.throttle(() => 
        getTimeline().timelineGetPatientTimeline(patientId)
      );
      
      return {
        success: true,
        data: response.data?.data || [],
        meta: { total: response.data?.meta?.total || 0 },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get timeline for patient ${patientId}:`, error);
      throw error;
    }
  }



  /**
   * Get patient documents (real API implementation)
   */
  async getDocuments(patientId: string): Promise<any> {
    try {
      const patientsApi = getPatients();
      const response: any = await patientsApi.sgkGetPatientSgkDocuments(patientId);
      
      return {
        success: true,
        data: response.data?.data || [],
        meta: { total: response.data?.meta?.total || 0 },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get documents for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Get patient appointments (real API implementation)
   */
  async getAppointments(patientId: string): Promise<any> {
    try {
      const appointmentsApi = getAppointments();
      const response = await appointmentsApi.appointmentsListAppointments();
      const filteredData = response.data?.data?.filter(appointment => 
        appointment.patientId === patientId || appointment.patient_id === patientId
      ) || [];
      
      return {
        success: true,
        data: filteredData,
        meta: { total: filteredData.length },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get appointments for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Get patient hearing tests (real API implementation)
   */
  async getHearingTests(patientId: string): Promise<any> {
    try {
      const patientsApi = getPatients();
      // GET endpoint is not in generated API, use direct axios call
      const response: any = await patientsApi.patientsGetPatients(); // This is a workaround since the GET endpoint isn't generated
      // Actually, let's use direct axios call for hearing tests
      const axios = (await import('axios')).default;
      const hearingTestsResponse = await axios.get(`/api/patients/${patientId}/hearing-tests`);
      
      return {
        success: true,
        data: hearingTestsResponse.data?.data || [],
        meta: { total: hearingTestsResponse.data?.meta?.total || 0 },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get hearing tests for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Get patient notes (real API implementation)
   */
  async getNotes(patientId: string): Promise<any> {
    try {
      const patientsApi = getPatients();
      // GET endpoint is not in generated API, use direct axios call
      const axios = (await import('axios')).default;
      const notesResponse = await axios.get(`/api/patients/${patientId}/notes`);
      
      return {
        success: true,
        data: notesResponse.data?.data || [],
        meta: { total: notesResponse.data?.meta?.total || 0 },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to get notes for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk upload patients (not implemented)
   */
  async bulkUpload(formData: any): Promise<any> {
    throw new Error('bulkUpload API method not implemented yet');
  }

  /**
   * Search patients (not implemented)
   */
  async search(searchParams: any): Promise<any> {
    throw new Error('search API method not implemented yet');
  }

  /**
   * Export patients to CSV (not implemented)
   */
  async exportCsv(filters: any): Promise<any> {
    throw new Error('exportCsv API method not implemented yet');
  }

  /**
   * List patients with filters (not implemented)
   */
  async list(filters: any): Promise<any> {
    throw new Error('list API method not implemented yet');
  }

  /**
   * Get patients with pagination and filters
   */
  async getPatients(params?: any): Promise<any> {
    try {
      // For now, return all patients with basic filtering
      const allPatients = await this.fetchAllPatients();
      
      let filtered = allPatients;
      
      // Apply search filter
      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        filtered = filtered.filter(p => 
          p.firstName?.toLowerCase().includes(searchLower) ||
          p.lastName?.toLowerCase().includes(searchLower) ||
          p.tcNumber?.includes(params.search) ||
          p.phone?.includes(params.search)
        );
      }
      
      // Apply status filter
      if (params?.status) {
        filtered = filtered.filter(p => p.status === params.status);
      }
      
      // Apply pagination
      const page = params?.page || 1;
      const perPage = params?.per_page || 10;
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedData = filtered.slice(startIndex, endIndex);
      
      return {
        data: {
          data: paginatedData,
          meta: {
            total: filtered.length,
            page,
            per_page: perPage,
            total_pages: Math.ceil(filtered.length / perPage)
          }
        }
      };
    } catch (error) {
      console.error('Failed to get patients:', error);
      throw error;
    }
  }

  // The mapping from Orval patient to domain Patient is provided by
  // 'convertOrvalPatient' in 'services/patient/patient-mappers.ts'.
  // This class intentionally does not duplicate mapping logic.

  /**
   * Create a note for a patient
   */
  async createNote(patientId: string, noteData: any): Promise<any> {
    try {
      const patientsApi = getPatients();
      const response = await patientsApi.patientSubresourcesCreatePatientNote(patientId, {
        title: noteData.title,
        content: noteData.content,
        priority: noteData.priority || 'medium',
        category: noteData.category || 'general',
        tags: noteData.tags || [],
        isPrivate: noteData.isPrivate || false,
        createdBy: noteData.createdBy || 'current_user'
      });

      return {
        success: true,
        data: {
          id: this.generateId(), // API response doesn't include ID, generate one
          patientId,
          ...noteData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to create note for patient ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a note for a patient
   */
  async deleteNote(patientId: string, noteId: string): Promise<any> {
    try {
      // TODO: Implement when notes API is available
      return {
        success: true,
        data: { deleted: true },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to delete note ${noteId} for patient ${patientId}:`, error);
      throw error;
    }
  }

  private generateId(): string {
    return `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const patientApiService = new PatientApiService();