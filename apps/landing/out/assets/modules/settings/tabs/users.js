import * as api from '../../../api';
export class UsersSettings {
  constructor() {
    this.storeKey = 'settings.users.list';
    this.users = [];
    this.unauthorized = false;
    this.currentUser = null;
    this.isAdmin = false;

    // User types (managed in settings)
    this.userTypesKey = 'settings.users.types';
    this.userTypes = JSON.parse(localStorage.getItem(this.userTypesKey) || '[]');
    if (!Array.isArray(this.userTypes)) this.userTypes = [];
  }
  
  async loadFromApi() {
    try {
      // Load current user to determine admin rights
      const meRes = await getCurrentUser();
      if (meRes.ok) {
        const meBody = await meRes.json();
        if (meBody && meBody.success && meBody.data) {
          this.currentUser = meBody.data;
          this.isAdmin = (this.currentUser.role === 'admin');
        }
      }

      const res = await getUsers();
      if (res.status === 401 || res.status === 403) {
        this.unauthorized = true;
        return;
      }
      const body = await res.json();
      if (body && body.success && Array.isArray(body.data)) {
        // Map server shape to local expected shape
        this.users = body.data.map(u => ({
          name: u.fullName || u.username,
          email: u.email,
          role: u.role,
          branch: u.branch || '',
          lastLogin: u.lastLogin,
          id: u.id
        }));
        this.persistUsers();
      }
    } catch (e) {
      // network error — fallback to localStorage
      const stored = JSON.parse(localStorage.getItem(this.storeKey) || '[]');
      if (Array.isArray(stored)) this.users = stored;
    }
  }

