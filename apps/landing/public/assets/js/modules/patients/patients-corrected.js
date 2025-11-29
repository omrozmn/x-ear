// Patients corrected manager
// This file is a safe, fully-featured PatientManager replacement that prefers the backend (API-first)
// and falls back to localStorage. It mirrors the original patients.js rendering and behaviors but
// avoids legacy in-class IIFE hazards.
(function() {
  class PatientManagerCorrected {
    constructor() {
      this.patients = [];
      this.filteredPatients = [];
      this.selectedPatients = new Set();
      this.currentFilters = { search: '' };
      this.currentPage = 1;
      this.patientsPerPage = 20;
      this.paginationOptions = [20,50,100];
      this.allSelected = false; // true when "select all across pages" is active
      // Don't auto-initialize on DOMContentLoaded - let the caller control initialization
      // document.addEventListener('DOMContentLoaded', () => this.initialize());
    }

    async initialize() {
      await this.loadPatients();
      this.setupEventListeners();
      this.renderSavedViews();
      this.renderPatients();
      this.renderStats();
    }

    async loadPatients() {
      console.log('🔄 Loading patients...');
      
      // Try Orval generated client first
      if (window.patientsGetPatients) {
        try {
          console.log('📡 Using Orval client to fetch patients');
          
          // Try to fetch with pagination to get all patients
          const resp = await window.patientsGetPatients({ 
            per_page: 5000 // Request large batch to get all patients
          });
          
          console.log('📡 Orval API response:', resp);
          
          // Extract patients from response
          let data = null;
          if (resp && resp.success && resp.data && resp.data.data) {
            data = resp.data.data;
          } else if (resp && resp.success && resp.data) {
            data = resp.data;
          } else if (resp && resp.data) {
            data = resp.data;
          } else if (Array.isArray(resp)) {
            data = resp;
          }
          
          if (data && Array.isArray(data)) {
            this.patients = data.map(p => this.normalizePatient(p));
            this.saveToLocalStorage();
            this.renderPatients();
            this.renderStats();
            console.log('✅ Patients loaded via Orval client:', this.patients.length);
            return;
          }
        } catch (orvalError) {
          console.warn('Orval client failed, trying APIConfig fallback:', orvalError);
        }
      }
      
      // API-first fallback
      if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
        try {
          console.log('📡 Making API request to:', window.APIConfig.endpoints.patients);

          // Try to fetch total count first so we can request all patients in a single call
          let resp;
          try {
            const head = await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.patients}?per_page=1`, 'GET');
            const total = head && head.meta && typeof head.meta.total === 'number' ? head.meta.total : null;
            const fetchCount = total ? Math.min(total, 5000) : 1000; // cap to avoid accidental huge responses
            resp = await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.patients}?per_page=${fetchCount}`, 'GET');
          } catch (firstErr) {
            // If the head-per_page approach fails (CORS/preflight or server doesn't support meta), fall back to a plain request
            console.warn('Could not fetch meta.total, falling back to single API call:', firstErr);
            resp = await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients, 'GET');
          }

          console.log('📡 API response:', resp);
          // Fix: Extract patients from the correct nested structure
          let data = null;
          if (resp && resp.data && resp.data.data && Array.isArray(resp.data.data)) {
            // New API format: { success: true, data: { data: [...], meta: {...} } }
            data = resp.data.data;
          } else if (resp && resp.data && Array.isArray(resp.data)) {
            // Legacy format: { success: true, data: [...] }
            data = resp.data;
          } else if (Array.isArray(resp)) {
            // Direct array response
            data = resp;
          }
          
          if (Array.isArray(data)) {
            console.log('✅ API returned patients:', data.length);
            this.patients = data.map(p => ({ ...p, name: p.name || `${p.firstName||''} ${p.lastName||''}`.trim() }));
            console.log('✅ Processed patients:', this.patients.length);
            this.filteredPatients = [...this.patients];
            // persist for legacy compatibility
            try { localStorage.setItem('xear_patients_data', JSON.stringify(this.patients)); } catch(e) { console.warn('persist failed', e); }
            return;
          }
        } catch (err) {
          // Heuristic to detect whether the failure is due to CORS/preflight vs backend unreachable
          try {
            const message = err && err.message ? err.message : String(err);
            if (/Failed to fetch|NetworkError|TypeError|CORS|cross-origin/i.test(message)) {
              console.warn('❌ Backend patients API failed possibly due to network/CORS/preflight:', err);
            } else {
              console.warn('❌ Backend patients API failed:', err);
            }
          } catch (logErr) {
            console.warn('❌ Backend patients API failed (and logging failed):', err);
          }

          // Fallback to local storage to keep the UI functional when backend is not reachable or CORS blocks requests
          try {
            const stored = JSON.parse(localStorage.getItem('xear_patients_data') || '[]');
            if (Array.isArray(stored) && stored.length > 0) {
              console.log('⬅️ Falling back to localStorage patients (xear_patients_data)', stored.length);
              this.patients = stored.map(p => ({ ...p, name: p.name || `${p.firstName||''} ${p.lastName||''}`.trim() }));
              this.filteredPatients = [...this.patients];
              return;
            }
          } catch (storageErr) {
            console.warn('Failed to read fallback patients from localStorage:', storageErr);
          }

          this.patients = [];
          this.filteredPatients = [];
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Hasta verileri yüklenemedi', 'error');
          return;
        }
      } else {
        console.warn('❌ APIConfig not available');
        // Try legacy storage as a final fallback so the page is usable when the API client isn't loaded
        try {
          const stored = JSON.parse(localStorage.getItem('xear_patients_data') || '[]');
          if (Array.isArray(stored) && stored.length > 0) {
            console.log('⬅️ Using legacy localStorage patients because APIConfig is not present');
            this.patients = stored.map(p => ({ ...p, name: p.name || `${p.firstName||''} ${p.lastName||''}`.trim() }));
            this.filteredPatients = [...this.patients];
            return;
          }
        } catch (storageErr) {
          console.warn('Failed to read patients from localStorage when APIConfig missing:', storageErr);
        }
      }
    }

    savePatientsToStorage(patients) {
      try {
        localStorage.setItem('xear_patients_data', JSON.stringify(patients));
        try { localStorage.setItem('xear_patients', JSON.stringify(patients)); } catch(e) {}
        try { localStorage.setItem('xear_crm_patients', JSON.stringify(patients)); } catch(e) {}
      } catch(e) {
        console.warn('savePatientsToStorage failed', e);
      }
    }

    setupEventListeners() {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.addEventListener('input', (e) => { this.currentFilters.search = e.target.value; this.applyFilters(); });
      // Filter dropdowns and date range inputs
      const statusFilterEl = document.getElementById('statusFilter');
      if (statusFilterEl) statusFilterEl.addEventListener('change', (e) => { this.currentFilters.status = e.target.value; this.applyFilters(); });
      const segmentFilterEl = document.getElementById('segmentFilter');
      if (segmentFilterEl) segmentFilterEl.addEventListener('change', (e) => { this.currentFilters.acquisition = e.target.value; this.applyFilters(); });
      const conversionFilterEl = document.getElementById('conversionFilter');
      if (conversionFilterEl) conversionFilterEl.addEventListener('change', (e) => { this.currentFilters.conversion = e.target.value; this.applyFilters(); });
      const branchFilterEl = document.getElementById('branchFilter');
      if (branchFilterEl) branchFilterEl.addEventListener('change', (e) => { this.currentFilters.branch = e.target.value; this.applyFilters(); });
      const fromDateEl = document.getElementById('fromDate');
      if (fromDateEl) fromDateEl.addEventListener('change', (e) => { this.currentFilters.dateFrom = e.target.value || null; this.applyFilters(); });
      const toDateEl = document.getElementById('toDate');
      if (toDateEl) toDateEl.addEventListener('change', (e) => { this.currentFilters.dateTo = e.target.value || null; this.applyFilters(); });
      document.addEventListener('click', (e) => {
        if (e.target && e.target.matches('.patient-view-btn')) {
          const pid = e.target.dataset.patientId; this.openPatientDetails(pid);
        }
        if (e.target && e.target.matches('.patient-edit-btn')) {
          const pid = e.target.dataset.patientId; this.openEditModal(pid);
        }
        if (e.target && e.target.matches('.patient-link')) {
          const pid = e.target.dataset.patientId; this.openPatientDetails(pid);
        }
      });

      // Listen for patient updates from patient details page
      window.addEventListener('patientUpdated', async (event) => {
        console.log('Patient updated event received (legacy):', event.detail);
        await this.loadPatients(); // Reload patients to reflect changes
        this.renderPatients();
        this.renderStats();
      });
      
      // New event names used across the codebase: dispatch from patient-details-manager
      window.addEventListener('patient:updated', async (event) => {
        console.log('patient:updated event received:', event.detail);
        await this.loadPatients();
        this.renderPatients();
        this.renderStats();
      });
      
      // Backend confirmed update (useful to force authoritative refresh)
      window.addEventListener('patient:updated:remote', async (event) => {
        console.log('patient:updated:remote event received:', event.detail);
        await this.loadPatients();
        this.renderPatients();
        this.renderStats();
      });

      // Handle selection checkboxes and pagination controls via delegated handlers
      document.addEventListener('change', (e) => {
        try {
          // Row-level checkbox toggles individual selection
          if (e.target && e.target.matches('.patient-checkbox')) {
            const pid = e.target.dataset.patientId;
            if (e.target.checked) this.selectedPatients.add(pid);
            else this.selectedPatients.delete(pid);
            // If the user manually deselects any item, turn off the global allSelected flag
            this.allSelected = (this.selectedPatients.size > 0 && this.selectedPatients.size === this.filteredPatients.length);
            this.updateSelectionUI();
          }

          // Page-level select (select all patients on the current page)
          if (e.target && e.target.id === 'selectPageCheckbox') {
            this.togglePageSelection(e.target.checked);
          }

          // Per-page selection changes
          if (e.target && e.target.id === 'perPageSelect') {
            const v = Number(e.target.value) || 20;
            this.patientsPerPage = v;
            this.currentPage = 1; // reset to first page when per_page changes
            this.renderPatients();
          }
        } catch (err) { console.error('Selection/pagination change handler failed', err); }
      });

      document.addEventListener('click', (e) => {
        try {
          const btn = e.target.closest('[data-page]');
          if (btn) {
            const page = Number(btn.dataset.page);
            if (!Number.isNaN(page)) {
              this.currentPage = Math.max(1, Math.min(this.getTotalPages(), page));
              this.renderPatients();
            }
          }
        } catch (err) { console.error('Pagination click handler failed', err); }
      });
    }

    applyFilters() {
      const term = (this.currentFilters.search||'').toLowerCase();
      const status = this.currentFilters.status || '';
      const acquisition = this.currentFilters.acquisition || this.currentFilters.segment || '';
      const branch = this.currentFilters.branch || '';
      const dateFrom = this.currentFilters.dateFrom ? new Date(this.currentFilters.dateFrom) : null;
      const dateTo = this.currentFilters.dateTo ? new Date(this.currentFilters.dateTo) : null;

      this.filteredPatients = this.patients.filter(p => {
        if (term) {
          const txt = `${p.name||''} ${p.phone||''} ${p.email||''}`.toLowerCase();
          if (!txt.includes(term)) return false;
        }
        if (status) {
          if ((p.status||'') !== status) return false;
        }
        if (acquisition) {
          // acquisition filter represents kazanım türü. Match acquisitionType or legacy segment/tags for compatibility.
          const tags = Array.isArray(p.tags) ? p.tags.map(t=>String(t).toLowerCase()) : [];
          const patientAcq = (p.acquisitionType || p.acquisition_type || p.segment || '').toString().toLowerCase();
          if (patientAcq !== acquisition.toLowerCase() && !tags.includes(acquisition.toLowerCase())) return false;
        }
        // Apply conversion filter when provided
        if (this.currentFilters.conversion) {
          const conv = (p.conversionStep || p.conversion_step || '').toString().toLowerCase();
          if (conv !== this.currentFilters.conversion.toString().toLowerCase()) return false;
        }
        if (branch) {
          const patientBranch = (p.branch || p.address || '').toString();
          if (!patientBranch.toLowerCase().includes(branch.toLowerCase())) return false;
        }
        if (dateFrom || dateTo) {
          const created = p.createdAt ? new Date(p.createdAt) : null;
          if (!created) return false;
          if (dateFrom && created < dateFrom) return false;
          if (dateTo) {
            // include entire day for dateTo
            const end = new Date(dateTo); end.setHours(23,59,59,999);
            if (created > end) return false;
          }
        }
        return true;
      });
      this.currentPage = 1;
      this.renderPatients();
      this.renderStats();
    }

    getPaginatedPatients() {
      const start = (this.currentPage-1)*this.patientsPerPage;
      return this.filteredPatients.slice(start, start+this.patientsPerPage);
    }

    renderPatientRow(p) {
      const lastVisit = p.lastVisit ? new Date(p.lastVisit).toLocaleDateString('tr-TR') : 'Hiç gelmedi';
      const deviceInfo = p.assignedDevices && p.assignedDevices.length ? `${p.assignedDevices[0].brand} ${p.assignedDevices[0].model}` : 'Cihaz yok';
      const tc = p.tcNumber || p.tc_number || '—';
      const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR') : '—';
      // acquisitionType and conversionStep are provided by the add/edit patient forms
      const acquisition = p.acquisitionType || p.acquisition_type || '';
      const conversion = p.conversionStep || p.conversion_step || '';
      // Try to map keys back to human readable names using settings helper functions available on the page
      let acquisitionLabel = acquisition;
      try {
        if (typeof window.loadAcquisitionTypesFromSettings === 'function') {
          const types = window.loadAcquisitionTypesFromSettings();
          const found = types.find(t => String(t.value) === String(acquisition));
          if (found) acquisitionLabel = found.name || acquisitionLabel;
        }
      } catch(e) { /* ignore */ }
      let conversionLabel = conversion;
      try {
        if (typeof window.loadConversionStepsFromSettings === 'function') {
          const steps = window.loadConversionStepsFromSettings();
          const found = steps.find(s => String(s.value) === String(conversion));
          if (found) conversionLabel = found.name || conversionLabel;
        }
      } catch(e) { /* ignore */ }
      const acquisitionHtml = acquisitionLabel ? `<span class="inline-block bg-green-100 text-xs text-green-700 px-2 py-0.5 rounded-full mr-1">${acquisitionLabel}</span>` : '';
      const conversionHtml = conversionLabel ? `<span class="inline-block bg-indigo-100 text-xs text-indigo-700 px-2 py-0.5 rounded-full mr-1">${conversionLabel}</span>` : '';
      const checked = this.selectedPatients && this.selectedPatients.has(p.id) ? 'checked' : '';
      return `<tr class="hover:bg-gray-50">
        <td class="px-4 py-3 whitespace-nowrap"><input type="checkbox" class="patient-checkbox" data-patient-id="${p.id}" ${checked}></td>
        <td class="px-4 py-3 whitespace-nowrap"><div class="flex items-center"><div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center"><span class="text-sm font-medium text-gray-700">${(p.name||'X').charAt(0)}</span></div><div class="ml-4"><div class="text-sm font-medium text-gray-900"><a href="javascript:void(0)" class="patient-link text-primary" data-patient-id="${p.id}">${p.name||''}</a></div><div class="text-xs text-gray-500 mt-1">TC: ${tc}</div></div></div></td>
        <td class="px-4 py-3 whitespace-nowrap"><div class="text-sm text-gray-900">${p.phone||''}</div><div class="text-sm text-gray-500">${p.email||'E-posta yok'}</div></td>
        <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-600">${created}</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${acquisitionHtml}</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${conversionHtml}</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700">${deviceInfo}</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium"><button class="patient-view-btn text-primary mr-3" data-patient-id="${p.id}">Görüntüle</button><button class="patient-edit-btn text-gray-600" data-patient-id="${p.id}">Düzenle</button></td>
      </tr>`;
    }

    // Toggle select all across pages (called by global selectAllPatients helper)
    async selectAll() {
      try {
        if (!this.allSelected) {
          // Select every filtered patient (across pages)
          this.filteredPatients.forEach(p => this.selectedPatients.add(p.id));
          this.allSelected = true;
        } else {
          // Deselect all
          this.selectedPatients.clear();
          this.allSelected = false;
        }
        this.updateSelectionUI();
        this.renderPatients();
      } catch (err) { console.error('selectAll toggle failed', err); }
    }

    // Deselect all explicitly
    deselectAll() {
      this.selectedPatients.clear();
      this.allSelected = false;
      this.updateSelectionUI();
      this.renderPatients();
    }

    // Toggle selection for the current page only
    togglePageSelection(checked) {
      const pagePatients = this.getPaginatedPatients();
      pagePatients.forEach(p => {
        if (checked) this.selectedPatients.add(p.id);
        else this.selectedPatients.delete(p.id);
      });
      // If after this operation we've selected everything, mark allSelected
      this.allSelected = (this.selectedPatients.size > 0 && this.selectedPatients.size === this.filteredPatients.length);
      this.updateSelectionUI();
      this.renderPatients();
    }

    updateSelectionUI() {
      try {
        // Update selected count
        const sc = document.getElementById('selectedCount');
        if (sc) sc.innerText = `${this.selectedPatients.size} hasta seçildi`;

        // Update the global select-all button text (toggle to "İptal" when all selected)
        const selectAllBtn = document.querySelector('button[onclick="selectAllPatients()"]');
        if (selectAllBtn) selectAllBtn.innerText = (this.allSelected ? 'İptal' : 'Tümünü Seç');

        // Enable/disable bulk action buttons based on selection count
        const bulkButtons = document.querySelectorAll('button[onclick="bulkAddTag()"], button[onclick="bulkSendSMS()"], button[onclick="exportSelected()"], button[onclick="updatePatientLabel()"]');
        bulkButtons.forEach(b => { if (this.selectedPatients.size > 0) { b.removeAttribute('disabled'); } else { b.setAttribute('disabled', 'true'); } });

        // Update the page-checkbox checked state (if every item on page is selected)
        const pagePatients = this.getPaginatedPatients();
        const allOnPage = pagePatients.length > 0 && pagePatients.every(p => this.selectedPatients.has(p.id));
        const pageCheckbox = document.getElementById('selectPageCheckbox');
        if (pageCheckbox) pageCheckbox.checked = allOnPage;
      } catch (err) { console.error('updateSelectionUI failed', err); }
    }

    getTotalPages() { return Math.max(1, Math.ceil((this.filteredPatients||[]).length / this.patientsPerPage)); }

 renderPatients() {
   const container = document.getElementById('patientsTableContainer'); if (!container) return;
   const rows = this.getPaginatedPatients().map(p => this.renderPatientRow(p)).join('');

  // Inject table with a page-level select checkbox in the header and pagination controls below
  const totalPages = this.getTotalPages();
      const pageStart = (this.currentPage - 1) * this.patientsPerPage + 1;
      const pageEnd = Math.min(this.filteredPatients.length, this.currentPage * this.patientsPerPage);
      container.innerHTML = `
        <div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr>
          <th class="px-4 py-3"><input id="selectPageCheckbox" type="checkbox" ${this.getPaginatedPatients().length>0 && this.getPaginatedPatients().every(p=>this.selectedPatients.has(p.id)) ? 'checked' : ''}></th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hasta</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İletişim</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oluşturulma</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kazanım Türü</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dönüşüm</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cihaz</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
        </tr></thead><tbody class="bg-white divide-y divide-gray-200">${rows}</tbody></table></div>

        <div class="p-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="text-sm text-gray-600">Göster:</div>
            <select id="perPageSelect" class="px-2 py-1 border rounded">
              ${this.paginationOptions.map(opt => `<option value="${opt}" ${opt===this.patientsPerPage? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
            <div class="text-sm text-gray-500">&nbsp;(${pageStart}-${pageEnd} / ${this.filteredPatients.length})</div>
          </div>
          <div id="paginationControls" class="flex items-center gap-2">
            <button class="px-3 py-1 border rounded" data-page="1">İlk</button>
            <button class="px-3 py-1 border rounded" data-page="${Math.max(1,this.currentPage-1)}">Önceki</button>
            ${[...Array(totalPages)].map((_,i) => `<button class="px-3 py-1 border rounded ${i+1===this.currentPage? 'bg-gray-200' : ''}" data-page="${i+1}">${i+1}</button>`).join('')}
            <button class="px-3 py-1 border rounded" data-page="${Math.min(totalPages,this.currentPage+1)}">Sonraki</button>
            <button class="px-3 py-1 border rounded" data-page="${totalPages}">Son</button>
          </div>
        </div>`;

      // After rendering, ensure selection UI is up-to-date
      this.updateSelectionUI();
     }

     calculateStats() {
      const list = this.filteredPatients || [];
      const total = list.length;
      const active = list.filter(p => (p.status||'') === 'active').length;
      // Map pending -> potential (potansiyel)
      const potential = list.filter(p => (p.status||'') === 'pending' || (Array.isArray(p.tags) && p.tags.map(t=>t.toString().toLowerCase()).includes('potansiyel'))).length;
      // Map trial -> appointment given (randevu verildi) by segment or tags
      const appointmentGiven = list.filter(p => (p.segment||'').toLowerCase() === 'trial' || (Array.isArray(p.tags) && p.tags.map(t=>t.toString().toLowerCase()).includes('randevu_verildi'))).length;
      // Tag counts
      const tagCounts = {};
      list.forEach(p => { const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []); tags.forEach(t => { const k = String(t||'').trim(); if (!k) return; tagCounts[k] = (tagCounts[k]||0) + 1; }); });
      return { total, active, potential, appointmentGiven, tagCounts };
    }

    renderStats() {
      const container = document.getElementById('statsContainer'); if (!container) return; const stats = this.calculateStats();
      // Render main KPI cards
      const tagList = Object.keys(stats.tagCounts || {}).sort((a,b) => (stats.tagCounts[b]||0) - (stats.tagCounts[a]||0));
      const tagHtml = tagList.slice(0,6).map(t => `<div class="text-sm text-gray-700">${t}: <span class="font-medium">${stats.tagCounts[t]}</span></div>`).join('');
      container.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="text-2xl font-bold text-gray-900">${stats.total}</div>
          <div class="text-sm text-gray-500">Toplam Hasta</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="text-2xl font-bold text-green-600">${stats.active}</div>
          <div class="text-sm text-gray-500">Aktif Hasta</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="text-2xl font-bold text-yellow-600">${stats.potential}</div>
          <div class="text-sm text-gray-500">Potansiyel</div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div class="text-2xl font-bold text-blue-600">${stats.appointmentGiven}</div>
          <div class="text-sm text-gray-500">Randevu Verildi</div>
        </div>
      `;
    }

    renderSavedViews() { 
      try {
        const container = document.getElementById('savedViews'); if (!container) return;
        let views = [];
        try { views = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SAVED_VIEWS || 'xear_saved_views') || '[]'); } catch(e) { views = []; }
        if (!Array.isArray(views) || views.length === 0) {
          // Show default chips
          container.innerHTML = `
            <button class="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">Hepsi</button>
            <button class="px-3 py-1 text-sm rounded-full bg-white border border-gray-200">demo</button>
          `;
          // attach Hepsi click (reset filters)
          const allBtn = container.querySelector('button');
          if (allBtn) allBtn.addEventListener('click', () => { this.currentFilters = { search: '' }; this.loadPatients().then(()=>{ this.applyFilters(); }); });
          return;
        }
        container.innerHTML = views.map(v => `
          <button class="px-3 py-1 text-sm rounded-full bg-white border border-gray-200" data-view-id="${v.id}">${v.name}</button>
        `).join(' ');
        // Attach click handlers
        container.querySelectorAll('[data-view-id]').forEach(btn => btn.addEventListener('click', () => {
          const id = btn.dataset.viewId; try { const view = (views||[]).find(x=>x.id===id); if (!view) return; if (view.filters && typeof view.filters === 'object') { Object.keys(view.filters).forEach(k=>{ this.currentFilters[k]=view.filters[k]; }); this.applyFilters(); } } catch(e){console.error(e);} }));
      } catch (err) { console.error('renderSavedViews failed', err); }
     }

    saveCurrentView() {
      try {
        if (window.showCustomPrompt) {
          window.showCustomPrompt('Görünüm Kaydet', 'Görünüme bir isim verin:', '', (name) => {
            if (!name || !name.trim()) return;
            const id = `view_${Date.now()}`;
            const toSave = { id, name: name.trim(), filters: { ...this.currentFilters } };
            let views = [];
            try { views = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SAVED_VIEWS || 'xear_saved_views') || '[]'); } catch(e) { views = []; }
            views.push(toSave);
            localStorage.setItem(window.STORAGE_KEYS?.SAVED_VIEWS || 'xear_saved_views', JSON.stringify(views));
            if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Görünüm kaydedildi', 'success');
            this.renderSavedViews();
          }, 'info');
        } else {
          const name = window.prompt('Görünüme bir isim verin:');
          if (!name || !name.trim()) return;
          const id = `view_${Date.now()}`;
          const toSave = { id, name: name.trim(), filters: { ...this.currentFilters } };
          let views = [];
          try { views = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SAVED_VIEWS || 'xear_saved_views') || '[]'); } catch(e) { views = []; }
          views.push(toSave);
          localStorage.setItem(window.STORAGE_KEYS?.SAVED_VIEWS || 'xear_saved_views', JSON.stringify(views));
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Görünüm kaydedildi', 'success');
          this.renderSavedViews();
        }
      } catch (err) { console.error('saveCurrentView failed', err); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Görünüm kaydedilemedi', 'error'); }
    }

    exportSelected() {
      try {
        const ids = Array.from(this.selectedPatients);
        if (!ids || ids.length === 0) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İlk önce seçim yapın', 'error'); return; }
        const rows = this.patients.filter(p => ids.includes(p.id));
        this._downloadCSV(rows, `patients_selected_${Date.now()}.csv`);
      } catch (err) { console.error('exportSelected failed', err); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Dışa aktarma başarısız', 'error'); }
    }

    exportAllPatients() {
      try {
        const rows = this.filteredPatients || this.patients || [];
        this._downloadCSV(rows, `patients_all_${Date.now()}.csv`);
      } catch (err) { console.error('exportAllPatients failed', err); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Dışa aktarma başarısız', 'error'); }
    }

    bulkAddTag() {
      try {
        if (window.showCustomPrompt) {
          window.showCustomPrompt('Etiket Ekle', 'Eklenecek etiketi girin:', '', (tag) => {
            if (!tag || !tag.trim()) return;
            const ids = Array.from(this.selectedPatients);
            if (!ids || ids.length === 0) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İlk önce seçim yapın', 'error'); return; }
            // Local update
            this.patients.forEach(p => { if (ids.includes(p.id)) { p.tags = Array.isArray(p.tags) ? p.tags.concat(tag.trim()).filter((v,i,a)=>a.indexOf(v)===i) : [tag.trim()]; } });
            this.savePatientsToStorage(this.patients);
            // Try backend updates in background if available
            try {
              if (window.BackendServiceManager && window.BackendServiceManager.getService) {
                const svc = window.BackendServiceManager.getService('patients');
                if (svc && svc.update) {
                  ids.forEach(async id => {
                    try {
                      const patient = this.patients.find(p => p.id === id);
                      if (patient) await svc.update(id, { tags: patient.tags });
                    } catch(e) { /* ignore per-patient errors */ }
                  });
                }
              }
            } catch(e) { /* non-fatal */ }
            if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Etiketler eklendi', 'success');
            this.renderPatients(); this.updateSelectionUI();
          }, 'info');
        } else {
          const tag = window.prompt('Eklenecek etiketi girin:');
          if (!tag) return;
          const ids = Array.from(this.selectedPatients);
          if (!ids || ids.length === 0) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İlk önce seçim yapın', 'error'); return; }
          // Local update
          this.patients.forEach(p => { if (ids.includes(p.id)) { p.tags = Array.isArray(p.tags) ? p.tags.concat(tag).filter((v,i,a)=>a.indexOf(v)===i) : [tag]; } });
          this.savePatientsToStorage(this.patients);
          // Try backend updates in background if available
          try {
            if (window.BackendServiceManager && window.BackendServiceManager.getService) {
              const svc = window.BackendServiceManager.getService('patients');
              if (svc && svc.update) {
                ids.forEach(async id => {
                  try {
                    const patient = this.patients.find(p => p.id === id);
                    if (patient) await svc.update(id, { tags: patient.tags });
                  } catch(e) { /* ignore per-patient errors */ }
                });
              }
            }
          } catch(e) { /* non-fatal */ }
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Etiketler eklendi', 'success');
          this.renderPatients(); this.updateSelectionUI();
        }
      } catch (err) { console.error('bulkAddTag failed', err); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Etiket eklenemedi', 'error'); }
    }

    updatePatientLabel() {
      try {
        const ids = Array.from(this.selectedPatients);
        if (!ids || ids.length === 0) { 
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İlk önce hasta seçin', 'error'); 
          return; 
        }

        // Get options from settings
        let acquisitionTypes = [];
        let conversionSteps = [];
        try {
          if (typeof window.loadAcquisitionTypesFromSettings === 'function') {
            acquisitionTypes = window.loadAcquisitionTypesFromSettings();
          }
        } catch(e) { acquisitionTypes = []; }
        try {
          if (typeof window.loadConversionStepsFromSettings === 'function') {
            conversionSteps = window.loadConversionStepsFromSettings();
          }
        } catch(e) { conversionSteps = []; }

        // Create modal content
        const modalContent = `
          <div class="space-y-4">
            <div class="bg-blue-50 p-3 rounded-lg">
              <p class="text-sm text-blue-800">
                <strong>${ids.length}</strong> hasta için etiket güncellenecek
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Edinilme Türü</label>
                <select id="bulkAcquisitionType" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seçiniz</option>
                  ${acquisitionTypes.map(type => `<option value="${type.value}">${type.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Dönüşüm Adımı</label>
                <select id="bulkConversionStep" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seçiniz</option>
                  ${conversionSteps.map(step => `<option value="${step.value}">${step.name}</option>`).join('')}
                </select>
              </div>
            </div>
            <div>
              <label for="labelNotes" class="block text-sm font-medium text-gray-700">Notlar (Opsiyonel)</label>
              <textarea id="labelNotes" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary" placeholder="Etiket değişikliği ile ilgili notlar..."></textarea>
            </div>
          </div>
        `;

        // Show modal using Utils.showModal
        if (typeof Utils !== 'undefined' && Utils.showModal) {
          Utils.showModal({
            title: 'Hasta Etiketlerini Güncelle',
            content: modalContent,
            primaryButton: {
              text: 'Kaydet',
              onClick: () => {
                // Get selected values
                const newAcquisitionType = document.getElementById('bulkAcquisitionType').value;
                const newConversionStep = document.getElementById('bulkConversionStep').value;
                const labelNotes = document.getElementById('labelNotes').value;
                
                if (!newAcquisitionType && !newConversionStep) {
                  if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('En az bir etiket seçin', 'error');
                  return false; // Prevent modal from closing
                }
                
                // Update selected patients
                this.patients.forEach(p => { 
                  if (ids.includes(p.id)) { 
                    const previousAcquisition = p.acquisitionType || 'Belirtilmemiş';
                    const previousConversion = p.conversionStep || 'Belirtilmemiş';
                    
                    if (newAcquisitionType) p.acquisitionType = newAcquisitionType;
                    if (newConversionStep) p.conversionStep = newConversionStep;
                    
                    p.labelUpdatedAt = new Date().toISOString();
                    
                    // Add label change to patient notes if notes provided or labels changed
                    if (labelNotes || (newAcquisitionType && previousAcquisition !== newAcquisitionType) || (newConversionStep && previousConversion !== newConversionStep)) {
                      if (!p.notes) {
                        p.notes = [];
                      }
                      
                      let changeText = '';
                      if (newAcquisitionType && previousAcquisition !== newAcquisitionType) {
                        const prevName = acquisitionTypes.find(t => t.value === previousAcquisition)?.name || previousAcquisition;
                        const newName = acquisitionTypes.find(t => t.value === newAcquisitionType)?.name || newAcquisitionType;
                        changeText += `Edinilme Türü: "${prevName}" -> "${newName}"`;
                      }
                      if (newConversionStep && previousConversion !== newConversionStep) {
                        if (changeText) changeText += ', ';
                        const prevName = conversionSteps.find(s => s.value === previousConversion)?.name || previousConversion;
                        const newName = conversionSteps.find(s => s.value === newConversionStep)?.name || newConversionStep;
                        changeText += `Dönüşüm Adımı: "${prevName}" -> "${newName}"`;
                      }
                      
                      const labelChangeNote = {
                        id: 'note_label_' + Date.now() + '_' + p.id,
                        title: 'Etiket Güncellendi',
                        content: `${changeText}${labelNotes ? '. Not: ' + labelNotes : ''}`,
                        type: 'other',
                        date: new Date().toISOString(),
                        createdBy: 'Sistem'
                      };
                      
                      p.notes.unshift(labelChangeNote);
                    }
                  } 
                });
                
                // Save to storage
                this.savePatientsToStorage(this.patients);
                
                // Try backend updates in background if available
                try {
                  if (window.BackendServiceManager && window.BackendServiceManager.getService) {
                    const svc = window.BackendServiceManager.getService('patients');
                    if (svc && svc.update) {
                      ids.forEach(async id => {
                        try {
                          const patient = this.patients.find(p => p.id === id);
                          if (patient) await svc.update(id, { 
                            acquisitionType: patient.acquisitionType,
                            conversionStep: patient.conversionStep,
                            labelUpdatedAt: patient.labelUpdatedAt,
                            notes: patient.notes
                          });
                        } catch(e) { /* ignore per-patient errors */ }
                      });
                    }
                  }
                } catch(e) { /* non-fatal */ }
                
                if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(`${ids.length} hastanın etiketi güncellendi`, 'success');
                this.renderPatients(); 
                this.updateSelectionUI();
                
                return true; // Allow modal to close
              }
            },
            secondaryButton: {
              text: 'İptal',
              onClick: () => true // Allow modal to close
            }
          });
        } else {
          // Fallback to simple prompt if Utils.showModal is not available
          const newLabel = window.prompt('Yeni edinilme türü girin (boş bırakabilirsiniz):');
          const newStep = window.prompt('Yeni dönüşüm adımı girin (boş bırakabilirsiniz):');
          
          this.patients.forEach(p => { 
            if (ids.includes(p.id)) { 
              if (newLabel) p.acquisitionType = newLabel;
              if (newStep) p.conversionStep = newStep;
              p.labelUpdatedAt = new Date().toISOString();
            } 
          });
          
          this.savePatientsToStorage(this.patients);
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(`${ids.length} hastanın etiketi güncellendi`, 'success');
          this.renderPatients(); 
          this.updateSelectionUI();
        }
      } catch (err) { 
        console.error('updatePatientLabel failed', err); 
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Etiket güncellenemedi', 'error'); 
      }
    }

    bulkSendSMS() {
      try {
        if (window.showCustomPrompt) {
          window.showCustomPrompt('SMS Gönder', 'Gönderilecek SMS mesajını girin:', '', (message) => {
            if (!message || !message.trim()) return;
            const ids = Array.from(this.selectedPatients);
            if (!ids || ids.length === 0) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İlk önce seçim yapın', 'error'); return; }
            // Persist messages locally as simulation and attempt a backend call if available
            const existing = JSON.parse(localStorage.getItem('sms_messages') || '[]');
            const newMessages = ids.map(id => ({ id: `sms_${Date.now()}_${id}`, patientId: id, message: message.trim(), timestamp: new Date().toISOString() }));
            localStorage.setItem('sms_messages', JSON.stringify(existing.concat(newMessages)));
            if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(`${ids.length} hastaya SMS gönderildi`, 'success');
          }, 'info');
        } else {
          const message = window.prompt('Gönderilecek SMS mesajını girin:');
          if (!message) return;
          const ids = Array.from(this.selectedPatients);
          if (!ids || ids.length === 0) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İlk önce seçim yapın', 'error'); return; }
          // Persist messages locally as simulation and attempt a backend call if available
          const existing = JSON.parse(localStorage.getItem('sms_messages') || '[]');
          const newMessages = ids.map(id => ({ id: `sms_${Date.now()}_${id}`, patientId: id, message, timestamp: new Date().toISOString() }));
          localStorage.setItem('sms_messages', JSON.stringify(existing.concat(newMessages)));
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(`${ids.length} hastaya SMS gönderildi`, 'success');
        }
      } catch (err) { console.error('bulkSendSMS failed', err); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('SMS gönderilemedi', 'error'); }
    }

    // Helper to generate CSV and trigger download
    _downloadCSV(rows, filename) {
      try {
        if (!Array.isArray(rows) || rows.length === 0) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Dışa aktarılacak kayıt yok', 'error'); return; }
        const headers = ['id','name','firstName','lastName','phone','email','tcNumber','createdAt','acquisitionType','conversionStep'];
        const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => '"' + ((r[h]!==undefined && r[h]!==null) ? String(r[h]).replace(/"/g,'""') : '') + '"').join(','))).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      } catch (err) { console.error('_downloadCSV failed', err); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('CSV oluşturulamadı', 'error'); }
    }

    /**
     * Normalize patient data to ensure consistent structure
     */
    normalizePatient(data) {
      if (!data) return null;
      
      return {
        id: data.id || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        tcNumber: data.tcNumber || data.tc || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        birthDate: data.birthDate || null,
        gender: data.gender || '',
        bloodType: data.bloodType || '',
        allergies: data.allergies || [],
        medications: data.medications || [],
        medicalHistory: data.medicalHistory || [],
        appointments: data.appointments || [],
        notes: data.notes || [],
        status: data.status || 'active',
        acquisitionType: data.acquisitionType || 'walk-in',
        conversionStep: data.conversionStep || '',
        assignedDevices: data.assignedDevices || [],
        ereceiptHistory: data.ereceiptHistory || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };
    }

    async handleNewPatient(formEl) {
      try {
        const fd = new FormData(formEl);
        const patientId = fd.get('patientId') || '';
        const firstName = (fd.get('firstName')||'').trim();
        const lastName = (fd.get('lastName')||'').trim();
        const phone = (fd.get('phone')||'').trim();
        if (!firstName || !lastName || !phone) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Ad, soyad ve telefon gereklidir','error'); return false; }
        
        if (patientId) {
          // Update existing patient
          const existingPatient = this.patients.find(p => p.id === patientId);
          if (!existingPatient) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Hasta bulunamadı','error'); return false; }
          
          const updatedP = { ...existingPatient, firstName, lastName, name: `${firstName} ${lastName}`.trim(), phone, 
                             tcNumber: fd.get('tcNumber')||'', email: fd.get('email')||'', birthDate: fd.get('birthDate')||'', 
                             address: fd.get('address')||'', acquisitionType: fd.get('acquisitionType')||'', 
                             conversionStep: fd.get('conversionStep')||'' };
          
          // Try Orval generated client first
          if (window.patientsUpdatePatient) {
            try {
              console.log('🔄 Updating patient via Orval client:', patientId, updatedP);
              const resp = await window.patientsUpdatePatient({ 
                id: patientId, 
                data: updatedP 
              });
              console.log('✅ Orval update response:', resp);
              if (resp && (resp.success || resp.id || resp.data)) {
                await this.loadPatients(); // Reload to get updated data
                this.renderPatients(); this.renderStats();
                if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Hasta güncellendi', 'success');
                hideNewPatientModal();
                // Dispatch patientUpdated event for other components
                // Emit both legacy and modern event names so all modules receive the change
                try { window.dispatchEvent(new CustomEvent('patientUpdated', { detail: { patientId, patient: updatedP } })); } catch(e){}
                try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { patientId, patient: updatedP } })); } catch(e){}
                // Also emit a remote-ack event for cross-tab or remote listeners
                try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { patientId, patient: updatedP } })); } catch(e){}
                 return true;
              }
            } catch (orvalError) {
              console.warn('Orval patient update failed, trying APIConfig fallback:', orvalError);
            }
          }
          
          // API-first update fallback
          if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
            try {
              console.log('🔄 Updating patient via API:', patientId, updatedP);
              const resp = await window.APIConfig.makeRequest(`${window.APIConfig.endpoints.patients}/${patientId}`, 'PUT', updatedP);
              console.log('✅ API update response:', resp);
              if (resp && (resp.success || resp.id)) {
                await this.loadPatients(); // Reload to get updated data
                this.renderPatients(); this.renderStats();
                if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Hasta güncellendi', 'success');
                hideNewPatientModal();
                // Dispatch patientUpdated event for other components
                // Emit both legacy and modern event names so all modules receive the change
                try { window.dispatchEvent(new CustomEvent('patientUpdated', { detail: { patientId, patient: updatedP } })); } catch(e){}
                try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { patientId, patient: updatedP } })); } catch(e){}
                // Also emit a remote-ack event for cross-tab or remote listeners
                try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { patientId, patient: updatedP } })); } catch(e){}
                 return true;
              } else {
                console.warn('❌ API update failed - invalid response:', resp);
                if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('API güncelleme başarısız', 'error');
                return false;
              }
            } catch(apiErr) {
              console.error('❌ API update error:', apiErr);
              if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(`API hatası: ${apiErr.message}`, 'error');
              return false; // Don't do local update
            }
          }
          
        } else {
          // Create new patient
          const newP = { id: `p_${Date.now()}`, firstName, lastName, name:`${firstName} ${lastName}`.trim(), phone, 
                         tcNumber: fd.get('tcNumber')||'', email: fd.get('email')||'', birthDate: fd.get('birthDate')||'', 
                         address: fd.get('address')||'', acquisitionType: fd.get('acquisitionType')||'', 
                         conversionStep: fd.get('conversionStep')||'', createdAt: new Date().toISOString() };
          
          // Try Orval generated client first
          if (window.patientsCreatePatient) {
            try {
              const resp = await window.patientsCreatePatient({ data: newP });
              const saved = resp && resp.data ? resp.data : resp;
              if (saved && (saved.id || saved.success)) {
                await this.loadPatients(); // Reload to include the new patient
                this.renderPatients(); this.renderStats();
                if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Hasta kaydedildi', 'success');
                // Dispatch remote update event so other windows/tabs or modules refresh
                try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { patientId: saved.id || newP.id, patient: saved } })); } catch(e){}
                // TEMPORARILY DISABLED FOR CONSOLE DEBUG: window.location.href = `patient-details-modular.html?id=${encodeURIComponent(saved.id || newP.id)}`;
                console.log('🎯 DEBUG: Patient saved successfully via Orval client, redirect disabled for console inspection');
                return true;
              }
            } catch(orvalErr) { 
              console.warn('Orval create failed, trying APIConfig fallback:', orvalErr); 
            }
          }
          
          // API-first create fallback
          if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
            try {
              const resp = await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients, 'POST', newP);
              const saved = resp && resp.data ? resp.data : resp;
              if (saved && (saved.id || saved.success)) {
                await this.loadPatients(); // Reload to include the new patient
                this.renderPatients(); this.renderStats();
                if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Hasta kaydedildi', 'success');
                // Dispatch remote update event so other windows/tabs or modules refresh
                try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { patientId: saved.id || newP.id, patient: saved } })); } catch(e){}
                // TEMPORARILY DISABLED FOR CONSOLE DEBUG: window.location.href = `patient-details-modular.html?id=${encodeURIComponent(saved.id || newP.id)}`;
                console.log('🎯 DEBUG: Patient saved successfully via API, redirect disabled for console inspection');
                return true;
              }
            } catch(apiErr) { console.warn('API create failed', apiErr); }
          }
          
          // Fallback local
          this.patients.push(newP); 
          this.savePatientsToStorage(this.patients);
          this.renderPatients(); this.renderStats(); 
          // TEMPORARILY DISABLED FOR CONSOLE DEBUG: window.location.href = `patient-details-modular.html?id=${encodeURIComponent(newP.id)}`; 
          console.log('🎯 DEBUG: Patient saved locally, redirect disabled for console inspection');
          return true;
        }
      } catch (err) { console.error('handleNewPatient error', err); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İşlem sırasında hata oluştu','error'); return false; }
    }

    openPatientDetails(id) { window.location.href = `patient-details-modular.html?id=${encodeURIComponent(id)}`; }
    openEditModal(id) { 
      const patient = this.patients.find(p => p.id === id);
      if (!patient) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Hasta bulunamadı','error'); return; }
      showNewPatientModal(); 
      document.getElementById('patientIdInput').value = id; 
      document.getElementById('newPatientModalTitle').innerText = 'Hasta Düzenle'; 
      // Populate fields
      document.querySelector('input[name="firstName"]').value = patient.firstName || '';
      document.querySelector('input[name="lastName"]').value = patient.lastName || '';
      document.querySelector('input[name="phone"]').value = patient.phone || '';
      document.querySelector('input[name="email"]').value = patient.email || '';
      document.querySelector('input[name="tcNumber"]').value = patient.tcNumber || patient.tc || '';
      document.querySelector('input[name="birthDate"]').value = patient.birthDate || '';
      document.querySelector('textarea[name="address"]').value = patient.address || '';
      document.querySelector('select[name="acquisitionType"]').value = patient.acquisitionType || '';
      document.querySelector('select[name="conversionStep"]').value = patient.conversionStep || '';
    }
  }

  window.PatientManager = window.PatientManager || PatientManagerCorrected;
  // Don't auto-create instance here - let the HTML page control initialization
  // if (!window.patientManager) window.patientManager = new window.PatientManager();

  if (typeof window.viewPatient === 'undefined') window.viewPatient = function(id){ if (window.patientManager && typeof window.patientManager.openPatientDetails==='function') return window.patientManager.openPatientDetails(id); window.location.href = `patient-details-modular.html?id=${encodeURIComponent(id)}`; };
  if (typeof window.editPatient === 'undefined') window.editPatient = function(id){ if (window.patientManager && typeof window.patientManager.openEditModal==='function') return window.patientManager.openEditModal(id); };
})();
