// Cashflow Management JavaScript
// Global variables
let allCashRecords = [];
let filteredRecords = [];
let currentPage = 1;
const pageSize = 10;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize date pickers
  flatpickr("#startDate", {
    dateFormat: "Y-m-d",
    locale: "tr"
  });
  
  flatpickr("#endDate", {
    dateFormat: "Y-m-d", 
    locale: "tr"
  });

  // Load sidebar and cash data
  loadSidebar();
  loadCashData();
  
  // Initialize patient search
  initializePatientSearch();
  
  // Add event listeners for automatic filtering
  setTimeout(() => {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const transactionTypeFilter = document.getElementById('transactionTypeFilter');
    const recordTypeFilter = document.getElementById('recordTypeFilter');
    const searchInput = document.getElementById('searchInput');

    if (startDate) startDate.addEventListener('change', applyFilters);
    if (endDate) endDate.addEventListener('change', applyFilters);
    if (transactionTypeFilter) transactionTypeFilter.addEventListener('change', applyFilters);
    if (recordTypeFilter) recordTypeFilter.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', Utils.debounce(applyFilters, 300));

    // Reset filters on page load to ensure all records are shown
    resetFilters();
  }, 200);
});

// Load sidebar using the same pattern as other pages
async function loadSidebar() {
  try {
    // Ensure widget loader is available
    if (!window.widgetLoader) {
      console.error('❌ Widget loader not available');
      return;
    }
    
    // Load sidebar and header widgets
    await window.widgetLoader.loadWidgets(['sidebar', 'header']);
    
    // Initialize sidebar widget
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer && window.SidebarWidget) {
      const sidebar = new SidebarWidget('cashflow');
      sidebarContainer.innerHTML = sidebar.render();
    }
    
    // Initialize header widget
    const headerContainer = document.getElementById('header-container');
    if (headerContainer && window.HeaderWidget) {
      const header = new HeaderWidget('Kasa Yönetimi');
      headerContainer.innerHTML = header.render();
    }
  } catch (error) {
    console.error('❌ Error loading sidebar:', error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialize transaction type buttons
  const incomeBtn = document.getElementById('incomeBtn');
  const expenseBtn = document.getElementById('expenseBtn');

  if (incomeBtn && expenseBtn) {
    incomeBtn.addEventListener('click', () => setTransactionType('income'));
    expenseBtn.addEventListener('click', () => setTransactionType('expense'));
  }

  // Listen for localStorage changes (including clear events)
  // Throttle localStorage events to prevent continuous reloading
  let lastStorageTime = 0;
  const STORAGE_THROTTLE_MS = 5000; // 5 seconds minimum between storage reloads
  
  window.addEventListener('storage', function(e) {
    if (e.key === 'cashRecords' || e.key === null) { // null means localStorage.clear() was called
      const now = Date.now();
      if (now - lastStorageTime > STORAGE_THROTTLE_MS) {
        console.log('📦 localStorage changed, reloading cash data...');
        lastStorageTime = now;
        setTimeout(() => {
          loadCashData(); // Reload from API when localStorage changes
        }, 100);
      } else {
        console.log('📦 localStorage change ignored (throttled)');
      }
    }
  });

  // Also listen for focus events to reload data when user returns to tab
  // Throttle focus events to prevent continuous reloading
  let lastFocusTime = 0;
  const FOCUS_THROTTLE_MS = 30000; // 30 seconds minimum between focus reloads
  
  window.addEventListener('focus', function() {
    const now = Date.now();
    if (now - lastFocusTime > FOCUS_THROTTLE_MS) {
      console.log('👁️ Window focused, checking for data updates...');
      lastFocusTime = now;
      loadCashData();
    } else {
      console.log('👁️ Window focus ignored (throttled)');
    }
  });
});

