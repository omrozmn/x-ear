export class IntegrationsSettings {
  constructor() {
    this.integrationsKey = 'settings.integrations.list';
    this.integrations = JSON.parse(localStorage.getItem(this.integrationsKey) || '[]');
    if (!Array.isArray(this.integrations) || this.integrations.length === 0) {
      this.integrations = [
        {
          id: 'sgk', name: 'SGK Entegrasyonu', enabled: true, status: 'Aktif',
          description: 'Sosyal Güvenlik Kurumu ile entegrasyon',
          details: { apiEndpoint: 'https://api.sgk.gov.tr/v1', lastSync: '2 saat önce' }
        },
        {
          id: 'sms', name: 'SMS Sağlayıcısı', enabled: true, status: 'Aktif',
          description: 'Toplu SMS gönderimi için entegrasyon',
          details: { provider: 'NetGSM', remainingCredit: '2,450 SMS' }
        },
        {
          id: 'email', name: 'E-posta Sağlayıcısı', enabled: false, status: 'Test',
          description: 'E-posta gönderimi için SMTP ayarları',
          details: { smtpServer: 'smtp.gmail.com', port: '587' }
        }
      ];
      this.persistIntegrations(); // Save initial defaults
    }
  }

  render() {
    return `
      <div>
        <h2 class="text-xl font-semibold mb-4">Entegrasyonlar</h2>
        <div class="space-y-6">
          ${this.integrations.map(int => `
            <div class="card p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 ${this.getIntegrationBg(int.id)} rounded-lg flex items-center justify-center">
                    ${this.getIntegrationIcon(int.id)}
                  </div>
                  <div>
                    <h4 class="text-lg font-semibold text-gray-900">${int.name}</h4>
                    <p class="text-sm text-gray-600">${int.description}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span class="status-badge ${int.status === 'Aktif' ? 'status-active' : 'status-warning'}">${int.status}</span>
                  <label class="switch">
                    <input type="checkbox" data-integration-id="${int.id}" ${int.enabled ? 'checked' : ''} />
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4 text-sm">
                ${this.renderIntegrationDetails(int)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.querySelectorAll('[data-integration-id]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = chk.getAttribute('data-integration-id');
        const enabled = e.target.checked;
        this.toggleIntegration(id, enabled);
      });
    });
  }

  toggleIntegration(id, enabled) {
    const integration = this.integrations.find(i => i.id === id);
    if (integration) {
      integration.enabled = enabled;
      this.persistIntegrations();
      this.refresh();
    }
  }

  persistIntegrations() {
    localStorage.setItem(this.integrationsKey, JSON.stringify(this.integrations));
  }

  refresh() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;
    container.innerHTML = this.render();
    this.bindEvents();
  }

  renderIntegrationDetails(integration) {
    let detailsHtml = '';
    switch (integration.id) {
      case 'sgk':
        detailsHtml = `
          <div>
            <span class="text-gray-600">API Endpoint:</span>
            <span class="font-medium">${integration.details.apiEndpoint}</span>
          </div>
          <div>
            <span class="text-gray-600">Son Senkronizasyon:</span>
            <span class="font-medium">${integration.details.lastSync}</span>
          </div>
        `;
        break;
      case 'sms':
        detailsHtml = `
          <div>
            <span class="text-gray-600">Sağlayıcı:</span>
            <span class="font-medium">${integration.details.provider}</span>
          </div>
          <div>
            <span class="text-gray-600">Kalan Kredi:</span>
            <span class="font-medium">${integration.details.remainingCredit}</span>
          </div>
        `;
        break;
      case 'email':
        detailsHtml = `
          <div>
            <span class="text-gray-600">SMTP Sunucu:</span>
            <span class="font-medium">${integration.details.smtpServer}</span>
          </div>
          <div>
            <span class="text-gray-600">Port:</span>
            <span class="font-medium">${integration.details.port}</span>
          </div>
        `;
        break;
    }
    return detailsHtml;
  }

  getIntegrationBg(id) {
    switch (id) {
      case 'sgk': return 'bg-green-100';
      case 'sms': return 'bg-blue-100';
      case 'email': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  }

  getIntegrationIcon(id) {
    switch (id) {
      case 'sgk': return '<svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
      case 'sms': return '<svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>';
      case 'email': return '<svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>';
      default: return '<svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>';
    }
  }
}
