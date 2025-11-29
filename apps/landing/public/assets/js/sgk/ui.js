// SGK UI rendering functions extracted from inline sgk.html
(function (global) {
  function displayOCRResults() {
    try {
      const ocrResults = document.getElementById('ocrResults');
      const ocrResultsList = document.getElementById('ocrResultsList');
      const processingStatus = document.getElementById('processingStatus');
      if (!ocrResults || !ocrResultsList || !processingStatus) return;

      if (!window.processedDocuments || window.processedDocuments.length === 0) {
        ocrResults.classList.add('hidden');
        processingStatus.classList.add('hidden');
        return;
      }

      ocrResults.classList.remove('hidden');
      processingStatus.classList.remove('hidden');
      ocrResultsList.innerHTML = '';

      window.processedDocuments.forEach((doc, index) => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded p-4 shadow';
        card.innerHTML = `\n          <div class="flex justify-between items-start">\n            <div>\n              <div class="font-medium">${doc.fileName}</div>\n              <div class="mt-1">${(function(d){ if (d && d.nlpReady && d.nlpResults) { return '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">🔒 Sunucu doğrulandı ' + Math.round((d.nlpResults.confidence||0)*100) + '%</span>'; } if (d && d.nlpAttempted && !d.nlpReady) { return '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">☁️ Sunucu denendi (yanıt yok)</span>'; } if (window.sgkPipeline && window.sgkPipeline.nlpEnabled) { return '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">☁️ Sunucu mevcut değil</span>'; } return '<span class="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">—</span>'; })(doc)}</div>\n              <div class="text-xs text-gray-500 mt-1">${doc.documentType?.displayName || doc.documentType?.type || 'Bilinmeyen'}</div>\n            </div>\n            <div class="text-right text-xs text-gray-500">\n              <div>Durum: ${doc.status}</div>\n              <div>OCR: ${Math.round((doc.ocrConfidence || 0) * 100) / 100}</div>\n            </div>\n          </div>\n          <div class="mt-3 text-sm text-gray-700">\n            ${((doc.extractedText || doc.ocrText) || '').substring(0, 300)}...\n          </div>\n          <div class="mt-3 flex items-center justify-between">\n            <div class="flex items-center gap-2">\n              <!-- Search input replaces the old select - shows live results from backend/local -->\n              <div class=\"w-80 relative\">\n                <input id=\"patientSearchInput-${index}\" type=\"text\" placeholder=\"Hasta ara: isim, soyisim, veya TC\" class=\"w-full border rounded px-2 py-1 text-sm\" autocomplete=\"off\" />\n                <div id=\"patientSearchResults-${index}\" class=\"absolute left-0 right-0 bg-white border rounded mt-1 max-h-80 overflow-auto z-50 hidden\" style="max-height:40vh;"></div>\n              </div>\n              <button onclick=\"openPatientAssignmentModalFromCard(${index})\" class=\"text-sm px-2 py-1 bg-gray-100 rounded\">Gelişmiş</button>\n            </div>\n            <div class=\"flex items-center gap-2\">\n              <button onclick=\"previewDocument(${index})\" class=\"text-sm px-3 py-1 bg-gray-100 rounded\">Önizle</button>\n              <button onclick=\"saveDocumentToPatient(processedDocuments[${index}])\" class=\"text-sm px-3 py-1 bg-green-100 rounded\">Kaydet</button>\n            </div>\n          </div>\n        `;
        ocrResultsList.appendChild(card);

        // Wire up patient search for this card
        try { setupPatientSearchForCard(index, doc); } catch (err) { console.warn('setupPatientSearchForCard failed for', index, err); }
      });

      // Update statistics counters
      document.getElementById('successCount').textContent = (window.processedDocuments.filter(d => d.status === 'auto_matched' || d.status === 'manual_matched').length || 0);
      document.getElementById('failureCount').textContent = (window.processedDocuments.filter(d => d.status === 'error').length || 0);
      document.getElementById('manualCount').textContent = (window.processedDocuments.filter(d => d.status === 'manual_review').length || 0);

    } catch (error) {
      console.error('displayOCRResults error:', error);
    }
  }

  // Setup a live patient search UI for a specific card index
  function setupPatientSearchForCard(index, doc) {
    const input = document.getElementById(`patientSearchInput-${index}`);
    const resultsContainer = document.getElementById(`patientSearchResults-${index}`);
    if (!input || !resultsContainer) return;

    // Helper to render results (name + tc shown)
    const renderResults = (list) => {
      if (!list || !list.length) {
        resultsContainer.innerHTML = `<div class="p-2 text-sm text-gray-500">Sonuç yok</div>`;
        resultsContainer.classList.remove('hidden');
        return;
      }
      resultsContainer.innerHTML = list.map(p => `
        <div class="p-2 border-b cursor-pointer hover:bg-gray-50" data-patient-id="${p.id}">
          <div class="text-sm font-medium">${p.name}</div>
          <div class="text-xs text-gray-500">TC: ${p.tcNumber || 'N/A'} • ${p.phone || ''}</div>
        </div>
      `).join('');
      resultsContainer.classList.remove('hidden');
      Array.from(resultsContainer.querySelectorAll('[data-patient-id]')).forEach(el => {
        el.addEventListener('click', () => {
          const pid = el.getAttribute('data-patient-id');
          selectPatientFromSearch(index, pid);
        });
      });
    };

    const debounce = (fn, wait=250) => { let t = null; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn.apply(this, args), wait); }; };

    // Make the core search logic available synchronously for Enter handling
    const doSearch = async (q) => {
      // Only kick off searches for meaningful queries (>=2 chars)
      if (!q || q.trim().length < 2) {
        resultsContainer.classList.add('hidden');
        return;
      }
      const query = q.trim();
      const isDigits = /^\d+$/.test(query.replace(/\D/g,''));

      // If the query is mostly digits, treat as partial TC search
      if (isDigits && query.length >= 3) {
        const localPatients = (window.patientDatabase || window.patients || window.sampleData?.patients || []);
        const cleanedQ = query.replace(/\D/g,'');
        // Find candidates by TC suffix or inclusion and rank by match length
        const candidates = localPatients.map(p => {
          const tc = String(p.tcNumber || p.tcNo || p.identityNumber || '');
          const cleanedTc = tc.replace(/\D/g,'');
          if (!cleanedTc) return null;
          if (cleanedTc.endsWith(cleanedQ)) return { id: p.id, name: p.name, tcNumber: tc, score: 3 + Math.min(cleanedQ.length, 11) };
          if (cleanedTc.includes(cleanedQ)) return { id: p.id, name: p.name, tcNumber: tc, score: 1 + Math.min(cleanedQ.length, 11) };
          return null;
        }).filter(Boolean).sort((a,b)=>b.score - a.score);

        if (candidates.length > 0) {
          renderResults(candidates.map(c => ({ id: c.id, name: c.name, tcNumber: c.tcNumber })));
          return;
        }
        // fallback to text search if no tc hits
      }

      // Try backend search first
      if (window.BackendServiceManager && window.BackendServiceManager.getService) {
        try {
          const svc = window.BackendServiceManager.getService('patients');
          const resp = await svc.search(q, { per_page: 50 });
          const found = (resp && resp.patients) ? resp.patients : (Array.isArray(resp) ? resp : (resp && resp.data ? resp.data : []));
          renderResults(found.map(normalizePatientShape));
          return;
        } catch (err) { console.warn('Backend patient search failed, falling back to local', err); }
      }

      // Local fallback
      const localPatients = (window.patientDatabase || window.patients || window.sampleData?.patients || []);
      const filtered = localPatients.filter(p => {
        const hay = `${p.name || ''} ${p.tcNumber || ''} ${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      }).map(normalizePatientShape);
      renderResults(filtered.slice(0, 50));
    };

    const performSearch = debounce(doSearch, 250);

    input.addEventListener('input', (e) => performSearch(e.target.value));
    // Do not auto-open suggestions on focus to avoid dropdown behavior on prefill; suggestions appear only on input or Enter
    // (user can press ArrowDown or type to open suggestions)
    input.addEventListener('blur', (e) => setTimeout(()=>resultsContainer.classList.add('hidden'), 200));

    // Handle Enter key: run immediate search and select first result if present
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await doSearch(input.value || '');
        const first = resultsContainer.querySelector('[data-patient-id]');
        if (first) {
          const pid = first.getAttribute('data-patient-id');
          selectPatientFromSearch(index, pid);
        }
      }
    });

    // Seed input with extracted name if present but DO NOT auto-open suggestions; open only on user action
    if (doc && doc.extractedPatientInfo && doc.extractedPatientInfo.name) {
      const prefill = doc.extractedPatientInfo.name;
      input.value = prefill;
      // Do not call performSearch(prefill) here; let user trigger by typing or focusing and editing
    }
    // Initial render
    performSearch(input.value || '');
  }

  function normalizePatientShape(p) {
    // Ensure consistent {id, name, tcNumber, phone}
    return { id: p.id || p.patient_id || p._id || (p.tcNumber? 't-'+p.tcNumber : null), name: p.name || `${p.firstName||''} ${p.lastName||''}`.trim(), tcNumber: p.tcNumber || p.tc || p.identityNumber || '', phone: p.phone || p.mobile || '' };
  }

  function selectPatientFromSearch(index, patientId) {
    try {
      const doc = window.processedDocuments[index];
      if (!doc) return;
      // Find patient in local caches first
      const all = (window.patientDatabase || window.patients || window.sampleData?.patients || []);
      let patient = all.find(p => String(p.id) === String(patientId) || String(p.tcNumber) === String(patientId));
      if (!patient && window.BackendServiceManager && window.BackendServiceManager.getService) {
        // Try to fetch from backend synchronously
        window.BackendServiceManager.getService('patients').getById(patientId).then(resp => {
          const remote = resp && (resp.patient || resp || null);
          if (remote) {
            patient = normalizePatientShape(remote);
            applySelectedPatient(index, patient);
          }
        }).catch(err => { console.warn('Failed to fetch patient by id', err); });
      } else if (patient) {
        applySelectedPatient(index, patient);
      }
    } catch (err) { console.error('selectPatientFromSearch error', err); }
  }

  function applySelectedPatient(index, patient) {
    try {
      const doc = window.processedDocuments[index]; if (!doc) return;
      doc.matchedPatient = { id: patient.id, name: patient.name, tcNumber: patient.tcNumber, matchConfidence: 1.0 };
      doc.status = 'auto_matched';
      // Close dropdown if present
      const resultsContainer = document.getElementById(`patientSearchResults-${index}`); if (resultsContainer) resultsContainer.classList.add('hidden');
      displayOCRResults();
    } catch (err) { console.error('applySelectedPatient error', err); }
  }

  function openPatientAssignmentModalFromCard(index) {
    const doc = window.processedDocuments[index]; if (!doc) return; if (!window.sgkPipeline) { Utils.showToast('SGK pipeline yüklü değil','error'); return; } window.sgkPipeline.showPatientAssignmentModal({ id: doc.id, patientMatch: doc.pipelineData?.patientMatch || doc.patientMatch || {}, extractedInfo: doc.extractedPatientInfo || {} }); }

  function getPreviewSrc(doc) {
    try {
      if (!doc) return null;
      // Prioritize explicit image fields
      if (doc.originalImage && typeof doc.originalImage === 'string' && !doc.originalImage.endsWith('undefined')) return doc.originalImage;
      if (doc.imageData && typeof doc.imageData === 'string' && !doc.imageData.endsWith('undefined')) return doc.imageData;
      if (doc.croppedImage && typeof doc.croppedImage === 'string') return doc.croppedImage;
      if (doc.fileData && typeof doc.fileData === 'string') return doc.fileData;
      // If there's a compressed PDF data uri, return that (UI will embed as iframe)
      if (doc.compressedPDF && doc.compressedPDF.data && typeof doc.compressedPDF.data === 'string') return doc.compressedPDF.data;
      // Last resort: try to find a preview in pipelineData
      if (doc.pipelineData) {
        if (doc.pipelineData.originalImageData) return doc.pipelineData.originalImageData;
        if (doc.pipelineData.croppedImageData) return doc.pipelineData.croppedImageData;
      }
      return null;
    } catch (e) { console.warn('getPreviewSrc error', e); return null; }
  }

  function previewDocument(index) {
    const doc = global.processedDocuments[index];
    if (!doc) return;
    const previewSrc = getPreviewSrc(doc);
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

    // Controls bar + viewport that will contain the media
    modal.innerHTML = `\n      <div class="bg-white rounded-lg p-2 max-w-5xl w-[90%] max-h-[90vh] flex flex-col">\n        <div class="flex items-center justify-between px-4 py-2 border-b">\n          <h3 class="text-lg font-semibold">${doc.fileName} - Hızlı Görüntüle</h3>\n          <div class=\"flex items-center gap-2\">\n            <button id=\"zoomOutBtn\" class=\"px-2 py-1 bg-gray-100 rounded text-sm\">-</button>\n            <button id=\"zoomResetBtn\" class=\"px-2 py-1 bg-gray-100 rounded text-sm\">100%</button>\n            <button id=\"zoomInBtn\" class=\"px-2 py-1 bg-gray-100 rounded text-sm\">+</button>\n            <button id=\"fitBtn\" class=\"px-2 py-1 bg-gray-100 rounded text-sm\">Sığdır</button>\n            <button id=\"closePreviewBtn\" class=\"px-2 py-1 bg-white rounded text-gray-600 hover:text-black\">Kapat</button>\n          </div>\n        </div>\n        <div class=\"preview-viewport flex-1 p-4 overflow-auto bg-gray-50\" style=\"touch-action: none;\">\n          <div class=\"preview-media flex items-center justify-center\" style=\"transform-origin: center center;\">\n            ${previewSrc ? (previewSrc.startsWith('data:application/pdf') || previewSrc.endsWith('.pdf') ? `<iframe src=\"${previewSrc}\" class=\"w-full h-[70vh] border rounded\"></iframe>` : `<img src=\"${previewSrc}\" alt=\"Document\" class=\"max-w-full h-auto\" style=\"display:block;\">`) : `<div class=\"h-64 flex items-center justify-center bg-gray-100 border rounded text-sm text-gray-500\">Önizleme mevcut değil</div>`}
          </div>
        </div>\n        <div class=\"px-4 py-2 text-xs text-gray-500\">İpucu: + / - ile yakınlaştırın, resim üzerinde sürükleyerek taşıyın.</div>\n      </div>\n    `;

    document.body.appendChild(modal);

    // Wire up controls
    try {
      const viewport = modal.querySelector('.preview-viewport');
      const mediaWrapper = modal.querySelector('.preview-media');
      const imgEl = mediaWrapper ? mediaWrapper.querySelector('img') : null;
      const iframeEl = mediaWrapper ? mediaWrapper.querySelector('iframe') : null;

      let scale = 1.0;
      let translateX = 0;
      let translateY = 0;
      let isPanning = false;
      let panStart = { x: 0, y: 0 };

      const minScale = 0.25;
      const maxScale = 6.0;
      const step = 0.2;

      const updateTransform = () => {
        if (!mediaWrapper) return;
        // Use CSS transform for both image and iframe containers so panning and zoom apply consistently
        mediaWrapper.style.transition = 'transform 0.08s ease-out';
        mediaWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      };

      const zoomTo = (newScale) => {
        scale = Math.max(minScale, Math.min(maxScale, newScale));
        // When scaling down to fit, reset translation
        if (scale <= 1) { translateX = 0; translateY = 0; }
        updateTransform();
      };

      const zoomInBtn = modal.querySelector('#zoomInBtn');
      const zoomOutBtn = modal.querySelector('#zoomOutBtn');
      const zoomResetBtn = modal.querySelector('#zoomResetBtn');
      const fitBtn = modal.querySelector('#fitBtn');
      const closeBtn = modal.querySelector('#closePreviewBtn');

      zoomInBtn.addEventListener('click', () => { zoomTo(scale + step); zoomResetBtn.textContent = Math.round(scale * 100) + '%'; });
      zoomOutBtn.addEventListener('click', () => { zoomTo(scale - step); zoomResetBtn.textContent = Math.round(scale * 100) + '%'; });
      zoomResetBtn.addEventListener('click', () => { zoomTo(1.0); zoomResetBtn.textContent = '100%'; });
      fitBtn.addEventListener('click', () => { zoomTo(1.0); zoomResetBtn.textContent = 'Sığdır'; viewport.scrollTop = 0; viewport.scrollLeft = 0; });
      closeBtn.addEventListener('click', () => modal.remove());

      // Mouse wheel to zoom when Ctrl or Meta pressed, otherwise let scrolling work
      viewport.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -step : step;
          zoomTo(scale + delta);
          zoomResetBtn.textContent = Math.round(scale * 100) + '%';
        }
      }, { passive: false });

      // Mouse drag to pan (when scaled > 1)
      mediaWrapper.addEventListener('pointerdown', (e) => {
        if (scale <= 1) return; // only pan when zoomed
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        mediaWrapper.style.cursor = 'grabbing';
        mediaWrapper.setPointerCapture(e.pointerId);
      });

      mediaWrapper.addEventListener('pointermove', (e) => {
        if (!isPanning) return;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        panStart = { x: e.clientX, y: e.clientY };
        translateX += dx;
        translateY += dy;
        updateTransform();
      });

      mediaWrapper.addEventListener('pointerup', (e) => {
        if (!isPanning) return; isPanning = false; mediaWrapper.style.cursor = 'grab'; mediaWrapper.releasePointerCapture && mediaWrapper.releasePointerCapture(e.pointerId);
      });

      mediaWrapper.addEventListener('pointerleave', (e) => { if (isPanning) { isPanning = false; mediaWrapper.style.cursor = 'grab'; } });

      // Make media draggable cursor when zoomed
      mediaWrapper.style.cursor = 'grab';

      // Ensure mediaWrapper has transform-origin set and is display:block for transform to apply
      mediaWrapper.style.display = 'flex';
      mediaWrapper.style.alignItems = 'center';
      mediaWrapper.style.justifyContent = 'center';
      mediaWrapper.style.width = '100%';
      mediaWrapper.style.height = '100%';

      // When an image loads, reset natural sizing and center view
      if (imgEl) {
        imgEl.addEventListener('load', () => {
          // reset any previous transforms
          scale = 1; translateX = 0; translateY = 0; updateTransform();
        });
      }

      // If iframe (pdf) present, apply same initial state
      if (iframeEl) {
        scale = 1; translateX = 0; translateY = 0; updateTransform();
      }

    } catch (err) {
      console.warn('Preview modal controls setup failed', err);
    }
  }

  function updateDocumentType(index, type) {
    const doc = global.processedDocuments[index];
    if (!doc) return;
    const typeMap = {
      'cihaz_recete': 'Cihaz Reçete',
      'pil_recete': 'Pil Reçete',
      'odyogram': 'Odyogram',
      'uygunluk_belgesi': 'Uygunluk Belgesi',
      'sgk_raporu': 'SGK Raporu',
      'diger': 'Diğer'
    };
    doc.documentType = { type: type, displayName: typeMap[type] || 'Bilinmiyor', confidence: 1.0 };
    Utils.showToast(`Belge türü "${typeMap[type] || type}" olarak güncellendi`, 'success');
    displayOCRResults();
  }

  function updatePatientMatch(index, patientId) {
    const doc = global.processedDocuments[index];
    if (!doc) return;
    const patients = (window.patientDatabase || window.patients || []);
    const patient = patients.find(p => String(p.id) === String(patientId));
    if (!patient) return;
    doc.matchedPatient = { id: patient.id, name: patient.name, matchConfidence: 1.0 };
    doc.status = 'auto_matched';
    displayOCRResults();
  }

  function getPatientOptions() {
    const patients = (window.patientDatabase || window.patients || []);
    return patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  function getStatusBadgeClass(status) {
    const statusClasses = {
      'Sorgulandı': 'bg-blue-100 text-blue-800',
      'Reçete Kaydedildi': 'bg-indigo-100 text-indigo-800',
      'Malzeme Teslim Edildi': 'bg-purple-100 text-purple-800',
      'Belgeler Yüklendi': 'bg-green-100 text-green-800',
      'Faturalandı': 'bg-yellow-100 text-yellow-800',
      'Ödemesi Alındı': 'bg-emerald-100 text-emerald-800',
      'Bekleyen': 'bg-gray-100 text-gray-800',
      'Reddedilen': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  function getPatientName(patientId) {
    try {
      const patients = window.sgkPipeline ? window.sgkPipeline.getAllPatients() : (window.patientDatabase || window.patients || []);
      const patient = patients.find(p => String(p.id) === String(patientId));
      return patient ? patient.name : 'Bilinmeyen Hasta';
    } catch (error) { return 'Bilinmeyen Hasta'; }
  }

  function getPatientTC(patientId) {
    try {
      const patients = window.sgkPipeline ? window.sgkPipeline.getAllPatients() : (window.patientDatabase || window.patients || []);
      const patient = patients.find(p => String(p.id) === String(patientId));
      return patient ? patient.tcNumber : null;
    } catch (error) { return null; }
  }

  function getSGKStatusFromWorkflow(patientId) {
    try {
      if (window.sgkPipeline && typeof window.sgkPipeline.getPatientSGKWorkflowStatus === 'function') {
        const workflowStatus = window.sgkPipeline.getPatientSGKWorkflowStatus(patientId);
        return workflowStatus ? workflowStatus.currentStatusInfo?.label : null;
      }
      return null;
    } catch (error) { return null; }
  }

  function loadSGKReports() {
    try {
      const reportsTableBody = document.getElementById('reports-table-body');
      if (!reportsTableBody) return;

      const sgkReports = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SGK_REPORTS || 'sgk_reports') || '[]');
        const sgkDocs = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SGK_DOCUMENTS || 'xear_sgk_documents') || '[]');
        const patientDocs = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS_DOCUMENTS || 'xear_patients_documents') || '{}');

      let allReports = [];
      allReports = allReports.concat(sgkReports.map(report => ({
        id: report.id,
        patientName: report.patientName,
        patientId: report.patientId,
        tcNumber: report.tcNumber || getPatientTC(report.patientId),
        reportType: report.reportType,
        date: new Date(report.saveDate || report.uploadDate).toLocaleDateString('tr-TR'),
        status: getSGKStatusFromWorkflow(report.patientId) || report.status || 'Belgeler Yüklendi',
        filename: report.filename,
        source: 'sgk_reports'
      })));

      sgkDocs.forEach(doc => {
        if (doc.savedToPatient && doc.patientId && doc.patientName && !allReports.find(r => r.id === doc.id)) {
          allReports.push({
            id: doc.id,
            patientName: doc.patientName,
            patientId: doc.patientId,
            tcNumber: getPatientTC(doc.patientId),
            reportType: doc.documentType?.label || doc.documentType?.name || 'Belge',
            date: new Date(doc.saveDate || doc.uploadDate).toLocaleDateString('tr-TR'),
            status: getSGKStatusFromWorkflow(doc.patientId) || 'Belgeler Yüklendi',
            filename: doc.filename,
            source: 'sgk_pipeline'
          });
        }
      });

      Object.entries(patientDocs).forEach(([patientId, docs]) => {
        if (!Array.isArray(docs)) return;
        docs.forEach(doc => {
          if (!allReports.find(r => r.id === doc.id)) {
            allReports.push({
              id: doc.id,
              patientName: doc.patientName || getPatientName(patientId),
              patientId: patientId,
              tcNumber: getPatientTC(patientId),
              reportType: doc.documentType?.label || doc.documentType?.name || 'Belge',
              date: new Date(doc.saveDate || doc.uploadDate || doc.processingDate).toLocaleDateString('tr-TR'),
              status: getSGKStatusFromWorkflow(patientId) || 'Belgeler Yüklendi',
              filename: doc.filename,
              source: 'patient_docs'
            });
          }
        });
      });

      allReports.sort((a, b) => new Date(b.date.split('.').reverse().join('-')) - new Date(a.date.split('.').reverse().join('-')));

      if (allReports.length === 0) {
        reportsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">Henüz kaydedilmiş belge bulunmuyor</td></tr>`;
      } else {
        const patientGroups = {};
        allReports.forEach(report => {
          const key = `${report.patientId}_${report.patientName}`;
          if (!patientGroups[key]) patientGroups[key] = { patientId: report.patientId, patientName: report.patientName, tcNumber: report.tcNumber, documents: [], reportTypes: new Set() };
          patientGroups[key].documents.push(report);
          patientGroups[key].reportTypes.add(report.reportType);
        });

        reportsTableBody.innerHTML = Object.values(patientGroups).map(group => {
          const hasIsitmeRaporu = Array.from(group.reportTypes).some(type => type.includes('İşitme') || type.includes('cihaz'));
          const hasPilRaporu = Array.from(group.reportTypes).some(type => type.includes('Pil') || type.includes('Battery'));
          let requiredDocs = [];
          if (hasIsitmeRaporu) requiredDocs.push('Reçete', 'Odyogram', 'Uygunluk Belgesi');
          if (hasPilRaporu) requiredDocs.push('Pil Reçetesi');
          const patientDocs = [];
          group.documents.forEach(doc => { const docType = mapDocumentTypeToDisplay(doc.reportType); if (!patientDocs.includes(docType)) patientDocs.push(docType); });
          const missingDocs = requiredDocs.filter(req => !patientDocs.includes(req));
          const warningIcon = missingDocs.length ? `<span class="inline-flex items-center ml-2 text-amber-500" title="Eksik belgeler: ${missingDocs.join(', ')}">⚠️</span>` : '';
          const latestDoc = group.documents.sort((a,b)=> new Date(a.date) - new Date(b.date))[0];
          let mainReportType = 'Belge';
          if (hasIsitmeRaporu && hasPilRaporu) mainReportType = 'İşitme Cihazı + Pil Raporu';
          else if (hasIsitmeRaporu) mainReportType = 'İşitme Cihazı Raporu';
          else if (hasPilRaporu) mainReportType = 'Pil Raporu';

          return `\n          <tr class="hover:bg-gray-50">\n            <td class="px-6 py-4">\n              <div class="flex items-center">\n                <button onclick="openPatientDetails('${group.patientId}')" class="text-sm font-medium text-indigo-600">${group.patientName}</button>\n                ${warningIcon}\n              </div>\n              <div class="text-xs text-gray-500">${patientDocs.join(', ')}</div>\n            </td>\n            <td class="px-6 py-4 text-sm text-gray-500">${group.tcNumber || 'Bilinmiyor'}</td>\n            <td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${mainReportType}</span></td>\n            <td class="px-6 py-4 text-sm text-gray-500">${latestDoc.date}</td>\n            <td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(latestDoc.status)}">${latestDoc.status}</span></td>\n            <td class="px-6 py-4 text-right text-sm font-medium">\n              <button onclick="viewPatientReports('${group.patientId}')" class="text-indigo-600 mr-3">Görüntüle</button>\n              <button onclick="downloadPatientReports('${group.patientId}')" class="text-green-600">İndir</button>\n            </td>\n          </tr>\n        `;
        }).join('');
      }
    } catch (error) {
      console.error('Failed to load SGK reports:', error);
      const reportsTableBody = document.getElementById('reports-table-body');
      if (reportsTableBody) {
        reportsTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">SGK raporları yüklenirken hata oluştu: ${String(error?.message || error)}</td></tr>`;
      }
    }
  }

  function openPatientDetails(patientId) {
    try {
      if (window.location.pathname.includes('patient-details.html')) {
        if (window.patientDetailsManager && window.patientDetailsManager.loadPatient) {
          window.patientDetailsManager.loadPatient(patientId);
          setTimeout(() => { const documentsTab = document.querySelector('[data-tab="documents"]'); if (documentsTab) documentsTab.click(); }, 500);
        }
      } else {
        const baseUrl = window.location.origin + window.location.pathname.replace('sgk.html', 'patient-details.html');
        const url = `${baseUrl}?patient=${patientId}&tab=documents`;
        window.open(url, '_blank');
      }
    } catch (error) { console.error('Failed to open patient details:', error); alert('Hasta detayları açılırken hata oluştu: ' + error.message); }
  }

  async function viewPatientReports(patientId) {
    try {
      const sgkDocs = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SGK_DOCUMENTS || 'xear_sgk_documents') || '[]');
        const patientDocs = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS_DOCUMENTS || 'xear_patients_documents') || '{}');
      const patientSpecificDocs = JSON.parse(localStorage.getItem(`xear_patient_documents_${patientId}`) || '[]');
      let patientReports = [];
      patientReports = patientReports.concat(sgkDocs.filter(d => d.patientId === patientId));
      if (patientDocs[patientId]) patientReports = patientReports.concat(patientDocs[patientId]);
      if (Array.isArray(patientSpecificDocs)) patientReports = patientReports.concat(patientSpecificDocs);
      if (window.SGK?.storageManager) {
        try { const additionalDocs = await window.SGK.storageManager.retrievePatientDocuments(patientId); if (additionalDocs && additionalDocs.length) patientReports = patientReports.concat(additionalDocs); } catch (e) { console.warn('Could not retrieve unlimited storage docs:', e); }
      }
      if (patientReports.length === 0) { alert('Bu hasta için belge bulunamadı.'); return; }
      showPatientReportsModal(patientId, patientReports);
    } catch (error) { console.error('Failed to load patient reports:', error); alert('Hasta belgeleri yüklenirken hata oluştu: ' + error.message); }
  }

  function downloadPatientReports(patientId) { alert(`Hasta belgeleri indiriliyor: ${patientId}\n(Bu özellik henüz geliştirilmektedir)`); }

  function showPatientReportsModal(patientId, reports) {
    const modalHtml = `\n    <div id="patient-reports-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">\n      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden m-4">\n        <div class="p-6 border-b border-gray-200 flex justify-between items-center">\n          <h3 class="text-lg font-semibold text-gray-900">Hasta Belgeleri</h3>\n          <button onclick="closePatientReportsModal()" class="text-gray-400 hover:text-gray-600">×</button>\n        </div>\n        <div class="p-6 overflow-y-auto max-h-[70vh]">\n          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n            ${reports.map(doc => `\n              <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">\n                <div class="flex items-center justify-between mb-2">\n                  <span class="text-sm font-medium text-gray-900">${mapDocumentTypeToDisplay(doc.documentType?.label || doc.reportType || 'Belge')}</span>\n                  <span class="text-xs text-gray-500">${new Date(doc.saveDate || doc.uploadDate).toLocaleDateString('tr-TR')}</span>\n                </div>\n                <div class="text-xs text-gray-600 mb-3">${doc.filename || doc.originalName || 'Dosya adı bilinmiyor'}</div>\n                <div class="flex space-x-2">\n                  <button onclick="viewDocument('${doc.id}')" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Görüntüle</button>\n                  <button onclick="downloadDocument('${doc.id}')" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">İndir</button>\n                </div>\n              </div>\n            `).join('')}\n          </div>\n        </div>\n      </div>\n    </div>\n  `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  function closePatientReportsModal() { const modal = document.getElementById('patient-reports-modal'); if (modal) modal.remove(); }

  function viewDocument(documentId) { alert(`Belge görüntüleniyor: ${documentId}\n(Bu özellik henüz geliştirilmektedir)`); }

  async function downloadDocument(documentId) {
    try {
      let document = (global.processedDocuments || []).find(d => d.id === documentId);
      if (document && document.compressedPDF) {
        const pdfBlob = document.compressedPDF;
        const filename = `${document.filename || 'belge'}.pdf`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        return;
      }

      // Fallback: look through storages
      if (!document) {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(window.STORAGE_KEYS?.PATIENT_DOCUMENTS_ || 'xear_patient_documents_') || k === 'xear_sgk_documents');
        for (const key of keys) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (Array.isArray(data)) {
              document = data.find(d => d.id === documentId);
            } else if (data && data.documents && Array.isArray(data.documents)) {
              document = data.documents.find(d => d.id === documentId);
            }
            if (document) break;
          } catch (e) { continue; }
        }
      }

      if (document) {
        const docInfo = `SGK Belge Bilgisi\n\nDosya Adı: ${document.filename || document.originalName || 'Belge'}\nHasta Adı: ${document.patientName || 'Bilinmiyor'}\nOCR Metni:\n${document.ocrText || 'OCR metni mevcut değil'}`;
        const blob = new Blob([docInfo], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${document.filename || 'belge'}_bilgi.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        alert('Belge bilgileri text dosyası olarak indirildi.');
      } else {
        alert('Belge bulunamadı: ' + documentId);
      }
    } catch (error) { console.error('Download error:', error); alert('Belge indirilirken hata oluştu: ' + error.message); }
  }

  function createSampleSGKReports() {
    try {
      const sampleReports = [
        { id: 'sample_report_1', patientName: 'Elif Özkan', tcNumber: '12345678901', reportType: 'İşitme Cihazı Raporu', filename: 'Elif_Ozkan_Isitme_Raporu.pdf', uploadDate: new Date(Date.now() - 5*24*60*60*1000).toISOString(), saveDate: new Date(Date.now() - 5*24*60*60*1000).toISOString(), status: 'documents_uploaded', source: 'test_data' },
        { id: 'sample_report_2', patientId: 'p2', patientName: 'Murat Demir', tcNumber: '98765432109', reportType: 'Pil Raporu', filename: 'Murat_Demir_Pil_Raporu.pdf', uploadDate: new Date(Date.now() - 3*24*60*60*1000).toISOString(), saveDate: new Date(Date.now() - 3*24*60*60*1000).toISOString(), status: 'documents_uploaded', source: 'test_data' }
      ];
      const existing = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SGK_REPORTS || 'sgk_reports') || '[]');
      sampleReports.forEach(r => { if (!existing.find(e => e.id === r.id)) existing.push(r); });
      localStorage.setItem(window.STORAGE_KEYS?.SGK_REPORTS || 'sgk_reports', JSON.stringify(existing));
      loadSGKReports();
    } catch (error) { console.error('Failed to create sample reports:', error); }
  }

  function mapDocumentTypeToDisplay(type) {
    const names = { 'cihaz_recete':'Cihaz Reçetesi','pil_recete':'Pil Reçetesi','recete':'Reçete','odyo':'Odyometri','uygunluk':'Uygunluk Raporu','muayene_raporu':'Muayene Raporu','other':'Diğer Belge' };
    return names[type] || names['other'];
  }

  // Export UI functions
  global.SGK = global.SGK || {};
  global.SGK.ui = global.SGK.ui || {};
  Object.assign(global.SGK.ui, {
    displayOCRResults,
    previewDocument,
    updateDocumentType,
    updatePatientMatch,
    getPatientOptions,
    loadSGKReports,
    openPatientDetails,
    viewPatientReports,
    downloadPatientReports,
    showPatientReportsModal,
    downloadDocument,
    createSampleSGKReports,
    getSGKStatusFromWorkflow
  });

  // Also expose some functions globally for inline onclicks preserved in templates
  window.displayOCRResults = displayOCRResults;
  window.previewDocument = previewDocument;
  window.updateDocumentType = updateDocumentType;
  window.updatePatientMatch = updatePatientMatch;
  window.getPatientOptions = getPatientOptions;
  window.openPatientDetails = openPatientDetails;
  window.viewPatientReports = viewPatientReports;
  window.downloadPatientReports = downloadPatientReports;
  window.downloadDocument = downloadDocument;
  window.createSampleSGKReports = createSampleSGKReports;

})(window);
