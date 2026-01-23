// Minimal Orval wrapper / api client adapter
// Keep this file small: only basic fetch wrapper and example method used by Inventory
import { apiClient } from '../api/orval-mutator';

export type InventoryItem = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
};

export const apiClientExtended = {
  async getInventorys(): Promise<InventoryItem[]> {
    // In real app wrap orval client calls here
    // Since customInstance unwraps data, we just return it
    const response = await apiClient.get<InventoryItem[]>('/inventory');
    return response.data;
  },

  async get<T>(path: string): Promise<{ data: T }> {
    const response = await apiClient.get<T>(path);
    // Maintain legacy { data: T } structure for compatibility if needed, 
    // butOrval usually returns data directly. 
    // Here we wrap it back for call-sites that expect it.
    return { data: response.data };
  },

  async post<T>(path: string, body: unknown): Promise<{ data: T }> {
    const response = await apiClient.post<T>(path, body);
    return { data: response.data };
  },

  async put<T>(path: string, body: unknown): Promise<{ data: T }> {
    const response = await apiClient.put<T>(path, body);
    return { data: response.data };
  },

  async delete(path: string): Promise<{ data: unknown }> {
    const response = await apiClient.delete<unknown>(path);
    return { data: response.data };
  },
};

// For backward compatibility while we refactor imports
export const apiClientLegacy = apiClientExtended;
export { apiClientLegacy as apiClient };
