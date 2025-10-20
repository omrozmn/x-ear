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
import { convertOrvalPatient } from './patient-mappers';

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

  // The mapping from Orval patient to domain Patient is provided by
  // 'convertOrvalPatient' in 'services/patient/patient-mappers.ts'.
  // This class intentionally does not duplicate mapping logic.

  private generateId(): string {
    return `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const patientApiService = new PatientApiService();