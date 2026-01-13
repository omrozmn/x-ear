import {
  listPatientReplacements,
  createPatientReplacements,
  getReplacement,
  updateReplacementStatus as updateReplacementStatusApi,
  createReplacementInvoice as createReplacementInvoiceApi
} from '@/api/generated/replacements/replacements';
import type { ReplacementCreate, ReplacementStatusUpdate } from '@/api/generated/schemas';
import { getInventory } from '@/api/generated';
import { getCurrentUserId } from '@/utils/auth-utils';
import type {
  DeviceReplacementRequest,
  DeviceReplacementResponse,
  DeviceInfo,
  DeviceReplacementHistory
} from '../types/device-replacement';

export class DeviceReplacementService {
  private readonly STORAGE_KEY = 'xear_device_replacements';

  /**
   * Create a new device replacement record
   */
  async createReplacement(request: DeviceReplacementRequest): Promise<DeviceReplacementResponse> {
    try {
      // Prepare API payload
      const apiPayload: ReplacementCreate = {
        saleId: request.saleId,
        oldDeviceId: request.oldDeviceId,
        newInventoryId: request.newInventoryId,
        oldDeviceInfo: request.oldDeviceInfo as Record<string, unknown> | undefined,
        newDeviceInfo: request.newDeviceInfo as Record<string, unknown> | undefined,
        replacementReason: request.replacementReason,
        priceDifference: request.priceDifference,
        notes: request.notes,
        createdBy: getCurrentUserId()
      };

      // Call the backend API
      const response = await createPatientReplacements(request.patientId, apiPayload);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = response as any;

      if (responseData?.success && responseData?.data) {
        const replacement = this.normalizeReplacementData(responseData.data);

        // If return invoice is requested, create it
        if (request.createReturnInvoice && replacement.id) {
          await this.createReturnInvoice(replacement, request.invoiceType || 'individual');
        }

        return {
          success: true,
          data: replacement,
          timestamp: new Date().toISOString()
        };
      }

      throw new Error('Invalid response from API');

    } catch (error) {
      console.error('Error creating device replacement:', error);

      // Fallback to local storage for offline support
      const fallbackReplacement = await this.createLocalFallback(request);
      return {
        success: true,
        data: fallbackReplacement,
        timestamp: new Date().toISOString(),
        warning: 'Saved locally - will sync when online'
      };
    }
  }

