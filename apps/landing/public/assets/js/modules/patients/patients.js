// Patient Management System
console.log('Loading patients.js...');

// Check if PatientManager already exists to avoid duplicate declaration
if (typeof window.PatientManager === 'undefined') {
    // Attach class directly to the window so it is available to inline scripts as `PatientManager` and to other modules
    window.PatientManager = class PatientManager {
        constructor() {
            this.patients = [];
            this.filteredPatients = [];
            this.selectedPatients = new Set();
            this.currentFilters = {
                search: '',
                status: '',
                segment: '',
                branch: '',
                hearingTest: '',
                trial: '',
                priceGiven: ''
            };
            
            // Pagination state
            this.currentPage = 1;
            this.patientsPerPage = 20;
            this.paginationOptions = [20, 50, 100];
            
            // Initialize asynchronously
            this.initialize();
        }

        async initialize() {
            await this.loadInitialData();
            this.setupEventListeners();
            this.renderSavedViews();
        }

        async loadInitialData() {
            await this.loadPatients();
            this.renderPatients();
            this.renderStats();
        }

        async loadPatients() {
            return new Promise((resolve) => {
                const doLoad = async () => {
                    try {
                        if (window.sampleData && window.sampleData.patientService) {
                            const allPatients = await window.sampleData.patientService.getAll();
                            console.log('Data service returned:', allPatients, 'Type:', typeof allPatients);
                            
                            const normalizedPatients = Array.isArray(allPatients) ? allPatients.map(patient => ({
                                ...patient,
                                name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
                            })) : [];
                            
                            this.patients = normalizedPatients;
                            this.filteredPatients = [...this.patients];
                            console.log(`Loaded ${this.patients.length} patients from TypeScript service.`);
                        } else if (window.patientDataService) {
                            const allPatients = await window.patientDataService.getAll();
                            const normalizedPatients = Array.isArray(allPatients) ? allPatients.map(patient => ({
                                ...patient,
                                name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
                            })) : [];
                            
                            this.patients = normalizedPatients;
                            this.filteredPatients = [...this.patients];
                            console.log(`Loaded ${this.patients.length} patients from legacy service.`);
                        } else if (window.samplePatients && Array.isArray(window.samplePatients)) {
                            this.patients = window.samplePatients;
                            this.filteredPatients = [...this.patients];
                            console.log(`Loaded ${this.patients.length} patients from sample data.`);
                        } else {
                            // Fallback to load from unified storage manager
                            let patients = [];
                            if (window.XEarStorageManager) {
                                patients = window.XEarStorageManager.get('patients', []);
                            } else {
                                // Direct localStorage fallback
                                patients = JSON.parse(localStorage.getItem('xear_patients_data') || '[]');
                            }
                            
                            const normalizedPatients = Array.isArray(patients) ? patients.map(patient => ({
                                ...patient,
                                name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
                            })) : [];
                            
                            this.patients = normalizedPatients;
                            this.filteredPatients = [...this.patients];
                            console.log(`Loaded ${this.patients.length} patients from unified storage.`);
                        }
                    } catch (error) {
                        console.error('Error loading patient data:', error);
                    } finally {
                        resolve();
                    }
                };

                if (window.sampleData) {
                    doLoad();
                } else {
                    window.addEventListener('typeScriptDataLoaded', doLoad, { once: true });
                }
            });
        }

        setupEventListeners() {
            // Search input
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.currentFilters.search = e.target.value;
                    this.applyFilters();
                });
            }

            // TC Kimlik No doğrulama
            const tcNumberInput = document.getElementById('tcNumber');
            if (tcNumberInput) {
                tcNumberInput.addEventListener('blur', (e) => {
                    const tcNumber = e.target.value.trim();
                    const tcNumberError = document.getElementById('tcNumberError');
                    
                    if (tcNumber && !Utils.validateTCKN(tcNumber)) {
                        tcNumberInput.classList.add('border-red-500');
                        tcNumberError.classList.remove('hidden');
                    } else {
                        tcNumberInput.classList.remove('border-red-500');
                        tcNumberError.classList.add('hidden');
                    }
                });
            }
            
            // Telefon numarası doğrulama
            const phoneInput = document.getElementById('phone');
            if (phoneInput) {
                phoneInput.addEventListener('blur', (e) => {
                    const phone = e.target.value.trim();
                    const phoneError = document.getElementById('phoneError');
                    
                    if (phone && !Utils.validatePhone(phone)) {
                        phoneInput.classList.add('border-red-500');
                        phoneError.classList.remove('hidden');
                    } else {
                        phoneInput.classList.remove('border-red-500');
                        phoneError.classList.add('hidden');
                    }
                });
            }

            // Filter dropdowns
            const filters = ['statusFilter', 'segmentFilter', 'branchFilter', 'hearingTestFilter', 'trialFilter', 'priceGivenFilter'];
            filters.forEach(filterId => {
                const filterElement = document.getElementById(filterId);
                if (filterElement) {
                    filterElement.addEventListener('change', (e) => {
                        const filterKey = filterId.replace('Filter', '');
                        this.currentFilters[filterKey] = e.target.value;
                        this.applyFilters();
                    });
                }
            });
        }

        applyFilters() {
            this.filteredPatients = (this.patients || []).filter(patient => {
                // Search filter
                if (this.currentFilters.search) {
                    const searchTerm = this.currentFilters.search.toLowerCase();
                    const searchableText = `${patient.name} ${patient.phone} ${patient.email || ''}`.toLowerCase();
                    if (!searchableText.includes(searchTerm)) {
                        return false;
                    }
                }

                // Status filter
                if (this.currentFilters.status && patient.status !== this.currentFilters.status) {
                    return false;
                }

                // Segment filter
                if (this.currentFilters.segment && patient.segment !== this.currentFilters.segment) {
                    return false;
                }

                // Branch filter (simplified - using address for now)
                if (this.currentFilters.branch) {
                    const patientBranch = this.getBranchFromAddress(patient.address);
                    if (patientBranch !== this.currentFilters.branch) {
                        return false;
                    }
                }

                return true;
            });

            // Reset to first page when filters change
            this.currentPage = 1;
            this.renderPatients();
            this.renderStats();
        }

        getBranchFromAddress(address) {
            if (address.includes('Kadıköy')) return 'kadikoy';
            if (address.includes('Bakırköy')) return 'bakirkoy';
            return 'merkez';
        }

        // Pagination helper methods
        getTotalPages() {
            return Math.ceil(this.filteredPatients.length / this.patientsPerPage);
        }

        getPaginatedPatients() {
            const startIndex = (this.currentPage - 1) * this.patientsPerPage;
            const endIndex = startIndex + this.patientsPerPage;
            return this.filteredPatients.slice(startIndex, endIndex);
        }

        changePage(page) {
            const totalPages = this.getTotalPages();
            if (page >= 1 && page <= totalPages) {
                this.currentPage = page;
                this.renderPatients();
            }
        }

        changePageSize(newSize) {
            this.patientsPerPage = newSize;
            this.currentPage = 1; // Reset to first page
            this.renderPatients();
        }

        renderPatients() {
            const container = document.getElementById('patientsTableContainer');
            if (!container) return;

            const paginatedPatients = this.getPaginatedPatients();
            const totalPages = this.getTotalPages();
            const startIndex = (this.currentPage - 1) * this.patientsPerPage + 1;
            const endIndex = Math.min(startIndex + paginatedPatients.length - 1, this.filteredPatients.length);

            const tableHTML = `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input type="checkbox" id="selectAllCheckbox" class="rounded border-gray-300 text-primary focus:ring-primary">
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasta</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edinilme</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dönüşüm</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Ziyaret</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cihaz</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${paginatedPatients.map(patient => this.renderPatientRow(patient)).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <div class="text-sm text-gray-700">
                            ${this.filteredPatients.length > 0 ? `${startIndex}-${endIndex}` : '0'} / ${this.filteredPatients.length} hasta gösteriliyor
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm text-gray-700">Sayfa başına:</span>
                            <select id="pageSizeSelect" class="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent">
                                ${this.paginationOptions.map(option => 
                                    `<option value="${option}" ${option === this.patientsPerPage ? 'selected' : ''}>${option}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button id="prevPageBtn" class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
                                ${this.currentPage <= 1 ? 'disabled' : ''}>
                            Önceki
                        </button>
                        <div class="flex items-center space-x-1">
                            ${this.renderPaginationNumbers()}
                        </div>
                        <button id="nextPageBtn" class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" 
                                ${this.currentPage >= totalPages ? 'disabled' : ''}>
                            Sonraki
                        </button>
                    </div>
                </div>
            `;

            container.innerHTML = tableHTML;

            // Setup event listeners
            this.setupPaginationEventListeners();

            // Setup select all checkbox
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('change', (e) => {
                    this.toggleSelectAll(e.target.checked);
                });
            }
        }

        renderPaginationNumbers() {
            const totalPages = this.getTotalPages();
            const currentPage = this.currentPage;
            let pages = [];

            if (totalPages <= 7) {
                // Show all pages if 7 or fewer
                for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // Show first page, last page, current page and surrounding pages
                if (currentPage <= 4) {
                    pages = [1, 2, 3, 4, 5, '...', totalPages];
                } else if (currentPage >= totalPages - 3) {
                    pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                } else {
                    pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                }
            }

            return pages.map(page => {
                if (page === '...') {
                    return '<span class="px-3 py-2 text-sm text-gray-500">...</span>';
                } else if (page === currentPage) {
                    return `<button class="px-3 py-2 text-sm bg-primary text-white rounded-lg">${page}</button>`;
                } else {
                    return `<button class="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" onclick="patientManager.changePage(${page})">${page}</button>`;
                }
            }).join('');
        }

        setupPaginationEventListeners() {
            // Page size selector
            const pageSizeSelect = document.getElementById('pageSizeSelect');
            if (pageSizeSelect) {
                pageSizeSelect.addEventListener('change', (e) => {
                    this.changePageSize(parseInt(e.target.value));
                });
            }

            // Previous page button
            const prevPageBtn = document.getElementById('prevPageBtn');
            if (prevPageBtn) {
                prevPageBtn.addEventListener('click', () => {
                    this.changePage(this.currentPage - 1);
                });
            }

            // Next page button
            const nextPageBtn = document.getElementById('nextPageBtn');
            if (nextPageBtn) {
                nextPageBtn.addEventListener('click', () => {
                    this.changePage(this.currentPage + 1);
                });
            }
        }

        renderPatientRow(patient) {
            const statusColors = {
                active: 'bg-green-100 text-green-800',
                inactive: 'bg-red-100 text-red-800',
                pending: 'bg-yellow-100 text-yellow-800'
            };

            const segmentColors = {
                lead: 'bg-blue-100 text-blue-800',
                trial: 'bg-purple-100 text-purple-800',
                purchased: 'bg-green-100 text-green-800',
                follow_up: 'bg-gray-100 text-gray-800'
            };

            const segmentLabels = {
                lead: 'Potansiyel',
                trial: 'Deneme',
                purchased: 'Satın Aldı',
                follow_up: 'Takip'
            };

            const deviceInfo = patient.assignedDevices && patient.assignedDevices.length > 0 
                ? `${patient.assignedDevices[0].brand} ${patient.assignedDevices[0].model}`
                : 'Cihaz yok';

            const lastVisit = patient.lastVisit 
                ? new Date(patient.lastVisit).toLocaleDateString('tr-TR')
                : 'Hiç gelmedi';

            // Check if patient has trial devices
            const hasTrialDevices = patient.assignedDevices && patient.assignedDevices.some(device => 
                device.trialPeriod && device.trialPeriod.isTrialActive
            );

            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" class="patient-checkbox rounded border-gray-300 text-primary focus:ring-primary" data-patient-id="${patient.id}">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10">
                                <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span class="text-sm font-medium text-gray-700">${patient.name.charAt(0)}</span>
                                </div>
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">
                                    <a href="javascript:void(0)" onclick="viewPatient('${patient.id}')" class="text-primary hover:text-blue-900 cursor-pointer">${patient.name}</a>
                                </div>
                                ${patient.currentLabel ? `<div class="text-xs text-gray-600 mt-1"><span class="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">${patient.currentLabel}</span></div>` : ''}
                                <div class="text-sm text-gray-500 mt-1">TC: ${patient.tcNumber}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${patient.phone}</div>
                        <div class="text-sm text-gray-500">${patient.email || 'E-posta yok'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[patient.status] || 'bg-gray-100 text-gray-800'}">
                            ${patient.status === 'active' ? 'Aktif' : patient.status === 'inactive' ? 'Pasif' : 'Bekleyen'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${segmentColors[patient.segment] || 'bg-gray-100 text-gray-800'}">
                            ${segmentLabels[patient.segment] || patient.segment}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${lastVisit}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${deviceInfo}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="viewPatient('${patient.id}')" class="text-primary hover:text-blue-900 mr-3">Görüntüle</button>
                        <button onclick="editPatient('${patient.id}')" class="text-gray-600 hover:text-gray-900">Düzenle</button>
                    </td>
                </tr>
            `;
        }

        renderStats() {
            const container = document.getElementById('statsContainer');
            if (!container) return;

            const stats = this.calculateStats();
            const reminders = this.getTodayReminders();
            
            const statsHTML = `
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Toplam Hasta</dt>
                                <dd class="text-lg font-medium text-gray-900">${stats.total}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Aktif Hastalar</dt>
                                <dd class="text-lg font-medium text-gray-900">${stats.active}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Deneme Sürecinde</dt>
                                <dd class="text-lg font-medium text-gray-900">${stats.trial}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Bekleyen</dt>
                                <dd class="text-lg font-medium text-gray-900">${stats.pending}</dd>
                            </dl>
                        </div>
                    </div>
                </div>
            `;

            // Build reminders card HTML
            const remindersHTML = `
                <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m9-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-5 w-0 flex-1">
                            <dl>
                                <dt class="text-sm font-medium text-gray-500 truncate">Bugünkü Hatırlatıcılar</dt>
                                <dd class="text-lg font-medium text-gray-900">${reminders.length}</dd>
                            </dl>
                        </div>
                    </div>
                    <div class="mt-4">
                        ${reminders.slice(0,3).map(r => `
                            <div class="py-2 border-t border-gray-100 flex items-center justify-between">
                                <div class="text-sm text-gray-700">
                                    <a href="javascript:void(0)" onclick="viewPatient('${r.patientId}')" class="text-primary hover:underline">${r.patientName || 'Bilinmeyen Hasta'}</a>
                                    <div class="text-xs text-gray-500">${r.date}</div>
                                </div>
                                <div>
                                    <button onclick="viewPatient('${r.patientId}')" class="text-sm text-gray-600 hover:text-gray-900">Gör</button>
                                </div>
                            </div>
                            `).join('')}
                    </div>
                </div>
            `;

            // Combine stats and reminders into container
            container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${statsHTML}${remindersHTML}</div>`;

            // Attach any post-render listeners (e.g., for view buttons)
            document.querySelectorAll('.patient-checkbox').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const pid = e.target.dataset.patientId;
                    if (e.target.checked) this.selectedPatients.add(pid);
                    else this.selectedPatients.delete(pid);
                });
            });
        }

        renderSavedViews() {
            // Populate saved views placeholder (safe no-op if storage absent)
            try {
                const container = document.getElementById('savedViews');
                if (!container) return;

                let views = [];
                try {
                    views = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SAVED_VIEWS || 'xear_saved_views') || '[]');
                } catch (e) {
                    views = [];
                }

                if (!Array.isArray(views) || views.length === 0) {
                    container.innerHTML = '<div class="text-sm text-gray-500">Kayıtlı görünüm yok</div>';
                    return;
                }

                container.innerHTML = views.map(v => `
                    <button class="px-3 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50" onclick="applySavedView('${v.id}')">${v.name}</button>
                `).join(' ');
            } catch (err) {
                console.error('Error rendering saved views:', err);
            }
        }

        // Ensure there's a runtime-friendly patientManager object with required methods. If legacy manager exists, augment it with missing methods.
        (function ensurePatientManagerAPI() {
            const pm = window.patientManager || window.PatientManager || {};

            // Helper: safe write if missing
            function defineIfMissing(obj, name, fn) {
                if (!obj[name]) obj[name] = fn;
            }

            // Provide calculateStats if missing
            defineIfMissing(pm, 'calculateStats', function() {
                try {
                    const total = (this.patients || []).length;
                    const active = (this.patients || []).filter(p => p.status === 'active').length;
                    const trial = (this.patients || []).filter(p => p.segment === 'trial').length;
                    const pending = (this.patients || []).filter(p => p.status === 'pending').length;
                    return { total, active, trial, pending };
                } catch (err) {
                    console.error('calculateStats fallback error:', err);
                    return { total: 0, active: 0, trial: 0, pending: 0 };
                }
            });

            // Provide getTodayReminders if missing
            defineIfMissing(pm, 'getTodayReminders', function() {
                try {
                    const appointments = window.XEarStorageManager ? window.XEarStorageManager.get('appointments', []) : JSON.parse(localStorage.getItem('appointments') || '[]');
                    const today = new Date();
                    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
                    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

                    return (appointments || []).filter(a => a && a.reminderDate).filter(a => {
                        const r = new Date(a.reminderDate).toISOString();
                        return r >= startOfDay && r < endOfDay;
                    }).map(a => ({
                        id: a.id || a.appointmentId || '',
                        patientId: a.patientId || a.patient || '',
                        patientName: ((this.patients || []).find(p => p.id === (a.patientId || a.patient)) || {}).name || '',
                        date: new Date(a.reminderDate).toLocaleString('tr-TR')
                    }));
                } catch (err) {
                    console.error('getTodayReminders fallback error:', err);
                    return [];
                }
            });

            // Provide renderSavedViews if missing
            defineIfMissing(pm, 'renderSavedViews', function() {
                try {
                    const container = document.getElementById('savedViews');
                    if (!container) return;
                    let views = [];
                    try { views = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SAVED_VIEWS || 'xear_saved_views') || '[]'); } catch (e) { views = []; }
                    if (!Array.isArray(views) || views.length === 0) {
                        container.innerHTML = '<div class="text-sm text-gray-500">Kayıtlı görünüm yok</div>';
                        return;
                    }
                    container.innerHTML = views.map(v => `
                        <button class="px-3 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50" onclick="applySavedView('${v.id}')">${v.name}</button>
                    `).join(' ');
                } catch (err) {
                    console.error('renderSavedViews fallback error:', err);
                }
            });

            // Provide a conservative renderStats if missing
            defineIfMissing(pm, 'renderStats', function() {
                try {
                    const container = document.getElementById('statsContainer');
                    if (!container) return;
                    const stats = (typeof this.calculateStats === 'function') ? this.calculateStats() : { total: 0, active: 0, trial: 0, pending: 0 };
                    const reminders = (typeof this.getTodayReminders === 'function') ? this.getTodayReminders() : [];
                    container.innerHTML = `
                        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div class="text-sm text-gray-700">Toplam Hasta: ${stats.total}</div>
                        </div>
                        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div class="text-sm text-gray-700">Bugünkü Hatırlatıcılar: ${reminders.length}</div>
                        </div>
                    `;
                } catch (err) {
                    console.error('renderStats fallback error:', err);
                }
            });

            // Provide handleNewPatient fallback (simple localStorage-based create) if missing
            defineIfMissing(pm, 'handleNewPatient', function(formEl) {
                try {
                    if (!formEl || typeof formEl !== 'object') return false;

                    const formData = new FormData(formEl);
                    const firstName = (formData.get('firstName') || '').trim();
                    const lastName = (formData.get('lastName') || '').trim();
                    const phone = (formData.get('phone') || '').trim();
                    const email = (formData.get('email') || '').trim();
                    const tcNumber = (formData.get('tcNumber') || '').trim();
                    const birthDate = (formData.get('birthDate') || '').trim();
                    const acquisitionType = formData.get('acquisitionType') || '';

                    if (!firstName) { if (Utils && Utils.showToast) Utils.showToast('Ad alanı zorunludur', 'error'); return false; }
                    if (!lastName) { if (Utils && Utils.showToast) Utils.showToast('Soyad alanı zorunludur', 'error'); return false; }
                    if (!phone || (Utils && !Utils.validatePhone(phone))) { if (Utils && Utils.showToast) Utils.showToast('Geçersiz telefon numarası', 'error'); return false; }
                    if (tcNumber && Utils && !Utils.validateTCKN(tcNumber)) { if (Utils && Utils.showToast) Utils.showToast('Geçersiz TC Kimlik Numarası', 'error'); return false; }
                    if (email && Utils && !Utils.validateEmail) { /* skip if validator missing */ }

                    const newPatient = {
                        id: `p_${Date.now()}`,
                        firstName,
                        lastName,
                        name: `${firstName} ${lastName}`.trim(),
                        phone,
                        email,
                        tcNumber,
                        birthDate: birthDate || null,
                        acquisitionType,
                        createdAt: new Date().toISOString()
                    };

                    // Persist to unified storage
                    try {
                        if (window.XEarStorageManager) {
                            const existing = window.XEarStorageManager.get('patients', []);
                            existing.push(newPatient);
                            window.XEarStorageManager.set('patients', existing);
                        } else {
                            const existing = JSON.parse(localStorage.getItem('xear_patients_data') || '[]');
                            existing.push(newPatient);
                            localStorage.setItem('xear_patients_data', JSON.stringify(existing));
                        }
                    } catch (err) {
                        console.error('Failed to persist new patient:', err);
                        if (Utils && Utils.showToast) Utils.showToast('Hasta kaydedilemedi: depolama hatası', 'error');
                        return false;
                    }

                    if (Utils && Utils.showToast) Utils.showToast('Hasta başarıyla kaydedildi', 'success');

                    // Refresh UI if possible
                    if (typeof pm.loadPatients === 'function') pm.loadPatients().then(() => { if (typeof pm.renderPatients === 'function') pm.renderPatients(); if (typeof pm.renderStats === 'function') pm.renderStats(); });

                    // Open patient details page
                    if (typeof pm.openPatientDetails === 'function') pm.openPatientDetails(newPatient.id);
                    else window.location.href = `patient-details-modular.html?id=${encodeURIComponent(newPatient.id)}`;

                    return true;
                } catch (err) {
                    console.error('handleNewPatient fallback error:', err);
                    if (Utils && Utils.showToast) Utils.showToast('Hasta kaydedilemedi', 'error');
                    return false;
                }
            });

            // If a legacy object was present, make sure it's referenced globally as patientManager
            if (typeof window.patientManager === 'undefined' && typeof pm === 'object') {
                window.patientManager = pm;
            }
        })();
    }

    // Close the conditional wrapper that prevents duplicate declaration
}

// Expose the class and a singleton instance for other modules and inline handlers
window.PatientManager = typeof window.PatientManager === 'undefined' ? PatientManager : window.PatientManager;

// Ensure singleton instance exists (do not reference `PatientManager` unguarded)
if (!window.patientManager) {
    try {
        window.patientManager = new window.PatientManager();
    } catch (err) {
        console.error('Failed to initialize patientManager singleton:', err);
    }
}

// Remove unsafe reassignment; if we still see an expression referencing `PatientManager` directly, replace it.
window.PatientManager = window.PatientManager; // no-op to keep linter happy

// Expose helper globals used by inline templates
function viewPatient(patientId) {
    try {
        if (window.patientManager && typeof window.patientManager.openPatientDetails === 'function') {
            window.patientManager.openPatientDetails(patientId);
            return;
        }
    } catch (err) {
        // ignore and fallback to navigation
    }

    // Fallback navigation to the patient details page
    window.location.href = `patient-details-modular.html?id=${encodeURIComponent(patientId)}`;
}

function applySavedView(viewId) {
    try {
        const views = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SAVED_VIEWS || 'xear_saved_views') || '[]');
        const view = (views || []).find(v => v.id === viewId);
        if (!view) return;
        if (window.patientManager) {
            // Expect view.filters to be an object with keys matching currentFilters
            if (view.filters && typeof view.filters === 'object') {
                Object.keys(view.filters).forEach(k => {
                    window.patientManager.currentFilters[k] = view.filters[k];
                });
                window.patientManager.applyFilters();
            }
        }
    } catch (err) {
        console.error('Error applying saved view:', err);
    }
}
