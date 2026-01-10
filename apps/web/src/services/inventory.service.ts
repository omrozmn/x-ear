// Inventory Service for X-Ear CRM
// Modern TypeScript service for inventory management

import {
  InventoryItem,
  CreateInventoryData,
  UpdateInventoryData,
  InventoryFilters,
  InventoryStats,
  InventoryStatus,
  InventoryMovement,
  StockUpdate,
  InventorySearchResult,
  SerialNumberAssignment,
  InventoryCategory,
  LowStockAlert,
  BulkInventoryOperation,
  BulkOperationResult
} from '../types/inventory';
import { INVENTORY_DATA } from '../constants/storage-keys';
import { outbox } from '../utils/outbox';
import { searchProducts, FuzzySearchResult } from '../utils/fuzzy-search';
import { searchAnalytics } from '../utils/search-analytics';
import { getCurrentUserId } from '../utils/auth-utils';

export class InventoryService {
  private storageKey = INVENTORY_DATA;
  private listeners: Set<(items: InventoryItem[]) => void> = new Set();

  constructor() {
    this.setupStorageListener();
  }

  private setupStorageListener(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        const items = this.loadInventory();
        this.notifyListeners(items);
      }
    });
  }

  private notifyListeners(items: InventoryItem[]): void {
    this.listeners.forEach(listener => listener(items));
  }

  public subscribe(listener: (items: InventoryItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private loadInventory(): InventoryItem[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load inventory from storage:', error);
      return [];
    }
  }

  private saveInventory(items: InventoryItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
      this.notifyListeners(items);
    } catch (error) {
      console.error('Failed to save inventory to storage:', error);
      throw new Error('Failed to save inventory data');
    }
  }

  // CRUD Operations
  async getAllItems(): Promise<InventoryItem[]> {
    try {
      // Use Orval mutator to fetch from API
      const { customInstance } = await import('../api/orval-mutator');
      const response = await customInstance<{ data: InventoryItem[] }>({
        url: '/api/inventory',
        method: 'GET'
      });

      // Orval mutator returns the response body directly in the promise resolution
      // If the body is { data: [...] }, then response.data is the array
      // However, if the existing code uses response.data.data, we should be careful.
      // Based on createItem usage: response.data.data
      // But based on orval-mutator implementation: it returns body.
      // If body is { data: Item }, then response.data is Item.
      // If createItem thinks response is AxiosResponse, it might be accessing response.data (body) then .data (property).
      // Let's inspect what we have.

      // Safe access:
      const items = (response as any).data || (response as any).items || [];
      if (Array.isArray(items)) {
        this.saveInventory(items);
        return items;
      }
      return [];
    } catch (error) {
      console.warn('Failed to fetch inventory from API, falling back to local storage:', error);
      return this.loadInventory();
    }
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    const items = this.loadInventory();
    return items.find(item => item.id === id) || null;
  }

  async createItem(data: CreateInventoryData): Promise<InventoryItem> {
    try {
      // Use Orval axios for auth handling
      const { customInstance } = await import('../api/orval-mutator');
      const response = await customInstance<{ data: InventoryItem }>({
        url: '/api/inventory',
        method: 'POST',
        data,
      });

      const newItem = response.data;

      // Clear localStorage cache to force refresh from API
      localStorage.removeItem(this.storageKey);

      return newItem;
    } catch (error) {
      console.error('Create item error:', error);
      throw error;
    }
  }

  async updateItem(id: string, data: UpdateInventoryData): Promise<InventoryItem> {
    try {
      // Use Orval axios for auth handling
      const { customInstance } = await import('../api/orval-mutator');
      const response = await customInstance<{ data: InventoryItem }>({
        url: `/api/inventory/${id}`,
        method: 'PUT',
        data,
      });

      const updatedItem = response.data;

      // Clear localStorage cache to force refresh from API
      localStorage.removeItem(this.storageKey);

      return updatedItem;
    } catch (error) {
      console.error('Update item error:', error);
      throw error;
    }
  }

  async updateItemLegacy(id: string, data: UpdateInventoryData): Promise<InventoryItem> {
    const items = this.loadInventory();
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error('Inventory item not found');
    }

    // Check for duplicate barcode (if changed)
    if (data.barcode && data.barcode !== items[index].barcode) {
      if (items.some(item => item.id !== id && item.barcode === data.barcode)) {
        throw new Error('Barcode already exists');
      }
    }

    const updatedItem: InventoryItem = {
      ...items[index],
      ...data,
      lastUpdated: new Date().toISOString()
    };

    // Update status based on stock levels
    if (data.availableInventory !== undefined) {
      if (data.availableInventory === 0) {
        updatedItem.status = 'out_of_stock';
      } else if (data.availableInventory <= updatedItem.reorderLevel) {
        updatedItem.status = 'low_stock';
      } else {
        updatedItem.status = 'available';
      }
    }

    items[index] = updatedItem;
    this.saveInventory(items);

    // Queue for sync
    await outbox.addOperation({
      method: 'PUT',
      endpoint: `/api/inventory/${id}`,
      data: updatedItem,
      headers: {
        'Idempotency-Key': `update-inventory-${id}-${Date.now()}`
      }
    });

    return updatedItem;
  }

  async deleteItem(id: string): Promise<void> {
    const items = this.loadInventory();
    const index = items.findIndex(item => item.id === id);

    if (index === -1) {
      throw new Error('Inventory item not found');
    }

    // Remove from local storage immediately (optimistic UI)
    items.splice(index, 1);
    this.saveInventory(items);

    try {
      const { customInstance } = await import('../api/orval-mutator');
      await customInstance({
        url: `/api/inventory/${id}`,
        method: 'DELETE',
        headers: {
          'Idempotency-Key': `delete-inventory-${id}-${Date.now()}`
        }
      });
    } catch (error) {
      console.warn('API delete failed, falling back to outbox:', error);
      // Queue for sync
      await outbox.addOperation({
        method: 'DELETE',
        endpoint: `/api/inventory/${id}`,
        headers: {
          'Idempotency-Key': `delete-inventory-${id}-${Date.now()}`
        }
      });
    }
  }

  // Search and Filter
  async searchItems(filters: InventoryFilters & { enableFuzzySearch?: boolean; maxResults?: number }): Promise<InventorySearchResult> {
    const startTime = performance.now();
    const allItems = this.loadInventory();
    let filteredItems = [...allItems];

    // Apply search filter with fuzzy search support
    if (filters.search) {
      if (filters.enableFuzzySearch) {
        // Use fuzzy search for better matching
        const fuzzyResults = searchProducts(filters.search, allItems, {
          maxResults: filters.maxResults || 50,
          threshold: 0.3,
          enablePhonetic: true,
          enableTypoTolerance: true,
          weights: {
            name: 0.4,
            brand: 0.3,
            model: 0.2,
            barcode: 0.1
          }
        });

        // Extract items from fuzzy search results and maintain order by relevance
        filteredItems = fuzzyResults.map(result => result.item as InventoryItem);

        // Track search analytics
        const executionTime = performance.now() - startTime;
        searchAnalytics.trackSearch({
          query: filters.search,
          resultCount: filteredItems.length,
          searchType: 'fuzzy',
          executionTime,
          context: 'inventory'
        });
      } else {
        // Fallback to basic string matching
        const searchTerm = filters.search.toLowerCase();
        filteredItems = filteredItems.filter(item =>
          item.name.toLowerCase().includes(searchTerm) ||
          item.brand.toLowerCase().includes(searchTerm) ||
          item.model?.toLowerCase().includes(searchTerm) ||
          item.supplier?.toLowerCase().includes(searchTerm) ||
          item.barcode?.toLowerCase().includes(searchTerm)
        );

        // Track search analytics
        const executionTime = performance.now() - startTime;
        searchAnalytics.trackSearch({
          query: filters.search,
          resultCount: filteredItems.length,
          searchType: 'basic',
          executionTime,
          context: 'inventory'
        });
      }
    }

    if (filters.category) {
      filteredItems = filteredItems.filter(item => item.category === filters.category);
    }

    if (filters.brand) {
      filteredItems = filteredItems.filter(item => item.brand === filters.brand);
    }

    if (filters.status) {
      filteredItems = filteredItems.filter(item => item.status === filters.status);
    }

    if (filters.lowStock) {
      filteredItems = filteredItems.filter(item =>
        item.availableInventory <= item.reorderLevel
      );
    }

    if (filters.outOfStock) {
      filteredItems = filteredItems.filter(item => item.availableInventory === 0);
    }

    if (filters.supplier) {
      filteredItems = filteredItems.filter(item => item.supplier === filters.supplier);
    }

    if (filters.minPrice !== undefined) {
      filteredItems = filteredItems.filter(item => item.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      filteredItems = filteredItems.filter(item => item.price <= filters.maxPrice!);
    }

    if (filters.hasSerials !== undefined) {
      filteredItems = filteredItems.filter(item =>
        filters.hasSerials ?
          (item.availableSerials && item.availableSerials.length > 0) :
          (!item.availableSerials || item.availableSerials.length === 0)
      );
    }

    if (filters.isMinistryTracked !== undefined) {
      filteredItems = filteredItems.filter(item =>
        item.isMinistryTracked === filters.isMinistryTracked
      );
    }

    const stats = this.calculateStats(allItems);

    return {
      items: filteredItems,
      total: filteredItems.length,
      filters,
      stats
    };
  }

  // Stock Management
  async updateStock(update: StockUpdate): Promise<InventoryItem> {
    const items = this.loadInventory();
    const index = items.findIndex(item => item.id === update.itemId);

    if (index === -1) {
      throw new Error('Inventory item not found');
    }

    const item = items[index];
    let newQuantity: number;

    switch (update.operation) {
      case 'add':
        newQuantity = item.availableInventory + update.quantity;
        item.totalInventory += update.quantity;
        break;
      case 'subtract':
        newQuantity = item.availableInventory - update.quantity;
        item.usedInventory = (item.usedInventory || 0) + update.quantity;
        break;
      case 'set':
        newQuantity = update.quantity;
        item.totalInventory = update.quantity + (item.usedInventory || 0);
        break;
      default:
        throw new Error('Invalid operation');
    }

    if (newQuantity < 0) {
      throw new Error('Insufficient inventory');
    }

    item.availableInventory = newQuantity;
    item.lastUpdated = new Date().toISOString();

    // Update status based on new quantity
    if (newQuantity === 0) {
      item.status = 'out_of_stock';
    } else if (newQuantity <= item.reorderLevel) {
      item.status = 'low_stock';
    } else {
      item.status = 'available';
    }

    // Handle serial numbers if provided
    if (update.serialNumbers && update.serialNumbers.length > 0) {
      if (!item.availableSerials) {
        item.availableSerials = [];
      }

      if (update.operation === 'add') {
        item.availableSerials.push(...update.serialNumbers);
      } else if (update.operation === 'subtract') {
        update.serialNumbers.forEach(serial => {
          const serialIndex = item.availableSerials!.indexOf(serial);
          if (serialIndex > -1) {
            item.availableSerials!.splice(serialIndex, 1);
          }
        });
      }
    }

    items[index] = item;
    this.saveInventory(items);

    // Log the movement
    await this.logMovement({
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId: update.itemId,
      type: update.operation === 'add' ? 'in' : 'out',
      quantity: Math.abs(update.quantity),
      reason: update.reason || 'Stock adjustment',
      reference: update.notes,
      serialNumbers: update.serialNumbers,
      performedBy: getCurrentUserId(),
      createdAt: new Date().toISOString(),
      notes: update.notes
    });

    // Queue for sync
    await outbox.addOperation({
      method: 'PUT',
      endpoint: `/api/inventory/${update.itemId}/stock`,
      data: update,
      headers: {
        'Idempotency-Key': `stock-update-${update.itemId}-${Date.now()}`
      }
    });

    return item;
  }

  // Statistics and Analytics
  async getStats(): Promise<InventoryStats> {
    const items = this.loadInventory();
    return this.calculateStats(items);
  }

  private calculateStats(items: InventoryItem[]): InventoryStats {
    const stats: InventoryStats = {
      total: items.length,
      available: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0,
      activeTrials: 0,
      byCategory: {} as Record<InventoryCategory, number>,
      byBrand: {},
      byStatus: {} as Record<InventoryStatus, number>,
      recentlyUpdated: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    items.forEach(item => {
      // Status counts
      if (item.availableInventory > 0) {
        stats.available++;
      }
      if (item.availableInventory <= item.reorderLevel) {
        stats.lowStock++;
      }
      if (item.availableInventory === 0) {
        stats.outOfStock++;
      }

      // Total value
      stats.totalValue += item.availableInventory * item.price;

      // Active trials count - sum up all items currently on trial
      if (item.onTrial && item.onTrial > 0) {
        stats.activeTrials += item.onTrial;
      }

      // By category
      stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;

      // By brand
      stats.byBrand[item.brand] = (stats.byBrand[item.brand] || 0) + 1;

      // By status
      const status = item.status || 'available';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Recently updated
      if (new Date(item.lastUpdated) > oneWeekAgo) {
        stats.recentlyUpdated++;
      }
    });

    return stats;
  }

  // Low Stock Alerts
  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const items = this.loadInventory();
    const alerts: LowStockAlert[] = [];

    items.forEach(item => {
      if (item.availableInventory <= item.reorderLevel) {
        alerts.push({
          item,
          currentStock: item.availableInventory,
          reorderLevel: item.reorderLevel,
          suggestedOrderQuantity: Math.max(item.reorderLevel * 2, 10)
        });
      }
    });

    return alerts.sort((a, b) => a.currentStock - b.currentStock);
  }

  // Serial Number Management
  async assignSerialNumber(itemId: string, serialNumber: string, patientId?: string): Promise<SerialNumberAssignment> {
    const items = this.loadInventory();
    const item = items.find(i => i.id === itemId);

    if (!item) {
      throw new Error('Inventory item not found');
    }

    if (!item.availableSerials || !item.availableSerials.includes(serialNumber)) {
      throw new Error('Serial number not available');
    }

    // Remove from available serials
    const serialIndex = item.availableSerials.indexOf(serialNumber);
    item.availableSerials.splice(serialIndex, 1);

    // Decrease available inventory
    item.availableInventory--;
    item.usedInventory = (item.usedInventory || 0) + 1;
    item.lastUpdated = new Date().toISOString();

    this.saveInventory(items);

    const assignment: SerialNumberAssignment = {
      serialNumber,
      itemId,
      patientId,
      assignedAt: new Date().toISOString(),
      status: patientId ? 'assigned' : 'trial'
    };

    // Queue for sync
    await outbox.addOperation({
      method: 'POST',
      endpoint: `/api/inventory/${itemId}/serial`,
      data: { serialNumber, patientId },
      headers: {
        'Idempotency-Key': `assign-serial-${itemId}-${serialNumber}-${Date.now()}`
      }
    });

    return assignment;
  }

  // Movement Logging
  private async logMovement(movement: InventoryMovement): Promise<void> {
    // Store movements in a separate storage key
    const movementsKey = `${this.storageKey}_movements`;
    try {
      const stored = localStorage.getItem(movementsKey);
      const movements: InventoryMovement[] = stored ? JSON.parse(stored) : [];
      movements.push(movement);

      // Keep only last 1000 movements
      if (movements.length > 1000) {
        movements.splice(0, movements.length - 1000);
      }

      localStorage.setItem(movementsKey, JSON.stringify(movements));
    } catch (error) {
      console.error('Failed to log inventory movement:', error);
    }
  }

  async getMovements(itemId?: string): Promise<InventoryMovement[]> {
    const movementsKey = `${this.storageKey}_movements`;
    try {
      const stored = localStorage.getItem(movementsKey);
      const movements: InventoryMovement[] = stored ? JSON.parse(stored) : [];

      if (itemId) {
        return movements.filter(m => m.itemId === itemId);
      }

      return movements;
    } catch (error) {
      console.error('Failed to load inventory movements:', error);
      return [];
    }
  }

  // Bulk Operations
  async bulkOperation(operation: BulkInventoryOperation): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      processed: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < operation.items.length; i++) {
      const item = operation.items[i];
      result.processed++;

      try {
        switch (operation.type) {
          case 'import':
            if (item.id && await this.getItemById(item.id)) {
              if (operation.options?.updateExisting) {
                await this.updateItem(item.id, item as UpdateInventoryData);
                result.updated++;
              } else {
                throw new Error('Item already exists');
              }
            } else {
              await this.createItem(item as CreateInventoryData);
              result.created++;
            }
            break;

          case 'update':
            if (!item.id) {
              throw new Error('Item ID required for update');
            }
            await this.updateItem(item.id, item as UpdateInventoryData);
            result.updated++;
            break;

          case 'delete':
            if (!item.id) {
              throw new Error('Item ID required for delete');
            }
            await this.deleteItem(item.id);
            break;

          default:
            throw new Error('Unsupported operation type');
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          index: i,
          item,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  // Utility Methods
  async getCategories(): Promise<InventoryCategory[]> {
    const items = this.loadInventory();
    const categories = new Set<InventoryCategory>();
    items.forEach(item => categories.add(item.category));
    return Array.from(categories);
  }

  async getBrands(): Promise<string[]> {
    const items = this.loadInventory();
    const brands = new Set<string>();
    items.forEach(item => brands.add(item.brand));
    return Array.from(brands).sort();
  }

  async getSuppliers(): Promise<string[]> {
    const items = this.loadInventory();
    const suppliers = new Set<string>();
    items.forEach(item => {
      if (item.supplier) {
        suppliers.add(item.supplier);
      }
    });
    return Array.from(suppliers).sort();
  }
  async getUnits(): Promise<string[]> {
    try {
      // Use Orval mutator for auth
      const { customInstance } = await import('../api/orval-mutator');
      const response = await customInstance<{ data: { units: string[] } }>({
        url: '/api/inventory/units',
        method: 'GET'
      });
      return response.data?.units || [];
    } catch (error) {
      console.warn('Failed to fetch units, using defaults:', error);
      return ['adet', 'kutu', 'paket', 'set'];
    }
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();