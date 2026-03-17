// Search and Filter Module
class SearchFilter {
    constructor() {
        this.searchInput = document.getElementById('search-appointments');
        this.searchClear = document.getElementById('clear-search');
        this.searchResults = document.getElementById('search-results');
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                this.searchClear.style.display = query ? 'block' : 'none';
                
                if (query.length >= 2) {
                    this.performSearch(query);
                } else {
                    this.hideSearchResults();
                }
            });
        }

        if (this.searchClear) {
            this.searchClear.addEventListener('click', () => {
                this.searchInput.value = '';
                this.searchClear.style.display = 'none';
                this.hideSearchResults();
                this.searchInput.focus();
            });
        }

        // Filter event listeners
        const filterElements = [
            'branch-filter',
            'status-filter',
            'type-filter'
        ];

        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    window.appointmentData.applyFilters();
                });
            }
        });

        // Filter control buttons
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                window.appointmentData.resetFilters();
            });
        }

        const saveBtn = document.getElementById('save-filter-preset');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                window.appointmentData.saveFilterPreset();
            });
        }

        // View toggle buttons
        const compactBtn = document.getElementById('compact-view');
        const detailedBtn = document.getElementById('detailed-view');

        if (compactBtn) {
            compactBtn.addEventListener('click', () => {
                window.appointmentData.isCompactView = true;
                this.updateViewButtons(compactBtn, detailedBtn);
                window.appointmentData.refreshCurrentView();
            });
        }

        if (detailedBtn) {
            detailedBtn.addEventListener('click', () => {
                window.appointmentData.isCompactView = false;
                this.updateViewButtons(detailedBtn, compactBtn);
                window.appointmentData.refreshCurrentView();
            });
        }

        // Click outside to close search results
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideSearchResults();
            }
        });

        // Search result click handler
        document.addEventListener('click', (e) => {
            if (e.target.closest('.search-result-item')) {
                const id = parseInt(e.target.closest('.search-result-item').dataset.id);
                const appointment = window.appointmentData.appointments.find(apt => apt.id === id);
                if (appointment) {
                    window.appointmentModal.openModal(appointment.patient, appointment.time, appointment.type);
                    this.hideSearchResults();
                }
            }
        });
    }

    performSearch(query) {
        const results = window.appointmentData.appointments.filter(apt => 
            apt.patient.toLowerCase().includes(query) ||
            apt.type.toLowerCase().includes(query) ||
            apt.branch.toLowerCase().includes(query) ||
            (apt.notes && apt.notes.toLowerCase().includes(query))
        );
        
        this.displaySearchResults(results);
    }

    displaySearchResults(results) {
        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="p-3 text-gray-500 text-sm">Sonuç bulunamadı</div>';
        } else {
            this.searchResults.innerHTML = results.map(apt => `
                <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 search-result-item" data-id="${apt.id}">
                    <div class="font-medium text-gray-900">${apt.patient}</div>
                    <div class="text-sm text-gray-600">${apt.date} ${apt.time} - ${apt.type}</div>
                    <div class="text-xs text-gray-500">${apt.branch} • ${apt.status}</div>
                </div>
            `).join('');
        }
        this.searchResults.classList.remove('hidden');
    }

    hideSearchResults() {
        if (this.searchResults) {
            this.searchResults.classList.add('hidden');
        }
    }

    updateViewButtons(activeBtn, inactiveBtn) {
        activeBtn.classList.add('bg-blue-600', 'text-white');
        activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        inactiveBtn.classList.remove('bg-blue-600', 'text-white');
        inactiveBtn.classList.add('bg-gray-200', 'text-gray-700');
    }
}

// Export for global use
window.SearchFilter = SearchFilter;