// Load cash data from API or localStorage
async function loadCashData() {
  try {
    console.log('🔄 Loading cash data...');
    
    // API candidates to try - prioritize unified endpoint
    const apiCandidates = [
      'http://localhost:5003/api/unified-cash-records',
      'http://localhost:5003/api/cash-records/unified',
      'http://localhost:5003/api/cash-records',
      window.location.origin + '/api/unified-cash-records',
      // Fallback to old endpoints
      'http://localhost:5100/api/unified-cash-records',
      'http://localhost:5100/api/cash-records',
      window.location.origin + '/api/cash-records'
    ];

    let apiData = null;
    
    // Try each API endpoint
    for (const apiUrl of apiCandidates) {
      try {
        console.log('🌐 Trying API: ', apiUrl);
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📥 Raw API response:', data);
          
          // Check if response has data property or is direct array
          if (data.success && data.data && Array.isArray(data.data)) {
            apiData = data.data;
          } else if (Array.isArray(data)) {
            apiData = data;
          } else {
            console.warn('⚠️ Unexpected API response format:', data);
            continue;
          }
          
          console.log('✅ API success: ', apiUrl, apiData.length, 'records');
          console.log('📊 Sample record:', apiData[0]);
          break;
        } else {
          console.warn(`❌ API failed: ${apiUrl} - Status: ${response.status}`);
        }
      } catch (error) {
        console.warn(`❌ API error: ${apiUrl}`, error.message);
      }
    }

    // Use API data if available, otherwise fall back to localStorage
    if (apiData && Array.isArray(apiData) && apiData.length > 0) {
      allCashRecords = apiData;
      // Update localStorage with fresh API data
      localStorage.setItem('cashRecords', JSON.stringify(allCashRecords));
      console.log('💾 Updated localStorage with API data');
      console.log('🗂️ allCashRecords length:', allCashRecords.length);
    } else {
      // Fall back to localStorage
      const localData = localStorage.getItem('cashRecords');
      allCashRecords = localData ? JSON.parse(localData) : [];
      console.log('📦 Using localStorage data:', allCashRecords.length, 'records');
    }

    // Sort by date (newest first)
    if (allCashRecords.length > 0) {
      allCashRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      console.log('🔄 Sorted records, first record date:', allCashRecords[0]?.date);
    }
    
    // Apply filters and render
    console.log('🎯 Calling applyFilters...');
    applyFilters();
    console.log('📊 Calling updateStats...');
    updateStats();
    
  } catch (error) {
    console.error('❌ Error loading cash data:', error);
    Utils.showToast('Veri yüklenirken hata oluştu', 'error');
    
    // Fall back to localStorage on error
    const localData = localStorage.getItem('cashRecords');
    allCashRecords = localData ? JSON.parse(localData) : [];
    applyFilters();
    updateStats();
  }
}

// Update statistics
function updateStats() {
  const totalIncome = allCashRecords
    .filter(record => record.transactionType === 'income')
    .reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);
    
  const totalExpense = allCashRecords
    .filter(record => record.transactionType === 'expense')
    .reduce((sum, record) => sum + parseFloat(record.amount || 0), 0);
    
  const netCashFlow = totalIncome - totalExpense;

  // Update stats display
  document.getElementById('totalIncome').textContent = Utils.formatCurrency(totalIncome);
  document.getElementById('totalExpense').textContent = Utils.formatCurrency(totalExpense);
  document.getElementById('netCashFlow').textContent = Utils.formatCurrency(netCashFlow);
  
  // Update net cash flow color
  const netElement = document.getElementById('netCashFlow');
  if (netCashFlow >= 0) {
    netElement.className = 'text-2xl font-bold text-green-600';
  } else {
    netElement.className = 'text-2xl font-bold text-red-600';
  }
}

// Render cash records table
function renderCashTable() {
  const tbody = document.getElementById('cashTableBody');
  const recordCountElement = document.getElementById('recordCount');
  
  if (!tbody) {
    console.error('❌ cashTableBody element not found!');
    return;
  }

  console.log('📊 Rendering table with', filteredRecords.length, 'filtered records');

  // Update record count display
  if (recordCountElement) {
    recordCountElement.textContent = `${filteredRecords.length} kayıt gösteriliyor`;
  }

  // Calculate pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  console.log('📄 Page', currentPage, '- showing records', startIndex, 'to', endIndex, '(', paginatedRecords.length, 'records)');

  if (paginatedRecords.length === 0) {
    console.log('⚠️ No records to display');
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2 block"></i>
          Kayıt bulunamadı
        </td>
      </tr>
    `;
    updatePagination();
    return;
  }

  tbody.innerHTML = paginatedRecords.map(record => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${formatDate(record.date)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${formatTime(record.date)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          record.transactionType === 'income' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }">
          <i class="fas fa-arrow-${record.transactionType === 'income' ? 'up' : 'down'} mr-1"></i>
          ${record.transactionType === 'income' ? 'Gelir' : 'Gider'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${getRecordTypeLabel(record.recordType)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${record.patientName || '-'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${
        record.transactionType === 'income' ? 'text-green-600' : 'text-red-600'
      }">
        ${record.transactionType === 'income' ? '+' : '-'}${Utils.formatCurrency(record.amount)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button onclick="deleteCashRecord('${record.id}')" 
                class="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1" 
                title="Sil">
          <i class="fas fa-trash mr-1"></i>
          Sil
        </button>
      </td>
    </tr>
  `).join('');

  console.log('✅ Table rendered successfully');
  updatePagination();
}

