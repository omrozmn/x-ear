export class TagsSettings {
  constructor() {
    this.acquisitionTypesKey = 'settings.etiket.acquisitionTypes';
    this.conversionStepsKey = 'settings.etiket.conversionSteps';

    this.acquisitionTypes = JSON.parse(localStorage.getItem(this.acquisitionTypesKey) || '[]');
    if (!Array.isArray(this.acquisitionTypes)) this.acquisitionTypes = [];

    this.conversionSteps = JSON.parse(localStorage.getItem(this.conversionStepsKey) || '[]');
    if (!Array.isArray(this.conversionSteps)) this.conversionSteps = [];
  }

  render() {
    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Etiket Yönetimi</h2>
        <div class="space-y-6">
          <!-- Edinilme Türü Section -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900">Edinilme Türü Seçenekleri</h3>
              <button id="openAddAcquisitionTypeModalBtn" class="btn btn-primary">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
                Yeni Ekle
              </button>
            </div>
            <div class="space-y-3" id="acquisitionTypesList">
              ${this.acquisitionTypes.map(type => `
                <div class="flex items-center justify-between p-2 border rounded-md">
                  <span>${type}</span>
                  <button class="btn" data-remove-acquisition-type="${type}">Sil</button>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Dönüşüm Adımı Section -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900">Dönüşüm Adımı Seçenekleri</h3>
              <button id="openAddConversionStepModalBtn" class="btn btn-primary">
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
                Yeni Ekle
              </button>
            </div>
            <div class="space-y-3" id="conversionStepsList">
              ${this.conversionSteps.map(step => `
                <div class="flex items-center justify-between p-2 border rounded-md">
                  <span>${step}</span>
                  <button class="btn" data-remove-conversion-step="${step}">Sil</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
          <button id="resetEtiketSettingsBtn" class="btn btn-secondary">Varsayılanlara Dön</button>
          <button id="saveEtiketSettingsBtn" class="btn btn-primary">Kaydet</button>
        </div>

        <!-- Add Acquisition Type Modal -->
        <div id="addAcquisitionTypeModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center hidden">
          <div class="bg-white p-4 rounded-lg w-full max-w-md">
            <h3 class="text-lg font-semibold mb-3">Yeni Edinilme Türü Ekle</h3>
            <div>
              <label class="block text-sm font-medium text-gray-700">Tür Adı</label>
              <input id="newAcquisitionTypeInput" type="text" class="input w-full" />
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button id="closeAddAcquisitionTypeModal" class="btn">İptal</button>
              <button id="confirmAddAcquisitionType" class="btn btn-primary">Ekle</button>
            </div>
          </div>
        </div>

        <!-- Add Conversion Step Modal -->
        <div id="addConversionStepModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center hidden">
          <div class="bg-white p-4 rounded-lg w-full max-w-md">
            <h3 class="text-lg font-semibold mb-3">Yeni Dönüşüm Adımı Ekle</h3>
            <div>
              <label class="block text-sm font-medium text-gray-700">Adım Adı</label>
              <input id="newConversionStepInput" type="text" class="input w-full" />
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button id="closeAddConversionStepModal" class="btn">İptal</button>
              <button id="confirmAddConversionStep" class="btn btn-primary">Ekle</button>
            </div>
          </div>
        </div>

      </div>
    `;
  }
  bindEvents() {
    // Acquisition Types
    const openAddAcquisitionTypeModalBtn = document.getElementById('openAddAcquisitionTypeModalBtn');
    const addAcquisitionTypeModal = document.getElementById('addAcquisitionTypeModal');
    const closeAddAcquisitionTypeModal = document.getElementById('closeAddAcquisitionTypeModal');
    const confirmAddAcquisitionType = document.getElementById('confirmAddAcquisitionType');

    if (openAddAcquisitionTypeModalBtn) openAddAcquisitionTypeModalBtn.addEventListener('click', () => this.openModal(addAcquisitionTypeModal));
    if (closeAddAcquisitionTypeModal) closeAddAcquisitionTypeModal.addEventListener('click', () => this.closeModal(addAcquisitionTypeModal));
    if (addAcquisitionTypeModal) addAcquisitionTypeModal.addEventListener('click', (e) => { if (e.target === addAcquisitionTypeModal) this.closeModal(addAcquisitionTypeModal); });
    if (confirmAddAcquisitionType) confirmAddAcquisitionType.addEventListener('click', () => this.addAcquisitionType());

    document.querySelectorAll('[data-remove-acquisition-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-remove-acquisition-type');
        this.removeAcquisitionType(type);
      });
    });

    // Conversion Steps
    const openAddConversionStepModalBtn = document.getElementById('openAddConversionStepModalBtn');
    const addConversionStepModal = document.getElementById('addConversionStepModal');
    const closeAddConversionStepModal = document.getElementById('closeAddConversionStepModal');
    const confirmAddConversionStep = document.getElementById('confirmAddConversionStep');

    if (openAddConversionStepModalBtn) openAddConversionStepModalBtn.addEventListener('click', () => this.openModal(addConversionStepModal));
    if (closeAddConversionStepModal) closeAddConversionStepModal.addEventListener('click', () => this.closeModal(addConversionStepModal));
    if (addConversionStepModal) addConversionStepModal.addEventListener('click', (e) => { if (e.target === addConversionStepModal) this.closeModal(addConversionStepModal); });
    if (confirmAddConversionStep) confirmAddConversionStep.addEventListener('click', () => this.addConversionStep());

    document.querySelectorAll('[data-remove-conversion-step]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const step = e.target.getAttribute('data-remove-conversion-step');
        this.removeConversionStep(step);
      });
    });

    // Global Save/Reset
    const saveBtn = document.getElementById('saveEtiketSettingsBtn');
    const resetBtn = document.getElementById('resetEtiketSettingsBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveEtiketSettings());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetEtiketSettings());
  }

  openModal(el) { if (el) el.classList.remove('hidden'); }
  closeModal(el) { if (el) el.classList.add('hidden'); }

  addAcquisitionType() {
    const input = document.getElementById('newAcquisitionTypeInput');
    const type = input?.value?.trim();
    if (!type) return alert('Edinilme türü adı boş olamaz.');
    if (this.acquisitionTypes.includes(type)) return alert('Bu edinilme türü zaten mevcut.');
    this.acquisitionTypes.push(type);
    this.persistAcquisitionTypes();
    this.refresh();
    this.closeModal(document.getElementById('addAcquisitionTypeModal'));
    input.value = '';
  }

  removeAcquisitionType(type) {
    this.acquisitionTypes = this.acquisitionTypes.filter(t => t !== type);
    this.persistAcquisitionTypes();
    this.refresh();
  }

  persistAcquisitionTypes() {
    localStorage.setItem(this.acquisitionTypesKey, JSON.stringify(this.acquisitionTypes));
  }

  addConversionStep() {
    const input = document.getElementById('newConversionStepInput');
    const step = input?.value?.trim();
    if (!step) return alert('Dönüşüm adımı adı boş olamaz.');
    if (this.conversionSteps.includes(step)) return alert('Bu dönüşüm adımı zaten mevcut.');
    this.conversionSteps.push(step);
    this.persistConversionSteps();
    this.refresh();
    this.closeModal(document.getElementById('addConversionStepModal'));
    input.value = '';
  }

  removeConversionStep(step) {
    this.conversionSteps = this.conversionSteps.filter(s => s !== step);
    this.persistConversionSteps();
    this.refresh();
  }

  persistConversionSteps() {
    localStorage.setItem(this.conversionStepsKey, JSON.stringify(this.conversionSteps));
  }

  saveEtiketSettings() {
    this.persistAcquisitionTypes();
    this.persistConversionSteps();
    alert('Etiket ayarları kaydedildi.');
  }

  resetEtiketSettings() {
    localStorage.removeItem(this.acquisitionTypesKey);
    localStorage.removeItem(this.conversionStepsKey);
    this.constructor(); // Re-initialize with defaults
    this.refresh();
    alert('Etiket ayarları sıfırlandı.');
  }

  refresh() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;
    container.innerHTML = this.render();
    this.bindEvents();
  }
}
