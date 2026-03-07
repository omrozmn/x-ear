// Dashboard Cashflow Management JavaScript
// Global variables
let allPatients = [];
let allCashRecords = JSON.parse(localStorage.getItem('dashboardCashRecords') || '[]');

// Record types configuration
let recordTypes = {
  income: JSON.parse(localStorage.getItem('incomeRecordTypes') || '["Kaparo", "Teslimat", "Ödeme"]'),
  expense: JSON.parse(localStorage.getItem('expenseRecordTypes') || '["Kalıp", "Pil", "Filtre", "Tamir", "Diğer"]')
};

// Initialize patient search functionality
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

// Load patients from API
async function loadPatients() {
  const endpoints = [
    'http://localhost:5003/api/patients',
    'http://localhost:5100/api/patients',
    window.location.origin + '/api/patients'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Attempting to load patients from: ${endpoint}`);
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        // Ensure we have an array of patients
        allPatients = Array.isArray(data) ? data : (data.patients || []);
        console.log(`Successfully loaded ${allPatients.length} patients from ${endpoint}`);
        return;
      }
    } catch (error) {
      console.log(`Failed to load from ${endpoint}:`, error.message);
    }
  }
  
  console.warn('Could not load patients from any endpoint');
  allPatients = [];
}

function handlePatientSearch() {
  const patientInput = document.getElementById('patientSelect');
  const resultsContainer = document.getElementById('patientSearchResults');
  
  if (!patientInput || !resultsContainer) return;
  
  const query = patientInput.value.trim().toLowerCase();
  
  if (query.length < 1) {
    resultsContainer.classList.add('hidden');
    return;
  }
  
  // Ensure allPatients is an array before filtering
  const patientsArray = Array.isArray(allPatients) ? allPatients : [];
  
  // Filter patients based on search query
  const filteredPatients = patientsArray.filter(patient => {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
    const tcNumber = (patient.tcNumber || '').toString();
    const phone = (patient.phone || '').toString();
    
    return fullName.includes(query) || 
           tcNumber.includes(query) || 
           phone.includes(query);
  }).slice(0, 10); // Limit to 10 results
  
  displayPatientResults(filteredPatients);
}

// Display patient search results
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

// Select patient from search results
function selectPatient(patientId, patientName) {
  const patientInput = document.getElementById('patientSelect');
  const resultsContainer = document.getElementById('patientSearchResults');
  
  patientInput.value = patientName;
  patientInput.setAttribute('data-patient-id', patientId);
  resultsContainer.classList.add('hidden');
}

// Set transaction type
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
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast('Lütfen kayıt türü adını girin', 'error');
    } else {
      alert('Lütfen kayıt türü adını girin');
    }
    return;
  }
  
  if (!transactionTypeInput.value) {
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast('Önce işlem türünü (Gelir/Gider) seçin', 'error');
    } else {
      alert('Önce işlem türünü (Gelir/Gider) seçin');
    }
    return;
  }
  
  const category = transactionTypeInput.value; // 'income' or 'expense'
  
  // Check if already exists
  if (recordTypes[category].includes(newType)) {
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast('Bu kayıt türü zaten mevcut', 'error');
    } else {
      alert('Bu kayıt türü zaten mevcut');
    }
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
  
  if (typeof Utils !== 'undefined' && Utils.showToast) {
    Utils.showToast('Kayıt türü eklendi', 'success');
  }
}

// Render record types
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
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
    
    // Visual feedback - highlight selected
    document.querySelectorAll('#incomeRecordTypes > div, #expenseRecordTypes > div').forEach(el => {
      el.classList.remove('ring-2', 'ring-blue-500');
    });
    
    event.target.closest('div').classList.add('ring-2', 'ring-blue-500');
    
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast(`"${type}" seçildi`, 'success');
    }
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
    
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast('Kayıt türü silindi', 'success');
    }
  }
}

// Submit cashflow record
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
    localStorage.setItem('dashboardCashRecords', JSON.stringify(allCashRecords));
    
    // Try to save via API
    await saveRecordAPI(record);
    
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
      console.warn(`❌ API save failed: ${apiUrl}`, error.message);
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  renderRecordTypes();
  initializePatientSearch();
  
  // Initially hide record type sections until a transaction type is selected
  const incomeTypesSection = document.getElementById('incomeRecordTypes');
  const expenseTypesSection = document.getElementById('expenseRecordTypes');
  
  if (incomeTypesSection && expenseTypesSection) {
    incomeTypesSection.parentElement.style.display = 'none';
    expenseTypesSection.parentElement.style.display = 'none';
  }
});

// Apply filters and update display (placeholder functions for dashboard)
function applyFilters() {
  // This function would normally filter and display records
  // For dashboard, we'll just log that it was called
  console.log('applyFilters called - dashboard context');
}

function updateStats() {
  // This function would normally update statistics
  // For dashboard, we'll just log that it was called
  console.log('updateStats called - dashboard context');
}