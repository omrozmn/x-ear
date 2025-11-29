/**
 * Patient Details Management System
 * Comprehensive system for hearing aid center operations
 */

class PatientDetailsManager {
    constructor() {
        this.currentPatient = null;
        this.patients = [];
        this.currentTab = 'genel';
        this.acquisitionTypes = [
            { value: 'tabela', label: 'Tabela' },
            { value: 'sosyal-medya', label: 'Sosyal Medya' },
            { value: 'tanitim', label: 'Tanıtım' },
            { value: 'referans', label: 'Referans' },
            { value: 'diger', label: 'Diğer' }
        ];
        this.patientLabels = {
            'yeni': { text: 'Yeni Hasta', color: 'bg-blue-100 text-blue-800' },
            'arama-bekliyor': { text: 'Arama Bekliyor', color: 'bg-yellow-100 text-yellow-800' },
            'randevu-verildi': { text: 'Randevu Verildi', color: 'bg-green-100 text-green-800' },
            'deneme-yapildi': { text: 'Deneme Yapıldı', color: 'bg-purple-100 text-purple-800' },
            'kontrol-hastasi': { text: 'Kontrol Hastası', color: 'bg-indigo-100 text-indigo-800' },
            'satis-tamamlandi': { text: 'Satış Tamamlandı', color: 'bg-emerald-100 text-emerald-800' }
        };
        
        // E-Receipt materials with VAT rates
        this.ereceiptMaterials = [
            { code: 'DPIC_RIGHT', name: 'Dijital programlanabilir işitme cihazı - sağ', vat: 0 },
            { code: 'DPIC_LEFT', name: 'Dijital programlanabilir işitme cihazı - sol', vat: 0 },
            { code: 'MOLD_RIGHT', name: 'İşitme cihazı kalıbı - sağ', vat: 0 },
            { code: 'MOLD_LEFT', name: 'İşitme cihazı kalıbı - sol', vat: 0 },
            { code: 'BATTERY_RIGHT', name: 'İşitme cihazı pili - sağ', vat: 20 },
            { code: 'BATTERY_LEFT', name: 'İşitme cihazı pili - sol', vat: 20 },
            { code: 'CI_BATTERY_RIGHT', name: 'Koklear implant pili - sağ', vat: 20 },
            { code: 'CI_BATTERY_LEFT', name: 'Koklear implant pili - sol', vat: 20 }
        ];
        
        // Device inventory
        this.deviceInventory = [
            { id: 'phonak_p90', brand: 'Phonak', model: 'Audeo Paradise P90', price: 25000, inventory: 10 },
            { id: 'phonak_p70', brand: 'Phonak', model: 'Audeo Paradise P70', price: 20000, inventory: 15 },
            { id: 'resound_one9', brand: 'ReSound', model: 'ONE 9', price: 22000, inventory: 8 },
            { id: 'oticon_more1', brand: 'Oticon', model: 'More 1', price: 24000, inventory: 12 }
        ];
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Patient Details Manager');
        
        // Load sample data
        await this.loadSampleData();
        
        // Load patients from storage or use sample data
        this.loadPatients();
        
        // Load patient list in sidebar
        this.renderPatientList();
        
        // Check if patient ID is in URL
        const urlParams = new URLSearchParams(window.location.search);
        const patientId = urlParams.get('patientId') || urlParams.get('id');
        
        if (patientId) {
            this.loadPatient(patientId);
        } else {
            this.showPatientSelection();
        }
        
        // Initialize widgets
        this.initializeWidgets();
        
        console.log('✅ Patient Details Manager initialized');
    }

    async loadSampleData() {
        // Use the data from data.js
        if (window.sampleData && window.sampleData.patients) {
            this.patients = window.sampleData.patients.map(patient => ({
                ...patient,
                acquisitionType: patient.acquisitionType || 'diger',
                label: patient.label || 'yeni',
                notes: patient.notes ? [{ 
                    id: Date.now().toString(),
                    text: patient.notes,
                    date: new Date().toISOString(),
                    author: 'System'
                }] : [],
                sgkInfo: patient.sgkInfo || {},
                devices: patient.devices || [],
                ereceiptHistory: patient.ereceiptHistory || [],
                reports: patient.reports || []
            }));
        } else {
            // No sample patients - start with empty array
            this.patients = [];
        }
    }

    loadPatients() {
        const savedPatients = window.Storage?.load('patients');
        if (savedPatients && savedPatients.length > 0) {
            this.patients = savedPatients;
        }
    }

    savePatients() {
        if (window.Storage) {
            window.Storage.save('patients', this.patients);
        }
    }

    updatePatient(patientData) {
        console.log('🔄 Updating patient:', patientData);
        
        if (!patientData || !patientData.id) {
            console.error('❌ Invalid patient data for update');
            return false;
        }

        const patientIndex = this.patients.findIndex(p => p.id === patientData.id);
        if (patientIndex === -1) {
            console.error('❌ Patient not found for update:', patientData.id);
            return false;
        }

        // Update patient data
        this.patients[patientIndex] = { ...this.patients[patientIndex], ...patientData };
        
        // Update current patient if it's the same
        if (this.currentPatient && this.currentPatient.id === patientData.id) {
            this.currentPatient = this.patients[patientIndex];
        }

        // Save to storage
        this.savePatients();
        
        console.log('✅ Patient updated successfully');
        return true;
    }

    savePatientToStorage() {
        // This method is called by timeline system to save patient data
        this.savePatients();
        console.log('✅ Patient data saved to storage via savePatientToStorage');
    }

