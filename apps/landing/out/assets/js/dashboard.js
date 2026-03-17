/**
 * Dashboard Manager - Handles dashboard functionality and real-time updates
 */

class DashboardManager {
    constructor() {
        this.refreshInterval = null;
        this.charts = {};
        this.kpis = {};
        // Initialize asynchronously to allow awaiting backend calls
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.renderKPIs();
        this.renderCharts();
        this.renderRecentActivities();
        this.renderPriorityPatients(); // New: Show priority patients
        this.renderAutomationInsights(); // New: Show automation activity
        this.renderQuickActions();
        this.bindEvents();
        this.startAutoRefresh();
    }

    async loadDashboardData() {
        // Try to fetch from backend if available; otherwise fall back to local sample data
        try {
            if (window.BackendServiceManager) {
                const initialized = await window.BackendServiceManager.initialize();
                if (initialized) {
                    const svc = window.BackendServiceManager.getService('dashboard');
                    if (svc && svc.getKPIs) {
                        const resp = await svc.getKPIs();
                        // Support both { success: true, ... } and flat shapes
                        if (resp && (resp.success || resp.totalPatients || resp.total_patients)) {
                            this.kpis = {
                                totalPatients: resp.totalPatients ?? resp.total_patients ?? 0,
                                todayAppointments: resp.todayAppointments ?? 0,
                                pendingTasks: resp.pendingTasks ?? 0,
                                monthlyRevenue: resp.estimatedRevenue ?? resp.monthlyRevenue ?? 0,
                                newPatientsThisMonth: resp.newPatientsThisMonth ?? 0,
                                deviceTrialsActive: resp.deviceTrialsActive ?? 0,
                                sgkReportsPending: resp.sgkReportsPending ?? 0,
                                inventoryLowInventory: resp.availableDevices ?? resp.inventoryLowInventory ?? 0
                            };
                            return;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Dashboard backend fetch failed, falling back to sample data:', err);
        }

        // Fallback to existing local/sample calculation
        this.applySampleDataFallback();
    }

    applySampleDataFallback() {
        this.kpis = {
            totalPatients: window.sampleData?.patients?.length || 0,
            todayAppointments: this.getTodayAppointments(),
            pendingTasks: this.getPendingTasks(),
            monthlyRevenue: this.getMonthlyRevenue(),
            newPatientsThisMonth: this.getNewPatientsThisMonth(),
            deviceTrialsActive: this.getActiveDeviceTrials(),
            sgkReportsPending: this.getPendingSGKReports(),
            inventoryLowInventory: this.getLowInventoryItems()
        };
    }

    bindEvents() {
        // Quick action buttons
        const quickAddPatient = document.getElementById('quick-add-patient');
        const quickAddAppointment = document.getElementById('quick-add-appointment');
        const quickViewInventory = document.getElementById('quick-view-inventory');
        const quickViewReports = document.getElementById('quick-view-reports');

        if (quickAddPatient) {
            quickAddPatient.addEventListener('click', () => this.quickAddPatient());
        }

        if (quickAddAppointment) {
            quickAddAppointment.addEventListener('click', () => this.quickAddAppointment());
        }

        if (quickViewInventory) {
            quickViewInventory.addEventListener('click', () => this.quickViewInventory());
        }

        if (quickViewReports) {
            quickViewReports.addEventListener('click', () => this.quickViewReports());
        }

        // Refresh button
        const refreshBtn = document.getElementById('dashboard-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Date range selector
        const dateRange = document.getElementById('date-range-selector');
        if (dateRange) {
            dateRange.addEventListener('change', () => this.updateDateRange());
        }
    }

    // Handle global filters from AppState
    async handleGlobalFilters(filters = {}) {
        if (filters.patients && filters.patients.trim().length > 0) {
            await this.searchPatients(filters.patients.trim());
        } else {
            const results = document.getElementById('patient-search-results');
            if (results) results.classList.add('hidden');
        }
    }

    // Perform backend patient search and render dropdown
    async searchPatients(term) {
        const resultsContainer = document.getElementById('patient-search-results');
        if (!resultsContainer) return;

        // show loading
        resultsContainer.innerHTML = `<div class="p-3 text-sm text-gray-600">Aranıyor...</div>`;
        resultsContainer.classList.remove('hidden');

        try {
            if (!window.BackendServiceManager) {
                resultsContainer.innerHTML = `<div class="p-3 text-sm text-gray-600">Arama servisi kullanılamıyor</div>`;
                return;
            }

            await window.BackendServiceManager.initialize();
            const svc = window.BackendServiceManager.getService('patients');
            if (!svc || typeof svc.search !== 'function') {
                resultsContainer.innerHTML = `<div class="p-3 text-sm text-gray-600">Arama servisinde hata</div>`;
                return;
            }

            const resp = await svc.search(term, { per_page: 10, page: 1 });
            // Accept both array response or { data: [...] }
            let items = [];
            if (Array.isArray(resp)) items = resp;
            else if (Array.isArray(resp.data)) items = resp.data;
            else if (Array.isArray(resp.items)) items = resp.items;
            else if (resp && resp.success && Array.isArray(resp.results)) items = resp.results;

            if (!items || items.length === 0) {
                resultsContainer.innerHTML = `<div class="p-3 text-sm text-gray-600">Hasta bulunamadı</div>`;
                return;
            }

            const html = items.slice(0,10).map(p => {
                const name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
                const phone = p.phone || p.phoneNumber || '';
                return `<div class="px-3 py-2 hover:bg-gray-100 cursor-pointer" data-patient-id="${p.id}">
                            <div class="text-sm font-medium">${name}</div>
                            <div class="text-xs text-gray-500">${phone}</div>
                        </div>`;
            }).join('');

            resultsContainer.innerHTML = html;

            // Attach click handlers to navigate
            resultsContainer.querySelectorAll('[data-patient-id]').forEach(el => {
                el.addEventListener('click', (e) => {
                    const pid = el.dataset.patientId;
                    window.location.href = `patient-details-modular.html?id=${encodeURIComponent(pid)}`;
                });
            });
        } catch (err) {
            console.error('Patient search error:', err);
            resultsContainer.innerHTML = `<div class="p-3 text-sm text-red-600">Arama sırasında hata oluştu</div>`;
        }
    }

    renderKPIs() {
        // Main KPI cards
        const kpiCards = [
            {
                id: 'total-patients',
                title: 'Toplam Hasta',
                value: this.kpis.totalPatients,
                icon: 'users',
                color: 'blue',
                trend: '+12%',
                trendDirection: 'up'
            },
            {
                id: 'today-appointments',
                title: 'Bugünkü Randevular',
                value: this.kpis.todayAppointments,
                icon: 'calendar',
                color: 'green',
                trend: '+5%',
                trendDirection: 'up'
            },
            {
                id: 'pending-tasks',
                title: 'Bekleyen Görevler',
                value: this.kpis.pendingTasks,
                icon: 'clock',
                color: 'yellow',
                trend: '-8%',
                trendDirection: 'down'
            },
            {
                id: 'monthly-revenue',
                title: 'Aylık Gelir',
                value: Utils.formatCurrency(this.kpis.monthlyRevenue),
                icon: 'currency',
                color: 'purple',
                trend: '+15%',
                trendDirection: 'up'
            }
        ];

        const kpiContainer = document.getElementById('kpi-cards');
        if (kpiContainer) {
            kpiContainer.innerHTML = kpiCards.map(kpi => this.renderKPICard(kpi)).join('');
        }

        // Secondary KPIs
        const secondaryKPIs = [
            {
                id: 'new-patients-month',
                title: 'Bu Ay Yeni Hastalar',
                value: this.kpis.newPatientsThisMonth,
                change: '+23%'
            },
            {
                id: 'device-trials-active',
                title: 'Aktif Cihaz Denemeleri',
                value: this.kpis.deviceTrialsActive,
                change: '+12%'
            },
            {
                id: 'sgk-reports-pending',
                title: 'Bekleyen SGK Raporları',
                value: this.kpis.sgkReportsPending,
                change: '-5%'
            },
            {
                id: 'inventory-low-inventory',
                title: 'Düşük Stok Uyarısı',
                value: this.kpis.inventoryLowInventory,
                change: '+2%'
            }
        ];

        const secondaryContainer = document.getElementById('secondary-kpis');
        if (secondaryContainer) {
            secondaryContainer.innerHTML = secondaryKPIs.map(kpi => `
                <div class="flex justify-between items-center py-2">
                    <span class="text-sm text-gray-600">${kpi.title}</span>
                    <div class="flex items-center space-x-2">
                        <span class="font-semibold">${kpi.value}</span>
                        <span class="text-xs ${kpi.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}">
                            ${kpi.change}
                        </span>
                    </div>
                </div>
            `).join('');
        }
    }

    renderKPICard(kpi) {
        const iconSvg = this.getIconSvg(kpi.icon);
        const colorClasses = this.getColorClasses(kpi.color);
        
        return `
            <div class="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-600">${kpi.title}</p>
                        <p class="text-2xl font-bold text-gray-900 mt-1">${kpi.value}</p>
                        <div class="flex items-center mt-2">
                            <svg class="w-4 h-4 ${kpi.trendDirection === 'up' ? 'text-green-500' : 'text-red-500'} mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${kpi.trendDirection === 'up' ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}"></path>
                            </svg>
                            <span class="text-sm ${kpi.trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}">${kpi.trend}</span>
                        </div>
                    </div>
                    <div class="p-3 ${colorClasses.bg} rounded-lg">
                        ${iconSvg}
                    </div>
                </div>
            </div>
        `;
    }

    renderCharts() {
        this.renderDynamicTrendChart();
        this.renderPatientFunnelChart();
        this.renderDeviceDistributionChart();
    }

    renderDynamicTrendChart() {
        const container = document.getElementById('dynamic-trend-chart');
        if (!container) return;

        const dateRange = document.getElementById('date-range-selector')?.value || 'week';
        const chartData = this.getChartDataForRange(dateRange);

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">${chartData.title}</h3>
                    <select id="chart-type-selector" class="text-sm border border-gray-300 rounded px-2 py-1">
                        <option value="appointments">Randevular</option>
                        <option value="revenue">Gelir</option>
                        <option value="patients">Yeni Hastalar</option>
                    </select>
                </div>
                <div class="h-64">
                    <canvas id="trend-chart-canvas" width="400" height="200"></canvas>
                </div>
            </div>
        `;

        // Initialize the chart
        this.initializeTrendChart(chartData);
        
        // Bind chart type selector
        const chartTypeSelector = document.getElementById('chart-type-selector');
        if (chartTypeSelector) {
            chartTypeSelector.addEventListener('change', () => {
                this.updateTrendChart();
            });
        }
    }

    renderPatientFunnelChart() {
        const container = document.getElementById('patient-funnel-chart');
        if (!container) return;

        const funnelData = [
            { stage: 'İlk Görüşme', count: 45, percentage: 100 },
            { stage: 'İşitme Testi', count: 38, percentage: 84 },
            { stage: 'Cihaz Denemesi', count: 28, percentage: 62 },
            { stage: 'Satış', count: 18, percentage: 40 }
        ];

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Hasta Dönüşüm Hunisi</h3>
                <div class="space-y-3">
                    ${funnelData.map(item => `
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-gray-600">${item.stage}</span>
                            <div class="flex items-center space-x-3">
                                <div class="w-32 bg-gray-200 rounded-full h-2">
                                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${item.percentage}%"></div>
                                </div>
                                <span class="text-sm font-semibold w-8">${item.count}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getChartDataForRange(dateRange) {
        const chartType = document.getElementById('chart-type-selector')?.value || 'appointments';
        
        switch (dateRange) {
            case 'today':
                return this.getTodayChartData(chartType);
            case 'week':
                return this.getWeekChartData(chartType);
            case 'month':
                return this.getMonthChartData(chartType);
            case 'quarter':
                return this.getQuarterChartData(chartType);
            default:
                return this.getWeekChartData(chartType);
        }
    }

    getTodayChartData(chartType) {
        const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
        const data = chartType === 'appointments' ? [0, 0, 3, 8, 5, 2] : 
                    chartType === 'revenue' ? [0, 0, 15000, 40000, 25000, 10000] :
                    [0, 0, 1, 2, 1, 0];
        
        return {
            title: `Bugünkü ${this.getChartTypeLabel(chartType)}`,
            labels,
            data,
            chartType
        };
    }

    getWeekChartData(chartType) {
        const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const data = chartType === 'appointments' ? [12, 15, 8, 18, 22, 6, 3] : 
                    chartType === 'revenue' ? [60000, 75000, 40000, 90000, 110000, 30000, 15000] :
                    [3, 4, 2, 5, 6, 2, 1];
        
        return {
            title: `Son 1 Hafta ${this.getChartTypeLabel(chartType)}`,
            labels,
            data,
            chartType
        };
    }

    getMonthChartData(chartType) {
        const labels = ['1. Hafta', '2. Hafta', '3. Hafta', '4. Hafta'];
        const data = chartType === 'appointments' ? [84, 92, 76, 88] : 
                    chartType === 'revenue' ? [420000, 460000, 380000, 440000] :
                    [23, 26, 19, 24];
        
        return {
            title: `Son 1 Ay ${this.getChartTypeLabel(chartType)}`,
            labels,
            data,
            chartType
        };
    }

    getQuarterChartData(chartType) {
        const labels = ['1. Ay', '2. Ay', '3. Ay'];
        const data = chartType === 'appointments' ? [340, 356, 312] : 
                    chartType === 'revenue' ? [1700000, 1780000, 1560000] :
                    [92, 98, 84];
        
        return {
            title: `Son Çeyrek ${this.getChartTypeLabel(chartType)}`,
            labels,
            data,
            chartType
        };
    }

    getChartTypeLabel(chartType) {
        switch (chartType) {
            case 'appointments': return 'Randevu Trendi';
            case 'revenue': return 'Gelir Trendi';
            case 'patients': return 'Yeni Hasta Trendi';
            default: return 'Trend';
        }
    }

    initializeTrendChart(chartData) {
        const canvas = document.getElementById('trend-chart-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Simple chart implementation without Chart.js
        this.drawSimpleChart(ctx, chartData);
    }

    drawSimpleChart(ctx, chartData) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set styles
        ctx.strokeStyle = '#2563eb';
        ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
        ctx.lineWidth = 2;
        ctx.font = '12px Arial';
        
        const data = chartData.data;
        const labels = chartData.labels;
        const maxValue = Math.max(...data) * 1.1;
        const minValue = Math.min(...data);
        const valueRange = maxValue - minValue || 1;
        
        // Draw grid lines
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight * i) / 5;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Draw axes
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw data points and line
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const points = [];
        data.forEach((value, index) => {
            const x = padding + (chartWidth * index) / (data.length - 1);
            const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
            points.push({ x, y });
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Fill area under curve
        ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
        ctx.beginPath();
        ctx.moveTo(points[0].x, height - padding);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.lineTo(points[points.length - 1].x, height - padding);
        ctx.closePath();
        ctx.fill();
        
        // Draw data points
        ctx.fillStyle = '#2563eb';
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Draw labels
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            const x = padding + (chartWidth * index) / (data.length - 1);
            ctx.fillText(label, x, height - padding + 20);
        });
        
        // Draw values on y-axis
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = minValue + (valueRange * (5 - i)) / 5;
            const y = padding + (chartHeight * i) / 5;
            const displayValue = chartData.chartType === 'revenue' ? 
                '₺' + Math.round(value).toLocaleString() : 
                Math.round(value).toString();
            ctx.fillText(displayValue, padding - 10, y + 4);
        }
    }

    updateTrendChart() {
        const dateRange = document.getElementById('date-range-selector')?.value || 'week';
        const chartData = this.getChartDataForRange(dateRange);
        
        // Update chart title
        const titleElement = document.querySelector('#dynamic-trend-chart h3');
        if (titleElement) {
            titleElement.textContent = chartData.title;
        }
        
        // Redraw chart
        this.initializeTrendChart(chartData);
    }

    updateDateRange() {
        this.updateTrendChart();
        this.loadDashboardData();
        
        const dateRange = document.getElementById('date-range-selector');
        const selectedText = dateRange.options[dateRange.selectedIndex].text;
        
        // Show toast notification
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Dashboard ${selectedText} için güncellendi`, 'info');
        }
    }

    renderDeviceDistributionChart() {
        const container = document.getElementById('device-distribution-chart');
        if (!container) return;

        const deviceData = [
            { brand: 'Phonak', count: 25, color: '#2563eb' },
            { brand: 'Oticon', count: 18, color: '#059669' },
            { brand: 'Widex', count: 12, color: '#dc2626' },
            { brand: 'Signia', count: 8, color: '#7c3aed' },
            { brand: 'Diğer', count: 5, color: '#6b7280' }
        ];

        const total = deviceData.reduce((sum, item) => sum + item.count, 0);

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Cihaz Marka Dağılımı</h3>
                <div class="space-y-3">
                    ${deviceData.map(item => {
                        const percentage = Math.round((item.count / total) * 100);
                        return `
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <div class="w-4 h-4 rounded" style="background-color: ${item.color}"></div>
                                    <span class="text-sm text-gray-600">${item.brand}</span>
                                </div>
                                <div class="flex items-center space-x-3">
                                    <div class="w-24 bg-gray-200 rounded-full h-2">
                                        <div class="h-2 rounded-full" style="width: ${percentage}%; background-color: ${item.color}"></div>
                                    </div>
                                    <span class="text-sm font-semibold w-8">${item.count}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderRecentActivities() {
        const container = document.getElementById('recent-activities');
        if (!container) return;

        const activities = [
            {
                type: 'appointment',
                title: 'Yeni randevu oluşturuldu',
                description: 'Ahmet Yılmaz - İşitme testi',
                time: '5 dakika önce',
                icon: 'calendar'
            },
            {
                type: 'patient',
                title: 'Yeni hasta kaydı',
                description: 'Fatma Demir sisteme eklendi',
                time: '15 dakika önce',
                icon: 'user-plus'
            },
            {
                type: 'device',
                title: 'Cihaz denemesi tamamlandı',
                description: 'Mustafa Çelik - Phonak Audeo',
                time: '1 saat önce',
                icon: 'device'
            },
            {
                type: 'sgk',
                title: 'SGK raporu onaylandı',
                description: 'Zeynep Arslan - İşitme cihazı raporu',
                time: '2 saat önce',
                icon: 'document'
            }
        ];

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
                <div class="space-y-4">
                    ${activities.map(activity => `
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                ${this.getActivityIcon(activity.icon)}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900">${activity.title}</p>
                                <p class="text-sm text-gray-600">${activity.description}</p>
                                <p class="text-xs text-gray-500 mt-1">${activity.time}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <a href="#" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Tüm aktiviteleri görüntüle →</a>
                </div>
            </div>
        `;
    }

    renderQuickActions() {
        const container = document.getElementById('quick-actions');
        if (!container) return;

        const quickActions = [
            {
                id: 'quick-add-patient',
                title: 'Yeni Hasta Ekle',
                description: 'Hızlı hasta kaydı',
                icon: 'user-plus',
                color: 'blue',
                action: () => this.quickAddPatient()
            },
            {
                id: 'quick-add-appointment',
                title: 'Randevu Oluştur',
                description: 'Yeni randevu planla',
                icon: 'calendar',
                color: 'green',
                action: () => this.quickAddAppointment()
            },
            {
                id: 'quick-view-inventory',
                title: 'Stok Durumu',
                description: 'Envanter kontrolü',
                icon: 'package',
                color: 'yellow',
                action: () => this.quickViewInventory()
            },
            {
                id: 'quick-send-sms',
                title: 'SMS Gönder',
                description: 'Toplu mesaj gönder',
                icon: 'message',
                color: 'purple',
                action: () => this.quickSendSMS()
            },
            {
                id: 'quick-view-reports',
                title: 'Raporlar',
                description: 'Analiz ve raporlar',
                icon: 'chart',
                color: 'indigo',
                action: () => this.quickViewReports()
            },
            {
                id: 'quick-sgk-check',
                title: 'SGK Kontrol',
                description: 'SGK rapor durumu',
                icon: 'document',
                color: 'red',
                action: () => this.quickSGKCheck()
            },
            {
                id: 'quick-sgk-calculator',
                title: 'SGK Hesaplayıcı',
                description: 'Fiyat hesaplama',
                icon: 'calculator',
                color: 'indigo',
                action: () => this.openSGKCalculator()
            }
        ];

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
                <div class="grid grid-cols-2 gap-3">
                    ${quickActions.map(action => `
                        <button 
                            id="${action.id}"
                            class="p-3 text-left rounded-lg border border-gray-200 hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-all duration-200 group"
                            onclick="${action.id.replace('-', '_')}Action()"
                        >
                            <div class="flex items-center space-x-3">
                                <div class="w-8 h-8 bg-${action.color}-100 rounded-lg flex items-center justify-center group-hover:bg-${action.color}-200 transition-colors">
                                    ${this.getActionIcon(action.icon)}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900 group-hover:text-${action.color}-700">${action.title}</p>
                                    <p class="text-xs text-gray-500 group-hover:text-${action.color}-600">${action.description}</p>
                                </div>
                            </div>
                        </button>
                    `).join('')}
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <div class="text-center">
                        <p class="text-xs text-gray-500 mb-2">Hizmet Verdiğimiz Hasta Sayısı</p>
                        <p class="text-2xl font-bold text-blue-600">${this.kpis.totalPatients || 156}</p>
                        <p class="text-xs text-green-600 mt-1">+12% bu ay</p>
                    </div>
                </div>
            </div>
        `;

        // Bind quick action events
        this.bindQuickActionEvents();
    }

    // Helper methods for data calculation
    getTodayAppointments() {
        if (!window.sampleData?.appointments) return 0;
        const today = new Date().toISOString().split('T')[0];
        return window.sampleData.appointments.filter(apt => apt.date === today).length;
    }

    getPendingTasks() {
        // Calculate pending tasks from various sources
        let pending = 0;
        if (window.sampleData?.appointments) {
            pending += window.sampleData.appointments.filter(apt => apt.status === 'pending').length;
        }
        return pending + 5; // Add some mock pending tasks
    }

    getMonthlyRevenue() {
        // Mock calculation - in real app, this would come from financial data
        return 125000;
    }

    getNewPatientsThisMonth() {
        if (!window.sampleData?.patients) return 0;
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        return window.sampleData.patients.filter(patient => {
            const regDate = new Date(patient.registrationDate);
            return regDate.getMonth() === thisMonth && regDate.getFullYear() === thisYear;
        }).length;
    }

    getActiveDeviceTrials() {
        // Mock data - in real app, this would come from device trial records
        return 8;
    }

    getPendingSGKReports() {
        // Mock data - in real app, this would come from SGK system
        return 12;
    }

    getLowInventoryItems() {
        if (!window.sampleData?.inventory) return 0;
        return window.sampleData.inventory.filter(item => item.inventory <= item.minInventory).length;
    }

    // Helper methods for UI
    getIconSvg(iconName) {
        const icons = {
            users: '<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path></svg>',
            calendar: '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z"></path></svg>',
            clock: '<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            currency: '<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path></svg>'
        };
        return icons[iconName] || icons.users;
    }

    getColorClasses(color) {
        const colors = {
            blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
            green: { bg: 'bg-green-100', text: 'text-green-600' },
            yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
            purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
            red: { bg: 'bg-red-100', text: 'text-red-600' }
        };
        return colors[color] || colors.blue;
    }

    getActivityIcon(iconName) {
        const icons = {
            calendar: '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z"></path></svg>',
            'user-plus': '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>',
            device: '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>',
            document: '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>'
        };
        return icons[iconName] || icons.calendar;
    }

    getActionIcon(iconName) {
        const icons = {
            'user-plus': '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>',
            'calendar-plus': '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z"></path></svg>',
            package: '<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>',
            'document-report': '<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 012 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>',
            calculator: '<svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 012 2z"></path></svg>',
            document: '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
            message: '<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>',
            chart: '<svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 012 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>'
        };
        return icons[iconName] || icons['user-plus'];
    }

    // Quick action methods
    quickAddPatient() {
        window.location.href = 'patients.html?action=add';
    }

    quickAddAppointment() {
        window.location.href = 'appointments.html?action=add';
    }

    quickViewInventory() {
        window.location.href = 'inventory.html';
    }

    quickViewReports() {
        window.location.href = 'reports.html';
    }

    quickSendSMS() {
        // Show SMS modal if it exists, otherwise navigate to campaigns
        const smsModal = document.getElementById('smsModal');
        if (smsModal) {
            smsModal.classList.remove('hidden');
        } else {
            window.location.href = 'campaigns.html';
        }
    }

    quickSGKCheck() {
        window.location.href = 'sgk.html';
    }

    openSGKCalculator() {
        // Create SGK Calculator Modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-gray-900">SGK Destek Hesaplayıcı</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <form id="sgk-calculator-form" class="space-y-6">
                        <!-- Device Price -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cihaz Fiyatı (TL)</label>
                            <input type="number" id="calc-device-price" name="devicePrice" step="0.01" min="0" 
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                                   placeholder="0.00" required>
                        </div>

                        <!-- Patient Age Group -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Hasta Yaş Grubu</label>
                            <select id="calc-age-group" name="ageGroup" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required>
                                <option value="">Yaş grubu seçin</option>
                                <option value="no_coverage">SGK destek hakkı yok</option>
                                <option value="under4_parent_working">0-4 yaş (Veli çalışıyor)</option>
                                <option value="under4_parent_retired">0-4 yaş (Veli emekli)</option>
                                <option value="age5_12_parent_working">5-12 yaş (Veli çalışıyor)</option>
                                <option value="age5_12_parent_retired">5-12 yaş (Veli emekli)</option>
                                <option value="age13_18_parent_working">13-18 yaş (Veli çalışıyor)</option>
                                <option value="age13_18_parent_retired">13-18 yaş (Veli emekli)</option>
                                <option value="over18_working">18 yaş üzeri (Çalışıyor)</option>
                                <option value="over18_retired">18 yaş üzeri (Emekli)</option>
                            </select>
                        </div>

                        <!-- Discount -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">İndirim</label>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <input type="number" id="calc-discount-percent" name="discountPercent" step="0.1" min="0" max="100" 
                                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                                           placeholder="Yüzde">
                                    <label class="block text-xs text-gray-500 mt-1">Yüzde (%)</label>
                                </div>
                                <div>
                                    <input type="number" id="calc-discount-amount" name="discountAmount" step="0.01" min="0" 
                                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                                           placeholder="Tutar">
                                    <label class="block text-xs text-gray-500 mt-1">Sabit Tutar (TL)</label>
                                </div>
                            </div>
                        </div>

                        <!-- Calculate Button -->
                        <div class="flex justify-center">
                            <button type="submit" class="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                                <i class="fas fa-calculator mr-2"></i>Hesapla
                            </button>
                        </div>

                        <!-- Results -->
                        <div id="calc-results" class="hidden bg-gray-50 p-4 rounded-lg">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Hesaplama Sonuçları</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Cihaz Fiyatı:</span>
                                    <span id="result-device-price" class="font-medium">0 TL</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">SGK İndirimi:</span>
                                    <span id="result-sgk-reduction" class="font-medium text-green-600">0%</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">İndirim:</span>
                                    <span id="result-discount" class="font-medium text-blue-600">0 TL</span>
                                </div>
                                <div class="border-t pt-3">
                                    <div class="flex justify-between">
                                        <span class="text-gray-900 font-semibold">Hasta Ödeyecek:</span>
                                        <span id="result-patient-payment" class="font-bold text-lg text-red-600">0 TL</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup form event listeners
        this.setupSGKCalculatorForm();
    }

    setupSGKCalculatorForm() {
        const form = document.getElementById('sgk-calculator-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const devicePrice = parseFloat(formData.get('devicePrice')) || 0;
            const ageGroup = formData.get('ageGroup');
            const discountPercent = parseFloat(formData.get('discountPercent')) || 0;
            const discountAmount = parseFloat(formData.get('discountAmount')) || 0;

            if (!devicePrice || !ageGroup) {
                alert('Lütfen cihaz fiyatı ve yaş grubunu doldurun.');
                return;
            }

            try {
                // Calculate SGK support using backend API
                const response = await getPricingPreview(data);

                if (!response.ok) {
                    throw new Error('Hesaplama başarısız');
                }

                const data = await response.json();
                
                if (data.success) {
                    const pricing = data.pricing;
                    
                    // Update results display
                    document.getElementById('result-device-price').textContent = `${devicePrice.toFixed(2)} TL`;
                    
                    // Display SGK reduction
                    const reductionType = pricing.sgk_reduction_type;
                    const reductionAmount = pricing.sgk_reduction_amount || 0;
                    let reductionDisplay = '';
                    if (reductionType === 'percentage') {
                        const percentage = (reductionAmount / devicePrice * 100);
                        reductionDisplay = `-${percentage.toFixed(1)}%`;
                    } else if (reductionType === 'amount') {
                        reductionDisplay = `-₺${reductionAmount.toFixed(2)}`;
                    } else {
                        reductionDisplay = '0%';
                    }
                    document.getElementById('result-sgk-reduction').textContent = reductionDisplay;
                    
                    // Display discount
                    const totalDiscount = pricing.discount_amount || 0;
                    document.getElementById('result-discount').textContent = `${totalDiscount.toFixed(2)} TL`;
                    
                    // Display patient payment
                    document.getElementById('result-patient-payment').textContent = `${pricing.patient_payment.toFixed(2)} TL`;
                    
                    document.getElementById('calc-results').classList.remove('hidden');
                } else {
                    throw new Error(data.message || 'Hesaplama başarısız');
                }
                
            } catch (error) {
                console.error('SGK calculation error:', error);
                alert('Hesaplama sırasında hata oluştu. Lütfen tekrar deneyin.');
            }
        });
    }

    bindQuickActionEvents() {
        // Global functions for onclick handlers
        window.quick_add_patientAction = () => this.quickAddPatient();
        window.quick_add_appointmentAction = () => this.quickAddAppointment();
        window.quick_view_inventoryAction = () => this.quickViewInventory();
        window.quick_send_smsAction = () => this.quickSendSMS();
        window.quick_view_reportsAction = () => this.quickViewReports();
        window.quick_sgk_checkAction = () => this.quickSGKCheck();
        window.quick_sgk_calculatorAction = () => this.openSGKCalculator();
    }

    // Dashboard management methods
    refreshDashboard() {
        this.loadDashboardData();
        this.renderKPIs();
        this.renderCharts();
        this.renderRecentActivities();
        Utils.showToast('Dashboard güncellendi.', 'success');
    }

    updateDateRange() {
        // Handle date range changes
        this.refreshDashboard();
    }

    startAutoRefresh() {
        // Auto-refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
            this.renderKPIs();
            this.renderPriorityPatients();
            this.renderAutomationInsights();
        }, 300000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // New method: Render priority patients widget
    renderPriorityPatients() {
        const container = document.getElementById('priorityPatientsWidget');
        if (!container) return;

        const priorityPatients = PrioritySystem.getHighPriorityPatients().slice(0, 5); // Top 5

        if (priorityPatients.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold mb-4 text-gray-900">Öncelikli Hastalar</h3>
                    <div class="text-center py-8">
                        <div class="text-4xl mb-4">✅</div>
                        <p class="text-gray-500">Yüksek öncelikli hasta bulunmuyor</p>
                    </div>
                </div>
            `;
            return;
        }

        const priorityPatientsHTML = priorityPatients.map(patient => {
            const priority = PrioritySystem.getPriorityLabel(patient.priorityScore);
            const explanation = PrioritySystem.getPriorityExplanation(patient);
            
            return `
                <div class="priority-patient-item p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                     onclick="window.location.href='patient-details.html?id=${patient.id}'">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-medium text-gray-900">${patient.name}</span>
                        <div class="flex items-center space-x-2">
                            <span class="priority-badge px-2 py-1 rounded-full text-xs font-medium ${priority.class}">
                                ${priority.icon} ${priority.text}
                            </span>
                            <span class="text-sm text-gray-500">${patient.priorityScore}</span>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600">${explanation}</p>
                    <div class="flex items-center mt-2 text-xs text-gray-500">
                        <span>${patient.phone}</span>
                        <span class="mx-2">•</span>
                        <span>Son iletişim: ${patient.lastContactDate ? Utils.formatDate(patient.lastContactDate) : 'Bilinmiyor'}</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Öncelikli Hastalar</h3>
                    <button onclick="window.location.href='patients.html?priority=high'" 
                            class="text-sm text-primary hover:text-primary-dark">
                        Tümünü Gör (${PrioritySystem.getHighPriorityPatients().length})
                    </button>
                </div>
                <div class="space-y-3">
                    ${priorityPatientsHTML}
                </div>
            </div>
        `;
    }

    // New method: Render automation insights widget
    renderAutomationInsights() {
        const container = document.getElementById('automationInsightsWidget');
        if (!container) return;

        // Get automation statistics
        const stats = this.getAutomationStats();
        
        const insightsHTML = `
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Otomasyon Özeti</h3>
                    <div class="flex items-center space-x-2">
                        <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span class="text-sm text-green-600">Aktif</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="text-center p-3 bg-blue-50 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">${stats.rulesExecuted}</div>
                        <div class="text-sm text-blue-600">Bugün Çalışan Kural</div>
                    </div>
                    <div class="text-center p-3 bg-green-50 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${stats.smssSent}</div>
                        <div class="text-sm text-green-600">Gönderilen SMS</div>
                    </div>
                </div>
                
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Görev Oluşturuldu:</span>
                        <span class="font-medium">${stats.tasksCreated}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">No-show Takibi:</span>
                        <span class="font-medium">${stats.noShowsProcessed}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">SGK Raporu Oluşturuldu:</span>
                        <span class="font-medium">${stats.sgkReportsCreated}</span>
                    </div>
                </div>
                
                ${stats.recentActivities.length > 0 ? `
                    <div class="mt-4 pt-4 border-t">
                        <h4 class="text-sm font-medium text-gray-900 mb-2">Son Aktiviteler</h4>
                        <div class="space-y-1">
                            ${stats.recentActivities.slice(0, 3).map(activity => `
                                <div class="text-xs text-gray-600 flex items-center">
                                    <div class="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                    ${activity.description}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="mt-4 pt-4 border-t">
                    <button onclick="window.location.href='settings.html#automations'" 
                            class="w-full text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors">
                        Otomasyon Ayarları
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = insightsHTML;
    }

    // Get automation statistics
    getAutomationStats() {
        const today = new Date().toISOString().split('T')[0];
        
        // Get execution log from advanced automation if available
        let executionLog = [];
        if (window.advancedAutomation) {
            executionLog = advancedAutomation.getRuleExecutionLog();
        }

        // Filter today's activities
        const todayActivities = executionLog.filter(log => 
            log.timestamp.startsWith(today) && log.status === 'success'
        );

        return {
            rulesExecuted: todayActivities.length,
            smssSent: todayActivities.filter(log => log.ruleName.includes('SMS') || log.ruleName.includes('Hatırlatma')).length,
            tasksCreated: todayActivities.filter(log => log.ruleName.includes('Takip') || log.ruleName.includes('Görev')).length,
            noShowsProcessed: todayActivities.filter(log => log.ruleName.includes('Randevu Kaçırma')).length,
            sgkReportsCreated: todayActivities.filter(log => log.ruleName.includes('SGK')).length,
            recentActivities: todayActivities.slice(-5).map(log => ({
                description: `${log.ruleName} - ${log.data?.patientName || 'Sistem'}`,
                time: new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
            }))
        };
    }
}

// Initialize Dashboard Manager when DOM is loaded
let dashboardManager;
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager = new DashboardManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboardManager) {
        dashboardManager.stopAutoRefresh();
    }
});