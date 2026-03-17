export class ProfileSettings {
  render() {
    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Profil</h2>
        <div class="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div>
            <label class="block text-sm text-gray-700">Ad Soyad</label>
            <input id="profileName" class="input" />
          </div>
          <div>
            <label class="block text-sm text-gray-700">E-posta</label>
            <input id="profileEmail" class="input" />
          </div>
          <div>
            <label class="block text-sm text-gray-700">Telefon</label>
            <input id="profilePhone" class="input" />
          </div>
          <div>
            <label class="block text-sm text-gray-700">Yeni Şifre</label>
            <input id="profileNewPassword" type="password" class="input" />
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <button id="profileSaveBtn" class="btn btn-primary">Kaydet</button>
          <button id="profileResetBtn" class="btn">Sıfırla</button>
        </div>
      </div>
    `;
  }
  bindEvents() {
    const save = document.getElementById('profileSaveBtn');
    const reset = document.getElementById('profileResetBtn');
    if (save) save.addEventListener('click', () => this.saveProfile());
    if (reset) reset.addEventListener('click', () => this.loadProfileData());
    this.loadProfileData();
  }
  loadProfileData() {
    const user = (window.authManager && typeof window.authManager.getCurrentUser === 'function') ? window.authManager.getCurrentUser() : JSON.parse(localStorage.getItem(window.STORAGE_KEYS.CURRENT_USER)||'null');
    if (!user) return;
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const phoneEl = document.getElementById('profilePhone');
    if (nameEl) nameEl.value = user.username || '';
    if (emailEl) emailEl.value = user.email || '';
    if (phoneEl) phoneEl.value = user.phone || '';
  }
  saveProfile() {
    const name = document.getElementById('profileName')?.value?.trim() || '';
    const email = document.getElementById('profileEmail')?.value?.trim() || '';
    const phone = document.getElementById('profilePhone')?.value?.trim() || '';
    if (!name) return alert('Ad Soyad zorunludur.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Geçerli bir e-posta girin.');
    const current = JSON.parse(localStorage.getItem(window.STORAGE_KEYS.CURRENT_USER)||'{}');
    current.username = name; current.email = email; current.phone = phone;
    localStorage.setItem(window.STORAGE_KEYS.CURRENT_USER, JSON.stringify(current));
    alert('Profil kaydedildi.');
  }
}
