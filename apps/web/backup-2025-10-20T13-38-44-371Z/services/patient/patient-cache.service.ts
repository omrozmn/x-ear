/**
 * Patient Cache Service
 * @fileoverview Handles patient data caching and offline storage
 * @version 1.0.0
 */

import { Patient } from '../../types/patient';
import { PatientSearchResult, PatientSearchItem } from '../../types/patient/patient-search.types';
import { indexedDBManager } from '../../utils/indexeddb';

export interface CacheStats {
  totalPatients: number;
  lastUpdated: string | null;
  cacheSize: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of patients to cache
  priority?: 'high' | 'normal' | 'low';
}

export interface SimpleCacheFilters {
  search?: string;
  status?: string[];
  segment?: string[];
  label?: string[];
  acquisitionType?: string[];
  tags?: string[];
  hasDevices?: boolean;
  page?: number;
  limit?: number;
}

export class PatientCacheService {
  private readonly CACHE_PREFIX = 'patient_cache_';
  private readonly METADATA_KEY = 'patient_cache_metadata';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 10000;

  async cachePatients(patients: Patient[], options: CacheOptions = {}): Promise<void> {
    try {
      // Store patients in IndexedDB
      await indexedDBManager.savePatients(patients);
      
      // Update cache metadata
      await this.updateCacheMetadata(patients.length);
      
      // Set individual cache entries with TTL
      const ttl = options.ttl || this.DEFAULT_TTL;
      const cachePromises = patients.map(patient => 
        indexedDBManager.setCache(
          `${this.CACHE_PREFIX}${patient.id}`,
          patient,
          ttl
        )
      );
      
      await Promise.all(cachePromises);
    } catch (error) {
      console.error('Failed to cache patients:', error);
      throw error;
    }
  }

  async getCachedPatient(patientId: string): Promise<Patient | null> {
    try {
      // Try IndexedDB first
      const patient = await indexedDBManager.getPatient(patientId);
      if (patient) {
        return patient;
      }

      // Fallback to cache
      const cached = await indexedDBManager.getCache(`${this.CACHE_PREFIX}${patientId}`);
      if (!cached) return null;
      // If the cached shape looks like the Orval API shape, convert it; otherwise assume domain Patient
      if ((cached as any).firstName || (cached as any).tc_number) {
        return cached as Patient; // Assume it's already in domain format
      }
      // Basic shape check: ensure required Patient fields exist
      if ((cached as any).id && ((cached as any).firstName || (cached as any).lastName)) {
        const c = cached as any;
        // Build a minimal Patient object from cached data to satisfy types
        const domain: Patient = {
          id: c.id,
          firstName: c.firstName || '',
          lastName: c.lastName || '',
          phone: c.phone || '',
          tcNumber: c.tcNumber || undefined,
          birthDate: c.birthDate || undefined,
          email: c.email || undefined,
          address: c.address || undefined,
          status: c.status || 'active',
          segment: c.segment || 'new',
          label: c.label || 'yeni',
          acquisitionType: c.acquisitionType || 'diger',
          tags: Array.isArray(c.tags) ? c.tags : [],
          priorityScore: c.priorityScore,
          deviceTrial: c.deviceTrial,
          trialDevice: c.trialDevice,
          trialDate: c.trialDate,
          priceGiven: c.priceGiven,
          purchased: c.purchased,
          purchaseDate: c.purchaseDate,
          deviceType: c.deviceType,
          deviceModel: c.deviceModel,
          overdueAmount: c.overdueAmount,
          sgkStatus: c.sgkStatus,
          sgkSubmittedDate: c.sgkSubmittedDate,
          sgkDeadline: c.sgkDeadline,
          deviceReportRequired: c.deviceReportRequired,
          batteryReportRequired: c.batteryReportRequired,
          batteryReportDue: c.batteryReportDue,
          lastContactDate: c.lastContactDate,
          lastAppointmentDate: c.lastAppointmentDate,
          missedAppointments: c.missedAppointments,
          lastPriorityTaskDate: c.lastPriorityTaskDate,
          renewalContactMade: c.renewalContactMade,
          assignedClinician: c.assignedClinician,
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString(),
          devices: Array.isArray(c.devices) ? c.devices : [],
          notes: Array.isArray(c.notes) ? c.notes : [],
          communications: Array.isArray(c.communications) ? c.communications : [],
          reports: Array.isArray(c.reports) ? c.reports : [],
          ereceiptHistory: Array.isArray(c.ereceiptHistory) ? c.ereceiptHistory : [],
          appointments: Array.isArray(c.appointments) ? c.appointments : [],
          installments: Array.isArray(c.installments) ? c.installments : [],
          sales: Array.isArray(c.sales) ? c.sales : [],
          sgkInfo: c.sgkInfo || { hasInsurance: false },
          sgkWorkflow: c.sgkWorkflow
        };
        return domain;
      }
      return null;
    } catch (error) {
      console.error(`Failed to get cached patient ${patientId}:`, error);
      return null;
    }
  }

  async getCachedPatients(): Promise<Patient[]> {
    try {
      return await indexedDBManager.getPatients();
    } catch (error) {
      console.error('Failed to get cached patients:', error);
      return [];
    }
  }