    renderPatientList() {
        const container = document.getElementById('patient-list');
        if (!container) return;

        let html = '';
        
        this.patients.forEach(patient => {
            const labelInfo = this.patientLabels[patient.label] || this.patientLabels['yeni'];
            const isActive = this.currentPatient && this.currentPatient.id === patient.id;
            
            html += `
                <div class="patient-list-item p-4 border-b border-gray-100 ${isActive ? 'active' : ''}" 
                     onclick="patientManager.loadPatient('${patient.id}')">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">${patient.name}</h4>
                            <p class="text-sm text-gray-600">${patient.phone}</p>
                            <span class="inline-block mt-1 px-2 py-1 text-xs rounded-full ${labelInfo.color}">
                                ${labelInfo.text}
                            </span>
                        </div>
                        <div class="text-xs text-gray-400">
                            ${new Date(patient.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                    </div>
                </div>
            `;
        });

        if (html === '') {
            html = `
                <div class="p-4 text-center text-gray-500">
                    <p>Henüz hasta kaydı yok</p>
                    <button onclick="openNewPatientModal()" class="mt-2 text-blue-600 hover:text-blue-800">
                        İlk hastayı ekleyin
                    </button>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    searchPatients(query) {
        const container = document.getElementById('patient-list');
        if (!container) return;

        const filteredPatients = this.patients.filter(patient => 
            patient.name.toLowerCase().includes(query.toLowerCase()) ||
            patient.phone.includes(query) ||
            (patient.tcNumber && patient.tcNumber.includes(query))
        );

        let html = '';
        
        filteredPatients.forEach(patient => {
            const labelInfo = this.patientLabels[patient.label] || this.patientLabels['yeni'];
            const isActive = this.currentPatient && this.currentPatient.id === patient.id;
            
            html += `
                <div class="patient-list-item p-4 border-b border-gray-100 ${isActive ? 'active' : ''}" 
                     onclick="patientManager.loadPatient('${patient.id}')">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">${patient.name}</h4>
                            <p class="text-sm text-gray-600">${patient.phone}</p>
                            <span class="inline-block mt-1 px-2 py-1 text-xs rounded-full ${labelInfo.color}">
                                ${labelInfo.text}
                            </span>
                        </div>
                        <div class="text-xs text-gray-400">
                            ${new Date(patient.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                    </div>
                </div>
            `;
        });

        if (html === '') {
            html = `
                <div class="p-4 text-center text-gray-500">
                    <p>"${query}" için sonuç bulunamadı</p>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    loadPatient(patientId) {
        console.log('🔄 Loading patient:', patientId);
        
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) {
            console.error('❌ Patient not found:', patientId);
            return;
        }

        this.currentPatient = patient;
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('id', patientId);
        window.history.replaceState({}, '', url);
        
        // Update patient header
        this.updatePatientHeader();
        
        // Re-render patient list to show active state
        this.renderPatientList();
        
        // Load current tab content
        this.loadTabContent(this.currentTab);
        
        console.log('✅ Patient loaded:', patient.name);
    }

    updatePatientHeader() {
        if (!this.currentPatient) {
            this.showPatientSelection();
            return;
        }

        const patient = this.currentPatient;
        const labelInfo = this.patientLabels[patient.label] || this.patientLabels['yeni'];

        // Update header elements (with null checks)
        const initialsEl = document.getElementById('patient-initials');
        const nameEl = document.getElementById('patient-name');
        const infoEl = document.getElementById('patient-info');
        const labelEl = document.getElementById('patient-label');

        if (initialsEl) initialsEl.textContent = this.getInitials(patient.name);
        if (nameEl) nameEl.textContent = patient.name;
        if (infoEl) infoEl.textContent = `${patient.phone} • ${patient.tcNumber || 'TC Yok'}`;
        
        if (labelEl) {
            labelEl.textContent = labelInfo.text;
            labelEl.className = `px-3 py-1 rounded-full text-sm font-medium ${labelInfo.color}`;
        }

        // Also update PatientProfileWidget if available
        if (window.patientProfile && window.patientProfile.updatePatientData) {
            window.patientProfile.updatePatientData(patient);
        }
    }

    showPatientSelection() {
        const initialsEl = document.getElementById('patient-initials');
        const nameEl = document.getElementById('patient-name');
        const infoEl = document.getElementById('patient-info');
        const labelEl = document.getElementById('patient-label');

        if (initialsEl) initialsEl.textContent = '--';
        if (nameEl) nameEl.textContent = 'Hasta Seçiniz';
        if (infoEl) infoEl.textContent = 'Soldan bir hasta seçin veya yeni hasta ekleyin';
        
        if (labelEl) {
            labelEl.textContent = '--';
            labelEl.className = 'px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800';
        }
        
        // Clear tab content
        document.getElementById('tab-content').innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <p class="text-lg">Hasta seçiniz</p>
                <p class="text-sm mt-2">Soldan bir hasta seçin veya yeni hasta ekleyin</p>
            </div>
        `;
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Load tab content
        this.loadTabContent(tabName);
    }

    loadTabContent(tabName) {
        if (!this.currentPatient) {
            return;
        }

        const container = document.getElementById('tab-content');
        
        switch (tabName) {
            case 'genel':
                this.renderGenelTab(container);
                break;
            case 'satis':
                this.renderSatisTab(container);
                break;
            case 'cihaz':
                this.renderCihazTab(container);
                break;
            case 'zaman':
                this.renderZamanTab(container);
                break;
            case 'sgk':
                this.renderSGKTab(container);
                break;
            default:
                container.innerHTML = '<p class="text-gray-500">Tab içeriği bulunamadı</p>';
        }
    }

    renderGenelTab(container) {
        const patient = this.currentPatient;
        
        container.innerHTML = `

        `;
    }

    renderSatisTab(container) {
        const patient = this.currentPatient;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Satış Özeti -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Satış Bilgileri</h3>
                        <button onclick="patientManager.openNewSaleModal('${patient.id}')" 
                                class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                            Yeni Satış
                        </button>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div class="bg-white p-3 rounded border">
                            <h4 class="text-sm text-gray-600">Toplam Satış</h4>
                            <p class="text-xl font-bold text-green-600">${this.calculateTotalSales(patient).toLocaleString('tr-TR')} TL</p>
                        </div>
                        <div class="bg-white p-3 rounded border">
                            <h4 class="text-sm text-gray-600">Satış Sayısı</h4>
                            <p class="text-xl font-bold text-blue-600">${(patient.sales || []).length}</p>
                        </div>
                        <div class="bg-white p-3 rounded border">
                            <h4 class="text-sm text-gray-600">Son Satış</h4>
                            <p class="text-sm text-gray-800">${this.getLastSaleDate(patient)}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Satış Geçmişi -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Satış Geçmişi</h3>
                    <div id="sales-history">
                        ${this.renderSalesHistory()}
                    </div>
                </div>
                
                <!-- Ödeme Takibi -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Ödeme Takibi</h3>
                    <div id="payment-tracking">
                        ${this.renderPaymentTracking()}
                    </div>
                </div>
                
                <!-- İade ve Değişim -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">İade ve Değişim</h3>
                    <div id="returns-exchanges">
                        ${this.renderReturnsExchanges()}
                    </div>
                </div>
            </div>
        `;
    }

    calculateTotalSales(patient) {
        if (!patient.sales) return 0;
        return patient.sales.reduce((total, sale) => total + (sale.totalAmount || 0), 0);
    }

    getLastSaleDate(patient) {
        if (!patient.sales || patient.sales.length === 0) return 'Henüz satış yok';
        const lastSale = patient.sales.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        return new Date(lastSale.date).toLocaleDateString('tr-TR');
    }

    renderSalesHistory() {
        if (!this.currentPatient.sales || this.currentPatient.sales.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz satış kaydı yok</p>';
        }

        return this.currentPatient.sales
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(sale => `
                <div class="bg-white p-4 rounded border border-gray-200 mb-3">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">Satış #${sale.id}</h4>
                            <p class="text-sm text-gray-600">${new Date(sale.date).toLocaleDateString('tr-TR')}</p>
                            <div class="mt-2">
                                ${sale.items.map(item => `
                                    <div class="text-sm">
                                        <span class="font-medium">${item.quantity}x ${item.name}</span>
                                        <span class="text-gray-600"> - ${item.price.toLocaleString('tr-TR')} TL</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-green-600">${sale.totalAmount.toLocaleString('tr-TR')} TL</p>
                            <span class="inline-block px-2 py-1 text-xs rounded ${this.getSaleStatusColor(sale.status)}">
                                ${this.getSaleStatusText(sale.status)}
                            </span>
                        </div>
                    </div>
                    <div class="flex justify-end space-x-2 mt-3">
                        <button onclick="patientManager.viewSaleDetails('${sale.id}')" 
                                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                            Detaylar
                        </button>
                        <button onclick="patientManager.printInvoice('${sale.id}')" 
                                class="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                            Fatura
                        </button>
                    </div>
                </div>
            `).join('');
    }

    getSaleStatusColor(status) {
        const colors = {
            'completed': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    getSaleStatusText(status) {
        const texts = {
            'completed': 'Tamamlandı',
            'pending': 'Beklemede',
            'cancelled': 'İptal Edildi'
        };
        return texts[status] || 'Bilinmeyen';
    }

    renderPaymentTracking() {
        if (!this.currentPatient.payments || this.currentPatient.payments.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz ödeme kaydı yok</p>';
        }

        return this.currentPatient.payments.map(payment => `
            <div class="bg-white p-3 rounded border border-gray-200 mb-2">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-medium">Ödeme #${payment.id}</h4>
                        <p class="text-sm text-gray-600">${payment.method} - ${new Date(payment.date).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold">${payment.amount.toLocaleString('tr-TR')} TL</p>
                        <span class="text-xs ${payment.status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}">
                            ${payment.status === 'confirmed' ? 'Onaylandı' : 'Beklemede'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderReturnsExchanges() {
        if (!this.currentPatient.returns || this.currentPatient.returns.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz iade/değişim kaydı yok</p>';
        }

        return this.currentPatient.returns.map(returnItem => `
            <div class="bg-white p-3 rounded border border-gray-200 mb-2">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-medium">${returnItem.type === 'return' ? 'İade' : 'Değişim'} #${returnItem.id}</h4>
                        <p class="text-sm text-gray-600">${returnItem.reason}</p>
                        <p class="text-xs text-gray-500">${new Date(returnItem.date).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-2 py-1 text-xs rounded ${returnItem.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                            ${returnItem.status === 'approved' ? 'Onaylandı' : 'Beklemede'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    openNewSaleModal(patientId) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Yeni Satış</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="new-sale-form" onsubmit="patientManager.saveSale(event, '${patientId}')">
                    <div class="space-y-4">
                        <!-- Patient Status Selection -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hasta Durumu</label>
                            <select name="patientStatus" required class="w-full px-3 py-2 border border-gray-300 rounded">
                                <option value="">Hasta durumunu seçin</option>
                                <option value="worker">Çalışan</option>
                                <option value="retired">Emekli</option>
                                <option value="beneficiary">Yakın (Çalışan/Emekli Yakını)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Ürünler</label>
                            <div id="sale-items">
                                <div class="flex items-center space-x-2 mb-2">
                                    <select name="device[]" class="flex-1 px-3 py-2 border border-gray-300 rounded">
                                        <option value="">Ürün Seçiniz</option>
                                        ${this.deviceInventory.map(device => 
                                            `<option value="${device.id}" data-price="${device.price}">${device.brand} ${device.model} - ${device.price.toLocaleString('tr-TR')} TL</option>`
                                        ).join('')}
                                    </select>
                                    <input type="number" name="quantity[]" placeholder="Adet" min="1" value="1" 
                                           class="w-20 px-3 py-2 border border-gray-300 rounded">
                                    <button type="button" onclick="this.closest('.flex').remove()" 
                                            class="bg-red-600 text-white px-2 py-2 rounded hover:bg-red-700">
                                        Sil
                                    </button>
                                </div>
                            </div>
                            <button type="button" onclick="patientManager.addSaleItem()" 
                                    class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                                + Ürün Ekle
                            </button>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">İndirim (%)</label>
                                <input type="number" name="discount" min="0" max="100" value="0" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded" onchange="patientManager.calculateTotal()">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
                                <select name="paymentMethod" required class="w-full px-3 py-2 border border-gray-300 rounded">
                                    <option value="cash">Nakit</option>
                                    <option value="card">Kredi Kartı</option>
                                    <option value="installment">Taksit</option>
                                    <option value="sgk">SGK</option>
                                </select>
                            </div>
                        </div>

                        <!-- Payment Section -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="text-sm font-medium text-gray-700 mb-3">Ödeme Bilgileri</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Toplam Tutar</label>
                                    <input type="text" id="totalAmount" readonly class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded" value="0 TL">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Peşinat</label>
                                    <input type="number" name="downPayment" min="0" value="0" 
                                           class="w-full px-3 py-2 border border-gray-300 rounded" onchange="patientManager.calculateTotal()">
                                </div>
                            </div>
                            <div class="mt-3">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Kalan Tutar</label>
                                <input type="text" id="remainingAmount" readonly class="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded" value="0 TL">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                            <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded"></textarea>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            İptal
                        </button>
                        <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Satışı Kaydet
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners for real-time calculation
        setTimeout(() => {
            this.attachSaleFormListeners();
        }, 100);
    }

    // Attach event listeners for sale form calculations
    attachSaleFormListeners() {
        const form = document.getElementById('new-sale-form');
        if (!form) return;

        // Listen for device selection changes
        form.addEventListener('change', (e) => {
            if (e.target.name === 'device[]' || e.target.name === 'quantity[]') {
                this.calculateTotal();
            }
        });

        // Initial calculation
        this.calculateTotal();
    }

    // Calculate total amount and remaining amount
    calculateTotal() {
        const form = document.getElementById('new-sale-form');
        if (!form) return;

        const deviceSelects = form.querySelectorAll('select[name="device[]"]');
        const quantityInputs = form.querySelectorAll('input[name="quantity[]"]');
        const discountInput = form.querySelector('input[name="discount"]');
        const downPaymentInput = form.querySelector('input[name="downPayment"]');
        const totalAmountInput = document.getElementById('totalAmount');
        const remainingAmountInput = document.getElementById('remainingAmount');

        let subtotal = 0;

        deviceSelects.forEach((select, index) => {
            const deviceId = select.value;
            const quantity = parseInt(quantityInputs[index]?.value) || 1;

            if (deviceId) {
                const device = this.deviceInventory.find(d => d.id === deviceId);
                if (device) {
                    subtotal += device.price * quantity;
                }
            }
        });

        const discount = parseFloat(discountInput?.value) || 0;
        const discountAmount = (subtotal * discount) / 100;
        const total = subtotal - discountAmount;

        const downPayment = parseFloat(downPaymentInput?.value) || 0;
        const remaining = total - downPayment;

        if (totalAmountInput) {
            totalAmountInput.value = total.toLocaleString('tr-TR') + ' TL';
        }

        if (remainingAmountInput) {
            remainingAmountInput.value = Math.max(0, remaining).toLocaleString('tr-TR') + ' TL';
        }
    }

    openAddNoteModal(patientId) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Yeni Not Ekle</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="new-note-form" onsubmit="patientManager.saveNote(event, '${patientId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Not</label>
                            <textarea name="noteText" rows="4" required 
                                      class="w-full px-3 py-2 border border-gray-300 rounded"
                                      placeholder="Not içeriğini yazınız..."></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <select name="category" class="w-full px-3 py-2 border border-gray-300 rounded">
                                <option value="Genel">Genel</option>
                                <option value="Tedavi">Tedavi</option>
                                <option value="Cihaz">Cihaz</option>
                                <option value="Ödeme">Ödeme</option>
                                <option value="Randevu">Randevu</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            İptal
                        </button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Notu Kaydet
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    addSaleItem() {
        const container = document.getElementById('sale-items');
        const newItem = document.createElement('div');
        newItem.className = 'flex items-center space-x-2 mb-2';
        newItem.innerHTML = `
            <select name="device[]" class="flex-1 px-3 py-2 border border-gray-300 rounded">
                <option value="">Ürün Seçiniz</option>
                ${this.deviceInventory.map(device => 
                    `<option value="${device.id}" data-price="${device.price}">${device.brand} ${device.model} - ${device.price.toLocaleString('tr-TR')} TL</option>`
                ).join('')}
            </select>
            <input type="number" name="quantity[]" placeholder="Adet" min="1" value="1" 
                   class="w-20 px-3 py-2 border border-gray-300 rounded">
            <button type="button" onclick="this.closest('.flex').remove()" 
                    class="bg-red-600 text-white px-2 py-2 rounded hover:bg-red-700">
                Sil
            </button>
        `;
        container.appendChild(newItem);
    }

    saveSale(event, patientId) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const devices = formData.getAll('device[]');
        const quantities = formData.getAll('quantity[]');
        
        const items = [];
        let totalAmount = 0;
        
        devices.forEach((deviceId, index) => {
            if (deviceId) {
                const device = this.deviceInventory.find(d => d.id === deviceId);
                const quantity = parseInt(quantities[index]) || 1;
                const itemTotal = device.price * quantity;
                
                items.push({
                    deviceId: deviceId,
                    name: `${device.brand} ${device.model}`,
                    quantity: quantity,
                    price: device.price,
                    total: itemTotal
                });
                
                totalAmount += itemTotal;
            }
        });
        
        if (items.length === 0) {
            alert('En az bir ürün seçiniz');
            return;
        }
        
        const discount = parseFloat(formData.get('discount')) || 0;
        const discountAmount = (totalAmount * discount) / 100;
        const finalAmount = totalAmount - discountAmount;
        const downPayment = parseFloat(formData.get('downPayment')) || 0;
        const remainingAmount = finalAmount - downPayment;
        
        const sale = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            patientStatus: formData.get('patientStatus'),
            items: items,
            subtotal: totalAmount,
            discount: discount,
            discountAmount: discountAmount,
            totalAmount: finalAmount,
            downPayment: downPayment,
            remainingAmount: remainingAmount,
            paymentMethod: formData.get('paymentMethod'),
            notes: formData.get('notes'),
            status: 'completed'
        };
        
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient.sales) patient.sales = [];
        
        patient.sales.push(sale);
        
        // Update patient label to satis-tamamlandi
        patient.label = 'satis-tamamlandi';
        
        this.savePatients();
        this.updatePatientHeader();
        this.renderPatientList();
        
        // Add timeline event
        this.addTimelineEvent(patientId, 'sale_completed', `${finalAmount.toLocaleString('tr-TR')} TL satış tamamlandı`);
        
        // Sync with Gelir/Gider system
        this.syncSaleToIncomeExpense(sale, patient);
        
        // Sync current patient data for patient details manager
        if (window.patientDetailsManager && window.patientDetailsManager.currentPatient && 
            window.patientDetailsManager.currentPatient.id === patientId) {
            window.patientDetailsManager.currentPatient = patient;
        }
        
        // Close modal and refresh tab
        event.target.closest('.fixed').remove();
        this.loadTabContent(this.currentTab);
        
        Utils.showToast('Satış başarıyla kaydedildi', 'success');
    }

    // Sync sale to Gelir/Gider system
    syncSaleToIncomeExpense(sale, patient) {
        try {
            // Create income record for the sale
            const incomeRecord = {
                transactionType: 'income',
                recordType: 'teslimat', // Sale delivery
                patientId: patient.id,
                patientName: patient.name,
                amount: sale.totalAmount,
                description: `İşitme cihazı satışı - ${sale.items?.[0]?.name || 'Cihaz'} (${this.getPatientStatusLabel(sale.patientStatus)})`,
                date: sale.date,
                id: sale.id, // Use same ID for sync
                syncedFrom: 'sales' // Mark as synced from sales
            };

            // Save to localStorage (same as dashboard cash register)
            const cashRecords = JSON.parse(localStorage.getItem('cashRecords') || '[]');
            cashRecords.push(incomeRecord);
            localStorage.setItem('cashRecords', JSON.stringify(cashRecords));

            console.log('✅ Sale synced to Gelir/Gider system:', incomeRecord);
        } catch (error) {
            console.error('❌ Error syncing sale to Gelir/Gider:', error);
        }
    }

    // Get patient status label for display
    getPatientStatusLabel(status) {
        switch (status) {
            case 'worker': return 'Çalışan';
            case 'retired': return 'Emekli';
            case 'beneficiary': return 'Yakın';
            default: return 'Hasta';
        }
    }

    saveNote(event, patientId) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const noteText = formData.get('noteText');
        const category = formData.get('category');
        
        if (!noteText.trim()) {
            alert('Not içeriği boş olamaz');
            return;
        }
        
        const note = {
            id: Date.now().toString(),
            text: noteText.trim(),
            category: category,
            date: new Date().toISOString(),
            author: 'Dr. Ahmet Yılmaz' // You can make this dynamic
        };
        
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient.notes) patient.notes = [];
        
        patient.notes.unshift(note); // Add to beginning of array
        
        this.savePatients();
        
        // Add timeline event
        this.addTimelineEvent(patientId, 'note_added', `${category} kategorisinde not eklendi`);
        
        // Close modal and refresh tab
        event.target.closest('.fixed').remove();
        this.loadTabContent(this.currentTab);
        
        Utils.showToast('Not başarıyla eklendi', 'success');
    }

    viewSaleDetails(saleId) {
        const sale = this.currentPatient.sales.find(s => s.id === saleId);
        if (!sale) return;
        
        alert(`Satış detayları: ${JSON.stringify(sale, null, 2)}`);
    }

    printInvoice(saleId) {
        alert('Fatura yazdırma özelliği geliştirme aşamasında');
    }

    renderCihazTab(container) {
        const patient = this.currentPatient;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Cihaz Listesi -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Hasta Cihazları</h3>
                        <button onclick="patientManager.openAddDeviceModal('${patient.id}')" 
                                class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                            Cihaz Ekle
                        </button>
                    </div>
                    
                    <div id="device-list">
                        ${this.renderDeviceList()}
                    </div>
                </div>
                
                <!-- Kayıtlı E-Reçeteler -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Kayıtlı E-Reçeteler</h3>
                    <div id="ereceipt-history">
                        ${this.renderEReceiptHistory()}
                    </div>
                </div>
                
                <!-- Belgeler -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Hasta Belgeleri</h3>
                        <button onclick="patientManager.uploadDocument('${patient.id}')" 
                                class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                            Belge Yükle
                        </button>
                    </div>
                    <div id="patient-documents">
                        ${this.renderPatientDocuments()}
                    </div>
                </div>
            </div>
        `;
    }

    renderZamanTab(container) {
        const patient = this.currentPatient;
        
        container.innerHTML = `
            <div class="space-y-6">
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Zaman Çizelgesi</h3>
                    <div id="timeline">
                        ${this.renderTimeline()}
                    </div>
                </div>
            </div>
        `;
    }

    renderSGKTab(container) {
        const patient = this.currentPatient;
        
        container.innerHTML = `
            <div class="space-y-6">
                <!-- E-Reçete ve Rapor Sorgulama -->
                <div class="bg-gray-50 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">E-Reçete ve Rapor İşlemleri</h3>
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <!-- E-Reçete Sorgula -->
                        <div>
                            <h4 class="font-medium text-gray-700 mb-2">E-Reçete Sorgula</h4>
                            <div class="space-y-2">
                                <input type="text" id="ereceipt-tc-${patient.id}" placeholder="TC Kimlik No" value="${patient.tcNumber || ''}" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                                <input type="text" id="ereceipt-no-${patient.id}" placeholder="E-Reçete No" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded text-sm">
                                <button onclick="patientManager.queryEReceipt('${patient.id}')" 
                                        class="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700">
                                    E-Reçete Sorgula
                                </button>
                            </div>
                            
                            <!-- E-Reçete Results -->
                            <div id="ereceipt-results-${patient.id}" class="mt-3 hidden">
                                <!-- Results will be populated here -->
                            </div>
                        </div>
                        
                        <!-- Rapor Sorgula -->
                        <div>
                            <h4 class="font-medium text-gray-700 mb-2">Rapor Sorgula</h4>
                            <div class="space-y-2">
                                <p class="text-sm text-gray-600">TC: ${patient.tcNumber || 'Girilmemiş'}</p>
                                <button id="raporSorguBtn"
                                        class="w-full bg-green-600 text-white py-2 rounded text-sm hover:bg-green-700"
                                        ${!patient.tcNumber ? 'disabled' : ''}>
                                    Rapor Sorgula
                                </button>
                            </div>
                            
                            <!-- Rapor Results -->
                            <div id="report-results-${patient.id}" class="mt-3">
                                <!-- Results will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- SGK Information -->
                <div id="sgkInfo" class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                        <span class="text-gray-600">SGK bilgileri yükleniyor...</span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('raporSorguBtn').addEventListener('click', () => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                try {
                    // Check if extension is available before sending message
                    if (!chrome.runtime.id) {
                        console.warn('Chrome extension not available');
                        const resultsDiv = document.getElementById(`report-results-${patient.id}`);
                        if (resultsDiv) {
                            resultsDiv.innerHTML = '<p class="text-yellow-600">SGK rapor sorgusu için Chrome eklentisi yüklü değil.</p>';
                            resultsDiv.classList.remove('hidden');
                        }
                        return;
                    }
                    
                    // Replace 'YOUR_EXTENSION_ID' with your actual extension ID
                    chrome.runtime.sendMessage('YOUR_EXTENSION_ID', {
                        action: 'querySgkReport',
                        tcNumber: patient.tcNumber,
                        token: generateToken()
                    }, (response) => {
                        // Check for chrome.runtime.lastError to handle connection issues
                        if (chrome.runtime.lastError) {
                            console.warn('Chrome extension connection error:', chrome.runtime.lastError.message);
                            // Show fallback message to user
                            const resultsDiv = document.getElementById(`report-results-${patient.id}`);
                            if (resultsDiv) {
                                resultsDiv.innerHTML = '<p class="text-yellow-600">SGK rapor sorgusu için Chrome eklentisi bağlantısı kurulamadı.</p>';
                                resultsDiv.classList.remove('hidden');
                            }
                            return;
                        }
                        
                        const resultsDiv = document.getElementById(`report-results-${patient.id}`);
                        if (response && response.success) {
                            // Display the report data
                            let reportHtml = '<p><strong>Rapor Bilgileri:</strong></p>';
                            reportHtml += `<ul>`;
                            reportHtml += `<li><strong>Rapor Tarihi:</strong> ${response.data.reportDate || 'N/A'}</li>`;
                            reportHtml += `<li><strong>Rapor Numarası:</strong> ${response.data.reportNumber || 'N/A'}</li>`;
                            reportHtml += `<li><strong>Doktor Adı:</strong> ${response.data.doctorName || 'N/A'}</li>`;
                            reportHtml += `</ul>`;
                            resultsDiv.innerHTML = reportHtml;

                        } else {
                            resultsDiv.innerHTML = '<p class="text-danger">Rapor bilgileri alınamadı.</p>';
                        }
                        resultsDiv.classList.remove('hidden');
                    });
                } catch (error) {
                    console.error('Chrome extension error:', error);
                    const resultsDiv = document.getElementById(`report-results-${patient.id}`);
                    if (resultsDiv) {
                        resultsDiv.innerHTML = '<p class="text-red-600">SGK rapor sorgusu sırasında hata oluştu.</p>';
                    }
                }
            } else {
                console.error('Chrome extension not available.');
                alert('Chrome uzantısı mevcut değil veya etkin değil.');
            }
        });
        
        // Auto-load cached report results if available
        if (patient.lastReportQuery && patient.lastReportQuery.results) {
            setTimeout(() => {
                this.displayReportResults(patient.id, patient.lastReportQuery.results);
            }, 100);
        }
        
        // Load SGK info after a short delay to ensure DOM is ready
        setTimeout(() => {
            if (typeof loadSGKInfo === 'function') {
                loadSGKInfo();
            }
        }, 100);
    }

    renderPatientNotes() {
        if (!this.currentPatient.notes) {
            return '<p class="text-gray-500 text-sm">Henüz not eklenmemiş</p>';
        }

        // Handle both string and array formats for backward compatibility
        if (typeof this.currentPatient.notes === 'string') {
            return `
                <div class="bg-white p-3 rounded border border-gray-200">
                    <p class="text-sm text-gray-800">${this.currentPatient.notes}</p>
                    <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>Kullanıcı</span>
                        <span>${new Date().toLocaleString('tr-TR')}</span>
                    </div>
                </div>
            `;
        }

        if (Array.isArray(this.currentPatient.notes) && this.currentPatient.notes.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz not eklenmemiş</p>';
        }

        return this.currentPatient.notes
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3) // Show only last 3 notes
            .map(note => `
                <div class="bg-white p-3 rounded border border-gray-200">
                    <p class="text-sm text-gray-800">${note.text}</p>
                    <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>${note.author || 'Kullanıcı'}</span>
                        <span>${new Date(note.date).toLocaleString('tr-TR')}</span>
                    </div>
                </div>
            `).join('');
    }

    renderDeviceList() {
        if (!this.currentPatient.devices || this.currentPatient.devices.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz cihaz eklenmemiş</p>';
        }

        return this.currentPatient.devices.map(device => `
            <div class="bg-white p-3 rounded border border-gray-200 mb-2">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-medium">${device.brand} ${device.model}</h4>
                        <p class="text-sm text-gray-600">Seri No: ${device.serialNumber}</p>
                        <p class="text-sm text-gray-600">Kulak: ${device.ear === 'left' ? 'Sol' : device.ear === 'right' ? 'Sağ' : 'Bilateral'}</p>
                        <span class="inline-block mt-1 px-2 py-1 text-xs rounded ${device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                            ${device.status === 'active' ? 'Aktif' : 'Deneme'}
                        </span>
                    </div>
                    <button onclick="patientManager.removeDevice('${this.currentPatient.id}', '${device.serialNumber}')" 
                            class="text-red-600 hover:text-red-800 text-sm">
                        Kaldır
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderEReceiptHistory() {
        if (!this.currentPatient.ereceiptHistory || this.currentPatient.ereceiptHistory.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz e-reçete kaydı yok</p>';
        }

        return this.currentPatient.ereceiptHistory.map(receipt => `
            <div class="bg-white p-3 rounded border border-gray-200 mb-2">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-medium">E-Reçete #${receipt.number}</h4>
                        <p class="text-sm text-gray-600">${receipt.doctorName}</p>
                        <p class="text-sm text-gray-600">${new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <button onclick="patientManager.showReceiptDetails('${receipt.id}')" 
                            class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        Detaylar
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderTimeline() {
        const events = [];
        
        // Add creation event
        events.push({
            date: this.currentPatient.createdAt,
            type: 'creation',
            title: 'Hasta Kaydı Oluşturuldu',
            description: `${this.getAcquisitionTypeLabel(this.currentPatient.acquisitionType)} olarak kaydedildi`
        });

        // Add notes as events
        if (this.currentPatient.notes) {
            this.currentPatient.notes.forEach(note => {
                events.push({
                    date: note.date,
                    type: 'note',
                    title: 'Not Eklendi',
                    description: note.text.substring(0, 100) + (note.text.length > 100 ? '...' : '')
                });
            });
        }

        // Sort by date (newest first)
        events.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (events.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz aktivite yok</p>';
        }

        return events.map(event => `
            <div class="flex items-start space-x-3 pb-4">
                <div class="flex-shrink-0 w-3 h-3 rounded-full ${event.type === 'creation' ? 'bg-blue-500' : 'bg-gray-400'} mt-1"></div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">${event.title}</p>
                    <p class="text-sm text-gray-600">${event.description}</p>
                    <p class="text-xs text-gray-500 mt-1">${new Date(event.date).toLocaleString('tr-TR')}</p>
                </div>
            </div>
        `).join('');
    }

    getAcquisitionTypeLabel(type) {
        const typeObj = this.acquisitionTypes.find(t => t.value === type);
        return typeObj ? typeObj.label : 'Bilinmeyen';
    }

    updatePatientLabel(patientId, newLabel) {
        const patient = this.patients.find(p => p.id === patientId);
        if (patient) {
            patient.label = newLabel;
            this.savePatients();
            this.updatePatientHeader();
            this.renderPatientList();
            
            // Add timeline event
            this.addTimelineEvent(patientId, 'label_change', `Durum ${this.patientLabels[newLabel].text} olarak güncellendi`);
        }
    }

    updateSGKInfo(patientId, field, value) {
        const patient = this.patients.find(p => p.id === patientId);
        if (patient) {
            if (!patient.sgkInfo) patient.sgkInfo = {};
            patient.sgkInfo[field] = value;
            this.savePatients();
        }
    }

    addTimelineEvent(patientId, type, description) {
        const patient = this.patients.find(p => p.id === patientId);
        if (patient) {
            if (!patient.timeline) patient.timeline = [];
            patient.timeline.push({
                id: Date.now().toString(),
                type: type,
                description: description,
                date: new Date().toISOString()
            });
            this.savePatients();
        }
    }

    calculateValidityDate(rightDate, years) {
        if (!rightDate) return 'Tarih girilmedi';
        
        const date = new Date(rightDate);
        const now = new Date();
        const validUntil = new Date(date.getTime() + (years * 365 * 24 * 60 * 60 * 1000));
        
        if (validUntil > now) {
            return `Geçerli (${validUntil.toLocaleDateString('tr-TR')}'ye kadar)`;
        } else {
            return `Süresi dolmuş (${validUntil.toLocaleDateString('tr-TR')})`;
        }
    }

    queryEReceipt(patientId) {
        const tcInput = document.getElementById(`ereceipt-tc-${patientId}`);
        const receiptInput = document.getElementById(`ereceipt-no-${patientId}`);
        const resultsDiv = document.getElementById(`ereceipt-results-${patientId}`);
        
        const tcNumber = tcInput.value.trim();
        const receiptNumber = receiptInput.value.trim();
        
        if (!tcNumber || !receiptNumber) {
            alert('TC Kimlik No ve E-Reçete No gereklidir');
            return;
        }
        
        // Simulate API call
        console.log('E-Reçete sorgulaması:', { tcNumber, receiptNumber });
        
        // Mock response - replace with actual API call
        const mockResponse = {
            success: true,
            receiptNumber: receiptNumber,
            doctorName: 'Dr. Mehmet Özkan',
            date: new Date().toISOString(),
            materials: [
                { code: 'DPIC_RIGHT', selected: false },
                { code: 'DPIC_LEFT', selected: false },
                { code: 'BATTERY_RIGHT', selected: false },
                { code: 'BATTERY_LEFT', selected: false }
            ]
        };
        
        this.displayEReceiptResults(patientId, mockResponse);
    }

    displayEReceiptResults(patientId, response) {
        const resultsDiv = document.getElementById(`ereceipt-results-${patientId}`);
        
        if (!response.success) {
            resultsDiv.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded p-3">
                    <p class="text-red-800 text-sm">E-reçete bulunamadı veya hata oluştu</p>
                </div>
            `;
            resultsDiv.classList.remove('hidden');
            return;
        }
        
        const materialsHtml = response.materials.map(material => {
            const materialInfo = this.ereceiptMaterials.find(m => m.code === material.code);
            if (!materialInfo) return '';
            
            return `
                <div class="flex items-center justify-between p-2 bg-white border rounded material-item">
                    <div class="flex items-center">
                        <input type="checkbox" id="material-${material.code}" 
                               class="mr-2 material-checkbox" ${material.selected ? 'checked' : ''}>
                        <label for="material-${material.code}" class="text-sm">
                            ${materialInfo.name} ${materialInfo.vat > 0 ? `%${materialInfo.vat} KDV` : '0 KDV'}
                        </label>
                    </div>
                    <input type="date" class="px-2 py-1 border rounded text-xs material-date" 
                           placeholder="Başvuru Tarihi" value="${new Date().toISOString().split('T')[0]}">
                </div>
            `;
        }).join('');
        
        resultsDiv.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded p-3">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <h5 class="font-medium text-green-800">E-Reçete #${response.receiptNumber}</h5>
                        <p class="text-sm text-green-600">${response.doctorName}</p>
                        <p class="text-xs text-green-600">${new Date(response.date).toLocaleDateString('tr-TR')}</p>
                    </div>
                </div>
                
                <div class="space-y-2 mb-3">
                    <div class="flex items-center justify-between">
                        <h6 class="text-sm font-medium text-gray-700">Kapsanan Malzemeler:</h6>
                        <label class="flex items-center text-sm text-blue-600 cursor-pointer">
                            <input type="checkbox" id="select-all-materials-${patientId}" 
                                   class="mr-1" onchange="patientManager.toggleSelectAllMaterials('${patientId}')">
                            Tümünü Seç
                        </label>
                    </div>
                    
                    <!-- Global Date Selection -->
                    <div class="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                        <div class="flex items-center justify-between">
                            <label class="text-sm font-medium text-blue-800">Başvuru Tarihi:</label>
                            <div class="flex items-center space-x-2">
                                <input type="date" id="global-date-${patientId}" 
                                       class="px-2 py-1 border rounded text-xs"
                                       value="${new Date().toISOString().split('T')[0]}"
                                       onchange="patientManager.applyGlobalDate('${patientId}')">
                                <label class="flex items-center text-xs text-blue-600 cursor-pointer">
                                    <input type="checkbox" id="auto-apply-date-${patientId}" 
                                           class="mr-1" checked>
                                    Otomatik Uygula
                                </label>
                            </div>
                        </div>
                    </div>
                    ${materialsHtml}
                </div>
                
                <button onclick="patientManager.saveEReceipt('${patientId}', '${response.receiptNumber}')" 
                        class="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700">
                    E-Reçete Kaydet
                </button>
            </div>
        `;
        
        resultsDiv.classList.remove('hidden');
    }

    toggleSelectAllMaterials(patientId) {
        const selectAllCheckbox = document.getElementById(`select-all-materials-${patientId}`);
        const materialCheckboxes = document.querySelectorAll('.material-checkbox');
        const autoApplyDate = document.getElementById(`auto-apply-date-${patientId}`);
        
        materialCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        
        // If selecting all and auto-apply is enabled, apply global date to all materials
        if (selectAllCheckbox.checked && autoApplyDate && autoApplyDate.checked) {
            this.applyGlobalDate(patientId);
        }
    }

    applyGlobalDate(patientId) {
        const globalDateInput = document.getElementById(`global-date-${patientId}`);
        const autoApply = document.getElementById(`auto-apply-date-${patientId}`);
        
        if (!globalDateInput.value) return;
        
        const materialDateInputs = document.querySelectorAll('.material-date');
        materialDateInputs.forEach(input => {
            if (autoApply.checked) {
                input.value = globalDateInput.value;
            } else {
                // Only apply to checked materials
                const materialRow = input.closest('.material-item');
                const checkbox = materialRow.querySelector('.material-checkbox');
                if (checkbox && checkbox.checked) {
                    input.value = globalDateInput.value;
                }
            }
        });
    }

    saveEReceipt(patientId, receiptNumber) {
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) {
            console.warn('Patient not found:', patientId);
            return;
        }
        
        // Get selected materials from UI
        const selectedMaterials = [];
        this.ereceiptMaterials.forEach(material => {
            const checkbox = document.getElementById(`material-${material.code}`);
            if (checkbox && checkbox.checked) {
                const materialRow = checkbox.closest('.material-item');
                const dateInput = materialRow.querySelector('.material-date');
                selectedMaterials.push({
                    code: material.code,
                    name: material.name,
                    applicationDate: dateInput.value || new Date().toISOString().split('T')[0]
                });
            }
        });
        
        // If no materials selected from UI (programmatic call), add some default materials
        if (selectedMaterials.length === 0) {
            console.log('No materials selected from UI, adding default materials for testing');
            selectedMaterials.push(
                {
                    code: 'DPIC_RIGHT',
                    name: 'Dijital programlanabilir işitme cihazı - sağ',
                    applicationDate: new Date().toISOString().split('T')[0]
                },
                {
                    code: 'BATTERY_RIGHT',
                    name: 'İşitme cihazı pili - sağ',
                    applicationDate: new Date().toISOString().split('T')[0]
                }
            );
        }
        
        // Save to patient's e-receipt history
        if (!patient.ereceiptHistory) patient.ereceiptHistory = [];
        
        // Generate random SGK status for testing
        const sgkStatuses = ['pending', 'processing', 'success', 'error'];
        const randomSgkStatus = sgkStatuses[Math.floor(Math.random() * sgkStatuses.length)];
        
        const newReceipt = {
            id: Date.now().toString(),
            number: receiptNumber,
            doctorName: 'Dr. Mehmet Özkan', // This would come from API
            date: new Date().toISOString(),
            sgkStatus: randomSgkStatus,
            materials: selectedMaterials,
            saved: true
        };

        // Add SGK processing dates based on status
        if (randomSgkStatus === 'processing') {
            newReceipt.sgkProcessingDate = new Date().toISOString();
        } else if (randomSgkStatus === 'success') {
            newReceipt.sgkProcessingDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
            newReceipt.sgkCompletionDate = new Date().toISOString();
        } else if (randomSgkStatus === 'error') {
            newReceipt.sgkProcessingDate = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
            newReceipt.sgkErrorDate = new Date().toISOString();
        }
        
        patient.ereceiptHistory.push(newReceipt);
        
        // Update current patient reference if it's the same patient
        if (this.currentPatient && this.currentPatient.id === patientId) {
            this.currentPatient.ereceiptHistory = patient.ereceiptHistory;
        }
        
        // Update sample data if it exists
        if (window.sampleData && window.sampleData.patients) {
            const samplePatient = window.sampleData.patients.find(p => p.id === patientId);
            if (samplePatient) {
                samplePatient.ereceiptHistory = patient.ereceiptHistory;
            }
        }
        
        this.savePatients();
        
        // Add to timeline
        this.addTimelineEvent(patientId, 'ereceipt_saved', `E-Reçete #${receiptNumber} kaydedildi`);
        
        // Show success message first
        Utils.showToast('E-Reçete başarıyla kaydedildi', 'success');
        
        // Switch to SGK tab to show saved materials with a small delay
        setTimeout(() => {
            this.switchToSGKTab();
            // Refresh the saved E-receipts display
            setTimeout(() => {
                if (typeof loadSavedEReceipts === 'function') {
                    loadSavedEReceipts();
                }
                Utils.showToast('SGK sekmesinde kaydedilen malzemeler görüntüleniyor', 'info');
            }, 300);
        }, 500);
    }

    switchToSGKTab() {
        // Use the global tab navigation instance to switch to SGK tab
        if (window.tabNavigation) {
            window.tabNavigation.switchTab('sgk');
            
            // Ensure SGK info is refreshed with latest data
            setTimeout(() => {
                if (typeof loadSGKInfo === 'function') {
                    loadSGKInfo();
                }
            }, 100);
        } else {
            // Fallback: find and click the SGK tab button
            const sgkTab = document.querySelector('[data-tab="sgk"]');
            if (sgkTab) {
                sgkTab.click();
                
                // Refresh SGK info after tab switch
                setTimeout(() => {
                    if (typeof loadSGKInfo === 'function') {
                        loadSGKInfo();
                    }
                }, 100);
            } else {
                console.warn('Could not find SGK tab to switch to');
                Utils.showToast('SGK sekmesine geçilemedi', 'warning');
            }
        }
    }

    queryReports(patientId) {
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient || !patient.tcNumber) {
            alert('TC Kimlik No bulunamadı');
            return;
        }
        
        // Check if we already have cached results
        if (patient.lastReportQuery && patient.lastReportQuery.results) {
            // Show existing results
            this.displayReportResults(patientId, patient.lastReportQuery.results);
            return;
        }
        
        // Simulate API call
        console.log('Rapor sorgulaması:', patient.tcNumber);
        
        // Mock response
        const mockReports = [
            { type: 'device', name: 'İşitme Cihazı Raporu', validUntil: '2025-12-31', status: 'active' },
            { type: 'battery', name: 'Pil Raporu', validUntil: '2024-06-30', status: 'expired' }
        ];
        
        // Save results to patient data
        patient.lastReportQuery = {
            date: new Date().toISOString(),
            tcNumber: patient.tcNumber,
            results: mockReports
        };
        
        this.savePatients();
        this.displayReportResults(patientId, mockReports);
    }

    displayReportResults(patientId, reports) {
        const resultsDiv = document.getElementById(`report-results-${patientId}`);
        const patient = this.patients.find(p => p.id === patientId);
        
        const reportsHtml = reports.map(report => `
            <div class="flex items-center justify-between p-2 bg-white border rounded">
                <div>
                    <p class="text-sm font-medium">${report.name}</p>
                    <p class="text-xs text-gray-600">Geçerli: ${new Date(report.validUntil).toLocaleDateString('tr-TR')}</p>
                </div>
                <span class="px-2 py-1 rounded text-xs ${report.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${report.status === 'active' ? 'Geçerli' : 'Süresi Dolmuş'}
                </span>
            </div>
        `).join('');
        
        const lastQueryDate = patient.lastReportQuery ? new Date(patient.lastReportQuery.date).toLocaleString('tr-TR') : 'Bilinmiyor';
        
        resultsDiv.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded p-3">
                <div class="flex justify-between items-center mb-2">
                    <h5 class="font-medium text-blue-800">Rapor Sonuçları</h5>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs text-blue-600">Son güncelleme: ${lastQueryDate}</span>
                        <button onclick="patientManager.refreshReportQuery('${patientId}')" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors">
                            🔄 Yenile
                        </button>
                    </div>
                </div>
                <div class="space-y-1">
                    ${reportsHtml}
                </div>
            </div>
        `;
        
        resultsDiv.classList.remove('hidden');
    }

    refreshReportQuery(patientId) {
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) return;
        
        // Clear cached results
        delete patient.lastReportQuery;
        this.savePatients();
        
        // Perform new query
        this.queryReports(patientId);
    }

    renderEReceiptHistory() {
        if (!this.currentPatient.ereceiptHistory || this.currentPatient.ereceiptHistory.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz e-reçete kaydı yok</p>';
        }

        return this.currentPatient.ereceiptHistory.map(receipt => `
            <div class="bg-white p-3 rounded border border-gray-200 mb-2">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-medium">E-Reçete #${receipt.number}</h4>
                        <p class="text-sm text-gray-600">${receipt.doctorName}</p>
                        <p class="text-sm text-gray-600">${new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <button onclick="patientManager.showReceiptDetails('${receipt.id}')" 
                            class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        Detaylar
                    </button>
                </div>
            </div>
        `).join('');
    }

    showReceiptDetails(receiptId) {
        const receipt = this.currentPatient.ereceiptHistory.find(r => r.id === receiptId);
        if (!receipt) return;
        
        const materialsHtml = receipt.materials.map(material => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded mb-2">
                <div>
                    <p class="text-sm font-medium">${material.name}</p>
                    <p class="text-xs text-gray-600">Başvuru: ${new Date(material.applicationDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <div class="flex space-x-2">
                    <button onclick="patientManager.deliverMaterial('${receiptId}', '${material.code}')" 
                            class="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">
                        Malzeme Teslim Et
                    </button>
                    <input type="date" class="px-2 py-1 border rounded text-xs" 
                           placeholder="Teslim Tarihi" value="${material.deliveryDate || ''}">
                </div>
            </div>
        `).join('');
        
        // Create modal for receipt details
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">E-Reçete Detayları #${receipt.number}</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-gray-50 p-3 rounded">
                        <p><strong>Doktor:</strong> ${receipt.doctorName}</p>
                        <p><strong>Tarih:</strong> ${new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                    </div>
                    
                    <div>
                        <h4 class="font-medium mb-2">Kapsanan Malzemeler:</h4>
                        ${materialsHtml}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    deliverMaterial(receiptId, materialCode) {
        // This would handle material delivery with UBB codes, barcodes, etc.
        alert(`Malzeme teslim edildi: ${materialCode}`);
    }

    renderPatientDocuments() {
        if (!this.currentPatient.documents || this.currentPatient.documents.length === 0) {
            return '<p class="text-gray-500 text-sm">Henüz belge yüklenmemiş</p>';
        }

        return this.currentPatient.documents.map(doc => `
            <div class="bg-white p-3 rounded border border-gray-200 mb-2">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-medium">${doc.name}</h4>
                        <p class="text-sm text-gray-600">${doc.type}</p>
                        <p class="text-xs text-gray-500">${new Date(doc.uploadDate).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="patientManager.downloadDocument('${doc.id}')" 
                                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                            İndir
                        </button>
                        <button onclick="patientManager.deleteDocument('${doc.id}')" 
                                class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
                            Sil
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    openAddDeviceModal(patientId) {
        const patient = this.patients.find(p => p.id === patientId);
        
        // Check required fields
        if (!patient.tcNumber || !patient.phone || !patient.address) {
            alert('Cihaz eklemek için TC Kimlik No, Telefon ve Adres bilgileri gereklidir!');
            return;
        }
        
        // Check SGK info
        if (!patient.sgkInfo?.deviceRight) {
            alert('Cihaz eklemek için SGK cihaz hakkı bilgisi gereklidir!');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Cihaz Ekle</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="add-device-form" onsubmit="patientManager.saveDevice(event, '${patientId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Ürün Seçin</label>
                            <select name="deviceId" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                <option value="">Ürün Seçiniz</option>
                                ${this.deviceInventory.map(device => 
                                    `<option value="${device.id}" data-price="${device.price}">${device.brand} ${device.model} - ${device.price.toLocaleString('tr-TR')} TL</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kulak</label>
                            <select name="ear" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                <option value="">Seçiniz</option>
                                <option value="left">Sol</option>
                                <option value="right">Sağ</option>
                                <option value="bilateral">Bilateral</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Adet</label>
                            <input type="number" name="quantity" min="1" max="2" value="1" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
                            <input type="text" name="serialNumber" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Barkod No</label>
                            <input type="text" name="barcode" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button type="button" onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                            İptal
                        </button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    saveDevice(event, patientId) {
        event.preventDefault();
        
        try {
            const formData = new FormData(event.target);
            const deviceData = {
                id: Date.now().toString(),
                deviceId: formData.get('deviceId'),
                ear: formData.get('ear'),
                quantity: parseInt(formData.get('quantity')),
                serialNumber: formData.get('serialNumber'),
                barcode: formData.get('barcode'),
                assignedDate: new Date().toISOString(),
                status: 'active'
            };
            
            // Validate required fields
            if (!deviceData.deviceId || !deviceData.ear || !deviceData.serialNumber || !deviceData.barcode) {
                throw new Error('Tüm alanları doldurunuz');
            }
            
            const device = this.deviceInventory.find(d => d.id === deviceData.deviceId);
            if (!device) {
                throw new Error('Seçilen cihaz bulunamadı');
            }
            
            deviceData.brand = device.brand;
            deviceData.model = device.model;
            deviceData.price = device.price;
            
            const patient = this.patients.find(p => p.id === patientId);
            if (!patient.devices) patient.devices = [];
            
            // Check for duplicate serial number
            if (patient.devices.some(d => d.serialNumber === deviceData.serialNumber)) {
                throw new Error('Bu seri numarası zaten kullanımda');
            }
            
            patient.devices.push(deviceData);
            patient.label = 'kontrol-hastasi';
            
            this.savePatients();
            this.updatePatientHeader();
            this.renderPatientList();
            
            // Add timeline event
            this.addTimelineEvent(patientId, 'device_assigned', `${device.brand} ${device.model} cihazı atandı`);
            
            // Close modal and refresh current tab (cihaz)
            event.target.closest('.fixed').remove();
            this.switchTab('cihaz'); // Force stay on cihaz tab
            
            Utils.showToast('Cihaz başarıyla eklendi', 'success');
            
        } catch (error) {
            Utils.showToast('Cihaz atama işlemi iptal edildi: ' + error.message, 'error');
        }
    }

    uploadDocument(patientId) {
        alert('Belge yükleme özelliği geliştirme aşamasında');
    }

    downloadDocument(documentId) {
        alert('Belge indirme özelliği geliştirme aşamasında');
    }

    deleteDocument(documentId) {
        if (confirm('Belgeyi silmek istediğinizden emin misiniz?')) {
            // Remove document logic here
            alert('Belge silindi');
        }
    }

    removeDevice(patientId, serialNumber) {
        const patient = this.patients.find(p => p.id === patientId);
        if (patient && patient.devices) {
            patient.devices = patient.devices.filter(d => d.serialNumber !== serialNumber);
            this.savePatients();
            this.loadTabContent(this.currentTab); // Refresh tab
        }
    }

    showReceiptDetails(receiptId) {
        alert('E-reçete detayları modalı açılacak. Geliştirme aşamasında.');
    }

    initializeWidgets() {
        // Sidebar is already initialized in the HTML
        // No need to initialize it again
        console.log('🎯 Widgets initialized');
    }
}

// Global functions for HTML event handlers
function togglePatientList() {
    const sidebar = document.getElementById('patient-list-sidebar');
    sidebar.classList.toggle('-translate-x-full');
}

function searchPatients(query) {
    if (window.patientManager) {
        window.patientManager.searchPatients(query);
    }
}

function openNewPatientModal() {
    document.getElementById('new-patient-modal').classList.remove('hidden');
}

function closeNewPatientModal() {
    document.getElementById('new-patient-modal').classList.add('hidden');
    document.getElementById('new-patient-form').reset();
}

function saveNewPatient(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const patientData = {
        id: 'p' + Date.now(),
        name: formData.get('name'),
        phone: formData.get('phone'),
        tcNumber: formData.get('tcNumber'),
        address: formData.get('address'),
        acquisitionType: formData.get('acquisitionType'),
        label: 'yeni',
        createdAt: new Date().toISOString(),
        notes: [],
        sgkInfo: {},
        devices: [],
        ereceiptHistory: [],
        reports: []
    };

    // Add to patients array
    window.patientManager.patients.push(patientData);
    window.patientManager.savePatients();
    window.patientManager.renderPatientList();
    
    // Log new patient creation to timeline
    if (window.addTimelineEvent) {
        window.addTimelineEvent('patient_created', {
            patientName: patientData.name,
            acquisitionType: patientData.acquisitionType,
            phone: patientData.phone
        });
    }
    
    // Load the new patient
    window.patientManager.loadPatient(patientData.id);
    
    closeNewPatientModal();
}

function editPatient() {
    // Get the current patient data
    const patient = window.patientDetailsManager?.currentPatient || {};
    
    // Ad ve soyad alanlarını ayır
    let firstName = patient.firstName || '';
    let lastName = patient.lastName || '';
    
    // Eğer firstName ve lastName yoksa ama name varsa, name'i parçala
    if ((!firstName || !lastName) && patient.name) {
        const nameParts = patient.name.split(' ');
        if (nameParts.length > 1) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
        } else {
            firstName = patient.name;
        }
    }
    
    // Create modal content using template literals (works fine in .js files)
    const modalContent = `
        <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="firstName" class="block text-sm font-medium text-gray-700">Ad</label>
                    <input type="text" id="firstName" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" value="${firstName}" />
                </div>
                <div>
                    <label for="lastName" class="block text-sm font-medium text-gray-700">Soyad</label>
                    <input type="text" id="lastName" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" value="${lastName}" />
                </div>
            </div>
            <div>
                <label for="tcNumber" class="block text-sm font-medium text-gray-700">TC Kimlik No</label>
                <input type="text" id="tcNumber" maxlength="11" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" value="${patient.tcNumber || ''}" onblur="validateTcNumber(this)" />
                <p id="tcNumberEditError" class="text-xs text-red-500 mt-1 hidden">Geçersiz TC Kimlik Numarası!</p>
            </div>
            <div>
                <label for="phone" class="block text-sm font-medium text-gray-700">Telefon</label>
                <input type="text" id="phone" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" value="${patient.phone || ''}" onblur="validatePhoneNumber(this)" />
                <p id="phoneEditError" class="text-xs text-red-500 mt-1 hidden">Geçersiz telefon numarası! Örnek: (90)5553332211</p>
            </div>
            <div>
                <label for="email" class="block text-sm font-medium text-gray-700">E-posta</label>
                <input type="email" id="email" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" value="${patient.email || ''}" />
            </div>
            <div>
                <label for="erecepteNo" class="block text-sm font-medium text-gray-700">E-reçete No</label>
                <div class="flex gap-2">
                    <input type="text" id="erecepteNo" placeholder="E-reçete numarasını girin" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" value="${patient.erecepteNo || ''}" />
                    <button type="button" onclick="queryErecepte()" class="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                        Sorgula
                    </button>
                </div>
                <p id="erecepteStatus" class="text-xs mt-1 hidden"></p>
            </div>
            <div>
                <label for="birthDate" class="block text-sm font-medium text-gray-700">Doğum Tarihi</label>
                <input type="date" id="birthDate" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" value="${patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : ''}" />
            </div>
            <div>
                <label for="address" class="block text-sm font-medium text-gray-700">Adres</label>
                <textarea id="address" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">${patient.address || ''}</textarea>
            </div>
            <div>
                <label for="acquisitionType" class="block text-sm font-medium text-gray-700">Kazanım Türü</label>
                <select id="acquisitionType" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
                    <option value="tabela" ${patient.acquisitionType === 'tabela' ? 'selected' : ''}>Tabela</option>
                    <option value="sosyal_medya" ${patient.acquisitionType === 'sosyal_medya' ? 'selected' : ''}>Sosyal Medya</option>
                    <option value="tanitim" ${patient.acquisitionType === 'tanitim' ? 'selected' : ''}>Tanıtım</option>
                    <option value="referans" ${patient.acquisitionType === 'referans' ? 'selected' : ''}>Referans</option>
                    <option value="diger" ${patient.acquisitionType === 'diger' ? 'selected' : ''}>Diğer</option>
                </select>
            </div>
            <div>
                <label for="conversionStep" class="block text-sm font-medium text-gray-700">Dönüşüm Adımı</label>
                <select id="conversionStep" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary">
                    <option value="lead" ${patient.conversionStep === 'lead' ? 'selected' : ''}>Potansiyel Müşteri</option>
                    <option value="contacted" ${patient.conversionStep === 'contacted' ? 'selected' : ''}>İletişim Kuruldu</option>
                    <option value="appointment_scheduled" ${patient.conversionStep === 'appointment_scheduled' ? 'selected' : ''}>Randevu Verildi</option>
                    <option value="visited" ${patient.conversionStep === 'visited' ? 'selected' : ''}>Merkez Ziyareti</option>
                    <option value="hearing_test_done" ${patient.conversionStep === 'hearing_test_done' ? 'selected' : ''}>İşitme Testi Yapıldı</option>
                    <option value="device_trial" ${patient.conversionStep === 'device_trial' ? 'selected' : ''}>Cihaz Denemesi</option>
                    <option value="proposal_given" ${patient.conversionStep === 'proposal_given' ? 'selected' : ''}>Teklif Verildi</option>
                    <option value="negotiation" ${patient.conversionStep === 'negotiation' ? 'selected' : ''}>Pazarlık</option>
                    <option value="purchased" ${patient.conversionStep === 'purchased' ? 'selected' : ''}>Satın Aldı</option>
                    <option value="follow_up" ${patient.conversionStep === 'follow_up' ? 'selected' : ''}>Takip</option>
                    <option value="lost" ${patient.conversionStep === 'lost' ? 'selected' : ''}>Kaybedildi</option>
                </select>
            </div>
        </div>
    `;
    
    // Show modal
    Utils.showModal({
        title: 'Hasta Bilgilerini Düzenle',
        content: modalContent,
        primaryButton: {
            text: 'Kaydet',
            onClick: () => {
                // Get form values
                const tcNumber = document.getElementById('tcNumber').value;
                
                // TC Kimlik No doğrulama
                if (tcNumber && !Utils.validateTCKN(tcNumber)) {
                    Utils.showToast('Geçersiz TC Kimlik Numarası! Lütfen kontrol ediniz.', 'error');
                    return false;
                }
                
                // Telefon numarası doğrulama
                const phone = document.getElementById('phone').value;
                if (phone && !Utils.validatePhone(phone)) {
                    Utils.showToast('Geçersiz telefon numarası! Lütfen kontrol ediniz.', 'error');
                    return false;
                }
                
                const updatedPatient = {
                    ...patient,
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    tcNumber: tcNumber,
                    tc: tcNumber, // TC alanını da güncelle
                    phone: document.getElementById('phone').value,
                    email: document.getElementById('email').value,
                    birthDate: document.getElementById('birthDate').value,
                    address: document.getElementById('address').value,
                    acquisitionType: document.getElementById('acquisitionType').value,
                    conversionStep: document.getElementById('conversionStep').value,
                    name: document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value,
                    eReceiptNo: document.getElementById('eReceiptNo') ? document.getElementById('eReceiptNo').value : ''
                };
                
                // Update patient data
                if (window.patientDetailsManager) {
                    // Calculate age if needed
                    if (updatedPatient.birthDate && !updatedPatient.age) {
                        updatedPatient.age = Utils.calculateAge(updatedPatient.birthDate);
                    }
                    
                    window.patientDetailsManager.currentPatient = updatedPatient;
                    window.patientDetailsManager.savePatientToStorage();
                    
                    // Log profile update to timeline
                    if (window.addTimelineEvent) {
                        window.addTimelineEvent('profile_update', {
                            updatedFields: ['firstName', 'lastName', 'tcNumber', 'phone', 'email', 'birthDate', 'address', 'acquisitionType', 'conversionStep']
                        });
                    }
                    
                    // Update all patient displays using our central function
                    if (typeof updateAllPatientDisplays === 'function') {
                        updateAllPatientDisplays(updatedPatient);
                    }
                    
                    // Render other components that might need updating
                    if (window.patientDetailsManager.renderPatientProfile) {
                        window.patientDetailsManager.renderPatientProfile();
                    }
                    if (window.patientDetailsManager.renderGeneralTab) {
                        window.patientDetailsManager.renderGeneralTab();
                    }
                    
                    Utils.showToast('Hasta bilgileri güncellendi', 'success');
                    return true; // Close modal
                } else {
                    Utils.showToast('Hasta bilgileri güncellenemedi', 'error');
                    return false; // Keep modal open
                }
            }
        },
        secondaryButton: {
            text: 'İptal',
            onClick: () => { return true; }
        }
    });
}

function closeEditPatientModal() {
    document.getElementById('edit-patient-modal').classList.add('hidden');
}

function makeCall() {
    if (window.patientManager.currentPatient) {
        // Open notes modal for call notes
        openNotesModal();
    }
}

function openNotesModal() {
    if (window.patientManager.currentPatient) {
        document.getElementById('notes-modal').classList.remove('hidden');
        loadNotesInModal();
    }
}

function closeNotesModal() {
    document.getElementById('notes-modal').classList.add('hidden');
    document.getElementById('new-note-text').value = '';
}

function loadNotesInModal() {
    const notesList = document.getElementById('notes-list');
    const patient = window.patientManager.currentPatient;
    
    if (!patient.notes || patient.notes.length === 0) {
        notesList.innerHTML = '<p class="text-gray-500 text-sm">Henüz not yok</p>';
        return;
    }

    const html = patient.notes
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(note => `
            <div class="bg-gray-50 p-3 rounded">
                <p class="text-sm">${note.text}</p>
                <div class="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span>${note.author || 'Kullanıcı'}</span>
                    <span>${new Date(note.date).toLocaleString('tr-TR')}</span>
                </div>
            </div>
        `).join('');
    
    notesList.innerHTML = html;
}

function addNote() {
    const noteText = document.getElementById('new-note-text').value.trim();
    if (!noteText) return;

    const patient = window.patientManager.currentPatient;
    if (!patient.notes) patient.notes = [];
    
    patient.notes.push({
        id: Date.now().toString(),
        text: noteText,
        date: new Date().toISOString(),
        author: 'Kullanıcı'
    });

    window.patientManager.savePatients();
    document.getElementById('new-note-text').value = '';
    
    // Log note addition to timeline
    if (window.addTimelineEvent) {
        window.addTimelineEvent('note', {
            content: noteText,
            author: 'Kullanıcı'
        });
    }
    
    // Refresh notes in modal and in tab
    loadNotesInModal();
    if (window.patientManager.currentTab === 'genel') {
        window.patientManager.loadTabContent('genel');
    }
}

function switchTab(tabName) {
    if (window.patientManager) {
        window.patientManager.switchTab(tabName);
    }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.patientManager = new PatientDetailsManager();
    // Also assign to patientDetailsManager for backward compatibility
    window.patientDetailsManager = window.patientManager;
});

console.log('🎯 Patient Details script loaded');
