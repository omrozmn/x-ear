// Inventory Utilities Module
class InventoryUtils {
    constructor() {
        // Utility functions for inventory management
    }

    // Export inventory to CSV
    exportToCSV() {
        const items = window.inventoryData.getAllItems();
        const headers = [
            'ID', 'Ürün Adı', 'Marka', 'Model', 'Kategori', 'Barkod No', 'Seri No', 
            'Stok', 'Min Stok', 'Fiyat', 'Tedarikçi', 'Açıklama'
        ];

        const csvContent = [
            headers.join(','),
            ...items.map(item => [
                item.id,
                item.name || '',
                item.brand || '',
                item.model || '',
                window.inventoryData.getCategoryText(item.category || item.type),
                item.barcode || '',
                item.serialNumber || '',
                item.inventory || 0,
                item.minInventory || 0,
                item.price || 0,
                item.supplier || '',
                (item.description || '').replace(/,/g, ';') // Replace commas to avoid CSV issues
            ].map(field => `"${field}"`).join(','))
        ].join('\n');

        this.downloadCSV(csvContent, 'inventory_export.csv');
    }

    // Export filtered inventory to CSV
    exportFilteredToCSV() {
        const items = window.inventoryData.getFilteredItems();
        const headers = [
            'ID', 'Ürün Adı', 'Marka', 'Model', 'Kategori', 'Barkod No', 'Seri No', 
            'Stok', 'Min Stok', 'Fiyat', 'Tedarikçi', 'Açıklama'
        ];

        const csvContent = [
            headers.join(','),
            ...items.map(item => [
                item.id,
                item.name || '',
                item.brand || '',
                item.model || '',
                window.inventoryData.getCategoryText(item.category || item.type),
                item.barcode || '',
                item.serialNumber || '',
                item.inventory || 0,
                item.minInventory || 0,
                item.price || 0,
                item.supplier || '',
                (item.description || '').replace(/,/g, ';')
            ].map(field => `"${field}"`).join(','))
        ].join('\n');

        this.downloadCSV(csvContent, 'filtered_inventory_export.csv');
    }

    // Download CSV file
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Print inventory list
    printInventory() {
        const items = window.inventoryData.getFilteredItems();
        const printContent = this.generatePrintHTML(items);
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    // Generate HTML for printing
    generatePrintHTML(items) {
        const totalValue = items.reduce((sum, item) => {
            const kdvIncludedPrice = this.getKdvIncludedPrice(item);
            return sum + ((item.inventory || 0) * kdvIncludedPrice);
        }, 0);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Stok Listesi</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .summary { margin-bottom: 20px; padding: 10px; background: #f5f5f5; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .text-right { text-align: right; }
                    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>X-Ear CRM - Stok Listesi</h1>
                    <p>Yazdırma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
                </div>
                
                <div class="summary">
                    <strong>Özet:</strong> ${items.length} ürün, 
                    Toplam Değer: ₺${totalValue.toLocaleString('tr-TR', {minimumFractionDigits: 2})}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Ürün Adı</th>
                            <th>Marka</th>
                            <th>Model</th>
                            <th>Kategori</th>
                            <th>Stok</th>
                            <th>Min Stok</th>
                            <th>Fiyat</th>
                            <th>Toplam Değer</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.name || ''}</td>
                                <td>${item.brand || ''}</td>
                                <td>${item.model || ''}</td>
                                <td>${window.inventoryData.getCategoryText(item.category || item.type)}</td>
                                <td class="text-right">${item.inventory || 0}</td>
                                <td class="text-right">${item.minInventory || 0}</td>
                                <td class="text-right">₺${(item.price || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                                <td class="text-right">₺${((item.inventory || 0) * (item.price || 0)).toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <p>X-Ear CRM Stok Yönetim Sistemi</p>
                </div>
            </body>
            </html>
        `;
    }

    // Generate barcode (simple implementation)
    generateBarcode() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return timestamp.slice(-7) + random;
    }

    // Validate barcode format
    validateBarcode(barcode) {
        if (!barcode) return true; // Optional field
        
        // Check if it's numeric and has reasonable length
        const isNumeric = /^\d+$/.test(barcode);
        const hasValidLength = barcode.length >= 8 && barcode.length <= 13;
        
        return isNumeric && hasValidLength;
    }

    // Format currency
    formatCurrency(amount) {
        return `₺${(amount || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;
    }

    // Format stock status
    formatStockStatus(item) {
        const stock = item.inventory || 0;
        const minStock = item.minInventory || 0;
        
        if (stock === 0) {
            return { text: 'Tükendi', class: 'text-red-600 bg-red-100' };
        } else if (stock <= minStock) {
            return { text: 'Düşük Stok', class: 'text-yellow-600 bg-yellow-100' };
        } else {
            return { text: 'Normal', class: 'text-green-600 bg-green-100' };
        }
    }

    // Search items by multiple criteria
    searchItems(query, items = null) {
        const searchItems = items || window.inventoryData.getAllItems();
        const searchTerm = query.toLowerCase();
        
        return searchItems.filter(item => 
            (item.name && item.name.toLowerCase().includes(searchTerm)) ||
            (item.brand && item.brand.toLowerCase().includes(searchTerm)) ||
            (item.model && item.model.toLowerCase().includes(searchTerm)) ||
            (item.barcode && item.barcode.toLowerCase().includes(searchTerm)) ||
            (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm)) ||
            (item.description && item.description.toLowerCase().includes(searchTerm))
        );
    }

    // Get low stock items
    getLowStockItems() {
        return window.inventoryData.getAllItems().filter(item => {
            const stock = item.inventory || 0;
            const minStock = item.minInventory || 0;
            return stock > 0 && stock <= minStock;
        });
    }

    // Get out of stock items
    getOutOfStockItems() {
        return window.inventoryData.getAllItems().filter(item => 
            (item.inventory || 0) === 0
        );
    }

    // Calculate inventory value
    calculateInventoryValue(items = null) {
        const calcItems = items || window.inventoryData.getAllItems();
        return calcItems.reduce((total, item) => {
            const kdvIncludedPrice = this.getKdvIncludedPrice(item);
            return total + ((item.inventory || 0) * kdvIncludedPrice);
        }, 0);
    }

    // Get items by category
    getItemsByCategory(category) {
        return window.inventoryData.getAllItems().filter(item => 
            (item.category === category) || (item.type === category)
        );
    }

    // Get items by brand
    getItemsByBrand(brand) {
        return window.inventoryData.getAllItems().filter(item => 
            (item.brand === brand)
        );
    }

    // Helper function to get KDV rate for an item
    getKdvRateForItem(item) {
        const hasExplicit = typeof item.kdvRate === 'number' && !isNaN(item.kdvRate);
        if (hasExplicit) return item.kdvRate;
        const category = item.category || item.type;
        return category === 'hearing_aid' ? 0 : 20;
    }

    // Helper function to get KDV-inclusive price
    getKdvIncludedPrice(item) {
        const basePrice = parseFloat(item.price) || 0;
        const explicitIncl = typeof item.priceWithKdv === 'number' && !isNaN(item.priceWithKdv) ? item.priceWithKdv : null;
        if (explicitIncl !== null) return explicitIncl;
        const rate = this.getKdvRateForItem(item);
        return basePrice * (1 + rate / 100);
    }

    // Debounce function for search/filter operations
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Show confirmation dialog
    confirm(message, callback) {
        if (window.confirm(message)) {
            callback();
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        if (window.Utils && window.Utils.showToast) {
            window.Utils.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Local storage helpers
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    loadFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    }
}

// Export for global use
window.InventoryUtils = InventoryUtils;