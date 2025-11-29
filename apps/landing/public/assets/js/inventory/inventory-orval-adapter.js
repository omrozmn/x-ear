/**
 * Inventory Orval Adapter
 * Simplified adapter using only Orval API functions
 */

class InventoryOrvalAdapter {
    constructor() {
        this.orvalAPI = null;
        this.init();
    }

    async init() {
        try {
            // Load Orval wrapper
            if (window.orvalInventoryAPI) {
                this.orvalAPI = window.orvalInventoryAPI;
                console.log('✅ Orval Inventory API loaded successfully');
            } else {
                throw new Error('Orval API not available');
            }
        } catch (error) {
            console.error('❌ Orval API required but not available:', error);
            throw error;
        }
    }

    /**
     * Get inventory items using Orval API
     */
    async getInventoryItems(params = {}) {
        if (!this.orvalAPI) {
            throw new Error('Orval API not initialized');
        }

        try {
            return await this.orvalAPI.getInventoryItems(params);
        } catch (error) {
            console.error('Error fetching inventory items:', error);
            throw error;
        }
    }

    /**
     * Create inventory item using Orval API
     */
    async createInventoryItem(itemData) {
        if (!this.orvalAPI) {
            throw new Error('Orval API not initialized');
        }

        try {
            return await this.orvalAPI.createInventoryItem(itemData);
        } catch (error) {
            console.error('Error creating inventory item:', error);
            throw error;
        }
    }

    /**
     * Delete inventory item using Orval API
     */
    async deleteInventoryItem(itemId) {
        if (!this.orvalAPI) {
            throw new Error('Orval API not initialized');
        }

        try {
            return await this.orvalAPI.deleteInventoryItem(itemId);
        } catch (error) {
            console.error('Error deleting inventory item:', error);
            throw error;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            orvalAvailable: !!this.orvalAPI,
            mode: 'orval-only'
        };
    }
}

// Initialize the adapter
window.inventoryOrvalAdapter = new InventoryOrvalAdapter();

console.log('🔧 Inventory Orval Adapter loaded (Orval-only mode).');