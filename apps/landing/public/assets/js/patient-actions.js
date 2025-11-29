// Patient actions glue: saved views, bulk actions and exports
(function(){
  const patientActions = {
    renderSavedViews() {
      try {
        const container = document.getElementById('savedViews'); if (!container) return;
        // Prefer manager implementation if available
        if (window.patientManager && typeof window.patientManager.renderSavedViews === 'function') {
          try { window.patientManager.renderSavedViews(); return; } catch(e) { console.error('patientManager.renderSavedViews failed', e); }
        }
        // Fallback: simple render
        let views = [];
        try { views = JSON.parse(localStorage.getItem('xear_saved_views') || '[]'); } catch(e) { views = []; }
        if (!Array.isArray(views) || views.length === 0) { container.innerHTML = '<div class="text-sm text-gray-500">Kayıtlı görünüm yok</div>'; return; }
        container.innerHTML = views.map(v => `<button class="px-3 py-1 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50" data-view-id="${v.id}">${v.name}</button>`).join(' ');
        container.querySelectorAll('[data-view-id]').forEach(btn => btn.addEventListener('click', () => {
          const id = btn.dataset.viewId; try { const viewsLocal = JSON.parse(localStorage.getItem('xear_saved_views') || '[]'); const view = (viewsLocal||[]).find(x=>x.id===id); if (!view) return; if (window.patientManager && typeof window.patientManager.applyFilters === 'function') { Object.keys(view.filters||{}).forEach(k=>{ window.patientManager.currentFilters[k]=view.filters[k]; }); window.patientManager.applyFilters(); } } catch(e){console.error(e);} }));
      } catch(err){ console.error('patientActions.renderSavedViews failed', err); }
    },

    saveCurrentView() {
      if (window.patientManager && typeof window.patientManager.saveCurrentView === 'function') return window.patientManager.saveCurrentView();
      try {
        if (window.showCustomPrompt) {
          window.showCustomPrompt('Görünüm Kaydet', 'Görünüme bir isim verin:', '', (name) => {
            if (!name || !name.trim()) return;
            const toSave = { id: `view_${Date.now()}`, name: name.trim(), filters: (window.patientManager && window.patientManager.currentFilters) ? { ...window.patientManager.currentFilters } : {} };
            const views = JSON.parse(localStorage.getItem('xear_saved_views') || '[]'); views.push(toSave); localStorage.setItem('xear_saved_views', JSON.stringify(views)); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Görünüm kaydedildi', 'success'); this.renderSavedViews();
          }, 'info');
        } else {
          const name = window.prompt('Görünüme bir isim verin:'); if (!name) return;
          const toSave = { id: `view_${Date.now()}`, name: name.trim(), filters: (window.patientManager && window.patientManager.currentFilters) ? { ...window.patientManager.currentFilters } : {} };
          const views = JSON.parse(localStorage.getItem('xear_saved_views') || '[]'); views.push(toSave); localStorage.setItem('xear_saved_views', JSON.stringify(views)); if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Görünüm kaydedildi', 'success'); this.renderSavedViews();
        }
      } catch(e){ console.error('patientActions.saveCurrentView failed', e); }
    },

    exportSelected() { if (window.patientManager && typeof window.patientManager.exportSelected === 'function') return window.patientManager.exportSelected(); },
    async exportAllPatients() {
      // Prefer server-side admin export when available
      try {
        const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('xear_access_token') : null;
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const params = ''; // could include filters in future
        const resp = await window.APIConfig.makeRequest(`/api/patients/${id}`, 'GET', null, headers);
        if (resp.status === 200) {
          const blob = await resp.blob();
          const filename = resp.headers.get('Content-Disposition') ? resp.headers.get('Content-Disposition').split('filename=')[1] : `patients_export_${Date.now()}.csv`;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = filename.replace(/"/g,''); document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Export indirildi', 'success');
          return;
        }
        if (resp.status === 403) {
          if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Yasak: Sadece admin kullanıcılar dışa aktarabilir', 'error');
          // fallthrough to client-side fallback
        }
        // For other non-OK responses, fall back to client-side download
      } catch (e) {
        console.warn('Server export failed, falling back to client-side export', e);
      }

      // Fallback to client-side export if server export is not allowed or fails
      if (window.patientManager && typeof window.patientManager.exportAllPatients === 'function') return window.patientManager.exportAllPatients();
      if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Dışa aktarım başarısız', 'error');
    },
    bulkAddTag() { if (window.patientManager && typeof window.patientManager.bulkAddTag === 'function') return window.patientManager.bulkAddTag(); },
    bulkSendSMS() { if (window.patientManager && typeof window.patientManager.bulkSendSMS === 'function') return window.patientManager.bulkSendSMS(); },
    bulkAddTagWithTag(tag) {
      if (!tag) return;
      if (window.patientManager && typeof window.patientManager.bulkAddTag === 'function') {
        // if patientManager has a method accepting tag, prefer it
        if (window.patientManager.bulkAddTagWithTag) return window.patientManager.bulkAddTagWithTag(tag);
      }
      try {
        // fallback: set currentFilters selection and reuse existing bulkAddTag implementation which uses prompt
        // Instead, emulate addition locally
        const ids = Array.from(window.patientManager ? window.patientManager.selectedPatients : []);
        if (!ids || ids.length === 0) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İlk önce seçim yapın', 'error'); return; }
        const pm = window.patientManager || {};
        if (pm.patients) {
          pm.patients.forEach(p => { if (ids.includes(p.id)) { p.tags = Array.isArray(p.tags) ? p.tags.concat(tag).filter((v,i,a)=>a.indexOf(v)===i) : [tag]; } });
          try { localStorage.setItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data', JSON.stringify(pm.patients)); } catch(e){}
        }
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Etiketler eklendi', 'success');
        if (pm.renderPatients) pm.renderPatients();
      } catch(e){ console.error('bulkAddTagWithTag failed', e); }
    },

    bulkSendSMSWithMessage(message) {
      if (!message) return;
      if (window.patientManager && typeof window.patientManager.bulkSendSMSWithMessage === 'function') {
        return window.patientManager.bulkSendSMSWithMessage(message);
      }
      try {
        const ids = Array.from(window.patientManager ? window.patientManager.selectedPatients : []);
        if (!ids || ids.length === 0) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('İlk önce seçim yapın', 'error'); return; }
        const existing = JSON.parse(localStorage.getItem('sms_messages') || '[]');
        const now = new Date().toISOString();
        const toSave = [];
        const pm = window.patientManager || {};
        ids.forEach(id => {
          const p = (pm.patients||[]).find(x => x.id === id);
          if (p) toSave.push({ id: `sms_${Date.now()}_${id}`, patientId: id, phone: p.phone || '', message, createdAt: now });
        });
        localStorage.setItem('sms_messages', JSON.stringify(existing.concat(toSave)));
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('SMS gönderim planlandı (simülasyon)', 'success');
      } catch(e){ console.error('bulkSendSMSWithMessage failed', e); }
    },

    showBulkTagModal() {
      const modal = document.getElementById('bulkTagModal');
      if (!modal) return false;
      // populate datalist with existing tags and segments
      try {
        const dl = document.getElementById('tag-suggestions');
        if (dl) {
          const tagsSet = new Set();
          try {
            if (window.patientManager && Array.isArray(window.patientManager.patients)) {
              window.patientManager.patients.forEach(p => {
                if (Array.isArray(p.tags)) p.tags.forEach(t => { if (t) tagsSet.add(String(t).trim()); });
                if (p.segment) tagsSet.add(String(p.segment).trim());
                if (p.acquisitionType) tagsSet.add(String(p.acquisitionType).trim());
              });
            }
            const saved = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SAVED_TAGS || 'xear_saved_tags') || '[]'); if (Array.isArray(saved)) saved.forEach(t => { if (t) tagsSet.add(String(t).trim()); });
          } catch(e) { console.warn('populate tags datalist failed', e); }
          dl.innerHTML = '';
          Array.from(tagsSet).sort().forEach(t => { const opt = document.createElement('option'); opt.value = t; dl.appendChild(opt); });
        }
      } catch(e) { console.warn('tag suggestions population error', e); }
      modal.classList.remove('hidden');
      const input = document.getElementById('bulkTagInput');
      const confirm = document.getElementById('bulkTagConfirm');
      const close = document.getElementById('bulkTagClose');
      const handler = () => { const tag = input.value; this.bulkAddTagWithTag(tag); modal.classList.add('hidden'); cleanup(); };
      const cleanup = () => { confirm.removeEventListener('click', handler); close.removeEventListener('click', cleanup); };
      confirm.addEventListener('click', handler);
      close.addEventListener('click', cleanup);
      return true;
    },

    showBulkSmsModal() {
      const modal = document.getElementById('bulkSmsModal');
      if (!modal) return false;
      modal.classList.remove('hidden');
      const input = document.getElementById('bulkSmsInput');
      const counter = document.getElementById('bulkSmsCounter');
      const confirm = document.getElementById('bulkSmsConfirm');
      const close = document.getElementById('bulkSmsClose');
      // initialize counter and listeners
      const updateCounter = () => {
        try {
          const len = input.value.length;
          const seg = len === 0 ? 0 : (len <= 160 ? 1 : Math.ceil((len - 160) / 153) + 1);
          if (counter) counter.innerText = `${len} karakter — ${seg} SMS`;
          if (confirm) confirm.disabled = (len === 0);
        } catch (e) { console.warn('updateCounter error', e); }
      };
      input.addEventListener('input', updateCounter);
      updateCounter();
      const handler = () => { const msg = input.value; this.bulkSendSMSWithMessage(msg); modal.classList.add('hidden'); cleanup(); };
      const cleanup = () => { confirm.removeEventListener('click', handler); close.removeEventListener('click', cleanup); input.removeEventListener('input', updateCounter); };
      confirm.addEventListener('click', handler);
      close.addEventListener('click', cleanup);
      return true;
    }
  };

  // Make global convenience functions used by inline handlers call into patientActions
  window.saveCurrentView = function(){ try { if (patientActions.saveCurrentView) patientActions.saveCurrentView(); } catch(e){console.error(e);} };
  window.exportSelected = function(){ try { if (patientActions.exportSelected) patientActions.exportSelected(); } catch(e){console.error(e);} };
  window.exportAllPatients = function(){ try { if (patientActions.exportAllPatients) patientActions.exportAllPatients(); } catch(e){console.error(e);} };
  window.bulkAddTag = function(){ try { if (patientActions.showBulkTagModal && patientActions.showBulkTagModal()) return; if (patientActions.bulkAddTag) patientActions.bulkAddTag(); } catch(e){console.error(e);} };
  window.bulkSendSMS = function(){ try { if (patientActions.showBulkSmsModal && patientActions.showBulkSmsModal()) return; if (patientActions.bulkSendSMS) patientActions.bulkSendSMS(); } catch(e){console.error(e);} };

  // Expose for other modules
  window.patientActions = patientActions;
})();