export class PatientSettings {
  constructor() {
    this.assignmentReasonsKey = 'settings.patient.assignmentReasons';
    this.assignmentReasons = JSON.parse(localStorage.getItem(this.assignmentReasonsKey) || '[]');
    if (!Array.isArray(this.assignmentReasons)) this.assignmentReasons = [];

    this.pricingSettingsKey = 'settings.patient.pricing';
    this.pricingSettings = JSON.parse(localStorage.getItem(this.pricingSettingsKey) || '{}');
    this.pricingSettings = {
      allowEditListPrice: this.pricingSettings.allowEditListPrice !== undefined ? this.pricingSettings.allowEditListPrice : true,
      allowPercentageDiscount: this.pricingSettings.allowPercentageDiscount !== undefined ? this.pricingSettings.allowPercentageDiscount : true,
      allowFixedDiscount: this.pricingSettings.allowFixedDiscount !== undefined ? this.pricingSettings.allowFixedDiscount : true,
      autoApplySgkDiscount: this.pricingSettings.autoApplySgkDiscount !== undefined ? this.pricingSettings.autoApplySgkDiscount : true,
    };
  }

  render() {
    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Hasta Ayarları</h2>
        
        <!-- Cihaz Atama Nedenleri Section -->
        <div class="card p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">Cihaz Atama Nedenleri</h3>
            <button id="openAddReasonModalBtn" class="btn btn-primary">
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
              </svg>
              Yeni Neden Ekle
            </button>
          </div>
          <div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <h4 class="text-blue-800 font-medium">Bilgi</h4>
                <p class="text-blue-700 text-sm mt-1">Bu bölümde cihaz atama nedenlerini yönetebilirsiniz. Sistem esnekliği için farklı atama nedenleri ekleyebilir veya mevcut olanları düzenleyebilirsiniz.</p>
              </div>
            </div>
          </div>
          <div class="space-y-3" id="assignmentReasonsList">
            ${this.assignmentReasons.map(reason => `
              <div class="flex items-center justify-between p-2 border rounded-md">
                <span>${reason}</span>
                <button class="btn" data-remove-reason="${reason}">Sil</button>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Pricing Settings Section -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">Fiyatlandırma Ayarları</h3>
          </div>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <label class="text-sm font-medium text-gray-700">Liste Fiyatını Düzenlemeye İzin Ver</label>
                <p class="text-xs text-gray-500">Cihaz atama sırasında liste fiyatının düzenlenmesine izin ver</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="allowEditListPriceToggle" ${this.pricingSettings.allowEditListPrice ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>
            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <label class="text-sm font-medium text-gray-700">Yüzde İndirimine İzin Ver</label>
                <p class="text-xs text-gray-500">Cihaz satışında yüzde bazlı indirim uygulamaya izin ver</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="allowPercentageDiscountToggle" ${this.pricingSettings.allowPercentageDiscount ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>
            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <label class="text-sm font-medium text-gray-700">Sabit İndirime İzin Ver</label>
                <p class="text-xs text-gray-500">Cihaz satışında sabit tutarda indirim uygulamaya izin ver</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="allowFixedDiscountToggle" ${this.pricingSettings.allowFixedDiscount ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>
            <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <label class="text-sm font-medium text-gray-700">SGK İndirimini Otomatik Uygula</label>
                <p class="text-xs text-gray-500">SGK kapsamında olan hastalara indirimi otomatik olarak uygula</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="autoApplySgkDiscountToggle" ${this.pricingSettings.autoApplySgkDiscount ? 'checked' : ''} />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add Reason Modal -->
      <div id="addReasonModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center hidden">
        <div class="bg-white p-4 rounded-lg w-full max-w-md">
          <h3 class="text-lg font-semibold mb-3">Yeni Neden Ekle</h3>
          <div>
            <label class="block text-sm text-gray-700">Neden Adı</label>
            <input id="newReasonInput" type="text" class="input w-full" />
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button id="closeAddReasonModal" class="btn">İptal</button>
            <button id="confirmAddReason" class="btn btn-primary">Ekle</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Assignment Reasons
    const addReasonBtn = document.getElementById('openAddReasonModalBtn');
    const addReasonModal = document.getElementById('addReasonModal');
    const closeAddReasonBtn = document.getElementById('closeAddReasonModal');
    const confirmAddReasonBtn = document.getElementById('confirmAddReason');

    if (addReasonBtn) addReasonBtn.addEventListener('click', () => this.openModal(addReasonModal));
    if (closeAddReasonBtn) closeAddReasonBtn.addEventListener('click', () => this.closeModal(addReasonModal));
    if (addReasonModal) addReasonModal.addEventListener('click', (e) => { if (e.target === addReasonModal) this.closeModal(addReasonModal); });
    if (confirmAddReasonBtn) confirmAddReasonBtn.addEventListener('click', () => this.addAssignmentReason());

    document.querySelectorAll('[data-remove-reason]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reason = e.target.getAttribute('data-remove-reason');
        this.removeAssignmentReason(reason);
      });
    });

    // Pricing Settings
    this.bindPricingToggle('allowEditListPriceToggle', 'allowEditListPrice');
    this.bindPricingToggle('allowPercentageDiscountToggle', 'allowPercentageDiscount');
    this.bindPricingToggle('allowFixedDiscountToggle', 'allowFixedDiscount');
    this.bindPricingToggle('autoApplySgkDiscountToggle', 'autoApplySgkDiscount');
  }

  openModal(el) { if (el) el.classList.remove('hidden'); }
  closeModal(el) { if (el) el.classList.add('hidden'); }

  addAssignmentReason() {
    const input = document.getElementById('newReasonInput');
    const reason = input?.value?.trim();
    if (!reason) return alert('Neden adı boş olamaz.');
    if (this.assignmentReasons.includes(reason)) return alert('Bu neden zaten mevcut.');

    this.assignmentReasons.push(reason);
    this.persistAssignmentReasons();
    this.refresh();
    this.closeModal(document.getElementById('addReasonModal'));
  }

  removeAssignmentReason(reason) {
    this.assignmentReasons = this.assignmentReasons.filter(r => r !== reason);
    this.persistAssignmentReasons();
    this.refresh();
  }

  persistAssignmentReasons() {
    localStorage.setItem(this.assignmentReasonsKey, JSON.stringify(this.assignmentReasons));
  }

  bindPricingToggle(elementId, settingKey) {
    const toggle = document.getElementById(elementId);
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        this.pricingSettings[settingKey] = e.target.checked;
        this.persistPricingSettings();
        alert(`${settingKey} ayarı güncellendi.`);
      });
    }
  }

  persistPricingSettings() {
    localStorage.setItem(this.pricingSettingsKey, JSON.stringify(this.pricingSettings));
  }

  refresh() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;
    container.innerHTML = this.render();
    this.bindEvents();
  }
}
