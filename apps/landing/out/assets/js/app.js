// Auto-load demo bootstrap when demo mode is requested (via ?demo=1 or localStorage.DEMO_MODE)
(function(){
  try {
    const params = new URLSearchParams(location.search);
    const wantDemo = params.get('demo') === '1' || (typeof localStorage !== 'undefined' && localStorage.getItem && localStorage.getItem('DEMO_MODE') === '1');
    if (!wantDemo) return;
    const s = document.createElement('script');
    s.src = '/demo/demo-bootstrap.js';
    s.defer = true;
    document.head.appendChild(s);
  } catch (e) { /* ignore */ }
})();

// X-Ear CRM Application JavaScript

// Global state management
const AppState = {
  currentUser: null,
  currentPage: 'dashboard',
  patients: [],
  appointments: [],
  inventory: [],
  campaigns: [],
  notifications: [],
  clinicians: [],
  branches: [],
  filters: {},
  settings: {
    features: {
      enableHighPriorityTagging: false
    }
  },
  kpis: {},
  patientFunnel: []
};

// Initialize app state with sample data
function initializeAppState() {
  if (typeof samplePatients !== 'undefined') {
    AppState.patients = [...samplePatients];
  }
  if (typeof sampleAppointments !== 'undefined') {
    AppState.appointments = [...sampleAppointments];
  }
  if (typeof sampleCampaigns !== 'undefined') {
    AppState.campaigns = [...sampleCampaigns];
  } else {
    // Add sample campaigns if none exist
    AppState.campaigns = [
      {
        id: 'camp_001',
        name: 'Yeni Hasta Kampanyası',
        type: 'sms',
        status: 'completed',
        sentCount: 150,
        openRate: 65,
        clickRate: 25,
        recipients: 150,
        message: 'X-Ear\'da yeni işitme cihazı kampanyamız başladı! Ücretsiz danışmanlık için bizi arayın.',
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 'camp_002',
        name: 'Pil Değişim Hatırlatması',
        type: 'sms',
        status: 'active',
        sentCount: 85,
        openRate: 72,
        clickRate: 28,
        recipients: 85,
        message: 'Merhaba {name}, cihazınızın pil değişim zamanı yaklaştı. Randevu için 0216-XXX-XX-XX arayın.',
        createdAt: '2024-02-01T09:00:00Z'
      },
      {
        id: 'camp_003',
        name: 'Deneme Süreci Takibi',
        type: 'sms',
        status: 'draft',
        sentCount: 0,
        openRate: 0,
        clickRate: 0,
        recipients: 0,
        message: 'Merhaba {name}, cihaz deneme süreciniz nasıl gidiyor? Sorularınız için bize ulaşın.',
        createdAt: '2024-02-10T14:00:00Z'
      }
    ];
  }
  if (typeof sampleInventory !== 'undefined') {
    AppState.inventory = [...sampleInventory];
  }
  if (typeof sampleNotifications !== 'undefined') {
    AppState.notifications = [...sampleNotifications];
  }
  if (typeof sampleClinicians !== 'undefined') {
    AppState.clinicians = [...sampleClinicians];
  }
  if (typeof sampleBranches !== 'undefined') {
    AppState.branches = [...sampleBranches];
  }
  if (typeof dashboardKPIs !== 'undefined') {
    AppState.kpis = {...dashboardKPIs};
  }
  if (typeof patientFunnel !== 'undefined') {
    AppState.patientFunnel = [...patientFunnel];
  }
  
  // Load from localStorage if available
  Storage.loadAppState();
}

// Note: Utils class is defined in utils.js and will be available globally

// Saved Views Manager
const SavedViews = {
  save(viewName, filters, page = 'patients') {
    const key = `savedViews_${page}`;
    const saved = Storage.load(key) || {};
    saved[viewName] = { filters, createdAt: new Date().toISOString() };
    Storage.save(key, saved);
    return saved[viewName];
  },

  load(page = 'patients') {
    const key = `savedViews_${page}`;
    return Storage.load(key) || {};
  },

  remove(viewName, page = 'patients') {
    const key = `savedViews_${page}`;
    const saved = Storage.load(key) || {};
    delete saved[viewName];
    Storage.save(key, saved);
    return saved;
  },

  getNames(page = 'patients') {
    return Object.keys(this.load(page));
  }
};

// UI State Manager
const UIState = {
  // Show loading state
  showLoading(container, rowCount = 5) {
    const loader = document.createElement('div');
    loader.className = 'loading-skeleton';
    loader.innerHTML = Array(rowCount).fill(0).map(() => `
      <div class="animate-pulse border border-gray-200 rounded-lg p-4 mb-3">
        <div class="flex space-x-4">
          <div class="rounded-full bg-gray-300 h-10 w-10"></div>
          <div class="flex-1 space-y-2 py-1">
            <div class="h-4 bg-gray-300 rounded w-3/4"></div>
            <div class="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    `).join('');
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (container) {
      container.innerHTML = '';
      container.appendChild(loader);
    }
    return loader;
  },

  // Show empty state
  showEmpty(container, icon = '📋', title = 'Veri bulunamadı', subtitle = '', actionText = '', actionCallback = null) {
    const empty = document.createElement('div');
    empty.className = 'empty-state text-center py-12';
    empty.innerHTML = `
      <div class="text-6xl mb-4">${icon}</div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
      ${subtitle ? `<p class="text-gray-600 mb-6">${subtitle}</p>` : ''}
      ${actionText ? `<button class="btn-primary" onclick="(${actionCallback})()">${actionText}</button>` : ''}
    `;
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (container) {
      container.innerHTML = '';
      container.appendChild(empty);
    }
    return empty;
  },

  // Show error state
  showError(container, error = 'Bir hata oluştu', retryCallback = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-state bg-red-50 border border-red-200 rounded-lg p-6 text-center';
    errorDiv.innerHTML = `
      <div class="text-red-600 text-4xl mb-4">⚠️</div>
      <h3 class="text-lg font-semibold text-red-900 mb-2">Hata</h3>
      <p class="text-red-700 mb-4">${error}</p>
      ${retryCallback ? `<button class="btn-primary bg-red-600 hover:bg-red-700" onclick="(${retryCallback})()">Tekrar Dene</button>` : ''}
    `;
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    if (container) {
      container.innerHTML = '';
      container.appendChild(errorDiv);
    }
    return errorDiv;
  }
};