// Apply filters
function applyFilters() {
  console.log('🎯 applyFilters called with allCashRecords:', allCashRecords.length);
  
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const transactionType = document.getElementById('transactionTypeFilter')?.value || '';
  const recordType = document.getElementById('recordTypeFilter')?.value || '';
  const dateFrom = document.getElementById('dateFromFilter')?.value || '';
  const dateTo = document.getElementById('dateToFilter')?.value || '';

  console.log('🔍 Filters:', { searchTerm, transactionType, recordType, dateFrom, dateTo });

  filteredRecords = allCashRecords.filter(record => {
    // Search filter
    if (searchTerm && !record.patientName?.toLowerCase().includes(searchTerm) && 
        !record.description?.toLowerCase().includes(searchTerm)) {
      return false;
    }

    // Transaction type filter
    if (transactionType && record.transactionType !== transactionType) {
      return false;
    }

    // Record type filter
    if (recordType && record.recordType !== recordType) {
      return false;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const recordDate = new Date(record.date);
      if (dateFrom && recordDate < new Date(dateFrom)) {
        return false;
      }
      if (dateTo && recordDate > new Date(dateTo + 'T23:59:59')) {
        return false;
      }
    }

    return true;
  });

  console.log('✅ Filtered records:', filteredRecords.length);
  console.log('📋 Sample filtered record:', filteredRecords[0]);

  // Reset to first page when filters change
  currentPage = 1;
  
  console.log('🎨 Calling renderCashTable...');
  renderCashTable();
}

// Reset filters
function resetFilters() {
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const transactionTypeFilter = document.getElementById('transactionTypeFilter');
  const recordTypeFilter = document.getElementById('recordTypeFilter');
  const searchInput = document.getElementById('searchInput');

  if (startDate) startDate.value = '';
  if (endDate) endDate.value = '';
  if (transactionTypeFilter) transactionTypeFilter.value = '';
  if (recordTypeFilter) recordTypeFilter.value = '';
  if (searchInput) searchInput.value = '';
  
  applyFilters();
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginationContainer = document.getElementById('pagination');
  
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let paginationHTML = '';
  
  // Previous button
  paginationHTML += `
    <button onclick="changePage(${currentPage - 1})" 
            ${currentPage === 1 ? 'disabled' : ''} 
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-50 hover:text-gray-700 ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      paginationHTML += `
        <button onclick="changePage(${i})" 
                class="px-3 py-2 text-sm font-medium ${i === currentPage 
                  ? 'text-blue-600 bg-blue-50 border-blue-500' 
                  : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-700'} border">
          ${i}
        </button>
      `;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      paginationHTML += `
        <span class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300">...</span>
      `;
    }
  }

  // Next button
  paginationHTML += `
    <button onclick="changePage(${currentPage + 1})" 
            ${currentPage === totalPages ? 'disabled' : ''} 
            class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-50 hover:text-gray-700 ${currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''}">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderCashTable();
}

