// Inventory Statistics Module
class InventoryStats {
    constructor() {
        this.setupEventListeners();
        this.update();
    }

    setupEventListeners() {
        // Listen for inventory updates
        window.addEventListener('inventoryUpdated', () => {
            console.log('📊 Received inventoryUpdated event');
            this.update();
        });
        
        // Also listen for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => this.update(), 500);
        });
    }

    async update() {
        console.log('📊 Updating inventory stats...');
        
        try {
            // Try to get stats from API first
            console.log('📊 Attempting to fetch stats from API...');
            const apiStats = await this.fetchStatsFromAPI();
            if (apiStats) {
                console.log('📊 Using API stats:', apiStats);
                this.renderStats(apiStats);
                return;
            }
        } catch (error) {
            console.warn('📊 API stats failed, falling back to local calculation:', error);
        }
        
        // Fallback to local calculation
        if (!window.inventoryData) {
            console.warn('InventoryData not available yet');
            return;
        }
        
        const allItems = window.inventoryData.getAllInventory();
        console.log('Total items for stats:', allItems.length);
        
        if (allItems.length === 0) {
            console.warn('No inventory items found');
            this.renderEmptyStats();
            return;
        }
        
        const stats = this.calculateStats(allItems);
        console.log('Calculated stats:', stats);
        this.renderStats(stats);
    }

    async fetchStatsFromAPI() {
        try {
            // Check if the API function is available
            if (typeof window.inventoryGetInventoryStats !== 'function') {
                console.error('📊 inventoryGetInventoryStats function not found on window object');
                console.log('📊 Available window properties:', Object.keys(window).filter(key => key.includes('inventory')));
                throw new Error('inventoryGetInventoryStats function not available');
            }
            
            console.log('📊 Calling inventoryGetInventoryStats...');
            const response = await window.inventoryGetInventoryStats();
            console.log('📊 API Response:', response);
            
            // Check if response has error status
            if (response.status >= 400) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            // Handle both success and error responses
            if (!response.data.success) {
                throw new Error(response.data.error || 'API returned error');
            }
            
            const data = response.data.data;
            
            // Calculate hearing aid count from category breakdown
            let hearingAidCount = 0;
            if (data.categoryBreakdown) {
                Object.keys(data.categoryBreakdown).forEach(category => {
                    if (category.includes('hearing') || category.includes('işitme') || 
                        category === 'hearing_aid' || category === 'hearing_device') {
                        hearingAidCount += data.categoryBreakdown[category].count;
                    }
                });
            }
            
            // Map API response to our stats format
            return {
                totalProducts: data.totalItems,
                totalValue: data.totalValue,
                lowInventoryCount: data.lowStockCount,
                outOfStockCount: data.outOfStockCount,
                activeTrials: 0, // Not available from API yet
                hearingAidCount: hearingAidCount,
                accessoryCount: data.totalItems - hearingAidCount,
                categoryBreakdown: data.categoryBreakdown || {},
                brandBreakdown: data.brandBreakdown || {}
            };
            
        } catch (error) {
            console.error('📊 Failed to fetch stats from API:', error);
            console.error('📊 Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                response: error.response,
                toString: error.toString(),
                valueOf: error.valueOf()
            });
            console.error('📊 Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            return null;
        }
    }

    calculateStats(items) {
        const totalProducts = items.length;
        let totalValue = 0;
        let lowInventoryCount = 0;
        let outOfStockCount = 0;
        let activeTrials = 0;
        let hearingAidCount = 0;

        items.forEach(item => {
            // Try different field names for compatibility
            const stock = parseInt(item.inventory) || parseInt(item.availableInventory) || parseInt(item.stock) || 0;
            const minStock = parseInt(item.minInventory) || parseInt(item.reorderLevel) || parseInt(item.minStock) || 5;
            const price = parseFloat(item.price) || 0;
            const onTrial = parseInt(item.onTrial) || 0;

            console.log(`Item: ${item.name}, Stock: ${stock}, MinStock: ${minStock}, Price: ${price}, OnTrial: ${onTrial}`);

            // Total value calculation
            totalValue += stock * price;

            // Stock status counts
            if (stock === 0) {
                outOfStockCount++;
            } else if (stock <= minStock) {
                lowInventoryCount++;
            }

            // Active trials count
            if (onTrial > 0) {
                activeTrials += onTrial;
            }

            // Category counts - check for hearing aid categories
            const category = item.category || '';
            if (category.includes('hearing') || category.includes('işitme') || 
                category === 'hearing_aid' || category === 'hearing_device') {
                hearingAidCount++;
            }
        });

        return {
            totalProducts,
            totalValue,
            lowInventoryCount,
            outOfStockCount,
            activeTrials,
            hearingAidCount,
            accessoryCount: totalProducts - hearingAidCount
        };
    }

    renderStats(stats) {
        console.log('📊 Rendering stats:', stats);
        
        // Ensure stats object has all required properties with defaults
        const safeStats = {
            totalProducts: stats?.totalProducts || 0,
            totalValue: stats?.totalValue || 0,
            lowInventoryCount: stats?.lowInventoryCount || 0,
            outOfStockCount: stats?.outOfStockCount || 0,
            activeTrials: stats?.activeTrials || 0,
            hearingAidCount: stats?.hearingAidCount || 0,
            accessoryCount: stats?.accessoryCount || 0
        };
        
        // Total Products
        this.updateStatCard('totalProducts', safeStats.totalProducts, 'Toplam Ürün');
        
        // Total Value - ensure it's a number before calling toLocaleString
        const totalValueFormatted = typeof safeStats.totalValue === 'number' && !isNaN(safeStats.totalValue) 
            ? `₺${safeStats.totalValue.toLocaleString('tr-TR', {minimumFractionDigits: 2})}` 
            : '₺0,00';
        
        this.updateStatCard('totalValue', totalValueFormatted, 'Toplam Değer');
        
        // Low Inventory Count
        this.updateStatCard('lowInventoryCount', safeStats.lowInventoryCount, 'Düşük Stok', 
            safeStats.lowInventoryCount > 0 ? 'warning' : 'success'
        );
        
        // Active Trials
        this.updateStatCard('activeTrials', safeStats.activeTrials, 'Aktif Denemeler',
            safeStats.activeTrials > 0 ? 'info' : 'success'
        );

        // Update progress bars if they exist
        this.updateProgressBars(safeStats);
    }

    renderEmptyStats() {
        console.log('📊 Rendering empty stats');
        this.updateStatCard('totalProducts', 0, 'Toplam Ürün');
        this.updateStatCard('totalValue', '₺0', 'Toplam Değer');
        this.updateStatCard('lowInventoryCount', 0, 'Düşük Stok');
        this.updateStatCard('activeTrials', 0, 'Aktif Denemeler');
    }

    updateStatCard(elementId, value, label, status = 'normal') {
        console.log(`📊 Updating stat card: ${elementId} = ${value}`);
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element not found: ${elementId}`);
            return;
        }

        // Update value directly (element is the <p> tag itself)
        element.textContent = value;
        console.log(`✅ Updated ${elementId} to ${value}`);
        
        // Update parent card styling based on status
        const cardElement = element.closest('.card');
        if (cardElement) {
            cardElement.classList.remove('stat-warning', 'stat-error', 'stat-success');
            
            if (status === 'warning') {
                cardElement.classList.add('stat-warning');
            } else if (status === 'error') {
                cardElement.classList.add('stat-error');
            } else if (status === 'success') {
                cardElement.classList.add('stat-success');
            }
        }


    }

    updateProgressBars(stats) {
        // Category distribution
        const hearingPercentage = stats.totalProducts > 0 ? 
            (stats.hearingAidCount / stats.totalProducts) * 100 : 0;
        
        this.updateProgressBar('categoryProgress', hearingPercentage, 
            `İşitme Cihazları: ${stats.hearingAidCount} (${hearingPercentage.toFixed(1)}%)`
        );

        // Stock status distribution
        const healthyStockCount = stats.totalProducts - stats.lowInventoryCount - stats.outOfStockCount;
        const healthyPercentage = stats.totalProducts > 0 ? 
            (healthyStockCount / stats.totalProducts) * 100 : 0;
        
        this.updateProgressBar('stockHealthProgress', healthyPercentage,
            `Sağlıklı Stok: ${healthyStockCount} (${healthyPercentage.toFixed(1)}%)`
        );
    }

    updateProgressBar(elementId, percentage, label) {
        const container = document.getElementById(elementId);
        if (!container) return;

        const progressBar = container.querySelector('.progress-bar');
        const progressLabel = container.querySelector('.progress-label');

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }

        if (progressLabel) {
            progressLabel.textContent = label;
        }
    }

    async generateReport() {
        try {
            // Get fresh data from API for the report
            const apiStats = await this.fetchStatsFromAPI();
            
            let stats, categoryBreakdown, brandBreakdown, stockAlerts, items;
            
            if (apiStats) {
                console.log('📊 Using API data for report');
                stats = apiStats;
                categoryBreakdown = apiStats.categoryBreakdown || {};
                brandBreakdown = apiStats.brandBreakdown || {};
                
                // Get items for stock alerts
                items = await this.fetchAllItemsFromAPI();
                if (items) {
                    stockAlerts = this.getStockAlerts(items);
                } else {
                    // Fallback to local items for stock alerts
                    items = window.inventoryData.getAllInventory();
                    stockAlerts = this.getStockAlerts(items);
                }
            } else {
                console.log('📊 Using local data for report');
                items = window.inventoryData.getAllInventory();
                stats = this.calculateStats(items);
                categoryBreakdown = this.getCategoryBreakdown(items);
                brandBreakdown = this.getBrandBreakdown(items);
                stockAlerts = this.getStockAlerts(items);
            }

            const reportData = {
                generatedAt: new Date().toLocaleString('tr-TR'),
                summary: stats,
                categoryBreakdown,
                brandBreakdown,
                stockAlerts,
                totalItems: items.length
            };

            this.showReportModal(reportData);
            return reportData;
            
        } catch (error) {
            console.error('📊 Error generating report:', error);
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Rapor oluşturulurken hata oluştu', 'error');
            }
            return null;
        }
    }

    async fetchAllItemsFromAPI() {
        try {
            const response = await inventoryGetInventoryItems();
            
            if (response.status !== 200) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            if (!response.data.success) {
                throw new Error(response.data.error || 'API returned error');
            }
            
            return response.data.data || [];
            
        } catch (error) {
            console.error('📊 Failed to fetch items from API:', error);
            return null;
        }
    }

    getCategoryBreakdown(items) {
        const breakdown = {};
        
        items.forEach(item => {
            const category = item.category || item.type || 'Diğer';
            const categoryText = window.inventoryData.getCategoryText(category);
            
            if (!breakdown[categoryText]) {
                breakdown[categoryText] = { count: 0, value: 0 };
            }
            
            breakdown[categoryText].count++;
            breakdown[categoryText].value += (item.inventory || 0) * (item.price || 0);
        });

        return breakdown;
    }

    getBrandBreakdown(items) {
        const breakdown = {};
        
        items.forEach(item => {
            const brand = item.brand || 'Bilinmeyen';
            
            if (!breakdown[brand]) {
                breakdown[brand] = { count: 0, value: 0 };
            }
            
            breakdown[brand].count++;
            breakdown[brand].value += (item.inventory || 0) * (item.price || 0);
        });

        // Sort by count descending
        return Object.entries(breakdown)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 10) // Top 10 brands
            .reduce((obj, [brand, data]) => {
                obj[brand] = data;
                return obj;
            }, {});
    }

    getStockAlerts(items) {
        const alerts = {
            outOfStock: [],
            lowStock: [],
            overStock: []
        };

        items.forEach(item => {
            const stock = item.inventory || 0;
            const minStock = item.minInventory || 0;
            const maxStock = minStock * 5; // Assume max stock is 5x min stock

            if (stock === 0) {
                alerts.outOfStock.push(item);
            } else if (stock <= minStock) {
                alerts.lowStock.push(item);
            } else if (stock > maxStock) {
                alerts.overStock.push(item);
            }
        });

        return alerts;
    }

    showReportModal(reportData) {
        const modal = document.getElementById('inventoryReportModal');
        if (!modal) return;

        // Update report content
        this.updateReportContent(reportData);
        
        // Show modal
        modal.classList.remove('hidden');
    }

    updateReportContent(reportData) {
        // Update summary stats
        const reportTotalProducts = document.getElementById('reportTotalProducts');
        if (reportTotalProducts) {
            reportTotalProducts.textContent = reportData.summary.totalProducts || 0;
        }
        
        const reportTotalValue = document.getElementById('reportTotalValue');
        if (reportTotalValue) {
            const formattedValue = `₺${(reportData.summary.totalValue || 0).toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;
            reportTotalValue.textContent = formattedValue;
        }
        
        const reportLowStock = document.getElementById('reportLowStock');
        if (reportLowStock) {
            reportLowStock.textContent = reportData.summary.lowInventoryCount || 0;
        }
        
        const reportOutOfStock = document.getElementById('reportOutOfStock');
        if (reportOutOfStock) {
            reportOutOfStock.textContent = reportData.summary.outOfStockCount || 0;
        }

        // Update category breakdown
        const categoryList = document.getElementById('reportCategoryBreakdown');
        if (categoryList && reportData.categoryBreakdown) {
            const categoryEntries = Object.entries(reportData.categoryBreakdown);
            if (categoryEntries.length > 0) {
                categoryList.innerHTML = categoryEntries
                    .map(([category, data]) => `
                        <div class="flex justify-between py-2 border-b border-gray-200 last:border-b-0">
                            <span class="font-medium">${this.getCategoryDisplayName(category)}</span>
                            <span class="text-gray-600">${data.count} ürün (₺${data.value.toLocaleString('tr-TR')})</span>
                        </div>
                    `).join('');
            } else {
                categoryList.innerHTML = '<div class="text-gray-500 text-center py-4">Kategori verisi bulunamadı</div>';
            }
        }

        // Update brand breakdown
        const brandList = document.getElementById('reportBrandBreakdown');
        if (brandList && reportData.brandBreakdown) {
            const brandEntries = Object.entries(reportData.brandBreakdown);
            if (brandEntries.length > 0) {
                brandList.innerHTML = brandEntries
                    .map(([brand, data]) => `
                        <div class="flex justify-between py-2 border-b border-gray-200 last:border-b-0">
                            <span class="font-medium">${brand}</span>
                            <span class="text-gray-600">${data.count} ürün (₺${data.value.toLocaleString('tr-TR')})</span>
                        </div>
                    `).join('');
            } else {
                brandList.innerHTML = '<div class="text-gray-500 text-center py-4">Marka verisi bulunamadı</div>';
            }
        }

        // Update stock alerts
        if (reportData.stockAlerts) {
            const outOfStockItems = document.getElementById('reportOutOfStockItems');
            if (outOfStockItems) {
                if (reportData.stockAlerts.outOfStock && reportData.stockAlerts.outOfStock.length > 0) {
                    outOfStockItems.innerHTML = reportData.stockAlerts.outOfStock
                        .slice(0, 10) // Show max 10 items
                        .map(item => `<div class="py-1">• ${item.name} (${item.brand || 'Marka yok'})</div>`)
                        .join('');
                } else {
                    outOfStockItems.innerHTML = '<div class="text-green-600">Tükenen ürün yok</div>';
                }
            }

            const lowStockItems = document.getElementById('reportLowStockItems');
            if (lowStockItems) {
                if (reportData.stockAlerts.lowStock && reportData.stockAlerts.lowStock.length > 0) {
                    lowStockItems.innerHTML = reportData.stockAlerts.lowStock
                        .slice(0, 10) // Show max 10 items
                        .map(item => {
                            const stock = item.available_inventory || item.inventory || 0;
                            const minStock = item.reorder_level || item.minInventory || 0;
                            return `<div class="py-1">• ${item.name} (Stok: ${stock}/${minStock})</div>`;
                        })
                        .join('');
                } else {
                    lowStockItems.innerHTML = '<div class="text-green-600">Düşük stok ürünü yok</div>';
                }
            }
        }

        // Update generation time
        const timeElement = document.getElementById('reportGeneratedAt');
        if (timeElement) {
            timeElement.textContent = reportData.generatedAt;
        }
    }

    getCategoryDisplayName(category) {
        const categoryMap = {
            'hearing_aid': '🦻 İşitme Cihazı',
            'aksesuar': '🔌 Aksesuar', 
            'pil': '🔋 Pil',
            'bakim': '🧽 Bakım',
            'accessory': '🔌 Aksesuar',
            'battery': '🔋 Pil',
            'maintenance': '🧽 Bakım'
        };
        return categoryMap[category] || category || 'Diğer';
    }

    closeReportModal() {
        const modal = document.getElementById('inventoryReportModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async exportReport() {
        try {
            // Get fresh data for export
            let items = await this.fetchAllItemsFromAPI();
            
            if (!items) {
                console.log('📊 API failed, using local data for export');
                items = window.inventoryData.getAllInventory();
            }
            
            if (!items || items.length === 0) {
                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast('Dışa aktarılacak veri bulunamadı', 'warning');
                }
                return;
            }
            
            // Create CSV content
            const csvContent = this.createReportCSV({ items });
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Rapor başarıyla indirildi', 'success');
            }
            
        } catch (error) {
            console.error('📊 Error exporting report:', error);
            if (window.Utils && window.Utils.showToast) {
                window.Utils.showToast('Rapor indirme sırasında hata oluştu', 'error');
            }
        }
    }

    createReportCSV(reportData) {
        const allItems = reportData.items || window.inventoryData.getAllInventory();
        
        const headers = [
            'Ürün Adı', 'Marka', 'Model', 'Kategori', 'Barkod No', 'Seri No', 
            'Stok', 'Min Stok', 'Fiyat', 'Toplam Değer', 'Durum'
        ];

        const rows = allItems.map(item => {
            // Handle both API and local data field names
            const stock = item.available_inventory || item.inventory || 0;
            const minStock = item.reorder_level || item.minInventory || 0;
            const price = item.price || 0;
            const totalValue = stock * price;
            
            let status = 'Normal';
            if (stock === 0) status = 'Tükendi';
            else if (stock <= minStock) status = 'Düşük Stok';

            // Get category text
            let categoryText = item.category || item.type || 'Diğer';
            if (window.inventoryData && window.inventoryData.getCategoryText) {
                categoryText = window.inventoryData.getCategoryText(categoryText);
            }

            return [
                item.name || '',
                item.brand || '',
                item.model || '',
                categoryText,
                item.barcode || '',
                item.serial_number || item.serialNumber || '',
                stock,
                minStock,
                price.toFixed(2),
                totalValue.toFixed(2),
                status
            ].map(field => `"${field}"`).join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    }
}

// Export for global use
window.InventoryStats = InventoryStats;