export class SettingsService {
  constructor(apiBase = '/api') {
    this.apiBase = apiBase;
    this.cache = null; // cached settings object
  }

  async getAll(force = false) {
    if (this.cache && !force) return this.cache;
    try {
      const res = await fetch(`${this.apiBase}/settings`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      const body = await res.json();
      if (body && body.success && body.settings) {
        this.cache = body.settings;
        return this.cache;
      }
    } catch (e) {
      console.warn('SettingsService.getAll failed', e);
      return this.cache || null;
    }
    return null;
  }

  async saveFull(settings) {
    const res = await fetch(`${this.apiBase}/settings`, {
      method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({settings})
    });
    if (!res.ok) throw new Error('Failed to save settings');
    this.cache = settings;
    return (await res.json());
  }

  // Apply partial updates using dot-path keys
  // updates: { 'company.name': 'value', 'system.timezone': 'X' }
  async patch(updates) {
    const res = await fetch(`${this.apiBase}/settings`, {
      method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({updates})
    });
    if (!res.ok) {
      const body = await res.json().catch(()=>({}));
      throw new Error(body.error || 'Patch failed');
    }
    const body = await res.json();
    this.cache = body.settings || this.cache;
    return body;
  }

  async patchPath(path, value) {
    return this.patch({ [path]: value });
  }

  // Helper: map server settings into per-module localStorage keys
  async syncToLocal() {
    try {
      const s = await this.getAll(true);
      if (!s) return;
      // Company
      if (s.company) {
        const company = {
          companyName: s.company.name || '',
          companyAddress: s.company.address || '',
          companyPhone: s.company.phone || '',
          companyEmail: s.company.email || '',
          taxNumber: s.company.taxNumber || ''
        };
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_GENERAL_COMPANY_INFO, JSON.stringify(company));
      }
      // System prefs
      if (s.system) {
        const systemPrefs = {
          defaultLanguage: s.system.language || 'tr',
          timezone: s.system.timezone || 'Europe/Istanbul',
          currency: s.system.currency || 'TRY',
          dateFormat: s.system.dateFormat || 'DD/MM/YYYY'
        };
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_GENERAL_SYSTEM_PREFS, JSON.stringify(systemPrefs));
      }
      // Notifications
      if (s.notifications) {
        const n = {
          emailNotifications: s.notifications.email !== undefined ? s.notifications.email : true,
          smsNotifications: s.notifications.sms !== undefined ? s.notifications.sms : true,
          desktopNotifications: s.notifications.desktop !== undefined ? s.notifications.desktop : false
        };
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_GENERAL_NOTIFICATION_SETTINGS, JSON.stringify(n));
      }
      // Patient pricing toggles -> patient.pricing
      if (s.pricing) {
        const p = JSON.parse(localStorage.getItem(window.STORAGE_KEYS.SETTINGS_PATIENT_PRICING) || '{}');
        // If local already has explicit fields, do not overwrite them
        const merged = Object.assign({
          allowEditListPrice: p.allowEditListPrice !== undefined ? p.allowEditListPrice : true,
          allowPercentageDiscount: p.allowPercentageDiscount !== undefined ? p.allowPercentageDiscount : true,
          allowFixedDiscount: p.allowFixedDiscount !== undefined ? p.allowFixedDiscount : true,
          autoApplySgkDiscount: p.autoApplySgkDiscount !== undefined ? p.autoApplySgkDiscount : true
        }, {});
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_PATIENT_PRICING, JSON.stringify(merged));
        // Also store full pricing table for sales modules
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_PRICING_FULL, JSON.stringify(s.pricing));
      }
      // Subscription/addons
      if (s.payment || s.subscription) {
        // Place payment plans under subscription usage/defaults
        const sub = JSON.parse(localStorage.getItem(window.STORAGE_KEYS.SETTINGS_SUBSCRIPTION_PLAN) || '{}');
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_SUBSCRIPTION_PLANS, JSON.stringify(s.payment || {}));
      }
      // SGK schemes
      if (s.sgk) {
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_SGK, JSON.stringify(s.sgk));
      }
      // Users types (if present in server settings -> store to settings.users.types)
      if (s.users && Array.isArray(s.users.types)) {
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_USERS_TYPES, JSON.stringify(s.users.types));
      }
      // Feature flags: copy server-side feature objects into localStorage for quick UI gating
      if (s.features && typeof s.features === 'object') {
        localStorage.setItem(window.STORAGE_KEYS.SETTINGS_FEATURES, JSON.stringify(s.features));
        Object.keys(s.features).forEach(k => {
          try {
            const fv = s.features[k];
            // Normalize legacy boolean to object
            const obj = (typeof fv === 'object' && fv !== null) ? fv : { mode: fv ? 'visible' : 'hidden', plans: [] };
            localStorage.setItem(`feature.${k}`, JSON.stringify(obj));
            localStorage.setItem(`feature.${k}.mode`, obj.mode || 'hidden');
            localStorage.setItem(`feature.${k}.plans`, JSON.stringify(obj.plans || []));
          } catch(e){}
        });
      }

      return true;
    } catch (e) {
      console.warn('SettingsService.syncToLocal failed', e);
      return false;
    }
  }
}

// Expose singleton on window for backward compatibility in modules
if (typeof window !== 'undefined' && !window.settingsService) {
  window.settingsService = new SettingsService('/api');
}
