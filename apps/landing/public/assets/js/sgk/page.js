// Page-level glue for SGK page: centralized functions moved out of inline <script>
(function (global) {
  const SGK = global.SGK = global.SGK || {};

  // Helper: convert data URL to Blob (also exposed via helpers; duplicate safe fallback)
  function dataURLToBlob(dataURL) {
    if (!dataURL) return null;
    try {
      const parts = dataURL.split(',');
      const contentType = parts[0].split(':')[1].split(';')[0];
      const base64 = parts[1];
      const raw = atob(base64);
      const uInt8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
      return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
      console.warn('dataURLToBlob failed', e);
      return null;
    }
  }

  // Update page-level statistics shown in header/cards
  async function updateStatistics() {
    try {
      // Prefer SGK.ui or storages where available
      let totalReports = 0, approved = 0, pending = 0, rejected = 0;

      try {
        const sgkReports = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SGK_REPORTS || 'sgk_reports') || '[]');
        const sgkDocs = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SGK_DOCUMENTS || 'xear_sgk_documents') || '[]');
        const patientDocsObj = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS_DOCUMENTS || 'xear_patients_documents') || '{}');
        const patientDocsCount = Object.values(patientDocsObj).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
        totalReports = sgkReports.length + sgkDocs.length + patientDocsCount;

        // Derive simple status counts (best-effort)
        approved = sgkReports.filter(r => (r.status || '').toString().toLowerCase().includes('approved')).length + sgkDocs.filter(d => (d.status || '').toString().toLowerCase().includes('approved')).length;
        pending = sgkReports.filter(r => (r.status || '').toString().toLowerCase().includes('pending')).length + sgkDocs.filter(d => (d.status || '').toString().toLowerCase().includes('pending')).length;
        rejected = sgkReports.filter(r => (r.status || '').toString().toLowerCase().includes('rejected')).length + sgkDocs.filter(d => (d.status || '').toString().toLowerCase().includes('rejected')).length;
      } catch (e) { console.warn('updateStatistics: reading storage failed', e); }

      const elTotal = document.getElementById('total-reports'); if (elTotal) elTotal.textContent = String(totalReports || 0);
      const elApproved = document.getElementById('approved-reports'); if (elApproved) elApproved.textContent = String(approved || 0);
      const elPending = document.getElementById('pending-reports'); if (elPending) elPending.textContent = String(pending || 0);
      const elRejected = document.getElementById('rejected-reports'); if (elRejected) elRejected.textContent = String(rejected || 0);

      // Also refresh SGK table if ui exposes it
      if (global.SGK && global.SGK.ui && typeof global.SGK.ui.loadSGKReports === 'function') {
        try { global.SGK.ui.loadSGKReports(); } catch (err) { console.warn('SGK.ui.loadSGKReports failed', err); }
      }
    } catch (err) { console.error('updateStatistics error', err); }
  }

  async function showStorageInfo() {
    try {
      const breakdown = (global.SGK && global.SGK.storage && typeof global.SGK.storage.getStorageBreakdown === 'function') ? await global.SGK.storage.getStorageBreakdown() : { sgkDocs:0, patientDocs:0, totalKeys: Object.keys(localStorage).length };
      const usage = (global.SGK && global.SGK.storage && typeof global.SGK.storage.calculateStorageUsage === 'function') ? global.SGK.storage.calculateStorageUsage() : { usedMB:0, limitMB:5, percentage:0 };
      const html = `
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-2">Depolama Durumu</h3>
          <p class="text-sm">• SGK Belgeleri: ${breakdown.sgkDocs}</p>
          <p class="text-sm">• Hasta Belgeleri: ${breakdown.patientDocs}</p>
          <p class="text-sm">• LocalStorage anahtar sayısı: ${breakdown.totalKeys}</p>
          <p class="text-sm mt-2">Kullanım: ${usage.usedMB} MB / ~${usage.limitMB} MB (${usage.percentage}%)</p>
        </div>
      `;
      const modal = document.createElement('div'); modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
      modal.innerHTML = `<div class="bg-white rounded-lg p-4 max-w-md w-full">${html}<div class="mt-4 text-right"><button id="_sgk_close_storage" class="px-3 py-1 bg-gray-100 rounded">Kapat</button></div></div>`;
      document.body.appendChild(modal);
      modal.querySelector('#_sgk_close_storage').addEventListener('click', () => modal.remove());
    } catch (err) { console.error('showStorageInfo failed', err); }
  }

  function reviewManualApprovals() {
    try {
      const docs = (global.processedDocuments || []).filter(d => d.status === 'manual_review');
      if (!docs || docs.length === 0) { Utils.showToast('Manuel onay bekleyen belge yok', 'info'); return; }
      // If modal helper exists, open first candidate modal for user to review
      if (global.SGK && global.SGK.modals && typeof global.SGK.modals.openCandidateModal === 'function') {
        global.SGK.modals.openCandidateModal(null, docs[0]);
      } else {
        Utils.showToast('Manuel onay modalı mevcut değil', 'warning');
      }
    } catch (e) { console.error('reviewManualApprovals failed', e); }
  }

  async function saveAllToPatients() {
    try {
      if (global.SGK && global.SGK.storage && typeof global.SGK.storage.saveAllToPatients === 'function') {
        const res = await global.SGK.storage.saveAllToPatients();
        if (res && res.success) Utils.showToast(`${res.documentCount || 0} belge kaydedildi`, 'success');
        else if (res && res.error) Utils.showToast(`Kaydetme hatası: ${res.error}`, 'error');
      } else if (typeof window.saveAllToPatients === 'function') {
        await window.saveAllToPatients();
      } else {
        Utils.showToast('Kaydetme fonksiyonu kullanılamıyor', 'error');
      }
      // Refresh stats
      updateStatistics();
    } catch (err) { console.error('saveAllToPatients failed', err); Utils.showToast('Tümünü kaydetme başarısız', 'error'); }
  }

  function previewPDFById(docId) {
    try {
      let doc = (global.processedDocuments || []).find(d => d.id === docId);
      if (!doc) {
        // search storages
        const keys = Object.keys(localStorage).filter(k => k.includes('sgk') || k.includes('patient'));
        for (const k of keys) {
          try { const data = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(data)) { const found = data.find(x=>x.id===docId); if (found) { doc = found; break; } } } catch(e){ }
        }
      }
      if (!doc) { Utils.showToast('Belge bulunamadı', 'error'); return; }
      const blob = doc.compressedPDF instanceof Blob ? doc.compressedPDF : (typeof doc.compressedPDF === 'string' ? dataURLToBlob(doc.compressedPDF) : null);
      if (!blob) { Utils.showToast('PDF verisi bulunamadı', 'error'); return; }
      const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(()=>URL.revokeObjectURL(url), 5000);
    } catch (err) { console.error('previewPDFById failed', err); }
  }

  async function downloadPDFById(docId) {
    try {
      let doc = (global.processedDocuments || []).find(d => d.id === docId);
      if (!doc) {
        const keys = Object.keys(localStorage).filter(k => k.includes('sgk') || k.includes('patient'));
        for (const k of keys) {
          try { const data = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(data)) { const found = data.find(x=>x.id===docId); if (found) { doc = found; break; } } } catch(e){ }
        }
      }
      if (!doc) { Utils.showToast('Belge bulunamadı', 'error'); return; }
      const blob = doc.compressedPDF instanceof Blob ? doc.compressedPDF : (typeof doc.compressedPDF === 'string' ? dataURLToBlob(doc.compressedPDF) : null);
      if (!blob) { Utils.showToast('PDF verisi bulunamadı', 'error'); return; }
      const filename = (doc.filename || doc.originalName || 'belge') + '.pdf';
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(link.href),1000);
      Utils.showToast('PDF indiriliyor', 'success');
    } catch (err) { console.error('downloadPDFById failed', err); Utils.showToast('PDF indirme hatası', 'error'); }
  }

  // Check background processing status (delegates to storage manager / storage helpers when possible)
  function checkBackgroundProcessingStatus() {
    try {
      if (global.SGK && global.SGK.storage && typeof global.SGK.storage.getStorageBreakdown === 'function') {
        // If storage manager exposes a background status helper, prefer it
        if (typeof global.SGK.storage.showBackgroundProcessingStatus === 'function') {
          return global.SGK.storage.showBackgroundProcessingStatus();
        }
      }
      // Fallback: read localStorage flag
      const bgStatus = localStorage.getItem('background_processing_status');
      if (bgStatus) {
        const status = JSON.parse(bgStatus);
        // Re-show UI badge if present
        const badge = document.getElementById('backgroundProcessingBadge') || document.getElementById('backgroundProcessingBadge');
        if (badge) badge.classList.remove('hidden');
        return status;
      }
      return null;
    } catch (err) { console.warn('checkBackgroundProcessingStatus failed', err); return null; }
  }

  // Expose on global
  SGK.page = SGK.page || {};
  Object.assign(SGK.page, { updateStatistics, showStorageInfo, reviewManualApprovals, saveAllToPatients, previewPDFById, downloadPDFById, dataURLToBlob });

  // Also expose checkBackgroundProcessingStatus
  SGK.page.checkBackgroundProcessingStatus = checkBackgroundProcessingStatus;

  // Also expose as globals for legacy inline calls
  window.updateStatistics = updateStatistics;
  window.showStorageInfo = showStorageInfo;
  window.reviewManualApprovals = reviewManualApprovals;
  window.saveAllToPatients = saveAllToPatients;
  window.previewPDF = previewPDFById;
  window.downloadPDF = downloadPDFById;
  window.dataURLToBlob = dataURLToBlob;

  // Backwards-compatible global for background status
  window.checkBackgroundProcessingStatus = window.checkBackgroundProcessingStatus || checkBackgroundProcessingStatus;

})(window);