  render() {
    if (this.unauthorized) {
      return `
        <div class="p-6 text-sm text-gray-600">Bu bölüme erişim yetkiniz yok.</div>`;
    }
    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Kullanıcı Listesi</h2>

        <!-- User Types -->
        <div class="card p-4 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Kullanıcı Tipleri</h3>
            ${this.isAdmin ? `<button id="openAddUserTypeModalBtn" class="btn btn-sm">Yeni Tip</button>` : ''}
          </div>
          <div id="userTypesList" class="space-y-2">
            ${this.userTypes.length ? this.userTypes.map(t => `
              <div class="flex items-center justify-between p-2 border rounded-md">
                <span>${t}</span>
                ${this.isAdmin ? `<button class="btn btn-sm" data-remove-type="${t}">Sil</button>` : ''}
              </div>
            `).join('') : `<div class="text-sm text-gray-500">Henüz kullanıcı tipi eklenmemiş.</div>`}
          </div>
        </div>

        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Kullanıcı Listesi</h3>
          ${this.isAdmin ? `<button id="openAddUserModalBtn" class="btn btn-primary">` : `<button id="openAddUserModalBtn" class="btn btn-primary hidden">`}
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
            </svg>
            Yeni Kullanıcı
          </button>
        </div>

        <div class="card">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-posta</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Şube</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Son Giriş</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200" id="usersTableBody">
                ${this.users.map(u => `
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap">${u.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${u.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${u.role}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${u.branch || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="status-badge status-active">Aktif</span></td>
                    <td class="px-6 py-4 whitespace-nowrap">${u.lastLogin || 'Hiç yok'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      ${this.isAdmin ? `<button class="text-indigo-600 hover:text-indigo-900" data-edit-user="${u.email}">Düzenle</button>` : ''}
                      ${this.isAdmin ? `<button class="text-red-600 hover:text-red-900 ml-4" data-remove-user="${u.email}">Sil</button>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Add User Modal -->
        <div id="addUserModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center hidden">
          <div class="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 class="text-lg font-semibold mb-4">Yeni Kullanıcı Ekle</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Ad Soyad</label>
                <input id="newUserNameInput" type="text" class="form-input mt-1" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">E-posta</label>
                <input id="newUserEmailInput" type="email" class="form-input mt-1" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Rol</label>
                <select id="newUserRoleInput" class="form-input mt-1">
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Yönetici</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Şube</label>
                <input id="newUserBranchInput" type="text" class="form-input mt-1" placeholder="Opsiyonel"/>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button id="closeAddUserModalBtn" class="btn btn-secondary">İptal</button>
              <button id="confirmAddUserBtn" class="btn btn-primary">Ekle</button>
            </div>
          </div>
        </div>

        <!-- Add User Type Modal -->
        <div id="addUserTypeModal" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center hidden">
          <div class="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 class="text-lg font-semibold mb-4">Yeni Kullanıcı Tipi Ekle</h3>
            <div>
              <label class="block text-sm font-medium text-gray-700">Tip Adı</label>
              <input id="newUserTypeInput" type="text" class="form-input mt-1" />
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button id="closeAddUserTypeModalBtn" class="btn btn-secondary">İptal</button>
              <button id="confirmAddUserTypeBtn" class="btn btn-primary">Ekle</button>
            </div>
          </div>
        </div>

      </div>
    `;
  }
  
  bindEvents() {
    const openAddUserModalBtn = document.getElementById('openAddUserModalBtn');
    const addUserModal = document.getElementById('addUserModal');
    const closeAddUserModalBtn = document.getElementById('closeAddUserModalBtn');
    const confirmAddUserBtn = document.getElementById('confirmAddUserBtn');

    if (openAddUserModalBtn) openAddUserModalBtn.addEventListener('click', () => this.openModal(addUserModal));
    if (closeAddUserModalBtn) closeAddUserModalBtn.addEventListener('click', () => this.closeModal(addUserModal));
    if (addUserModal) addUserModal.addEventListener('click', (e) => { if (e.target === addUserModal) this.closeModal(addUserModal); });
    if (confirmAddUserBtn && this.isAdmin) confirmAddUserBtn.addEventListener('click', () => this.addUser());

    if (this.isAdmin) {
      document.querySelectorAll('[data-remove-user]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const email = e.target.getAttribute('data-remove-user');
          this.removeUser(email);
        });
      });
      document.querySelectorAll('[data-edit-user]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const email = e.target.getAttribute('data-edit-user');
          // Edit flow could open modal - keep placeholder for now
          alert('Kullanıcı düzenleme: ' + email);
        });
      });
    }

    // User Type modals/events
    const openAddUserTypeBtn = document.getElementById('openAddUserTypeModalBtn');
    const addUserTypeModal = document.getElementById('addUserTypeModal');
    const closeAddUserTypeModalBtn = document.getElementById('closeAddUserTypeModalBtn');
    const confirmAddUserTypeBtn = document.getElementById('confirmAddUserTypeBtn');

    if (openAddUserTypeBtn) openAddUserTypeBtn.addEventListener('click', () => this.openModal(addUserTypeModal));
    if (closeAddUserTypeModalBtn) closeAddUserTypeModalBtn.addEventListener('click', () => this.closeModal(addUserTypeModal));
    if (addUserTypeModal) addUserTypeModal.addEventListener('click', (e) => { if (e.target === addUserTypeModal) this.closeModal(addUserTypeModal); });
    if (confirmAddUserTypeBtn && this.isAdmin) confirmAddUserTypeBtn.addEventListener('click', () => this.addUserType());

    if (this.isAdmin) {
      document.querySelectorAll('[data-remove-type]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const t = e.target.getAttribute('data-remove-type');
          this.removeUserType(t);
        });
      });
    }
    // Edit user functionality would go here, possibly opening a similar modal with populated data
  }

  openModal(el) { if (el) el.classList.remove('hidden'); }
  closeModal(el) { if (el) el.classList.add('hidden'); }

  addUser() {
    const name = document.getElementById('newUserNameInput')?.value?.trim();
    const email = document.getElementById('newUserEmailInput')?.value?.trim();
    const role = document.getElementById('newUserRoleInput')?.value || 'user';
    const branch = document.getElementById('newUserBranchInput')?.value?.trim() || '';

    if (!name) return alert('Ad Soyad zorunlu.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Geçerli e-posta girin.');
    if (this.users.some(u => u.email === email)) return alert('Bu e-posta zaten kayıtlı.');

    this.users.push({ name, email, role, branch, status: 'Aktif', lastLogin: 'Şimdi' }); // Mock status and lastLogin
    this.persistUsers();
    this.refresh();
    this.closeModal(document.getElementById('addUserModal'));

    // Clear inputs after adding
    document.getElementById('newUserNameInput').value = '';
    document.getElementById('newUserEmailInput').value = '';
    document.getElementById('newUserRoleInput').value = 'user';
    document.getElementById('newUserBranchInput').value = '';
  }

  removeUser(email) {
    this.users = this.users.filter(x => x.email !== email);
    this.persistUsers();
    this.refresh();
  }

  addUserType() {
    const input = document.getElementById('newUserTypeInput');
    const t = input?.value?.trim();
    if (!t) return alert('Tip adı boş olamaz.');
    if (this.userTypes.includes(t)) return alert('Bu tip zaten mevcut.');
    this.userTypes.push(t);
    this.persistUserTypes();
    // Persist to server via settingsService if available
    if (typeof window !== 'undefined' && window.settingsService && typeof window.settingsService.patch === 'function') {
      window.settingsService.patch({'users.types': this.userTypes}).catch(e => console.warn('Failed to persist user types', e));
    }
    this.refresh();
    this.closeModal(document.getElementById('addUserTypeModal'));
  }

  removeUserType(t) {
    this.userTypes = this.userTypes.filter(x => x !== t);
    this.persistUserTypes();
    if (typeof window !== 'undefined' && window.settingsService && typeof window.settingsService.patch === 'function') {
      window.settingsService.patch({'users.types': this.userTypes}).catch(e => console.warn('Failed to persist user types', e));
    }
    this.refresh();
  }

  persistUsers() {
    localStorage.setItem(this.storeKey, JSON.stringify(this.users));
  }

  persistUserTypes() {
    localStorage.setItem(this.userTypesKey, JSON.stringify(this.userTypes));
  }

  refresh() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;
    container.innerHTML = this.render();
    this.bindEvents();
  }
}