// Priority Patient System
const PrioritySystem = {
  // Calculate patient priority score
  calculatePriority(patient) {
    let score = 0;
    
    // High priority: Trial + Price Given + No Purchase
    if (patient.deviceTrial && patient.priceGiven && !patient.purchased) {
      score += 100;
    }
    
    // Recent activity
    const daysSinceLastContact = patient.lastContactDate ? 
      Math.floor((Date.now() - new Date(patient.lastContactDate)) / (1000 * 60 * 60 * 24)) : 999;
    
    if (daysSinceLastContact <= 3) score += 50;
    else if (daysSinceLastContact <= 7) score += 30;
    else if (daysSinceLastContact <= 14) score += 10;
    
    // Overdue appointments
    if (patient.missedAppointments > 0) score += patient.missedAppointments * 20;
    
    // Pending payments
    if (patient.overdueAmount > 0) score += Math.min(patient.overdueAmount / 1000 * 10, 50);
    
    // SGK status urgency
    if (patient.sgkStatus === 'rejected') score += 75;
    else if (patient.sgkStatus === 'pending') score += 25;
    
    // Battery report due
    if (patient.batteryReportDue) {
      const dueDate = new Date(patient.batteryReportDue);
      const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30 && daysUntil > 0) score += 40;
      else if (daysUntil <= 0) score += 80; // Overdue
    }
    
    return Math.min(score, 200);
  },

  // Get high priority patients
  getHighPriorityPatients() {
    return AppState.patients
      .map(patient => ({
        ...patient,
        priorityScore: this.calculatePriority(patient)
      }))
      .filter(patient => patient.priorityScore >= 80)
      .sort((a, b) => b.priorityScore - a.priorityScore);
  },

  // Get priority label with enhanced styling
  getPriorityLabel(score) {
    if (score >= 150) return { 
      text: 'ÇOK ÖNEMLİ', 
      class: 'bg-red-100 text-red-800 border border-red-200',
      icon: '🔥'
    };
    if (score >= 100) return { 
      text: 'ÖNEMLİ', 
      class: 'bg-orange-100 text-orange-800 border border-orange-200',
      icon: '⚠️'
    };
    if (score >= 50) return { 
      text: 'ORTA', 
      class: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      icon: '📋'
    };
    return { 
      text: 'DÜŞÜK', 
      class: 'bg-gray-100 text-gray-800 border border-gray-200',
      icon: '📝'
    };
  },

  // Get priority explanation
  getPriorityExplanation(patient) {
    const reasons = [];
    
    if (patient.deviceTrial && patient.priceGiven && !patient.purchased) {
      reasons.push('Deneme yaptı, fiyat verildi, satış yapılmadı');
    }
    
    if (patient.overdueAmount > 0) {
      reasons.push(`${Utils.formatCurrency(patient.overdueAmount)} geciken ödeme`);
    }
    
    if (patient.sgkStatus === 'rejected') {
      reasons.push('SGK raporu reddedildi');
    }
    
    if (patient.batteryReportDue) {
      const dueDate = new Date(patient.batteryReportDue);
      const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30) {
        reasons.push(`Pil raporu ${daysUntil} gün içinde`);
      }
    }
    
    if (patient.missedAppointments > 0) {
      reasons.push(`${patient.missedAppointments} kaçırılan randevu`);
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Düzenli hasta';
  },

  // Render priority badge for UI
  renderPriorityBadge(patient, showExplanation = false) {
    const score = this.calculatePriority(patient);
    const priority = this.getPriorityLabel(score);
    
    if (score < 50) return ''; // Don't show low priority badges
    
    const explanation = showExplanation ? this.getPriorityExplanation(patient) : '';
    
    return `
      <div class="priority-badge inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priority.class}" 
           ${explanation ? `title="${explanation}"` : ''}>
        <span class="mr-1">${priority.icon}</span>
        ${priority.text}
        ${score >= 100 ? ` (${score})` : ''}
      </div>
    `;
  },

  // Auto-tag high priority patients
  autoTagHighPriorityPatients() {
    const highPriorityPatients = this.getHighPriorityPatients();
    let updated = 0;
    
    highPriorityPatients.forEach(patient => {
      // Ensure tags is an array
      if (!Array.isArray(patient.tags)) {
        // Handle various malformed tag formats
        if (typeof patient.tags === 'string') {
          try {
            patient.tags = JSON.parse(patient.tags);
            if (!Array.isArray(patient.tags)) {
              patient.tags = [];
            }
          } catch (e) {
            patient.tags = [];
          }
        } else if (!patient.tags) {
          patient.tags = [];
        } else {
          patient.tags = [];
        }
      }
      if (!patient.tags.includes('high_priority')) {
        patient.tags.push('high_priority');
        PatientManager.updatePatient(patient.id, { 
          tags: patient.tags,
          priorityScore: patient.priorityScore 
        });
        updated++;
      }
    });
    
    // Remove high_priority tag from patients who no longer qualify
    AppState.patients.forEach(patient => {
      const score = this.calculatePriority(patient);
      // Ensure tags is an array before checking
      if (!Array.isArray(patient.tags)) {
        // Handle various malformed tag formats
        if (typeof patient.tags === 'string') {
          try {
            patient.tags = JSON.parse(patient.tags);
            if (!Array.isArray(patient.tags)) {
              patient.tags = [];
            }
          } catch (e) {
            patient.tags = [];
          }
        } else if (!patient.tags) {
          patient.tags = [];
        } else {
          patient.tags = [];
        }
      }
      if (score < 80 && patient.tags.includes('high_priority')) {
        patient.tags = patient.tags.filter(tag => tag !== 'high_priority');
        PatientManager.updatePatient(patient.id, {
          tags: patient.tags,
          priorityScore: score
        });
        updated++;
      }
    });
    
    if (updated > 0) {
      Utils.showToast(`${updated} hasta öncelik durumu güncellendi`, 'info');
    }
  },

  // Generate priority-based tasks
  generatePriorityTasks() {
    const highPriorityPatients = this.getHighPriorityPatients();
    let tasksCreated = 0;
    
    highPriorityPatients.forEach(patient => {
      // Don't create duplicate tasks
      if (patient.lastPriorityTaskDate === new Date().toISOString().split('T')[0]) {
        return;
      }
      
      const explanation = this.getPriorityExplanation(patient);
      
      NotificationManager.add({
        title: `Öncelikli Hasta: ${patient.name}`,
        message: explanation,
        type: 'priority_patient',
        data: {
          patientId: patient.id,
          priorityScore: patient.priorityScore,
          explanation
        }
      });
      
      // Mark that we created a task today
      PatientManager.updatePatient(patient.id, {
        lastPriorityTaskDate: new Date().toISOString().split('T')[0]
      });
      
      tasksCreated++;
    });
    
    return tasksCreated;
  },

  // Update all priority scores
  updateAllPriorityScores() {
    let updated = 0;
    
    AppState.patients.forEach(patient => {
      const newScore = this.calculatePriority(patient);
      if (patient.priorityScore !== newScore) {
        PatientManager.updatePatient(patient.id, { priorityScore: newScore });
        updated++;
      }
    });
    
    return updated;
  }
};

