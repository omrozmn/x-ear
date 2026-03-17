export class BranchesSettings {
  constructor() {
    this.storeKey = 'settings.branches.list';
    this.branches = JSON.parse(localStorage.getItem(this.storeKey) || '[]');
    if (!Array.isArray(this.branches)) this.branches = [];
  }
  render() {
    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Şube Listesi</h2>
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Şube Listesi</h3>
          <button id="openAddBranchModalBtn" class="btn btn-primary">
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
            </svg>
            Yeni Şube
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="branchesGrid">
          ${this.branches.map(b => `
            <div class="card p-6">
              <h4 class="text-lg font-semibold text-gray-900 mb-2">${b.name} (${b.code})</h4>
              <p class="text-sm text-gray-600">Telefon: ${b.phone || 'N/A'}</p>
              <p class="text-sm text-gray-600 mb-4">Adres: ${b.address || 'N/A'}</p>
              <div class="flex justify-end gap-2">
                <button class="text-indigo-600 hover:text-indigo-900" data-edit-branch="${b.code}">Düzenle</button>
                <button class="text-red-600 hover:text-red-900" data-remove-branch="${b.code}">Sil</button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Add Branch Modal -->
        <div id="addBranchModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center hidden">
          <div class="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 class="text-lg font-semibold mb-4">Yeni Şube Ekle</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Şube Adı</label>
                <input id="newBranchNameInput" type="text" class="form-input mt-1" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Kod</label>
                <input id="newBranchCodeInput" type="text" class="form-input mt-1" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Telefon</label>
                <input id="newBranchPhoneInput" type="tel" class="form-input mt-1" placeholder="Opsiyonel" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Adres</label>
                <textarea id="newBranchAddressInput" class="form-input mt-1" rows="2" placeholder="Opsiyonel"></textarea>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button id="closeAddBranchModalBtn" class="btn btn-secondary">İptal</button>
              <button id="confirmAddBranchBtn" class="btn btn-primary">Ekle</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  bindEvents() {
    const openAddBranchModalBtn = document.getElementById('openAddBranchModalBtn');
    const addBranchModal = document.getElementById('addBranchModal');
    const closeAddBranchModalBtn = document.getElementById('closeAddBranchModalBtn');
    const confirmAddBranchBtn = document.getElementById('confirmAddBranchBtn');

    if (openAddBranchModalBtn) openAddBranchModalBtn.addEventListener('click', () => this.openModal(addBranchModal));
    if (closeAddBranchModalBtn) closeAddBranchModalBtn.addEventListener('click', () => this.closeModal(addBranchModal));
    if (addBranchModal) addBranchModal.addEventListener('click', (e) => { if (e.target === addBranchModal) this.closeModal(addBranchModal); });
    if (confirmAddBranchBtn) confirmAddBranchBtn.addEventListener('click', () => this.addBranch());

    document.querySelectorAll('[data-remove-branch]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.target.getAttribute('data-remove-branch');
        this.removeBranch(code);
      });
    });
    // Edit branch functionality would go here, possibly opening a similar modal with populated data
  }

  openModal(el) { if (el) el.classList.remove('hidden'); }
  closeModal(el) { if (el) el.classList.add('hidden'); }

  addBranch() {
    const name = document.getElementById('newBranchNameInput')?.value?.trim();
    const code = document.getElementById('newBranchCodeInput')?.value?.trim();
    const phone = document.getElementById('newBranchPhoneInput')?.value?.trim() || '';
    const address = document.getElementById('newBranchAddressInput')?.value?.trim() || '';

    if (!name) return alert('Şube adı zorunlu.');
    if (!code) return alert('Kod zorunlu.');
    if (this.branches.some(b => b.code === code)) return alert('Bu kod zaten kayıtlı.');

    this.branches.push({ name, code, phone, address });
    this.persistBranches();
    this.refresh();
    this.closeModal(document.getElementById('addBranchModal'));

    // Clear inputs after adding
    document.getElementById('newBranchNameInput').value = '';
    document.getElementById('newBranchCodeInput').value = '';
    document.getElementById('newBranchPhoneInput').value = '';
    document.getElementById('newBranchAddressInput').value = '';
  }

  removeBranch(code) {
    this.branches = this.branches.filter(x => x.code !== code);
    this.persistBranches();
    this.refresh();
  }

  persistBranches() {
    localStorage.setItem(this.storeKey, JSON.stringify(this.branches));
  }

  refresh() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;
    container.innerHTML = this.render();
    this.bindEvents();
  }
}
