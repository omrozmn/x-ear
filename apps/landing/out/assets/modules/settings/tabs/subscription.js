export class SubscriptionSettings {
  constructor() {
    this.subscription = { plan: 'Altın', daysRemaining: 250 };
    this.usage = { patientRecordCount: 750, maxPatientRecords: 1000, eFaturaKontor: 120, smsKredi: 450 };
    this.addons = [
      { id: 'sgk', name: 'SGK Entegrasyonu', enabled: true },
      { id: 'uts', name: 'ÜTS Entegrasyonu', enabled: false },
    ];
  }

  render() {
    const s = this.subscription;
    const u = this.usage;

    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Abonelik</h2>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Aktif Abonelik -->
          <div class="card p-6 lg:col-span-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Aktif Abonelik</h3>
            <div id="subscription-details" class="space-y-4">
              <div>
                <p class="text-sm font-medium text-gray-500">Mevcut Paket</p>
                <p class="text-2xl font-bold text-gray-900" id="current-plan">${s.plan}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Kalan Gün</p>
                <p class="text-2xl font-bold text-gray-900" id="days-remaining">${s.daysRemaining}</p>
              </div>
            </div>
          </div>

          <!-- Kullanım Detayları -->
          <div class="card p-6 lg:col-span-2">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Kullanım Detayları</h3>
            <div id="usage-details" class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p class="text-sm font-medium text-gray-500">Hasta Kayıtları</p>
                <p class="text-lg font-semibold text-gray-900">${u.patientRecordCount} / ${u.maxPatientRecords}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">E-Fatura Kontör</p>
                <p class="text-lg font-semibold text-gray-900">${u.eFaturaKontor}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">SMS Kredisi</p>
                <p class="text-lg font-semibold text-gray-900">${u.smsKredi}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Abonelik Yönetimi -->
        <div class="card p-6 mt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Abonelik Yönetimi</h3>
          <div class="flex space-x-4">
            <button id="openChangePackageModalBtn" class="bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">Paket Değiştir</button>
            <button id="openBuyKontorModalBtn" class="bg-green-600 text-white py-2 px-4 rounded text-sm hover:bg-green-700">Kontör Satın Al</button>
          </div>
        </div>

        <!-- Eklentiler -->
        <div class="card p-6 mt-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Eklentiler</h3>
          <div class="space-y-4" id="addons-container">
            ${this.addons.map(addon => `
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-700">${addon.name}</label>
                </div>
                <label class="switch">
                  <input type="checkbox" data-addon-id="${addon.id}" ${addon.enabled ? 'checked' : ''} />
                  <span class="slider"></span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Paket Değiştir Modal -->
        <div id="changePackageModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center hidden">
          <div class="bg-white p-4 rounded-lg w-full max-w-md">
            <h3 class="text-lg font-semibold mb-3">Paketi Değiştir</h3>
            <div class="space-y-2">
              ${['Gümüş','Altın','Platin'].map(p => `
                <button class="btn w-full text-left" data-package="${p}">${p} Paketine Geç</button>
              `).join('')}
            </div>
            <div class="mt-4 text-right">
              <button id="closeChangePackageModalBtn" class="btn btn-secondary">Kapat</button>
            </div>
          </div>
        </div>

        <!-- Kontör Satın Al Modal -->
        <div id="buyKontorModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center hidden">
          <div class="bg-white p-4 rounded-lg w-full max-w-md">
            <h3 class="text-lg font-semibold mb-3">Kontör Satın Al</h3>
            <div>
              <label class="block text-sm font-medium text-gray-700">Miktar</label>
              <input id="kontorAmountInput" type="number" min="1" class="form-input w-full" />
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button id="closeBuyKontorModalBtn" class="btn btn-secondary">İptal</button>
              <button id="confirmBuyKontorBtn" class="btn btn-primary">Satın Al</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const openChangePackageModalBtn = document.getElementById('openChangePackageModalBtn');
    const openBuyKontorModalBtn = document.getElementById('openBuyKontorModalBtn');
    const changePackageModal = document.getElementById('changePackageModal');
    const buyKontorModal = document.getElementById('buyKontorModal');

    // Open modals
    if (openChangePackageModalBtn) openChangePackageModalBtn.addEventListener('click', () => this.openModal(changePackageModal));
    if (openBuyKontorModalBtn) openBuyKontorModalBtn.addEventListener('click', () => this.openModal(buyKontorModal));

    // Close modals
    const closeChangePackageModalBtn = document.getElementById('closeChangePackageModalBtn');
    const closeBuyKontorModalBtn = document.getElementById('closeBuyKontorModalBtn');
    if (closeChangePackageModalBtn) closeChangePackageModalBtn.addEventListener('click', () => this.closeModal(changePackageModal));
    if (closeBuyKontorModalBtn) closeBuyKontorModalBtn.addEventListener('click', () => this.closeModal(buyKontorModal));
    
    // Close modals on backdrop click
    if (changePackageModal) changePackageModal.addEventListener('click', (e) => { if (e.target === changePackageModal) this.closeModal(changePackageModal); });
    if (buyKontorModal) buyKontorModal.addEventListener('click', (e) => { if (e.target === buyKontorModal) this.closeModal(buyKontorModal); });

    // Change Package logic
    document.querySelectorAll('#changePackageModal [data-package]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pkg = btn.getAttribute('data-package');
        this.changePackage(pkg);
        this.closeModal(changePackageModal);
      });
    });

    // Buy Kontor logic
    const confirmBuyKontorBtn = document.getElementById('confirmBuyKontorBtn');
    if (confirmBuyKontorBtn) confirmBuyKontorBtn.addEventListener('click', () => this.buyKontor());

    // Addon toggles
    document.querySelectorAll('[data-addon-id]').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = input.getAttribute('data-addon-id');
        const enabled = e.target.checked;
        this.toggleAddon(id, enabled);
      });
    });
  }

  openModal(el) { if (el) el.classList.remove('hidden'); }
  closeModal(el) { if (el) el.classList.add('hidden'); }

  changePackage(packageName) {
    this.subscription.plan = packageName;
    // Update UI immediately
    const el = document.getElementById('current-plan');
    if (el) el.textContent = packageName;
    alert(`${packageName} paketine geçildi.`);
    this.persistSubscription();
  }

  buyKontor() {
    const amount = parseInt(document.getElementById('kontorAmountInput')?.value || '0', 10);
    if (!amount || amount <= 0) return alert('Lütfen geçerli bir miktar girin.');
    this.usage.eFaturaKontor += amount;
    this.persistUsage();
    this.refresh(); // Re-render usage details
    this.closeModal(document.getElementById('buyKontorModal'));
    alert(`${amount} kontör satın alındı.`);
  }

  toggleAddon(addonId, enabled) {
    const a = this.addons.find(x => x.id === addonId);
    if (a) a.enabled = enabled;
    this.persistAddons();
  }

  persistSubscription() {
    localStorage.setItem('settings.subscription.plan', JSON.stringify(this.subscription));
  }

  persistUsage() {
    localStorage.setItem('settings.subscription.usage', JSON.stringify(this.usage));
  }

  persistAddons() {
    localStorage.setItem('settings.subscription.addons', JSON.stringify(this.addons));
  }

  refresh() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;
    container.innerHTML = this.render();
    this.bindEvents();
  }
}