// Keyboard Shortcuts Manager
const KeyboardShortcuts = {
  shortcuts: {
    'KeyK': { ctrl: true, action: 'globalSearch', description: 'Global arama' },
    'KeyN': { ctrl: true, action: 'newPatient', description: 'Yeni hasta' },
    'KeyS': { ctrl: true, action: 'saveForm', description: 'Formu kaydet' },
    'KeyG': { ctrl: true, action: 'goToDashboard', description: 'Ana sayfaya git' },
    'KeyF': { ctrl: true, action: 'toggleFilters', description: 'Filtreleri aç/kapat' }
  },

  init() {
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    this.showShortcutsHint();
  },

  handleKeydown(event) {
    const shortcut = this.shortcuts[event.code];
    if (!shortcut) return;

    // Check modifier requirements
    if (shortcut.ctrl && !(event.ctrlKey || event.metaKey)) return;
    if (shortcut.shift && !event.shiftKey) return;
    if (shortcut.alt && !event.altKey) return;

    // Prevent default if we're handling this shortcut
    event.preventDefault();
    this.executeAction(shortcut.action);
  },

  executeAction(action) {
    switch (action) {
      case 'globalSearch':
        this.showGlobalSearch();
        break;
      case 'newPatient':
        if (window.location.pathname.includes('patients')) {
          this.newPatient();
        }
        break;
      case 'saveForm':
        this.saveCurrentForm();
        break;
      case 'goToDashboard':
        window.location.href = 'dashboard.html';
        break;
      case 'toggleFilters':
        this.toggleFilters();
        break;
    }
  },

  showGlobalSearch() {
    // Create global search modal
    const modal = UI.showModal(`
      <div class="search-modal">
        <input type="text" id="globalSearchInput" 
               class="w-full p-3 border border-gray-300 rounded-lg text-lg"
               placeholder="Hasta adı, telefon, TC veya seri no ile ara..." 
               autofocus>
        <div id="searchResults" class="mt-4 max-h-96 overflow-y-auto"></div>
      </div>
    `, 'Global Arama');

    const searchInput = modal.querySelector('#globalSearchInput');
    const searchResults = modal.querySelector('#searchResults');

    searchInput.addEventListener('input', Utils.debounce((e) => {
      this.performGlobalSearch(e.target.value, searchResults);
    }, 200));
  },

  performGlobalSearch(term, resultsContainer) {
    if (!term || term.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }

    const results = [];
    const searchTerm = term.toLowerCase();

    // Search patients
    AppState.patients.forEach(patient => {
      const searchableText = `${patient.name} ${patient.phone} ${patient.tcNumber}`.toLowerCase();
      if (searchableText.includes(searchTerm)) {
        results.push({
          type: 'patient',
          title: patient.name,
          subtitle: `${patient.phone} - ${patient.tcNumber}`,
          url: `patient-details.html?id=${patient.id}`
        });
      }
    });

    // Search inventory by serial
    AppState.inventory.forEach(item => {
      const searchableText = `${item.model} ${item.serial || ''}`.toLowerCase();
      if (searchableText.includes(searchTerm)) {
        results.push({
          type: 'inventory',
          title: item.model,
          subtitle: `Seri: ${item.serial || 'N/A'} - Stok: ${item.available}`,
          url: `inventory.html?search=${item.serial || item.model}`
        });
      }
    });

    this.renderSearchResults(results, resultsContainer);
  },

  renderSearchResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-4">Sonuç bulunamadı</p>';
      return;
    }

    container.innerHTML = results.map(result => `
      <div class="search-result p-3 hover:bg-gray-50 cursor-pointer border-b"
           onclick="window.location.href='${result.url}'; this.closest('.modal-overlay').remove();">
        <div class="flex items-center">
          <span class="result-type badge mr-3">${result.type === 'patient' ? '👤' : '📦'}</span>
          <div>
            <div class="font-semibold">${result.title}</div>
            <div class="text-sm text-gray-600">${result.subtitle}</div>
          </div>
        </div>
      </div>
    `).join('');
  },

  newPatient() {
    window.location.href = 'patient-details.html?new=true';
  },

  saveCurrentForm() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const saveBtn = form.querySelector('button[type="submit"], .btn-primary');
      if (saveBtn) saveBtn.click();
    });
    Utils.showToast('Form kaydedildi', 'success');
  },

  toggleFilters() {
    const filterPanel = document.querySelector('.filter-panel, .filters');
    if (filterPanel) {
      filterPanel.classList.toggle('hidden');
    }
  },

  showShortcutsHint() {
    // Add keyboard shortcuts hint to help menu if it exists
    const helpMenu = document.querySelector('.help-menu');
    if (helpMenu) {
      const shortcutsHtml = Object.entries(this.shortcuts).map(([key, shortcut]) => 
        `<div class="flex justify-between">
          <span>${shortcut.description}</span>
          <kbd class="kbd">${shortcut.ctrl ? 'Ctrl+' : ''}${key.replace('Key', '')}</kbd>
        </div>`
      ).join('');
      
      helpMenu.innerHTML += `<div class="shortcuts-help">${shortcutsHtml}</div>`;
    }
  }
};

