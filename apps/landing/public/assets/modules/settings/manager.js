export class SettingsManager {
  constructor(options = {}) {
    this.defaultTab = options.defaultTab || 'general';
    this.tabs = ['general','profile','users','branches','integrations','etiket','subscription','automation','patient','invoice'];
    this.instances = {};
    // settingsService singleton is exposed on window by service.js
    this.settingsService = (typeof window !== 'undefined' && window.settingsService) ? window.settingsService : null;
  }

  async init() {
    // If settingsService exists, attempt to sync server settings into localStorage
    if (this.settingsService && typeof this.settingsService.syncToLocal === 'function') {
      try {
        await this.settingsService.syncToLocal();
      } catch (e) {
        // non-fatal: continue even if sync fails
        console.warn('SettingsManager: syncToLocal failed', e);
      }
    }

    this.renderHeader();
    this.renderTabs();
    this.bindTabClicks();
    this.bindHashChange();
    const hashTab = (window.location.hash || `#${this.defaultTab}`).replace('#','');
    const initial = this.tabs.includes(hashTab) ? hashTab : 'general';
    this.switchTab(initial);
  }

  renderHeader() {
    const headerContainer = document.getElementById('header-container');
    if (headerContainer && typeof HeaderWidget !== 'undefined') {
      const header = new HeaderWidget('Ayarlar');
      headerContainer.innerHTML = header.render();
    }
  }

  renderTabs() {
    const container = document.getElementById('settings-tabs-container');
    const active = (window.location.hash || `#${this.defaultTab}`).replace('#','');
    const tabsHtml = `
      <div class="tab-nav">
        ${this.tabs.map(t => `
          <button class="tab-btn ${t===active?'active':''}" data-tab="${t}" id="${t}TabBtn">${this.getTabLabel(t)}</button>
        `).join('')}
      </div>
    `;
    container.innerHTML = tabsHtml;
  }

  bindTabClicks() {
    document.getElementById('settings-tabs-container').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      const tab = btn.getAttribute('data-tab');
      this.switchTab(tab);
    });
  }

  async switchTab(tabName) {
    this.updateActiveButton(tabName);
    window.location.hash = `#${tabName}`;
    const container = document.getElementById('settings-tab-content');
    if (!container) return;

    if (!this.instances[tabName]) {
      this.instances[tabName] = await this.createTabInstance(tabName);
    }

    const instance = this.instances[tabName];
    if (instance && typeof instance.render === 'function') {
      container.innerHTML = instance.render();
      if (typeof instance.bindEvents === 'function') instance.bindEvents();
    } else {
      container.innerHTML = `<div class="text-gray-600">Tab bulunamadı: ${tabName}</div>`;
    }
  }

  updateActiveButton(tabName) {
    document.querySelectorAll('#settings-tabs-container .tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`${tabName}TabBtn`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  bindHashChange() {
    window.addEventListener('hashchange', () => {
      const tab = (window.location.hash || '').replace('#','');
      if (!tab || !this.tabs.includes(tab)) return;
      const currentActive = document.querySelector('#settings-tabs-container .tab-btn.active');
      if (currentActive && currentActive.getAttribute('data-tab') === tab) return;
      this.switchTab(tab);
    });
  }

  async createTabInstance(tabName) {
    switch (tabName) {
      case 'general': {
        const m = await import('/assets/modules/settings/tabs/general.js');
        return new m.GeneralSettings();
      }
      case 'profile': {
        const m = await import('/assets/modules/settings/tabs/profile.js');
        return new m.ProfileSettings();
      }
      case 'users': {
        const m = await import('/assets/modules/settings/tabs/users.js');
        const inst = new m.UsersSettings();
        if (typeof inst.loadFromApi === 'function') await inst.loadFromApi();
        return inst;
      }
      case 'branches': {
        const m = await import('/assets/modules/settings/tabs/branches.js');
        return new m.BranchesSettings();
      }
      case 'integrations': {
        const m = await import('/assets/modules/settings/tabs/integrations.js');
        return new m.IntegrationsSettings();
      }
      case 'etiket': {
        const m = await import('/assets/modules/settings/tabs/tags.js');
        return new m.TagsSettings();
      }
      case 'subscription': {
        const m = await import('/assets/modules/settings/tabs/subscription.js');
        return new m.SubscriptionSettings();
      }
      case 'automation': {
        const m = await import('/assets/modules/settings/tabs/automation.js');
        return new m.AutomationSettings();
      }
      case 'patient': {
        const m = await import('/assets/modules/settings/tabs/patient.js');
        return new m.PatientSettings();
      }
      case 'invoice': {
        const m = await import('/assets/modules/settings/tabs/invoice.js');
        return new m.InvoiceSettings();
      }
      default:
        return null;
    }
  }

  getTabLabel(key) {
    const labels = {
      general: 'Genel',
      profile: 'Profil',
      users: 'Kullanıcılar',
      branches: 'Şubeler',
      integrations: 'Entegrasyonlar',
      etiket: 'Etiketler',
      subscription: 'Abonelik',
      automation: 'Otomasyon',
      patient: 'Hasta Yönetimi',
      invoice: 'Fatura Ayarları'
    };
    return labels[key] || key;
  }
}