  /**
   * Get replacement history for a patient
   */
  async getPatientReplacements(patientId: string): Promise<DeviceReplacementHistory[]> {
    try {
      const response = await listPatientReplacements(patientId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = response as any;

      if (responseData?.success && Array.isArray(responseData?.data)) {
        return responseData.data.map((d: unknown) => this.normalizeReplacementData(d));
      }

      // Return empty array if no data
      return [];

    } catch (error) {
      console.warn('Backend API unavailable for replacements, using local storage fallback:', error);
      return this.getFromLocalStorage().filter(r => r.patientId === patientId);
    }
  }

  /**
   * Get all replacement history
   */
  async getAllReplacements(): Promise<DeviceReplacementHistory[]> {
    try {
      // Note: Backend doesn't have a "get all" endpoint, fallback to local storage
      // This could be implemented as a paginated list endpoint in the future
      console.warn('getAllReplacements: No backend endpoint available, using local storage');
      return this.getFromLocalStorage();
    } catch (error) {
      console.error('Error fetching all replacements:', error);
      return [];
    }
  }

  /**
   * Update replacement status
   */
  async updateReplacementStatus(
    replacementId: string,
    status: DeviceReplacementHistory['status'],
    notes?: string
  ): Promise<DeviceReplacementResponse> {
    try {
      const updatePayload: ReplacementStatusUpdate = {
        status,
        notes
      };

      const response = await updateReplacementStatusApi(replacementId, updatePayload);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = response as any;

      if (responseData?.success && responseData?.data) {
        return {
          success: true,
          data: this.normalizeReplacementData(responseData.data),
          timestamp: new Date().toISOString()
        };
      }

      throw new Error('Invalid response from API');

    } catch (error) {
      console.error('Error updating replacement status:', error);

      // Update in local storage as fallback
      const replacements = this.getFromLocalStorage();
      const index = replacements.findIndex(r => r.id === replacementId);

      if (index !== -1) {
        replacements[index].status = status;
        replacements[index].updatedAt = new Date().toISOString();
        if (notes) {
          replacements[index].notes = notes;
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(replacements));

        return {
          success: true,
          data: replacements[index],
          timestamp: new Date().toISOString(),
          warning: 'Updated locally - will sync when online'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create return invoice for replacement (calls backend API)
   */
  private async createReturnInvoice(
    replacement: DeviceReplacementHistory,
    invoiceType: 'individual' | 'corporate' | 'e_archive'
  ): Promise<void> {
    try {
      if (!replacement.id) {
        throw new Error('Replacement ID is required');
      }

      const response = await createReplacementInvoiceApi(replacement.id, {
        invoiceType,
        notes: `Return invoice for replacement ${replacement.id}`
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = response as any;

      if (responseData?.success && responseData?.data?.invoice) {
        replacement.returnInvoiceId = responseData.data.invoice.id;
        replacement.returnInvoiceStatus = 'created';
        console.log('Return invoice created:', responseData.data.invoice);
      }
    } catch (error) {
      console.error('Error creating return invoice:', error);
      replacement.returnInvoiceStatus = 'pending';
    }
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(deviceId: string): Promise<DeviceInfo> {
    try {
      console.log('Fetching device info for:', deviceId);
    } catch (error) {
      console.warn('Could not fetch device info from API:', error);
    }

    return {
      brand: 'Unknown',
      model: 'Unknown',
      serialNumber: deviceId,
      deviceType: 'hearing_aid',
      price: 0
    };
  }

  /**
   * Get device information from inventory
   */
  private async getInventoryDeviceInfo(inventoryId: string): Promise<DeviceInfo> {
    try {
      const response = await getInventory(inventoryId);
      if (response) {
        const item = response as { brand?: string; model?: string; availableSerials?: string[]; category?: string; price?: number };
        return {
          brand: item.brand || '',
          model: item.model || '',
          serialNumber: item.availableSerials?.[0] || '',
          deviceType: item.category || '',
          price: item.price || 0
        };
      }
    } catch (error) {
      console.warn('Could not fetch inventory info from API:', error);
    }

    return {
      brand: 'Unknown',
      model: 'Unknown',
      serialNumber: '',
      deviceType: 'Unknown',
      price: 0
    };
  }

  /**
   * Create local fallback replacement for offline support
   */
  private async createLocalFallback(request: DeviceReplacementRequest): Promise<DeviceReplacementHistory> {
    const replacementId = `REPL-LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const replacement: DeviceReplacementHistory = {
      id: replacementId,
      patientId: request.patientId,
      oldDeviceId: request.oldDeviceId,
      newDeviceId: request.newInventoryId || `NEW-${Date.now()}`,
      oldDeviceInfo: await this.getDeviceInfo(request.oldDeviceId),
      newDeviceInfo: request.newDeviceInfo as DeviceInfo || await this.getInventoryDeviceInfo(request.newInventoryId!),
      replacementReason: request.replacementReason,
      replacementDate: new Date().toISOString(),
      replacedBy: getCurrentUserId(),
      status: 'pending',
      notes: request.notes,
      returnInvoiceId: request.createReturnInvoice ? `INV-${Date.now()}` : undefined,
      returnInvoiceStatus: request.createReturnInvoice ? 'pending' : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.saveToLocalStorage(replacement);
    return replacement;
  }

  /**
   * Save replacement to local storage
   */
  private async saveToLocalStorage(replacement: DeviceReplacementHistory): Promise<void> {
    const replacements = this.getFromLocalStorage();
    const existingIndex = replacements.findIndex(r => r.id === replacement.id);

    if (existingIndex !== -1) {
      replacements[existingIndex] = replacement;
    } else {
      replacements.push(replacement);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(replacements));
  }

  /**
   * Get replacements from local storage
   */
  private getFromLocalStorage(): DeviceReplacementHistory[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading from local storage:', error);
      return [];
    }
  }

  /**
   * Normalize replacement data from API
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeReplacementData(data: any): DeviceReplacementHistory {
    return {
      id: data.id,
      patientId: data.patient_id || data.patientId,
      oldDeviceId: data.old_device_id || data.oldDeviceId,
      newDeviceId: data.new_device_id || data.newDeviceId,
      oldDeviceInfo: typeof data.old_device_info === 'string'
        ? JSON.parse(data.old_device_info)
        : data.old_device_info || data.oldDeviceInfo,
      newDeviceInfo: typeof data.new_device_info === 'string'
        ? JSON.parse(data.new_device_info)
        : data.new_device_info || data.newDeviceInfo,
      replacementReason: data.replacement_reason || data.replacementReason || 'other',
      replacementDate: data.replacement_date || data.replacementDate || new Date().toISOString(),
      status: data.status || 'pending',
      priceDifference: data.price_difference || data.priceDifference || 0,
      notes: data.notes,
      replacedBy: data.replaced_by || data.replacedBy || data.created_by || data.createdBy || 'unknown',
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
      returnInvoiceId: data.return_invoice?.id || data.returnInvoiceId || data.return_invoice_id,
      returnInvoiceStatus: data.return_invoice?.status || data.returnInvoiceStatus || 'pending'
    };
  }
}

export const deviceReplacementService = new DeviceReplacementService();