// Local Storage Manager
const Storage = {
  save(key, data) {
    try {
      localStorage.setItem(`xear_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  load(key) {
    try {
      const data = localStorage.getItem(`xear_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Storage load error:', e);
      return null;
    }
  },

  remove(key) {
    localStorage.removeItem(`xear_${key}`);
  },
  
  saveAppState: function() {
    this.save('patients', AppState.patients);
    this.save('appointments', AppState.appointments);
    this.save('campaigns', AppState.campaigns);
    this.save('inventory', AppState.inventory);
    this.save('notifications', AppState.notifications);
    this.save('settings', AppState.settings);
  },
  
  loadAppState: function() {
    const savedPatients = this.load('patients');
    const savedAppointments = this.load('appointments');
    const savedCampaigns = this.load('campaigns');
    const savedInventory = this.load('inventory');
    const savedNotifications = this.load('notifications');
    const savedSettings = this.load('settings');
    
    if (savedPatients) {
      // Normalize patient data to ensure tags are arrays
      AppState.patients = savedPatients.map(patient => ({
        ...patient,
        tags: Array.isArray(patient.tags) ? patient.tags : 
              (typeof patient.tags === 'string' ? (function() {
                try { 
                  const parsed = JSON.parse(patient.tags); 
                  return Array.isArray(parsed) ? parsed : []; 
                } catch(e) { return []; }
              })() : [])
      }));
    }
    if (savedAppointments) AppState.appointments = savedAppointments;
    if (savedCampaigns) AppState.campaigns = savedCampaigns;
    if (savedInventory) AppState.inventory = savedInventory;
    if (savedNotifications) AppState.notifications = savedNotifications;
    if (savedSettings) AppState.settings = savedSettings;
  }
};

// Patient Management
const PatientManager = {
  // Get all patients with optional filtering
  getPatients(filters = {}) {
    let patients = AppState.patients;
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      patients = patients.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.tcNumber.includes(search) ||
        p.phone.includes(search)
      );
    }
    
    if (filters.status) {
      patients = patients.filter(p => p.status === filters.status);
    }
    
    if (filters.segment) {
      patients = patients.filter(p => p.segment === filters.segment);
    }
    
    return patients;
  },

  // Add new patient
  addPatient(patientData) {
    const patient = {
      id: Utils.generateId(),
      ...patientData,
      status: patientData.status || 'active',
      segment: patientData.segment || 'new',
      devices: patientData.devices || [],
      tags: patientData.tags || [], // Ensure tags is always an array
      notes: patientData.notes || '',
      priorityScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    AppState.patients.push(patient);
    Storage.saveAppState();
    
    // Trigger automation event
    document.dispatchEvent(new CustomEvent('patientCreated', {
      detail: { patient }
    }));
    
    return patient;
  },

  // Update patient
  updatePatient(id, updates) {
    const index = AppState.patients.findIndex(p => p.id === id);
    if (index !== -1) {
      const oldPatient = { ...AppState.patients[index] };

      // If API is available, prefer calling backend so central DB is authoritative
      if (typeof window !== 'undefined' && window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
        try {
          const endpoint = `${window.APIConfig.endpoints.patients}/${id}`;
          // Attempt server update synchronously (caller is async-safe if needed)
          // We do not block UI: we will await and then update AppState with server response
          window.APIConfig.makeRequest(endpoint, 'PUT', Object.assign({}, updates))
            .then((resp) => {
              const serverData = resp && (resp.data || resp) ? (resp.data || resp) : null;
              if (serverData) {
                AppState.patients[index] = { ...AppState.patients[index], ...serverData, updatedAt: new Date().toISOString() };
              } else {
                // if server gave no body, merge local updates
                AppState.patients[index] = { ...AppState.patients[index], ...updates, updatedAt: new Date().toISOString() };
              }

              // Recalculate priority score
              AppState.patients[index].priorityScore = PrioritySystem.calculatePriority(AppState.patients[index]);
              Storage.saveAppState();

              // Trigger automation and global update events
              document.dispatchEvent(new CustomEvent('patientUpdated', {
                detail: { patient: AppState.patients[index], oldPatient, changes: updates }
              }));

              // Also dispatch the new event names used across the app
              try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { id } })); } catch(e){}
              try { window.dispatchEvent(new CustomEvent('patient:updated:remote', { detail: { id } })); } catch(e){}
            })
            .catch((apiErr) => {
              // On API failure, keep local changes but surface error when relevant
              console.warn('API update failed, applying local fallback:', apiErr);
              AppState.patients[index] = { ...AppState.patients[index], ...updates, updatedAt: new Date().toISOString() };
              AppState.patients[index].priorityScore = PrioritySystem.calculatePriority(AppState.patients[index]);
              Storage.saveAppState();
              document.dispatchEvent(new CustomEvent('patientUpdated', { detail: { patient: AppState.patients[index], oldPatient, changes: updates } }));
            });

          // Immediately return optimistic state
          AppState.patients[index] = { ...AppState.patients[index], ...updates, updatedAt: new Date().toISOString() };
          AppState.patients[index].priorityScore = PrioritySystem.calculatePriority(AppState.patients[index]);
          Storage.saveAppState();
          document.dispatchEvent(new CustomEvent('patientUpdated', { detail: { patient: AppState.patients[index], oldPatient, changes: updates } }));

          return AppState.patients[index];

        } catch(e) {
          console.warn('Error during API-first update flow, falling back to local update', e);
        }
      }

      // Legacy local update fallback
      AppState.patients[index] = {
        ...AppState.patients[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Recalculate priority score
      AppState.patients[index].priorityScore = PrioritySystem.calculatePriority(AppState.patients[index]);

      Storage.saveAppState();

      // Trigger automation event
      document.dispatchEvent(new CustomEvent('patientUpdated', {
        detail: { 
          patient: AppState.patients[index], 
          oldPatient,
          changes: updates 
        }
      }));

      return AppState.patients[index];
    }
    return null;
  },

  // Delete patient
  deletePatient(id) {
    const index = AppState.patients.findIndex(p => p.id === id);
    if (index !== -1) {
      AppState.patients.splice(index, 1);
      Storage.saveAppState();
      return true;
    }
    return false;
  },

  // Get patient by ID
  getPatient(id) {
    return AppState.patients.find(p => p.id === id);
  },
  
  // Validate TC Number
  validateTCNumber(tcNumber) {
    // Utils sınıfındaki validateTCKN fonksiyonunu kullan
    return Utils.validateTCKN(tcNumber);
  },
  
  // Check if TC Number is unique
  isUniqueTCNumber(tcNumber, excludeId = null) {
    return !AppState.patients.some(p => p.tcNumber === tcNumber && p.id !== excludeId);
  },
  
  // Add device to patient
  addDevice(patientId, device) {
    const patient = this.getPatient(patientId);
    if (patient) {
      device.id = Utils.generateId();
      device.addedAt = new Date().toISOString();
      patient.devices.push(device);
      this.updatePatient(patientId, { devices: patient.devices });
      
      // Trigger automation events
      if (device.status === 'trial') {
        document.dispatchEvent(new CustomEvent('deviceTrialStarted', {
          detail: { patient, device }
        }));
      } else if (device.status === 'purchased') {
        document.dispatchEvent(new CustomEvent('saleCompleted', {
          detail: { patient, device }
        }));
      }
      
      return device;
    }
    return null;
  },
  
  // Update device
  updateDevice(patientId, deviceId, updates) {
    const patient = this.getPatient(patientId);
    if (patient) {
      const deviceIndex = patient.devices.findIndex(d => d.id === deviceId);
      if (deviceIndex !== -1) {
        const oldDevice = { ...patient.devices[deviceIndex] };
        patient.devices[deviceIndex] = { ...patient.devices[deviceIndex], ...updates };
        this.updatePatient(patientId, { devices: patient.devices });
        
        // Trigger automation events based on status changes
        const newDevice = patient.devices[deviceIndex];
        if (oldDevice.status === 'trial' && newDevice.status === 'trial_completed') {
          document.dispatchEvent(new CustomEvent('deviceTrialCompleted', {
            detail: { patient, device: newDevice, oldDevice }
          }));
        } else if (newDevice.status === 'purchased' && oldDevice.status !== 'purchased') {
          document.dispatchEvent(new CustomEvent('saleCompleted', {
            detail: { patient, device: newDevice }
          }));
        }
        
        return patient.devices[deviceIndex];
      }
    }
    return null;
  }
};

