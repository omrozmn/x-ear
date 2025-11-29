// Inventory Statistics Module
class InventoryStats {
    constructor() {
        this.setupEventListeners();
        this.update();
    }

    setupEventListeners() {
        // Listen for inventory updates
        window.addEventListener('inventoryUpdated', () => {
            this.update();
        });
    }

    update() {
        console.log('📊 Updating inventory stats...');
        
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

    calculateStats(items) {
        const totalProducts = items.length;
        let totalValue = 0;
        let lowInventoryCount = 0;
        let activeTrials = 0;
        let hearingAidCount = 0;

        items.forEach(item => {
            const stock = parseInt(item.stock) || 0;
            const minStock = parseInt(item.minStock) || 5; // Default min stock
            const price = parseFloat(item.price) || 0;
            const onTrial = parseInt(item.onTrial) || 0;

            // Total value calculation
            totalValue += stock * price;

            // Low stock count (stock below minimum)
            if (stock > 0 && stock <= minStock) {
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
            activeTrials,
            hearingAidCount,
            accessoryCount: totalProducts - hearingAidCount
        };
    }

    renderStats(stats) {
        console.log('📊 Rendering stats:', stats);
        
        // Total Products
        this.updateStatCard('totalProducts', stats.totalProducts, 'Toplam Ürün');
        
        // Total Value
        this.updateStatCard('totalValue', 
            `₺${stats.totalValue.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`, 
            'Toplam Değer'
        );
        
        // Low Inventory Count
        this.updateStatCard('lowInventoryCount', stats.lowInventoryCount, 'Düşük Stok', 
            stats.lowInventoryCount > 0 ? 'warning' : 'success'
        );
        
        // Active Trials
        this.updateStatCard('activeTrials', stats.activeTrials, 'Aktif Denemeler',
            stats.activeTrials > 0 ? 'info' : 'success'
        );

        // Update progress bars if they exist
        this.updateProgressBars(stats);
    }

    renderEmptyStats() {
        console.log('📊 Rendering empty stats');
        this.updateStatCard('totalProducts', 0, 'Toplam Ürün');
        this.updateStatCard('totalValue', '₺0', 'Toplam Değer');
        this.updateStatCard('lowInventoryCount', 0, 'Düşük Stok');
        this.updateStatCard('activeTrials', 0, 'Aktif Denemeler');
    }

    updateStatCard(elementId, value, label, status = 'normal') {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Update value
        const valueElement = element.querySelector('.stat-value') || element.querySelector('h3');
        if (valueElement) {
            valueElement.textContent = value;
        }

        // Update label
        const labelElement = element.querySelector('.stat-label') || element.querySelector('p');
        if (labelElement) {
            labelElement.textContent = label;
        }

        // Update status styling
        const cardElement = element.closest('.stat-card') || element;
        cardElement.classList.remove('stat-warning', 'stat-error', 'stat-success');
        
        if (status === 'warning') {
            cardElement.classList.add('stat-warning');
        } else if (status === 'error') {
            cardElement.classList.add('stat-error');
        } else if (status === 'success') {
            cardElement.classList.add('stat-success');
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

    generateReport() {
        const allItems = window.inventoryData.getAllInventory();
        const stats = this.calculateStats(allItems);
        
        // Calculate additional report data
        const categoryBreakdown = this.getCategoryBreakdown(allItems);
        const brandBreakdown = this.getBrandBreakdown(allItems);
        const stockAlerts = this.getStockAlerts(allItems);

        const reportData = {
            generatedAt: new Date().toLocaleString('tr-TR'),
            summary: stats,
            categoryBreakdown,
            brandBreakdown,
            stockAlerts,
            totalItems: allItems.length
        };

        this.showReportModal(reportData);
        return reportData;
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
        document.getElementById('reportTotalProducts').textContent = reportData.summary.totalProducts;
        document.getElementById('reportTotalValue').textContent = 
            `₺${reportData.summary.totalValue.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;
        document.getElementById('reportLowStock').textContent = reportData.summary.lowInventoryCount;
        document.getElementById('reportOutOfStock').textContent = reportData.summary.outOfStockCount;

        // Update category breakdown
        const categoryList = document.getElementById('reportCategoryBreakdown');
        if (categoryList) {
            categoryList.innerHTML = Object.entries(reportData.categoryBreakdown)
                .map(([category, data]) => `
                    <div class="flex justify-between py-2 border-b">
                        <span>${category}</span>
                        <span>${data.count} ürün (₺${data.value.toLocaleString('tr-TR')})</span>
                    </div>
                `).join('');
        }

        // Update brand breakdown
        const brandList = document.getElementById('reportBrandBreakdown');
        if (brandList) {
            brandList.innerHTML = Object.entries(reportData.brandBreakdown)
                .map(([brand, data]) => `
                    <div class="flex justify-between py-2 border-b">
                        <span>${brand}</span>
                        <span>${data.count} ürün</span>
                    </div>
                `).join('');
        }

        // Update generation time
        const timeElement = document.getElementById('reportGeneratedAt');
        if (timeElement) {
            timeElement.textContent = reportData.generatedAt;
        }
    }

    closeReportModal() {
        const modal = document.getElementById('inventoryReportModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    exportReport() {
        const reportData = this.generateReport();
        
        // Create CSV content
        const csvContent = this.createReportCSV(reportData);
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    createReportCSV(reportData) {
        const allItems = window.inventoryData.getAllInventory();
        
        const headers = [
            'Ürün Adı', 'Marka', 'Model', 'Kategori', 'Barkod No', 'Seri No', 
            'Stok', 'Min Stok', 'Fiyat', 'Toplam Değer', 'Durum'
        ];

        const rows = allItems.map(item => {
            const stock = item.inventory || 0;
            const minStock = item.minInventory || 0;
            const price = item.price || 0;
            const totalValue = stock * price;
            
            let status = 'Normal';
            if (stock === 0) status = 'Tükendi';
            else if (stock <= minStock) status = 'Düşük Stok';

            return [
                item.name || '',
                item.brand || '',
                item.model || '',
                window.inventoryData.getCategoryText(item.category || item.type),
                item.barcode || '',
                item.serialNumber || '',
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