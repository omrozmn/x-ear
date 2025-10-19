/**
 * Patient API Service
 * @fileoverview API communication for patient data
 * @version 1.0.0
 */

import { AxiosResponse } from 'axios';
import { 
  patientsGetPatients, 
  PatientsGetPatients200,
  Patient as OrvalPatient,
  PaginationInfo
} from '../../generated/orval-api';
import type { Patient } from '../../types/patient';

export class PatientApiService {
  /**
   * Fetch all patients from API using cursor-based pagination
   */
  async fetchAllPatients(): Promise<OrvalPatient[]> {
    const aggregated: OrvalPatient[] = [];
    let cursor: string | undefined;
    const perPage = 100;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const params: any = { per_page: perPage };
        if (cursor) {
          params.cursor = cursor;
        }
        
        // eslint-disable-next-line no-await-in-loop
        const resp: AxiosResponse<PatientsGetPatients200> = await patientsGetPatients(params);
        const payload = resp?.data;
        
        if (!payload || !Array.isArray(payload.data)) {
          break;
        }

        const chunk = payload.data;
        aggregated.push(...chunk);

        // Check if there are more pages using cursor-based pagination
        const pagination = payload.pagination;
        if (!pagination?.hasNext || !pagination?.nextCursor) {
          break;
        }
        
        cursor = pagination.nextCursor;
        
        // Safety check to prevent infinite loops
        if (aggregated.length > 10000) {
          console.warn('⚠️ Reached safety limit of 10,000 patients');
          break;
        }
      }

      console.log(`✅ Fetched ${aggregated.length} patients from API`);
      return aggregated;
      
    } catch (error) {
      console.error('❌ Failed to fetch patients from API:', error);
      throw error;
    }
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
      const newPatient: OrvalPatient = {
        ...patientData,
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as OrvalPatient;
      
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
      
      const updatedPatient: OrvalPatient = {
        ...existingPatient,
        ...updates,
        updatedAt: new Date().toISOString()
      } as OrvalPatient;
      
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
   * Convert Orval patient to internal Patient type
   */
  private convertOrvalPatient(orvalPatient: OrvalPatient): Patient {
    // Convert Orval patient type to internal Patient type
    // Note: Many fields in our internal Patient type don't exist in Orval Patient
    // We'll map what we can and provide defaults for the rest
    
    const fullName = `${orvalPatient.firstName || ''} ${orvalPatient.lastName || ''}`.trim();
    
    return {
      id: orvalPatient.id || '',
      name: fullName,
      firstName: orvalPatient.firstName,
      lastName: orvalPatient.lastName,
      phone: orvalPatient.phone,
      tcNumber: orvalPatient.tcNumber || (orvalPatient as any).tc_number,
      birthDate: orvalPatient.birthDate || (orvalPatient as any).birth_date,
      email: orvalPatient.email,
      address: (orvalPatient as any).addressFull || (orvalPatient as any).address_full,
      
      // Map status and classification with proper defaults
      status: (orvalPatient.status === 'active' || orvalPatient.status === 'inactive') 
        ? orvalPatient.status as Patient['status']
        : 'active',
      segment: 'new', // Default since Orval doesn't have our segment enum
      label: 'yeni', // Default since Orval doesn't have our label enum  
      acquisitionType: (orvalPatient as any).acquisitionType || 'diger',
      
      // Initialize arrays and optional fields
      tags: orvalPatient.tags || [],
      priorityScore: orvalPatient.priorityScore || (orvalPatient as any).priority_score,
      
      // Device information - initialize with defaults since Orval may not have these
      deviceTrial: (orvalPatient as any).deviceTrial || false,
      trialDevice: (orvalPatient as any).trialDevice,
      trialDate: (orvalPatient as any).trialDate,
      priceGiven: (orvalPatient as any).priceGiven,
      purchased: (orvalPatient as any).purchased || false,
      purchaseDate: (orvalPatient as any).purchaseDate,
      deviceType: (orvalPatient as any).deviceType as Patient['deviceType'],
      deviceModel: (orvalPatient as any).deviceModel,
      overdueAmount: (orvalPatient as any).overdueAmount,
      
      // SGK information
      sgkStatus: (orvalPatient as any).sgkStatus as Patient['sgkStatus'],
      sgkSubmittedDate: (orvalPatient as any).sgkSubmittedDate,
      sgkDeadline: (orvalPatient as any).sgkDeadline,
      
      // Reports
      deviceReportRequired: (orvalPatient as any).deviceReportRequired,
      batteryReportRequired: (orvalPatient as any).batteryReportRequired,
      batteryReportDue: (orvalPatient as any).batteryReportDue,
      
      // Contact information
      lastContactDate: (orvalPatient as any).lastContactDate,
      lastAppointmentDate: (orvalPatient as any).lastAppointmentDate,
      missedAppointments: (orvalPatient as any).missedAppointments,
      lastPriorityTaskDate: (orvalPatient as any).lastPriorityTaskDate,
      renewalContactMade: (orvalPatient as any).renewalContactMade,
      assignedClinician: (orvalPatient as any).assignedClinician,
      
      // Related data - initialize empty arrays
      devices: (orvalPatient as any).devices || [],
      notes: (orvalPatient as any).notes || [],
      communications: (orvalPatient as any).communications || [],
      reports: (orvalPatient as any).reports || [],
      ereceiptHistory: (orvalPatient as any).ereceiptHistory || [],
      appointments: (orvalPatient as any).appointments || [],
      installments: (orvalPatient as any).installments || [],
      sales: (orvalPatient as any).sales || [],
      
      // SGK information - convert from generic object to our SGK structure
      sgkInfo: {
        hasInsurance: false,
        ...((orvalPatient as any).sgkInfo || (orvalPatient as any).sgk_info || {})
      },
      sgkWorkflow: (orvalPatient as any).sgkWorkflow,
      
      // Metadata
      createdAt: orvalPatient.createdAt || new Date().toISOString(),
      updatedAt: orvalPatient.updatedAt || new Date().toISOString(),
    } as Patient;
  }

  private generateId(): string {
    return `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const patientApiService = new PatientApiService();