  async searchCachedPatients(filters: SimpleCacheFilters): Promise<PatientSearchResult> {
    try {
      const allPatients = await this.getCachedPatients();
      let filteredPatients = [...allPatients];

      // Apply filters
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredPatients = filteredPatients.filter(patient =>
          patient.firstName?.toLowerCase().includes(searchTerm) ||
          patient.lastName?.toLowerCase().includes(searchTerm) ||
          patient.phone?.includes(searchTerm) ||
          patient.tcNumber?.includes(searchTerm) ||
          patient.email?.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.status && filters.status.length > 0) {
        filteredPatients = filteredPatients.filter(patient =>
          filters.status!.includes(patient.status)
        );
      }

      if (filters.segment && filters.segment.length > 0) {
        filteredPatients = filteredPatients.filter(patient =>
          filters.segment!.includes(patient.segment)
        );
      }

      if (filters.label && filters.label.length > 0) {
        filteredPatients = filteredPatients.filter(patient =>
          filters.label!.includes(patient.label)
        );
      }

      if (filters.acquisitionType && filters.acquisitionType.length > 0) {
        filteredPatients = filteredPatients.filter(patient =>
          filters.acquisitionType!.includes(patient.acquisitionType)
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredPatients = filteredPatients.filter(patient =>
          patient.tags?.some(tag => filters.tags!.includes(tag))
        );
      }

      if (filters.hasDevices !== undefined) {
        filteredPatients = filteredPatients.filter(patient =>
          filters.hasDevices ? patient.devices && patient.devices.length > 0 : !patient.devices || patient.devices.length === 0
        );
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;
      const paginatedPatients = filteredPatients.slice(offset, offset + limit);

      // Convert to PatientSearchItem format
      const searchItems: PatientSearchItem[] = paginatedPatients.map(patient => ({
        id: patient.id,
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        tcNumber: patient.tcNumber,
        phone: patient.phone,
        email: patient.email,
        status: patient.status,
        segment: patient.segment,
        labels: patient.label ? [patient.label] : [],
        registrationDate: patient.createdAt,
        lastVisitDate: patient.updatedAt,
        deviceCount: patient.devices?.length || 0,
        hasInsurance: !!patient.sgkInfo,
        outstandingBalance: 0, // This would need to be calculated from actual data
        priority: 0 // This would need to be calculated based on business rules
      }));

      return {
        patients: searchItems,
        totalCount: filteredPatients.length,
        filteredCount: filteredPatients.length
      };
    } catch (error) {
      console.error('Failed to search cached patients:', error);
      return {
        patients: [],
        totalCount: 0,
        filteredCount: 0
      };
    }
  }

  async updateCachedPatient(patient: Patient): Promise<void> {
    try {
      await indexedDBManager.updatePatient(patient);
      await indexedDBManager.setCache(`${this.CACHE_PREFIX}${patient.id}`, patient);
    } catch (error) {
      console.error(`Failed to update cached patient ${patient.id}:`, error);
      throw error;
    }
  }

  async removeCachedPatient(patientId: string): Promise<void> {
    try {
      await indexedDBManager.deletePatient(patientId);
      await indexedDBManager.deleteCache(`${this.CACHE_PREFIX}${patientId}`);
    } catch (error) {
      console.error(`Failed to remove cached patient ${patientId}:`, error);
      throw error;
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    try {
      const patients = await this.getCachedPatients();
      const metadata = await indexedDBManager.getCache(this.METADATA_KEY) as any;
      
      const stats: CacheStats = {
        totalPatients: patients.length,
        lastUpdated: metadata?.lastUpdated || null,
        cacheSize: this.calculateCacheSize(patients),
        oldestEntry: null,
        newestEntry: null
      };

      if (patients.length > 0) {
        const sortedByCreated = [...patients].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        stats.oldestEntry = sortedByCreated[0].createdAt;
        stats.newestEntry = sortedByCreated[sortedByCreated.length - 1].createdAt;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalPatients: 0,
        lastUpdated: null,
        cacheSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  async clearCache(): Promise<void> {
    try {
      // Clear all patients from IndexedDB
      const patients = await this.getCachedPatients();
      const deletePromises = patients.map(patient => 
        this.removeCachedPatient(patient.id)
      );
      
      await Promise.all(deletePromises);
      
      // Clear metadata
      await indexedDBManager.deleteCache(this.METADATA_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  async optimizeCache(): Promise<void> {
    try {
      const patients = await this.getCachedPatients();
      
      // Remove old entries if cache is too large
      if (patients.length > this.MAX_CACHE_SIZE) {
        const sortedByUpdated = [...patients].sort((a, b) => 
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
        
        const toRemove = sortedByUpdated.slice(0, patients.length - this.MAX_CACHE_SIZE);
        const removePromises = toRemove.map(patient => 
          this.removeCachedPatient(patient.id)
        );
        
        await Promise.all(removePromises);
      }
    } catch (error) {
      console.error('Failed to optimize cache:', error);
    }
  }

  async isPatientCached(patientId: string): Promise<boolean> {
    try {
      const patient = await this.getCachedPatient(patientId);
      return patient !== null;
    } catch (error) {
      console.error(`Failed to check if patient ${patientId} is cached:`, error);
      return false;
    }
  }

  async preloadPatients(patientIds: string[]): Promise<void> {
    // This would typically fetch patients from API and cache them
    // For now, it's a placeholder for the actual implementation
    console.log('Preloading patients:', patientIds);
  }

  private async updateCacheMetadata(patientCount: number): Promise<void> {
    try {
      const metadata = {
        lastUpdated: new Date().toISOString(),
        patientCount,
        version: '1.0.0'
      };
      
      await indexedDBManager.setCache(this.METADATA_KEY, metadata);
    } catch (error) {
      console.error('Failed to update cache metadata:', error);
    }
  }

  private calculateCacheSize(patients: Patient[]): number {
    // Rough estimation of cache size in bytes
    const jsonString = JSON.stringify(patients);
    return new Blob([jsonString]).size;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export const patientCacheService = new PatientCacheService();