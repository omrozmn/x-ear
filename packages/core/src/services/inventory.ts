// Types
export interface InventoryItem {
  id: string;
  productName: string;
  brand: string;
  model: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  vatIncludedPrice: number;
  totalValue: number;
  barcode?: string;
  supplier?: string;
  warrantyPeriod?: string;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemRequest {
  productName: string;
  brand: string;
  model?: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  barcode?: string;
  supplier?: string;
  warrantyPeriod?: string;
  status?: 'active' | 'inactive' | 'discontinued';
}

export interface UpdateInventoryItemRequest extends Partial<CreateInventoryItemRequest> {
  id: string;
  vatIncludedPrice?: number;
  totalValue?: number;
}

export interface InventoryFilters {
  search?: string;
  category?: string;
  brand?: string;
  status?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  totalValue: number;
  activeItems: number;
  categories: Array<{
    name: string;
    count: number;
  }>;
  brands: Array<{
    name: string;
    count: number;
  }>;
}

export interface BulkUploadResult {
  success: boolean;
  processed: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

// Simple API client interface for now - will be replaced with Orval generated client
interface ApiClient {
  get(url: string, config?: any): Promise<{ data: any }>;
  post(url: string, data?: any, config?: any): Promise<{ data: any }>;
  put(url: string, data?: any, config?: any): Promise<{ data: any }>;
  patch(url: string, data?: any, config?: any): Promise<{ data: any }>;
  delete(url: string, config?: any): Promise<{ data: any }>;
}

export class InventoryService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get inventory items with filtering and pagination
   */
  async getInventoryItems(filters: InventoryFilters = {}): Promise<InventoryListResponse> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.brand && filters.brand !== 'All') params.append('brand', filters.brand);
    if (filters.status && filters.status !== 'All') params.append('status', filters.status.toLowerCase());
    if (filters.lowStock) params.append('lowStock', 'true');
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await this.apiClient.get(`/inventory?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a single inventory item by ID
   */
  async getInventoryItem(id: string): Promise<InventoryItem> {
    const response = await this.apiClient.get(`/inventory/${id}`);
    return response.data;
  }

  /**
   * Create a new inventory item
   */
  async createInventoryItem(data: CreateInventoryItemRequest): Promise<InventoryItem> {
    // Calculate VAT included price and total value
    const vatIncludedPrice = data.unitPrice * 1.18; // 18% VAT
    const totalValue = data.stock * vatIncludedPrice;

    const payload = {
      ...data,
      vatIncludedPrice,
      totalValue,
      status: data.status || 'active'
    };

    const response = await this.apiClient.post('/inventory', payload);
    return response.data;
  }

  /**
   * Update an existing inventory item
   */
  async updateInventoryItem(data: UpdateInventoryItemRequest): Promise<InventoryItem> {
    const { id, ...updateData } = data;
    
    // Recalculate VAT and total value if price or stock changed
    if (updateData.unitPrice !== undefined || updateData.stock !== undefined) {
      const currentItem = await this.getInventoryItem(id);
      const unitPrice = updateData.unitPrice ?? currentItem.unitPrice;
      const stock = updateData.stock ?? currentItem.stock;
      
      updateData.vatIncludedPrice = unitPrice * 1.18;
      updateData.totalValue = stock * updateData.vatIncludedPrice;
    }

    const response = await this.apiClient.put(`/inventory/${id}`, updateData);
    return response.data;
  }

  /**
   * Delete an inventory item
   */
  async deleteInventoryItem(id: string): Promise<void> {
    await this.apiClient.delete(`/inventory/${id}`);
  }

  /**
   * Delete multiple inventory items
   */
  async deleteInventoryItems(ids: string[]): Promise<void> {
    await this.apiClient.post('/inventory/bulk-delete', { ids });
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStats(): Promise<InventoryStats> {
    const response = await this.apiClient.get('/inventory/stats');
    return response.data;
  }

  /**
   * Upload inventory items from CSV
   */
  async bulkUploadInventory(file: File): Promise<BulkUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.apiClient.post('/inventory/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  }

  /**
   * Export inventory items to CSV
   */
  async exportInventory(filters: InventoryFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.brand && filters.brand !== 'All') params.append('brand', filters.brand);
    if (filters.status && filters.status !== 'All') params.append('status', filters.status.toLowerCase());
    if (filters.lowStock) params.append('lowStock', 'true');

    const response = await this.apiClient.get(`/inventory/export?${params.toString()}`, {
      responseType: 'blob'
    });
    
    return response.data;
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<string[]> {
    const response = await this.apiClient.get('/inventory/categories');
    return response.data;
  }

  /**
   * Get available brands
   */
  async getBrands(): Promise<string[]> {
    const response = await this.apiClient.get('/inventory/brands');
    return response.data;
  }

  /**
   * Check if barcode is unique
   */
  async checkBarcodeUnique(barcode: string, excludeId?: string): Promise<boolean> {
    const params = new URLSearchParams();
    params.append('barcode', barcode);
    if (excludeId) params.append('excludeId', excludeId);

    const response = await this.apiClient.get(`/inventory/check-barcode?${params.toString()}`);
    return response.data.isUnique;
  }

  /**
   * Update stock quantity for an item
   */
  async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<InventoryItem> {
    const response = await this.apiClient.patch(`/inventory/${id}/stock`, {
      quantity,
      operation
    });
    return response.data;
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(): Promise<InventoryItem[]> {
    const response = await this.apiClient.get('/inventory/low-stock');
    return response.data;
  }

  /**
   * Generate barcode for a product
   */
  async generateBarcode(): Promise<string> {
    const response = await this.apiClient.post('/inventory/generate-barcode');
    return response.data.barcode;
  }
}

// Utility functions for inventory calculations
export const InventoryUtils = {
  /**
   * Calculate VAT included price
   */
  calculateVATPrice(unitPrice: number, vatRate: number = 0.18): number {
    return unitPrice * (1 + vatRate);
  },

  /**
   * Calculate total value
   */
  calculateTotalValue(stock: number, unitPrice: number, vatRate: number = 0.18): number {
    const vatIncludedPrice = this.calculateVATPrice(unitPrice, vatRate);
    return stock * vatIncludedPrice;
  },

  /**
   * Check if item is low stock
   */
  isLowStock(item: InventoryItem): boolean {
    return item.stock <= item.minStock;
  },

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = '₺'): string {
    return `${currency}${amount.toFixed(2)}`;
  },

  /**
   * Generate stock status badge variant
   */
  getStockStatusVariant(item: InventoryItem): 'success' | 'warning' | 'danger' {
    if (item.stock === 0) return 'danger';
    if (item.stock <= item.minStock) return 'warning';
    return 'success';
  },

  /**
   * Parse CSV file to inventory items
   */
  async parseCSVFile(file: File): Promise<CreateInventoryItemRequest[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          const items: CreateInventoryItemRequest[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim());
            
            const item: CreateInventoryItemRequest = {
              productName: values[0] || '',
              brand: values[1] || '',
              model: values[2] || '',
              category: values[3] || '',
              stock: parseInt(values[4]) || 0,
              minStock: parseInt(values[5]) || 0,
              unitPrice: parseFloat(values[6]) || 0,
              barcode: values[7] || undefined,
              supplier: values[8] || undefined,
              warrantyPeriod: values[9] || undefined,
              status: (values[10] as 'active' | 'inactive' | 'discontinued') || 'active'
            };
            
            items.push(item);
          }
          
          resolve(items);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  /**
   * Validate inventory item data
   */
  validateInventoryItem(item: Partial<CreateInventoryItemRequest>): string[] {
    const errors: string[] = [];
    
    if (!item.productName?.trim()) {
      errors.push('Product name is required');
    }
    
    if (!item.brand?.trim()) {
      errors.push('Brand is required');
    }
    
    if (!item.category?.trim()) {
      errors.push('Category is required');
    }
    
    if (item.stock !== undefined && item.stock < 0) {
      errors.push('Stock cannot be negative');
    }
    
    if (item.minStock !== undefined && item.minStock < 0) {
      errors.push('Minimum stock cannot be negative');
    }
    
    if (item.unitPrice !== undefined && item.unitPrice < 0) {
      errors.push('Unit price cannot be negative');
    }
    
    return errors;
  }
};

export default InventoryService;