// Note: AppointmentManager is now defined as a class in appointments.js

// SMS Campaign Manager
const CampaignManager = {
  // Get all campaigns
  getCampaigns() {
    return AppState.campaigns;
  },
  
  // Add campaign
  addCampaign(campaignData) {
    const campaign = {
      id: Utils.generateId(),
      ...campaignData,
      status: campaignData.status || 'draft',
      responses: campaignData.responses || { delivered: 0, opened: 0, clicked: 0, replied: 0 },
      createdAt: new Date().toISOString()
    };
    
    AppState.campaigns.push(campaign);
    Storage.saveAppState();
    return campaign;
  },
  
  // Update campaign
  updateCampaign(id, updates) {
    const index = AppState.campaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      AppState.campaigns[index] = {
        ...AppState.campaigns[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      Storage.saveAppState();
      return AppState.campaigns[index];
    }
    return null;
  },
  
  // Delete campaign
  deleteCampaign(id) {
    const index = AppState.campaigns.findIndex(c => c.id === id);
    if (index !== -1) {
      AppState.campaigns.splice(index, 1);
      Storage.saveAppState();
      return true;
    }
    return false;
  },
  
  // Launch campaign
  launchCampaign(id) {
    const campaign = this.updateCampaign(id, { status: 'active', sentAt: new Date().toISOString() });
    if (campaign) {
      this.sendSMS(campaign.recipients, campaign.message);
    }
    return campaign;
  },

  // Send SMS campaign
  sendCampaign(campaignData) {
    const campaign = {
      id: Utils.generateId(),
      ...campaignData,
      status: 'sent',
      sentAt: new Date().toISOString(),
      recipients: campaignData.recipients.length
    };
    
    AppState.campaigns.push(campaign);
    Storage.saveAppState();
    
    // Simulate SMS sending
    Utils.showToast(`SMS kampanyası ${campaign.recipients} kişiye gönderildi`, 'success');
    return campaign;
  },
  
  // Send SMS
  sendSMS(recipients, message) {
    // Simulate SMS sending
    console.log('Sending SMS to:', recipients);
    console.log('Message:', message);
    
    // In a real app, this would integrate with an SMS service
    return {
      success: true,
      sentCount: recipients.length,
      message: 'SMS gönderildi'
    };
  },
  
  // Get recipient groups
  getRecipientGroups() {
    const groups = {
      all: AppState.patients,
      active: AppState.patients.filter(p => p.status === 'active'),
      trial: AppState.patients.filter(p => p.segment === 'trial'),
      purchased: AppState.patients.filter(p => p.segment === 'purchased'),
      inactive: AppState.patients.filter(p => p.status === 'inactive')
    };
    return groups;
  },

  // Get campaign templates
  getTemplates() {
    return [
      {
        id: 'no_show',
        name: 'Randevu Kaçırma',
        message: 'Merhaba {name}, bugünkü randevunuzu kaçırdınız. Yeni randevu için lütfen bizi arayın.'
      },
      {
        id: 'trial_followup',
        name: 'Deneme Takibi',
        message: 'Merhaba {name}, cihaz deneme süreciniz nasıl gidiyor? Sorularınız için bizi arayabilirsiniz.'
      },
      {
        id: 'battery_reminder',
        name: 'Pil Hatırlatması',
        message: 'Merhaba {name}, cihazınızın pil değişim zamanı yaklaştı. Randevu için bizi arayın.'
      }
    ];
  }
};

// UI Components
const UI = {
  // Show modal
  showModal(content, title = '') {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content p-6">
        ${title ? `<h3 class="text-lg font-semibold mb-4">${title}</h3>` : ''}
        <div class="modal-body">${content}</div>
        <div class="flex justify-end mt-6 space-x-3">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  },

  // Show confirmation dialog
  showConfirm(message, onConfirm) {
    const modal = this.showModal(`
      <p class="mb-4">${message}</p>
      <div class="flex justify-end space-x-3">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
        <button class="btn-primary" onclick="(${onConfirm})(); this.closest('.modal-overlay').remove()">Onayla</button>
      </div>
    `, 'Onay');
    return modal;
  },

  // Render patient card
  renderPatientCard(patient) {
    return `
      <div class="card p-4 hover:shadow-md transition-shadow cursor-pointer" onclick="window.location.href='patient-details.html?id=${patient.id}'">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-semibold text-gray-900">${patient.name}</h3>
          <span class="status-badge status-${patient.status}">${patient.status}</span>
        </div>
        <div class="text-sm text-gray-600 space-y-1">
          <p><strong>TC:</strong> ${patient.tcNumber}</p>
          <p><strong>Telefon:</strong> ${patient.phone}</p>
          <p><strong>Son Ziyaret:</strong> ${Utils.formatDate(patient.lastVisit)}</p>
        </div>
      </div>
    `;
  },

  // Render appointment card
  renderAppointmentCard(appointment) {
    const patient = PatientManager.getPatient(appointment.patientId);
    return `
      <div class="card p-4 border-l-4 border-blue-500">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-semibold">${patient ? patient.name : 'Bilinmeyen Hasta'}</h4>
          <span class="status-badge status-${appointment.status}">${appointment.status}</span>
        </div>
        <div class="text-sm text-gray-600">
          <p><strong>Saat:</strong> ${appointment.time}</p>
          <p><strong>Klinisyen:</strong> ${appointment.clinician}</p>
          <p><strong>Tür:</strong> ${appointment.type}</p>
        </div>
      </div>
    `;
  }
};

// Inventory Manager
const InventoryManager = {
  getAll() {
    return AppState.inventory;
  },
  
  add(item) {
    item.id = Utils.generateId();
    item.createdAt = new Date().toISOString();
    item.lastUpdated = new Date().toISOString();
    item.available = item.inInventory - (item.reserved || 0);
    AppState.inventory.push(item);
    Storage.saveAppState();
    return item;
  },
  
  update(id, updates) {
    const index = AppState.inventory.findIndex(i => i.id === id);
    if (index !== -1) {
      AppState.inventory[index] = {
        ...AppState.inventory[index],
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      AppState.inventory[index].available = AppState.inventory[index].inInventory - (AppState.inventory[index].reserved || 0);
      Storage.saveAppState();
      return AppState.inventory[index];
    }
    return null;
  },
  
  delete(id) {
    const index = AppState.inventory.findIndex(i => i.id === id);
    if (index !== -1) {
      AppState.inventory.splice(index, 1);
      Storage.saveAppState();
      return true;
    }
    return false;
  },
  
  updateInventory(id, quantity, reason) {
    const item = AppState.inventory.find(i => i.id === id);
    if (item) {
      item.inInventory = Math.max(0, item.inInventory + quantity);
      item.available = item.inInventory - (item.reserved || 0);
      item.lastUpdated = new Date().toISOString();
      Storage.saveAppState();
      return item;
    }
    return null;
  },
  
  reserveItem(id, quantity) {
    const item = AppState.inventory.find(i => i.id === id);
    if (item && item.available >= quantity) {
      item.reserved = (item.reserved || 0) + quantity;
      item.available = item.inInventory - item.reserved;
      Storage.saveAppState();
      return true;
    }
    return false;
  },
  
  assignToPatient(itemId, patientId, serialNumber, ear) {
    const item = AppState.inventory.find(i => i.id === itemId);
    const patient = PatientManager.getPatient(patientId);
    
    if (item && patient && item.available > 0) {
      const device = {
        brand: item.brand,
        model: item.model,
        serialNumber: serialNumber,
        ear: ear,
        status: 'trial',
        trialStartDate: new Date().toISOString().split('T')[0],
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      PatientManager.addDevice(patientId, device);
      this.reserveItem(itemId, 1);
      return device;
    }
    return null;
  }
};

// Notification Manager
const NotificationManager = {
  add(notification) {
    notification.id = Utils.generateId();
    notification.timestamp = new Date().toISOString();
    notification.read = false;
    AppState.notifications.unshift(notification);
    Storage.saveAppState();

    // --- New: Mirror to header widget's local storage so header widget shows it ---
    try {
      const headerListRaw = localStorage.getItem('notifications');
      const headerList = headerListRaw ? JSON.parse(headerListRaw) : [];
      const headerItem = {
        id: notification.id,
        type: notification.type || 'notification',
        title: notification.title,
        message: notification.message,
        createdAt: notification.timestamp,
        read: false
      };
      headerList.unshift(headerItem);
      if (headerList.length > 50) headerList.splice(50);
      localStorage.setItem('notifications', JSON.stringify(headerList));

      if (window.headerWidget && typeof window.headerWidget.addNotification === 'function') {
        window.headerWidget.addNotification(headerItem);
      }
    } catch (e) {
      console.warn('Failed to mirror notification to header widget:', e);
    }

    // --- New: Send to server (fire-and-forget) so multi-device sync is possible ---
    try {
      if (window.NotificationClient && typeof window.NotificationClient.postNotification === 'function') {
        window.NotificationClient.postNotification(notification);
      } else {
        // fallback small inline post
        const currentUser = (window.authManager && typeof window.authManager.getCurrentUser === 'function') ? window.authManager.getCurrentUser() : JSON.parse(localStorage.getItem('currentUser')||'null');
        createNotification(data).catch(()=>{});
      }
    } catch (e) {
      console.warn('Failed to send notification to server:', e);
    }

    // --- New: Native desktop notification when permission granted and user prefers desktop ---
    try {
      const desktopPref = (AppState.settings && AppState.settings.notifications && typeof AppState.settings.notifications.desktop !== 'undefined') ? AppState.settings.notifications.desktop : (JSON.parse(localStorage.getItem('systemSettings')||'{}').notifications || {}).desktop;
      if (desktopPref && window.NotificationClient && typeof window.NotificationClient.showNativeNotification === 'function') {
        // If permission not granted, request it
        if (Notification && Notification.permission !== 'granted') {
          window.NotificationClient.requestDesktopPermission().then(p => {
            if (p === 'granted') window.NotificationClient.showNativeNotification(notification);
          }).catch(()=>{});
        } else if (Notification && Notification.permission === 'granted') {
          window.NotificationClient.showNativeNotification(notification);
        }
      }
    } catch (e) {
      // non-blocking
    }

    return notification;
  },
  
  markAsRead(id) {
    const notification = AppState.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      Storage.saveAppState();
    }
  },
  
  getUnread() {
    return AppState.notifications.filter(n => !n.read);
  }
};

// Helper: normalize inventory item fields for consistent reads/writes
  function normalizeInventoryItem(item) {
    const normalized = Object.assign({}, item);

    // Canonical numeric inventory fields
    const inv = (item.inventory != null) ? item.inventory : (item.inInventory != null ? item.inInventory : (item.availableInventory != null ? item.availableInventory : 0));
    const avail = (item.availableInventory != null) ? item.availableInventory : (item.available != null ? item.available : inv);
    const minInv = (item.minInventory != null) ? item.minInventory : (item.reorderLevel != null ? item.reorderLevel : 5);

    // Ensure both modern and legacy names exist
    normalized.inventory = inv;
    normalized.availableInventory = avail;
    normalized.inInventory = inv;
    normalized.available = avail;
    normalized.minInventory = minInv;
    normalized.reorderLevel = minInv;

    // Keep other fields unchanged
    return normalized;
  }

  // Wrap Storage.save to normalize inventory automatically when saving
  const _origStorageSave = Storage.save.bind(Storage);
  Storage.save = function(key, data) {
    try {
      if (key === 'inventory' && Array.isArray(data)) {
        const normalized = data.map(normalizeInventoryItem);
        return _origStorageSave(key, normalized);
      }
    } catch (e) {
      console.error('Inventory normalization error on save:', e);
    }
    return _origStorageSave(key, data);
  };

  // Wrap Storage.load to normalize inventory after load
  const _origStorageLoad = Storage.load.bind(Storage);
  Storage.load = function(key) {
    const data = _origStorageLoad(key);
    if (key === 'inventory' && Array.isArray(data)) {
      try {
        return data.map(normalizeInventoryItem);
      } catch (e) {
        console.error('Inventory normalization error on load:', e);
        return data;
      }
    }
    return data;
  };



// Setup global event listeners
function setupGlobalEvents() {
  // Initialize keyboard shortcuts
  KeyboardShortcuts.init();
  
  // Search functionality
  const searchInputs = document.querySelectorAll('[data-search]');
  searchInputs.forEach(input => {
    input.addEventListener('input', Utils.debounce((e) => {
      const searchTerm = e.target.value;
      const searchType = e.target.dataset.search;
      handleSearch(searchType, searchTerm);
    }, 300));
  });
  
  // Mobile menu toggle
  const menuToggle = document.querySelector('[data-menu-toggle]');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar-nav');
      sidebar.classList.toggle('open');
    });
  }

  // Handle URL parameters on page load
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of urlParams.entries()) {
      params[key] = value;
    }
    if (Object.keys(params).length > 0) {
      AppState.filters = { ...AppState.filters, ...params };
    }
  } catch (error) {
    console.error('Error parsing URL parameters:', error);
  }
}