// CRUD Functions for cash records
function editCashRecord(recordId) {
  const record = allCashRecords.find(r => r.id == recordId);
  if (!record) {
    Utils.showToast('Kayıt bulunamadı', 'error');
    return;
  }

  // Create edit modal using the same form as new record
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Kayıt Düzenle</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <form onsubmit="updateCashRecord(event, ${recordId})" class="p-6">
        <!-- Transaction Type -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-3">İşlem Türü</label>
          <div class="flex space-x-4">
            <button type="button" id="editIncomeBtn" onclick="setEditTransactionType('income')" 
                    class="flex-1 py-3 px-4 border-2 rounded-lg font-medium transition-all ${record.transactionType === 'income' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-700 hover:border-green-300'}">
              <i class="fas fa-arrow-up mr-2"></i>Gelir
            </button>
            <button type="button" id="editExpenseBtn" onclick="setEditTransactionType('expense')" 
                    class="flex-1 py-3 px-4 border-2 rounded-lg font-medium transition-all ${record.transactionType === 'expense' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 text-gray-700 hover:border-red-300'}">
              <i class="fas fa-arrow-down mr-2"></i>Gider
            </button>
          </div>
          <input type="hidden" id="editTransactionType" name="transactionType" value="${record.transactionType}">
        </div>

        <!-- Record Type -->
        <div class="mb-6">
          <label for="editRecordType" class="block text-sm font-medium text-gray-700 mb-2">Kayıt Türü</label>
          <select id="editRecordType" name="recordType" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
            <option value="kaparo" ${record.recordType === 'kaparo' ? 'selected' : ''}>Kaparo</option>
            <option value="kalip" ${record.recordType === 'kalip' ? 'selected' : ''}>Kalıp</option>
            <option value="teslimat" ${record.recordType === 'teslimat' ? 'selected' : ''}>Teslimat</option>
            <option value="pil" ${record.recordType === 'pil' ? 'selected' : ''}>Pil</option>
            <option value="filtre" ${record.recordType === 'filtre' ? 'selected' : ''}>Filtre</option>
            <option value="tamir" ${record.recordType === 'tamir' ? 'selected' : ''}>Tamir</option>
            <option value="diger" ${record.recordType === 'diger' ? 'selected' : ''}>Diğer</option>
          </select>
        </div>

        <!-- Patient Selection -->
        <div class="mb-6">
          <label for="editPatientSelect" class="block text-sm font-medium text-gray-700 mb-2">Hasta (İsteğe Bağlı)</label>
          <input type="text" id="editPatientSelect" name="patientName" value="${record.patientName || ''}" 
                 class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                 placeholder="Hasta adı...">
        </div>

        <!-- Amount -->
        <div class="mb-6">
          <label for="editAmount" class="block text-sm font-medium text-gray-700 mb-2">Tutar (₺)</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₺</span>
            <input type="number" id="editAmount" name="amount" step="0.01" min="0" value="${record.amount || 0}"
                   class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors">
          </div>
        </div>

        <!-- Description -->
        <div class="mb-6">
          <label for="editDescription" class="block text-sm font-medium text-gray-700 mb-2">Açıklama (İsteğe Bağlı)</label>
          <textarea id="editDescription" name="description" rows="3" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="İşlem açıklaması...">${record.description || ''}</textarea>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button type="button" onclick="this.closest('.fixed').remove()"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            İptal
          </button>
          <button type="submit"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all">
            Güncelle
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function deleteCashRecord(recordId) {
  const record = allCashRecords.find(r => r.id == recordId);
  if (!record) {
    Utils.showToast('Kayıt bulunamadı', 'error');
    return;
  }

  // Create confirmation modal
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Kayıt Sil</h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="p-6">
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <i class="fas fa-exclamation-triangle text-red-600"></i>
          </div>
        </div>
        <div class="text-center">
          <h3 class="text-lg font-medium text-gray-900 mb-2">Kayıt Silinsin mi?</h3>
          <p class="text-sm text-gray-500 mb-4">
            Bu işlem geri alınamaz. Kayıt kalıcı olarak silinecektir.
          </p>
          <div class="bg-gray-50 p-3 rounded-lg text-left">
            <p class="text-sm"><strong>Tarih:</strong> ${formatDate(record.date)}</p>
            <p class="text-sm"><strong>Tür:</strong> ${record.transactionType === 'income' ? 'Gelir' : 'Gider'}</p>
            <p class="text-sm"><strong>Tutar:</strong> ${Utils.formatCurrency(record.amount)}</p>
          </div>
        </div>
      </div>
      <div class="flex justify-end space-x-3 p-6 border-t border-gray-200">
        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          İptal
        </button>
        <button onclick="confirmDeleteCashRecord(${recordId})" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
          Sil
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function setEditTransactionType(type) {
  document.getElementById('editTransactionType').value = type;
  
  const incomeBtn = document.getElementById('editIncomeBtn');
  const expenseBtn = document.getElementById('editExpenseBtn');
  
  if (type === 'income') {
    incomeBtn.className = 'flex-1 py-3 px-4 border-2 border-green-500 bg-green-50 text-green-700 rounded-lg font-medium transition-all';
    expenseBtn.className = 'flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 hover:border-green-300 rounded-lg font-medium transition-all';
  } else {
    expenseBtn.className = 'flex-1 py-3 px-4 border-2 border-red-500 bg-red-50 text-red-700 rounded-lg font-medium transition-all';
    incomeBtn.className = 'flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 hover:border-red-300 rounded-lg font-medium transition-all';
  }
}

async function updateCashRecord(event, recordId) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const updatedRecord = {
    id: recordId,
    transactionType: formData.get('transactionType'),
    recordType: formData.get('recordType'),
    patientName: formData.get('patientName') || null,
    amount: parseFloat(formData.get('amount')),
    description: formData.get('description') || ''
  };

  try {
    // Update in allCashRecords array
    const index = allCashRecords.findIndex(r => r.id == recordId);
    if (index !== -1) {
      allCashRecords[index] = updatedRecord;
      
      // Update localStorage
      localStorage.setItem('cashRecords', JSON.stringify(allCashRecords));
      
      // Try to update via API
      await updateRecordAPI(updatedRecord);
      
      // Refresh display
      applyFilters();
      updateStats();
      
      // Close modal
      event.target.closest('.fixed').remove();
      
      Utils.showToast('Kayıt başarıyla güncellendi', 'success');
    }
  } catch (error) {
    console.error('Error updating record:', error);
    Utils.showToast('Kayıt güncellenirken hata oluştu', 'error');
  }
}

async function confirmDeleteCashRecord(recordId) {
  try {
    // Remove from allCashRecords array
    const index = allCashRecords.findIndex(r => r.id == recordId);
    if (index !== -1) {
      allCashRecords.splice(index, 1);
      
      // Update localStorage
      localStorage.setItem('cashRecords', JSON.stringify(allCashRecords));
      
      // Try to delete via API
      await deleteRecordAPI(recordId);
      
      // Refresh display
      applyFilters();
      updateStats();
      
      // Close modal
      document.querySelector('.fixed').remove();
      
      Utils.showToast('Kayıt başarıyla silindi', 'success');
    }
  } catch (error) {
    console.error('Error deleting record:', error);
    Utils.showToast('Kayıt silinirken hata oluştu', 'error');
  }
}

async function updateRecordAPI(record) {
  const apiCandidates = [
    'http://localhost:5003/api/cash-records',
    'http://localhost:5100/api/cash-records',
    window.location.origin + '/api/cash-records'
  ];

  for (const apiUrl of apiCandidates) {
    try {
      const response = await fetch(`${apiUrl}/${record.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });

      if (response.ok) {
        console.log('✅ Record updated via API:', apiUrl);
        return;
      }
    } catch (error) {
      console.warn(`❌ API update failed: ${apiUrl}`, error.message);
    }
  }
}

async function deleteRecordAPI(recordId) {
  const apiCandidates = [
    'http://localhost:5003/api/cash-records',
    'http://localhost:5100/api/cash-records',
    window.location.origin + '/api/cash-records'
  ];

  for (const apiUrl of apiCandidates) {
    try {
      const response = await fetch(`${apiUrl}/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Record deleted via API:', apiUrl);
        return;
      }
    } catch (error) {
      console.warn(`❌ API delete failed: ${apiUrl}`, error.message);
    }
  }
}

// Refresh cash data
function refreshCashData() {
  loadCashData();
  Utils.showToast('Veriler yenilendi', 'success');
}

// Export cash data
function exportCashData() {
  if (filteredRecords.length === 0) {
    Utils.showToast('Dışa aktarılacak veri bulunamadı', 'warning');
    return;
  }

  // Prepare CSV data
  const headers = ['Tarih', 'Saat', 'İşlem Türü', 'Kayıt Türü', 'Hasta', 'Tutar', 'Açıklama'];
  const csvData = [
    headers.join(','),
    ...filteredRecords.map(record => [
      formatDate(record.date),
      formatTime(record.date),
      record.transactionType === 'income' ? 'Gelir' : 'Gider',
      getRecordTypeLabel(record.recordType),
      record.patientName || '',
      record.amount,
      record.description || ''
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `kasa-kayitlari-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  Utils.showToast('Veriler başarıyla dışa aktarıldı', 'success');
}

// Data source console notice
(function () {
  function consoleSourceNotice() {
    let lsCount = 0;
    try {
      lsCount = (JSON.parse(localStorage.getItem('cashRecords') || '[]') || []).length;
    } catch (e) {
      lsCount = 0;
    }

    const candidates = [
      'http://localhost:5003/api/cash-records?limit=1',
      'http://localhost:5100/api/cash-records?limit=1',
      window.location.origin + '/api/cash-records?limit=1'
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const tryFetch = async () => {
      for (const url of candidates) {
        try {
          const res = await fetch(url, { mode: 'cors', signal: controller.signal });
          if (!res.ok) continue;
          const json = await res.json();
          const sampleCount = Array.isArray(json && json.data) ? json.data.length : 0;
          console.info('💾 Kasa veri kaynağı: DB', { url, sampleCount });
          clearTimeout(timeout);
          return true;
        } catch (err) {
          // try next candidate
        }
      }
      clearTimeout(timeout);
      console.warn('📦 Kasa veri kaynağı: localStorage', {
        key: 'cashRecords',
        count: lsCount,
        note: 'DB erişilemedi veya CORS engeli'
      });
      return false;
    };

    tryFetch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', consoleSourceNotice);
  } else {
    consoleSourceNotice();
  }
})();




// Patient search functionality
let allPatients = [];

function initializePatientSearch() {
  const patientInput = document.getElementById('patientSelect');
  const resultsContainer = document.getElementById('patientSearchResults');
  
  if (!patientInput || !resultsContainer) return;
  
  // Load patients data
  loadPatients();
  
  // Add event listeners
  patientInput.addEventListener('input', Utils.debounce(handlePatientSearch, 300));
  patientInput.addEventListener('focus', handlePatientSearch);
  
  // Hide results when clicking outside
  document.addEventListener('click', function(event) {
    if (!patientInput.contains(event.target) && !resultsContainer.contains(event.target)) {
      resultsContainer.classList.add('hidden');
    }
  });
}

async function loadPatients() {
  const apiCandidates = [
    'http://localhost:5003/api/patients',
    'http://localhost:5100/api/patients',
    window.location.origin + '/api/patients'
  ];

  for (const apiUrl of apiCandidates) {
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        
        // Fix: Extract patients from the correct nested structure
        let patients = null;
        if (data.success && data.data && data.data.data && Array.isArray(data.data.data)) {
          // New API format: { success: true, data: { data: [...], meta: {...} } }
          patients = data.data.data;
        } else if (data.success && data.data && Array.isArray(data.data)) {
          // Legacy format: { success: true, data: [...] }
          patients = data.data;
        } else if (Array.isArray(data)) {
          // Direct array response
          patients = data;
        }
        
        if (Array.isArray(patients)) {
          allPatients = patients;
          console.log('✅ Patients loaded from:', apiUrl, `(${allPatients.length} patients)`);
          return;
        }
      }
    } catch (error) {
      console.warn(`❌ Failed to load patients from: ${apiUrl}`, error.message);
    }
  }
  
  console.warn('Failed to load patients from all API endpoints, using fallback');
  allPatients = [];
}

function handlePatientSearch() {
  const patientInput = document.getElementById('patientSelect');
  const resultsContainer = document.getElementById('patientSearchResults');
  const query = patientInput.value.trim().toLowerCase();
  
  if (query.length < 2) {
    resultsContainer.classList.add('hidden');
    return;
  }
  
  // Filter patients based on search query
  const filteredPatients = allPatients.filter(patient => {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
    const tcNumber = (patient.tcNumber || '').toString();
    const phone = (patient.phone || '').toString();
    
    return fullName.includes(query) || 
           tcNumber.includes(query) || 
           phone.includes(query);
  }).slice(0, 10); // Limit to 10 results
  
  displayPatientResults(filteredPatients);
}

function displayPatientResults(patients) {
  const resultsContainer = document.getElementById('patientSearchResults');
  
  if (patients.length === 0) {
    resultsContainer.innerHTML = '<div class="p-3 text-gray-500 text-sm">Hasta bulunamadı</div>';
    resultsContainer.classList.remove('hidden');
    return;
  }
  
  const resultsHTML = patients.map(patient => {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    const displayInfo = [];
    
    if (patient.tcNumber) displayInfo.push(`TC: ${patient.tcNumber}`);
    if (patient.phone) displayInfo.push(`Tel: ${patient.phone}`);
    
    return `
      <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0" 
           onclick="selectPatient('${patient.id}', '${fullName}')">
        <div class="font-medium text-gray-900">${fullName}</div>
        ${displayInfo.length > 0 ? `<div class="text-sm text-gray-500">${displayInfo.join(' • ')}</div>` : ''}
      </div>
    `;
  }).join('');
  
  resultsContainer.innerHTML = resultsHTML;
  resultsContainer.classList.remove('hidden');
}

function selectPatient(patientId, patientName) {
  const patientInput = document.getElementById('patientSelect');
  const resultsContainer = document.getElementById('patientSearchResults');
  
  patientInput.value = patientName;
  patientInput.setAttribute('data-patient-id', patientId);
  resultsContainer.classList.add('hidden');
}

// Helper functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR');
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function getRecordTypeLabel(recordType) {
  const labels = {
    'kaparo': 'Kaparo',
    'kalip': 'Kalıp',
    'teslimat': 'Teslimat',
    'pil': 'Pil',
    'filtre': 'Filtre',
    'tamir': 'Tamir',
    'diger': 'Diğer'
  };
  return labels[recordType] || recordType;
}

// Set transaction type for new record form
function setTransactionType(type) {
  // Update button states
  const incomeBtn = document.getElementById('incomeBtn');
  const expenseBtn = document.getElementById('expenseBtn');
  
  if (incomeBtn && expenseBtn) {
    incomeBtn.classList.remove('bg-green-600', 'text-white');
    incomeBtn.classList.add('bg-white', 'text-green-600', 'border-green-600');
    
    expenseBtn.classList.remove('bg-red-600', 'text-white');
    expenseBtn.classList.add('bg-white', 'text-red-600', 'border-red-600');
    
    if (type === 'income') {
      incomeBtn.classList.remove('bg-white', 'text-green-600', 'border-green-600');
      incomeBtn.classList.add('bg-green-600', 'text-white');
    } else if (type === 'expense') {
      expenseBtn.classList.remove('bg-white', 'text-red-600', 'border-red-600');
      expenseBtn.classList.add('bg-red-600', 'text-white');
    }
  }
  
  // Set hidden input value
  const transactionTypeInput = document.getElementById('transactionType');
  if (transactionTypeInput) {
    transactionTypeInput.value = type;
  }

  // Show/hide record type sections based on transaction type
  const incomeTypesSection = document.getElementById('incomeRecordTypes');
  const expenseTypesSection = document.getElementById('expenseRecordTypes');
  
  if (incomeTypesSection && expenseTypesSection) {
    if (type === 'income') {
      incomeTypesSection.parentElement.style.display = 'block';
      expenseTypesSection.parentElement.style.display = 'none';
    } else if (type === 'expense') {
      incomeTypesSection.parentElement.style.display = 'none';
      expenseTypesSection.parentElement.style.display = 'block';
    } else {
      // If no type selected, hide both
      incomeTypesSection.parentElement.style.display = 'none';
      expenseTypesSection.parentElement.style.display = 'none';
    }
  }
}

// Add new record type
function addRecordType() {
  const input = document.getElementById('newRecordType');
  const transactionTypeInput = document.getElementById('transactionType');
  const newType = input.value.trim();
  
  if (!newType) {
    Utils.showToast('Lütfen kayıt türü adını girin', 'error');
    return;
  }
  
  if (!transactionTypeInput.value) {
    Utils.showToast('Önce işlem türünü (Gelir/Gider) seçin', 'error');
    return;
  }
  
  const category = transactionTypeInput.value; // 'income' or 'expense'
  
  // Check if already exists
  if (recordTypes[category].includes(newType)) {
    Utils.showToast('Bu kayıt türü zaten mevcut', 'error');
    return;
  }
  
  // Add to array
  recordTypes[category].push(newType);
  
  // Save to localStorage
  localStorage.setItem(category + 'RecordTypes', JSON.stringify(recordTypes[category]));
  
  // Clear input
  input.value = '';
  
  // Re-render
  renderRecordTypes();
  
  Utils.showToast('Kayıt türü eklendi', 'success');
}

// Render record type labels
function renderRecordTypes() {
  const incomeContainer = document.getElementById('incomeRecordTypes');
  const expenseContainer = document.getElementById('expenseRecordTypes');
  
  if (!incomeContainer || !expenseContainer) return;
  
  // Render income types
  incomeContainer.innerHTML = '';
  recordTypes.income.forEach(type => {
    const label = createRecordTypeLabel(type, 'income');
    incomeContainer.appendChild(label);
  });
  
  // Render expense types
  expenseContainer.innerHTML = '';
  recordTypes.expense.forEach(type => {
    const label = createRecordTypeLabel(type, 'expense');
    expenseContainer.appendChild(label);
  });
}

// Create record type label element
function createRecordTypeLabel(type, category) {
  const label = document.createElement('div');
  label.className = `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-all ${
    category === 'income' 
      ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300' 
      : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
  }`;
  
  label.innerHTML = `
    <span onclick="selectRecordType('${type}')">${type}</span>
    <button onclick="removeRecordType('${type}', '${category}')" class="ml-2 text-gray-500 hover:text-red-600">
      <i class="fas fa-times text-xs"></i>
    </button>
  `;
  
  return label;
}

// Select record type
function selectRecordType(type) {
  const recordTypeInput = document.getElementById('recordType');
  const errorDiv = document.getElementById('recordTypeError');
  
  if (recordTypeInput) {
    recordTypeInput.value = type;
    errorDiv.classList.add('hidden');
    
    // Visual feedback - highlight selected
    document.querySelectorAll('#incomeRecordTypes > div, #expenseRecordTypes > div').forEach(el => {
      el.classList.remove('ring-2', 'ring-blue-500');
    });
    
    event.target.closest('div').classList.add('ring-2', 'ring-blue-500');
    
    Utils.showToast(`"${type}" seçildi`, 'success');
  }
}

// Remove record type
function removeRecordType(type, category) {
  if (confirm(`"${type}" kayıt türünü silmek istediğinizden emin misiniz?`)) {
    recordTypes[category] = recordTypes[category].filter(t => t !== type);
    localStorage.setItem(category + 'RecordTypes', JSON.stringify(recordTypes[category]));
    renderRecordTypes();
    
    // Clear selection if this type was selected
    const recordTypeInput = document.getElementById('recordType');
    if (recordTypeInput && recordTypeInput.value === type) {
      recordTypeInput.value = '';
    }
    
    Utils.showToast('Kayıt türü silindi', 'success');
  }
}

// Submit new cashflow record
async function submitCashflowRecord(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  
  const record = {
    id: 'payment_' + Math.random().toString(36).substr(2, 8),
    date: new Date().toISOString(),
    transactionType: formData.get('transactionType'),
    recordType: formData.get('recordType'),
    patientName: formData.get('patientName') || '',
    amount: parseFloat(formData.get('amount')),
    description: formData.get('description') || ''
  };

  // Validate required fields
  if (!record.transactionType) {
    Utils.showToast('Lütfen işlem türünü seçin', 'error');
    return;
  }
  
  if (!record.recordType) {
    Utils.showToast('Lütfen kayıt türünü seçin', 'error');
    return;
  }
  
  if (!record.amount || record.amount <= 0) {
    Utils.showToast('Lütfen geçerli bir tutar girin', 'error');
    return;
  }

  try {
    // Add to local array
    allCashRecords.unshift(record);
    
    // Update localStorage
    localStorage.setItem('cashRecords', JSON.stringify(allCashRecords));
    
    // Try to save via API
    await saveRecordAPI(record);
    
    // 🆕 SALES HISTORY INTEGRATION: Create sales record if patient is selected and transaction is income
    const selectedPatientId = document.getElementById('selectedPatientId')?.value;
    if (selectedPatientId && record.transactionType === 'income') {
      try {
        await createSalesHistoryRecord(selectedPatientId, record);
        console.log('✅ Sales history record created successfully');
      } catch (salesError) {
        console.warn('⚠️ Failed to create sales history record:', salesError);
        // Don't block the cash record creation if sales history fails
      }
    }

    // 🆕 TIMELINE INTEGRATION: Create timeline entry if patient is selected
    if (selectedPatientId) {
      try {
        await createTimelineEntry(selectedPatientId, record);
        console.log('✅ Timeline entry created successfully');
      } catch (timelineError) {
        console.warn('⚠️ Failed to create timeline entry:', timelineError);
        // Don't block the cash record creation if timeline fails
      }
    }

    // 🆕 ACTIVITY LOG INTEGRATION: Log the cash record activity
    try {
      if (window.ActivityLogger) {
        await window.ActivityLogger.logCashRecordCreated(record.id, record.transactionType, record.amount, {
          recordType: record.recordType,
          description: record.description,
          patientId: selectedPatientId
        });
      }
    } catch (activityError) {
      console.warn('⚠️ Failed to log cash activity:', activityError);
      // Don't block the cash record creation if activity logging fails
    }
    
    // Refresh display
    applyFilters();
    updateStats();
    
    // Close modal and reset form
    document.getElementById('cashRegisterModal').classList.add('hidden');
    form.reset();
    document.getElementById('transactionType').value = '';
    
    // Reset transaction type buttons
    const incomeBtn = document.getElementById('incomeBtn');
    const expenseBtn = document.getElementById('expenseBtn');
    if (incomeBtn && expenseBtn) {
      incomeBtn.classList.remove('bg-green-600', 'text-white');
      incomeBtn.classList.add('bg-white', 'text-green-600', 'border-green-600');
      expenseBtn.classList.remove('bg-red-600', 'text-white');
      expenseBtn.classList.add('bg-white', 'text-red-600', 'border-red-600');
    }
    
    Utils.showToast('Kayıt başarıyla eklendi', 'success');
    
  } catch (error) {
    console.error('Error saving record:', error);
    Utils.showToast('Kayıt eklenirken hata oluştu', 'error');
  }
}

// 🆕 NEW FUNCTION: Create sales history record for cash transactions
async function createSalesHistoryRecord(patientId, cashRecord) {
  try {
    // Create sales log entry using the generated API client
    const salesLogData = {
      patient_id: patientId,
      sale_id: cashRecord.id,
      amount: cashRecord.amount,
      notes: `${cashRecord.recordType} - ${cashRecord.description}`,
      timestamp: cashRecord.date,
      user_name: localStorage.getItem('currentUser') || 'Sistem'
    };

    const result = await api.salesCreateSalesLog({ data: salesLogData });
    console.log('📝 Sales history record created:', result);
    return result;

  } catch (error) {
    console.error('❌ Error creating sales history record:', error);
    throw error;
  }
}

/**
 * 🆕 NEW FUNCTION: Create timeline entry for cash transactions
 */
async function createTimelineEntry(patientId, record) {
  try {
    const timelineData = {
      type: 'cash_transaction',
      title: record.transactionType === 'income' ? 'Gelir Kaydı' : 'Gider Kaydı',
      description: `${record.recordType} - ${record.amount.toFixed(2)} TL ${record.description ? '- ' + record.description : ''}`,
      category: 'financial',
      icon: record.transactionType === 'income' ? 'fa-plus-circle' : 'fa-minus-circle',
      color: record.transactionType === 'income' ? 'green' : 'red',
      details: {
        cashRecordId: record.id,
        transactionType: record.transactionType,
        recordType: record.recordType,
        amount: record.amount,
        description: record.description
      }
    };

    // Try multiple API endpoints for timeline creation
    const apiCandidates = [
      `http://localhost:5003/api/patients/${patientId}/timeline`,
      `http://localhost:5100/api/patients/${patientId}/timeline`,
      `${window.location.origin}/api/patients/${patientId}/timeline`
    ];

    for (const apiUrl of apiCandidates) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(timelineData)
        });

        if (response.ok) {
          console.log('✅ Timeline entry created via API:', apiUrl);
          return;
        }
      } catch (error) {
        console.warn(`❌ Timeline API save error: ${apiUrl}`, error.message);
      }
    }
    
    console.warn('⚠️ All timeline API save attempts failed');

  } catch (error) {
    console.error('❌ Error creating timeline entry:', error);
  }
}

