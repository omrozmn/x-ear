export class GeneralSettings {
  constructor() {
    this.companyInfoKey = 'settings.general.companyInfo';
    this.systemPrefsKey = 'settings.general.systemPrefs';
    this.notificationSettingsKey = 'settings.general.notificationSettings';
    this.securitySettingsKey = 'settings.general.securitySettings';

    this.companyInfo = JSON.parse(localStorage.getItem(this.companyInfoKey) || '{}');
    this.companyInfo = {
      companyName: this.companyInfo.companyName || 'X-Ear İşitme Merkezi',
      companyAddress: this.companyInfo.companyAddress || 'Atatürk Cad. No: 123\nKadıköy, İstanbul',
      companyPhone: this.companyInfo.companyPhone || '+90 216 555 0123',
      companyEmail: this.companyInfo.companyEmail || 'info@x-ear.com',
      taxNumber: this.companyInfo.taxNumber || '1234567890',
    };

    this.systemPrefs = JSON.parse(localStorage.getItem(this.systemPrefsKey) || '{}');
    this.systemPrefs = {
      defaultLanguage: this.systemPrefs.defaultLanguage || 'tr',
      timezone: this.systemPrefs.timezone || 'Europe/Istanbul',
      currency: this.systemPrefs.currency || 'TRY',
      dateFormat: this.systemPrefs.dateFormat || 'DD/MM/YYYY',
    };

    this.notificationSettings = JSON.parse(localStorage.getItem(this.notificationSettingsKey) || '{}');
    this.notificationSettings = {
      emailNotifications: this.notificationSettings.emailNotifications !== undefined ? this.notificationSettings.emailNotifications : true,
      smsNotifications: this.notificationSettings.smsNotifications !== undefined ? this.notificationSettings.smsNotifications : true,
      desktopNotifications: this.notificationSettings.desktopNotifications !== undefined ? this.notificationSettings.desktopNotifications : false,
    };

    this.securitySettings = JSON.parse(localStorage.getItem(this.securitySettingsKey) || '{}');
    this.securitySettings = {
      twoFactorAuth: this.securitySettings.twoFactorAuth !== undefined ? this.securitySettings.twoFactorAuth : false,
      sessionTimeout: this.securitySettings.sessionTimeout || 480,
      minPasswordLength: this.securitySettings.minPasswordLength || 8,
    };
  }

  render() {
    const c = this.companyInfo;
    const s = this.systemPrefs;
    const n = this.notificationSettings;
    const sec = this.securitySettings;

    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Genel Ayarlar</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Şirket Bilgileri -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Şirket Bilgileri</h3>
            <form class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Şirket Adı</label>
                <input type="text" class="form-input" value="${c.companyName}" id="companyName">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <textarea class="form-input" rows="3" id="companyAddress">${c.companyAddress}</textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="tel" class="form-input" value="${c.companyPhone}" id="companyPhone">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                  <input type="email" class="form-input" value="${c.companyEmail}" id="companyEmail">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vergi No</label>
                <input type="text" class="form-input" value="${c.taxNumber}" id="taxNumber">
              </div>
            </form>
          </div>

          <!-- Sistem Tercihleri -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Sistem Tercihleri</h3>
            <form class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Varsayılan Dil</label>
                <select class="form-input" id="defaultLanguage">
                  <option value="tr" ${s.defaultLanguage === 'tr' ? 'selected' : ''}>Türkçe</option>
                  <option value="en" ${s.defaultLanguage === 'en' ? 'selected' : ''}>English</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Saat Dilimi</label>
                <select class="form-input" id="timezone">
                  <option value="Europe/Istanbul" ${s.timezone === 'Europe/Istanbul' ? 'selected' : ''}>İstanbul (UTC+3)</option>
                  <option value="Europe/London" ${s.timezone === 'Europe/London' ? 'selected' : ''}>Londra (UTC+0)</option>
                  <option value="America/New_York" ${s.timezone === 'America/New_York' ? 'selected' : ''}>New York (UTC-5)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
                <select class="form-input" id="currency">
                  <option value="TRY" ${s.currency === 'TRY' ? 'selected' : ''}>Türk Lirası (₺)</option>
                  <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>US Dollar ($)</option>
                  <option value="EUR" ${s.currency === 'EUR' ? 'selected' : ''}>Euro (€)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Tarih Formatı</label>
                <select class="form-input" id="dateFormat">
                  <option value="DD/MM/YYYY" ${s.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY" ${s.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD" ${s.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                </select>
              </div>
            </form>
          </div>

          <!-- Bildirim Ayarları -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Bildirim Ayarları</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-700">E-posta Bildirimleri</label>
                  <p class="text-xs text-gray-500">Yeni hasta ve randevu bildirimleri</p>
                </div>
                <label class="switch">
                  <input type="checkbox" id="emailNotificationsToggle" ${n.emailNotifications ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-700">SMS Bildirimleri</label>
                  <p class="text-xs text-gray-500">Acil durum ve hatırlatmalar</p>
                </div>
                <label class="switch">
                  <input type="checkbox" id="smsNotificationsToggle" ${n.smsNotifications ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-700">Masaüstü Bildirimleri</label>
                  <p class="text-xs text-gray-500">Tarayıcı bildirimleri</p>
                </div>
                <label class="switch">
                  <input type="checkbox" id="desktopNotificationsToggle" ${n.desktopNotifications ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Güvenlik Ayarları -->
          <div class="card p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Güvenlik Ayarları</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-gray-700">İki Faktörlü Doğrulama</label>
                  <p class="text-xs text-gray-500">Ekstra güvenlik katmanı</p>
                </div>
                <label class="switch">
                  <input type="checkbox" id="twoFactorAuthToggle" ${sec.twoFactorAuth ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Oturum Süresi (dakika)</label>
                <input type="number" class="form-input" value="${sec.sessionTimeout}" min="30" max="1440" id="sessionTimeoutInput">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Minimum Şifre Uzunluğu</label>
                <input type="number" class="form-input" value="${sec.minPasswordLength}" min="6" max="20" id="minPasswordLengthInput">
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end space-x-3">
          <button id="resetGeneralSettingsBtn" class="btn btn-secondary">Sıfırla</button>
          <button id="saveGeneralSettingsBtn" class="btn btn-primary">Kaydet</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const saveBtn = document.getElementById('saveGeneralSettingsBtn');
    const resetBtn = document.getElementById('resetGeneralSettingsBtn');

    if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetSettings());

    // Bind toggle events for Notification and Security settings
    this.bindToggle('emailNotificationsToggle', this.notificationSettings, 'emailNotifications', this.notificationSettingsKey);
    this.bindToggle('smsNotificationsToggle', this.notificationSettings, 'smsNotifications', this.notificationSettingsKey);
    this.bindToggle('desktopNotificationsToggle', this.notificationSettings, 'desktopNotifications', this.notificationSettingsKey);
    this.bindToggle('twoFactorAuthToggle', this.securitySettings, 'twoFactorAuth', this.securitySettingsKey);

    // Bind input events for session timeout and min password length
    this.bindInput('sessionTimeoutInput', this.securitySettings, 'sessionTimeout', this.securitySettingsKey, 'number');
    this.bindInput('minPasswordLengthInput', this.securitySettings, 'minPasswordLength', this.securitySettingsKey, 'number');
  }

  saveSettings() {
    // Company Info
    this.companyInfo.companyName = document.getElementById('companyName')?.value || '';
    this.companyInfo.companyAddress = document.getElementById('companyAddress')?.value || '';
    this.companyInfo.companyPhone = document.getElementById('companyPhone')?.value || '';
    this.companyInfo.companyEmail = document.getElementById('companyEmail')?.value || '';
    this.companyInfo.taxNumber = document.getElementById('taxNumber')?.value || '';
    localStorage.setItem(this.companyInfoKey, JSON.stringify(this.companyInfo));

    // System Preferences
    this.systemPrefs.defaultLanguage = document.getElementById('defaultLanguage')?.value || 'tr';
    this.systemPrefs.timezone = document.getElementById('timezone')?.value || 'Europe/Istanbul';
    this.systemPrefs.currency = document.getElementById('currency')?.value || 'TRY';
    this.systemPrefs.dateFormat = document.getElementById('dateFormat')?.value || 'DD/MM/YYYY';
    localStorage.setItem(this.systemPrefsKey, JSON.stringify(this.systemPrefs));

    this.persistNotificationSettings();
    this.persistSecuritySettings();

    // Also persist to server (patch partial fields) if settingsService is available
    try {
      const updates = {
        'company.name': this.companyInfo.companyName,
        'company.address': this.companyInfo.companyAddress,
        'company.phone': this.companyInfo.companyPhone,
        'company.email': this.companyInfo.companyEmail,
        'company.taxNumber': this.companyInfo.taxNumber,
        'system.language': this.systemPrefs.defaultLanguage,
        'system.timezone': this.systemPrefs.timezone,
        'system.currency': this.systemPrefs.currency,
        'system.dateFormat': this.systemPrefs.dateFormat,
        'notifications.email': this.notificationSettings.emailNotifications,
        'notifications.sms': this.notificationSettings.smsNotifications,
        'notifications.desktop': this.notificationSettings.desktopNotifications,
        'security.sessionTimeout': this.securitySettings.sessionTimeout,
        'security.minPasswordLength': this.securitySettings.minPasswordLength,
        'security.twoFactorAuth': this.securitySettings.twoFactorAuth
      };
      if (typeof window !== 'undefined' && window.settingsService && typeof window.settingsService.patch === 'function') {
        window.settingsService.patch(updates).then(() => {
          alert('Genel ayarlar kaydedildi ve sunucuya güncellendi.');
        }).catch(e => {
          console.warn('Server save failed', e);
          alert('Genel ayarlar kaydedildi (yerel) — sunucuya kaydedilemedi.');
        });
      } else {
        alert('Genel ayarlar kaydedildi.');
      }
    } catch (e) {
      console.warn('Failed to persist general settings to server', e);
      alert('Genel ayarlar kaydedildi (yerel).');
    }
  }

  resetSettings() {
    localStorage.removeItem(this.companyInfoKey);
    localStorage.removeItem(this.systemPrefsKey);
    localStorage.removeItem(this.notificationSettingsKey);
    localStorage.removeItem(this.securitySettingsKey);
    this.constructor(); // Re-initialize with defaults
    this.refresh();
    alert('Genel ayarlar sıfırlandı.');
  }

  bindToggle(elementId, settingsObj, settingKey, storageKey) {
    const toggle = document.getElementById(elementId);
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        settingsObj[settingKey] = e.target.checked;
        localStorage.setItem(storageKey, JSON.stringify(settingsObj));
        // if (settingKey === 'darkMode') { 
        //   if (e.target.checked) document.documentElement.classList.add('dark');
        //   else document.documentElement.classList.remove('dark');
        // }
      });
    }
  }

  bindInput(elementId, settingsObj, settingKey, storageKey, type = 'text') {
    const input = document.getElementById(elementId);
    if (input) {
      input.addEventListener('change', (e) => {
        let value = e.target.value;
        if (type === 'number') value = parseInt(value, 10);
        settingsObj[settingKey] = value;
        localStorage.setItem(storageKey, JSON.stringify(settingsObj));
      });
    }
  }

  persistNotificationSettings() {
    localStorage.setItem(this.notificationSettingsKey, JSON.stringify(this.notificationSettings));
  }

  persistSecuritySettings() {
    localStorage.setItem(this.securitySettingsKey, JSON.stringify(this.securitySettings));
  }

  refresh() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;
    container.innerHTML = this.render();
    this.bindEvents();
  }
}