// Handle search functionality
function handleSearch(type, term) {
  AppState.filters[type] = term;
  
  // Trigger page refresh with new filters
  if (typeof refreshPageData === 'function') {
    refreshPageData();
  }
}

// Global handler that delegates searches to appropriate page flows
window.refreshPageData = function() {
  try {
    const filters = window.AppState && window.AppState.filters ? window.AppState.filters : {};
    // If the user searched for patients, redirect to the patients listing with query
    if (filters.patients && filters.patients.trim().length > 0) {
      const q = encodeURIComponent(filters.patients.trim());
      window.location.href = `patients.html?q=${q}`;
      return;
    }

    // For other pages we keep the existing behavior: call page-specific handlers if present.
    if (window.AppState && window.AppState.currentPage && typeof window['refresh_' + window.AppState.currentPage] === 'function') {
      window['refresh_' + window.AppState.currentPage]();
    }
  } catch (err) {
    console.warn('refreshPageData error', err);
  }
};

// Initialize application
function initApp() {
  // Initialize app state with sample data
  initializeAppState();
  
  // Set current page based on URL
  const path = window.location.pathname;
  AppState.currentPage = path.split('/').pop().replace('.html', '') || 'dashboard';
  
  // Initialize automation systems
  if (typeof AutomationEngine !== 'undefined') {
    window.automationEngine = new AutomationEngine();
  }
  
  // Initialize page-specific functionality
  if (typeof initPage === 'function') {
    initPage();
  }
  
  // Setup global event listeners
  setupGlobalEvents();
  
  // Run initial automation checks after a short delay
  setTimeout(() => {
    if (window.advancedAutomation) {
      advancedAutomation.runPeriodicChecks();
    }
    
    // Update priority scores for all patients
    PrioritySystem.updateAllPriorityScores();
    if (AppState?.settings?.features?.enableHighPriorityTagging) {
      PrioritySystem.autoTagHighPriorityPatients();
    }
    
    // Generate priority tasks if there are high-priority patients
    const tasksCreated = PrioritySystem.generatePriorityTasks();
    if (tasksCreated > 0) {
      Utils.showToast(`${tasksCreated} öncelikli hasta görevi oluşturuldu`, 'info');
    }
  }, 2000);
}