// Save record via API
async function saveRecordAPI(record) {
  const apiCandidates = [
    'http://localhost:5003/api/cash-records',
    'http://localhost:5100/api/cash-records',
    window.location.origin + '/api/cash-records'
  ];

  for (const apiUrl of apiCandidates) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });

      if (response.ok) {
        console.log('✅ Record saved via API:', apiUrl);
        return;
      }
    } catch (error) {
      console.warn(`❌ API save error: ${apiUrl}`, error.message);
    }
  }
  
  console.warn('⚠️ All API save attempts failed, record saved to localStorage only');
}

// Record type management
let recordTypes = {
  income: JSON.parse(localStorage.getItem('incomeRecordTypes') || '["Kaparo", "Teslimat", "Ödeme"]'),
  expense: JSON.parse(localStorage.getItem('expenseRecordTypes') || '["Kalıp", "Pil", "Filtre", "Tamir", "Diğer"]')
};

// Initialize record types on page load
document.addEventListener('DOMContentLoaded', function() {
  renderRecordTypes();
  
  // Initially hide record type sections until a transaction type is selected
  const incomeTypesSection = document.getElementById('incomeRecordTypes');
  const expenseTypesSection = document.getElementById('expenseRecordTypes');
  
  if (incomeTypesSection && expenseTypesSection) {
    incomeTypesSection.parentElement.style.display = 'none';
    expenseTypesSection.parentElement.style.display = 'none';
  }
});