import {
  listReplacements as listPartyReplacements,
  createReplacement as createPartyReplacements,
  getReplacement,
  updateReplacementStatus as updateReplacementStatusApi,
  createReplacementInvoice as createReplacementInvoiceApi
} from '@/api/client/replacements.client';
import type { ReplacementCreate, ReplacementStatusUpdate } from '@/api/generated/schemas';
import { getInventory } from '@/api/client/inventory.client';
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
      const response = await createPartyReplacements(request.partyId, apiPayload);

      const responseData = response as Record<string, unknown>;

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
   * Get replacement history for a party
   */
  async getPartyReplacements(partyId: string): Promise<DeviceReplacementHistory[]> {
    try {
      const response = await listPartyReplacements(partyId);

      const responseData = response as Record<string, unknown>;

      if (responseData?.success && Array.isArray(responseData?.data)) {
        return responseData.data.map((d: unknown) => this.normalizeReplacementData(d));
      }

      // Return empty array if no data
      return [];

    } catch (error) {
      console.warn('Backend API unavailable for replacements, using local storage fallback:', error);
      return this.getFromLocalStorage().filter(r => r.partyId === partyId);
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

      const responseData = response as Record<string, unknown>;

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

      const responseData = response as Record<string, unknown>;

      if (responseData?.success && (responseData?.data as Record<string, unknown>)?.invoice) {
        const invoice = (responseData.data as Record<string, unknown>).invoice as Record<string, unknown>;
        replacement.returnInvoiceId = invoice.id as string;
        replacement.returnInvoiceStatus = 'created';
        console.log('Return invoice created:', invoice);
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
        const item = response as Record<string, unknown>;
        return {
          brand: (item.brand as string) || '',
          model: (item.model as string) || '',
          serialNumber: ((item.availableSerials as string[])?.[0]) || '',
          deviceType: (item.category as string) || '',
          price: (item.price as number) || 0
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
      partyId: request.partyId,
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
  private normalizeReplacementData(data: unknown): DeviceReplacementHistory {
    const d = data as Record<string, unknown>;
    return {
      id: d.id as string,
      partyId: (d.party_id || d.partyId) as string,
      oldDeviceId: (d.old_device_id || d.oldDeviceId) as string,
      newDeviceId: (d.new_device_id || d.newDeviceId) as string,
      oldDeviceInfo: typeof d.old_device_info === 'string'
        ? JSON.parse(d.old_device_info)
        : (d.old_device_info || d.oldDeviceInfo) as DeviceInfo,
      newDeviceInfo: typeof d.new_device_info === 'string'
        ? JSON.parse(d.new_device_info)
        : (d.new_device_info || d.newDeviceInfo) as DeviceInfo,
      replacementReason: (d.replacement_reason || d.replacementReason || 'other') as DeviceReplacementHistory['replacementReason'],
      replacementDate: (d.replacement_date || d.replacementDate || new Date().toISOString()) as string,
      status: (d.status || 'pending') as DeviceReplacementHistory['status'],
      priceDifference: (d.price_difference || d.priceDifference || 0) as number,
      notes: d.notes as string | undefined,
      replacedBy: (d.replaced_by || d.replacedBy || d.created_by || d.createdBy || 'unknown') as string,
      createdAt: (d.created_at || d.createdAt || new Date().toISOString()) as string,
      updatedAt: (d.updated_at || d.updatedAt || new Date().toISOString()) as string,
      returnInvoiceId: ((d.return_invoice as Record<string, unknown>)?.id || d.returnInvoiceId || d.return_invoice_id) as string | undefined,
      returnInvoiceStatus: ((d.return_invoice as Record<string, unknown>)?.status || d.returnInvoiceStatus || 'pending') as DeviceReplacementHistory['returnInvoiceStatus']
    };
  }
}

export const deviceReplacementService = new DeviceReplacementService();