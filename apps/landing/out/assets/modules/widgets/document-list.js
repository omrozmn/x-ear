/* DocumentListWidget
 * Lightweight wrapper to show patient documents in a modal using the
 * legacy document management renderer when available. Exposes a global
 * instance at window.documentListWidget with method openPatientDocumentsModal(patientId).
 */
// ApiClient is provided globally by a legacy script (window.APIClient). Use the global instance when available.
// This avoids importing the classic api-client.js as an ES module which would cause mismatched module formats.
const globalApiClient = (typeof window !== 'undefined') ? (window.apiClient || window.APIClient || null) : null;

export class DocumentListWidget {
  constructor(apiClient) {
    this.apiClient = apiClient || globalApiClient || null;
  }

  async openPatientDocumentsModal(patientId) {
    try {
      // Fetch patient (best-effort)
      let patientData = { id: patientId };
      try {
        const resp = await this.apiClient.get(`/api/patients/${patientId}`);
        patientData = resp?.data || resp || patientData;
      } catch (e) {
        // fall back to minimal patient object
      }

      // If legacy documentManagement component is available, reuse its renderer
      let inner = '';
      if (window.documentManagement && typeof window.documentManagement.renderDocumentsTab === 'function') {
        inner = window.documentManagement.renderDocumentsTab(patientData);
      } else {
        const docs = patientData.documents || [];
        inner = `
          <div class="p-6">
            <h3 class="text-lg font-semibold">Belgeler (${docs.length})</h3>
            <div class="mt-4 grid grid-cols-1 gap-3">
              ${docs.map(d => `
                <div class="flex items-center justify-between bg-white border p-3 rounded">
                  <div>
                    <div class="font-medium">${d.name || d.fileName || 'İsimsiz'}</div>
                    <div class="text-xs text-gray-500">${new Date(d.uploadedAt||d.uploadDate||d.createdAt||'').toLocaleString('tr-TR') || ''}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button onclick="documentListWidget.download('${d.id}','${patientId}')" class="px-2 py-1 text-sm bg-blue-600 text-white rounded">İndir</button>
                    <button onclick="documentListWidget.view('${d.id}','${patientId}')" class="px-2 py-1 text-sm bg-gray-100">Görüntüle</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      const modalHtml = `
        <div id="patient-documents-modal" class="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4" onclick="if(event.target.id==='patient-documents-modal') document.getElementById('patient-documents-modal')?.remove()">
          <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between p-4 border-b">
              <div>
                <h3 class="text-lg font-semibold">Hasta Belgeleri</h3>
                <p class="text-sm text-gray-500">Hasta ID: ${patientId}</p>
              </div>
              <div>
                <button onclick="document.getElementById('patient-documents-modal')?.remove()" class="text-gray-500 hover:text-gray-700">Kapat</button>
              </div>
            </div>
            <div class="p-4">${inner}</div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (err) {
      console.error('Failed to open patient documents modal', err);
      if (window.showToast) window.showToast('Belgeler yüklenemedi', 'error');
    }
  }

  // Delegates to legacy documentManagement if present
  view(documentId, patientId) {
    if (window.documentManagement && typeof window.documentManagement.viewDocument === 'function') {
      return window.documentManagement.viewDocument(documentId, patientId);
    }
    // fallback: try to download
    return this.download(documentId, patientId);
  }

  download(documentId, patientId) {
    if (window.documentManagement && typeof window.documentManagement.downloadDocument === 'function') {
      return window.documentManagement.downloadDocument(documentId, patientId);
    }
    // fallback: attempt to fetch document download endpoint
    try {
      const link = document.createElement('a');
      link.href = `/api/patients/${patientId}/documents/${documentId}/download`;
      link.download = '';
      link.click();
      if (window.showToast) window.showToast('İndirme başlatıldı', 'info');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('İndirme başarısız', 'error');
    }
  }
}

// Expose global instance
if (typeof window !== 'undefined') {
  window.DocumentListWidget = DocumentListWidget;
  window.documentListWidget = new DocumentListWidget();
}

export default DocumentListWidget;