// Race condition fix - wait for both data and DOM
const startAppWhenReady = () => {
  if (window.sampleData && document.readyState !== 'loading') {
    console.log('✅ Data and DOM ready, starting app.');
    initApp();
  } else if (window.sampleData) {
    console.log('✅ Data loaded, waiting for DOM.');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('✅ DOM ready, starting app.');
      initApp();
    });
  } else {
    console.log('⏳ Data not yet loaded, waiting for data event.');
    window.addEventListener('typeScriptDataLoaded', () => {
      console.log('✅ Data loaded, checking DOM.');
      if (document.readyState !== 'loading') {
        console.log('✅ DOM ready, starting app.');
        initApp();
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          console.log('✅ DOM ready, starting app.');
          initApp();
        });
      }
    }, { once: true });
  }
};

// Start the app when ready
startAppWhenReady();

// Export for global access
window.AppState = AppState;
window.PatientManager = PatientManager;
// AppointmentManager is exported from appointments.js
window.CampaignManager = CampaignManager;
window.InventoryManager = InventoryManager;
window.NotificationManager = NotificationManager;
window.UI = UI;
window.Storage = Storage;
window.SavedViews = SavedViews;
window.UIState = UIState;
window.PrioritySystem = PrioritySystem;
window.KeyboardShortcuts = KeyboardShortcuts;
window.initializeAppState = initializeAppState;