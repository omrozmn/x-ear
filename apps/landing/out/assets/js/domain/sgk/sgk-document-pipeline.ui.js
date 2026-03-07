(function(){
  if (typeof SGKDocumentPipeline === 'undefined') return;
  const proto = SGKDocumentPipeline.prototype;

  proto.showInPatientDocuments = function(document) {
    try {
      const documentsContainer = document.querySelector('[data-document-list]') || document.querySelector('.documents-list') || document.querySelector('#documentsTab');
      if (documentsContainer) this.renderDocumentInUI(document, documentsContainer);
      Utils.showToast(`SGK belgesi başarıyla yüklendi: ${document.filename}`, 'success');
      this.updateDocumentStats();
    } catch (error) { console.error('UI update failed:', error); }
  };

  proto.renderDocumentInUI = function(document, container) {
    try {
      const nlpBadge = (document && document.nlpReady && document.nlpResults) ? `<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">🔒 Sunucu doğrulandı ${Math.round((document.nlpResults.confidence||0)*100)}%</span>` : (document && document.nlpAttempted ? `<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">☁️ Sunucu denendi</span>` : (this.nlpEnabled ? `<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">☁️ Sunucu yok</span>` : `<span class="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">—</span>`));

      const documentHTML = `
        <div class="bg-white border border-gray-200 rounded-lg p-4 mb-3" data-document-id="${document.id}">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2 mb-2">
                <span class="text-lg">${this.getTypeIcon(document.documentType)}</span>
                <h4 class="font-medium text-gray-900">${this.getTypeDisplayName(document.documentType)}</h4>
                ${nlpBadge}
              </div>
              <div class="text-sm text-gray-600 mb-2">
                <p><strong>Dosya:</strong> ${document.filename}</p>
                <p><strong>Yüklenme:</strong> ${new Date(document.uploadDate).toLocaleString('tr-TR')}</p>
              </div>
            </div>
            <div class="flex flex-col space-y-2 ml-4">
              <button onclick="sgkPipeline.downloadDocument('${document.id}')" class="px-3 py-1 bg-blue-500 text-white text-xs rounded">📄 İndir</button>
              <button onclick="sgkPipeline.viewDocument('${document.id}')" class="px-3 py-1 bg-gray-500 text-white text-xs rounded">👁️ Görüntüle</button>
            </div>
          </div>
        </div>`;

      const root = container || document.querySelector('[data-document-list]') || document.querySelector('.documents-list') || document.querySelector('#documentsTab');
      if (!root) return;
      const existing = root.querySelector(`[data-document-id="${document.id}"]`);
      if (existing) existing.outerHTML = documentHTML; else root.insertAdjacentHTML('afterbegin', documentHTML);
    } catch (err) { console.error('UI pipeline renderDocumentInUI failed:', err); }
  };

  proto.getTypeIcon = function(type) { const icons = { 'cihaz_recete':'🏥','pil_recete':'🔋','recete':'📋','odyo':'🎧','uygunluk':'✅','muayene_raporu':'📝','other':'📄' }; return icons[type] || icons['other']; };
  proto.getTypeDisplayName = function(type) { const names = { 'cihaz_recete':'Cihaz Reçetesi','pil_recete':'Pil Reçetesi','recete':'Reçete','odyo':'Odyometri','uygunluk':'Uygunluk Raporu','muayene_raporu':'Muayene Raporu','other':'Diğer Belge' }; return names[type] || names['other']; };

  proto.formatFileSize = function(bytes) { if (bytes===0) return '0 Bytes'; const k=1024; const sizes=['Bytes','KB','MB','GB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i]; };

  proto.updateDocumentStats = function() {
    const statsElements = document.querySelectorAll('[data-sgk-doc-count]'); statsElements.forEach(element => { const sgkDocs = JSON.parse(localStorage.getItem('sgk_documents')||'[]'); element.textContent = sgkDocs.length; });
  };

  proto.downloadDocument = function(documentId) {
    const sgkDocs = JSON.parse(localStorage.getItem('sgk_documents')||'[]'); const document = sgkDocs.find(doc=>doc.id===documentId); if (!document || !document.pdfData) { Utils.showToast('Belge bulunamadı', 'error'); return; } const link = document.createElement('a'); link.href = document.pdfData; link.download = document.filename; link.click();
  };

  proto.viewDocument = function(documentId) { const sgkDocs = JSON.parse(localStorage.getItem('sgk_documents')||'[]'); const document = sgkDocs.find(doc=>doc.id===documentId); if (!document) { Utils.showToast('Belge bulunamadı', 'error'); return; } this.showDocumentModal(document); };

  proto.assignPatient = function(documentId) { const sgkDocs = JSON.parse(localStorage.getItem('sgk_documents')||'[]'); const document = sgkDocs.find(doc=>doc.id===documentId); if (!document) { Utils.showToast('Belge bulunamadı', 'error'); return; } this.showPatientAssignmentModal(document); };

  proto.showDocumentModal = function(document) { const modalContent = `<div class="max-w-4xl mx-auto"> ... </div>`; Utils.showModal({ title:'SGK Belgesi Detayları', content: modalContent, primaryButton:{ text:'Kapat', onClick:()=>{} } }); };

  proto.showPatientAssignmentModal = function(document) {
      const patients = this.getAllPatients();
      const candidates = document.patientMatch?.candidates || [];
      let candidatesHTML = '';
      if (candidates.length > 0) {
        // Make suggested candidates scrollable so the UI isn't limited to a small fixed number
        const suggestedItems = candidates.map(candidate => `\n            <div class="border rounded p-3 mb-2 cursor-pointer hover:bg-gray-50" onclick="sgkPipeline.selectPatientForDocument('${document.id}', '${candidate.patient.id}')">\n              <div class=\"font-medium\">${candidate.patient.name}</div>\n              <div class=\"text-xs text-gray-500\">TC: ${candidate.patient.tcNumber || '—'} • Olasılık: ${candidate.confidence ? Math.round(candidate.confidence * 100) + '%' : '—'}</div>\n            </div>`).join('');
        candidatesHTML = `<div class="mb-4"><h4 class="font-medium mb-2">Önerilen Hastalar</h4><div id="suggestedPatientList" class="max-h-80 overflow-auto space-y-2">${suggestedItems}</div></div>`;
      }
     const modalContent = `<div>...${candidatesHTML}<div><h4 class="font-medium mb-2">Tüm Hastalar</h4>
       <input id="patientSearchInput" type="text" placeholder="İsim, TC veya telefon ile arayın..." class="w-full border rounded p-2" autocomplete="off"/>
       <input type="hidden" id="selectedPatientId" value="" />
       <div id="patientSearchResults" class="mt-2 max-h-80 overflow-auto" style="max-height:40vh;"></div>
     </div></div>`;

     Utils.showModal({ title:'Hasta Ataması', content: modalContent, primaryButton:{ text:'Ata', onClick:()=>{ const selectedPatientId = window.document.getElementById('selectedPatientId').value; if (selectedPatientId) { this.selectPatientForDocument(document.id, selectedPatientId); } else { Utils.showToast('Lütfen bir hasta seçin','error'); } } }, secondaryButton:{ text:'İptal', onClick:()=>{} } });

     // After modal shown, wire up live search (debounced)
     try {
       const input = window.document.getElementById('patientSearchInput');
       const resultsContainer = window.document.getElementById('patientSearchResults');
       const hiddenSel = window.document.getElementById('selectedPatientId');
       // Pre-fill with extracted name if available
       if (document.patientMatch && document.patientMatch.extractedInfo && document.patientMatch.extractedInfo.name) {
         input.value = document.patientMatch.extractedInfo.name;
       }

       const renderResults = (list) => {
         resultsContainer.innerHTML = list && list.length ? list.map(p => `\n          <div class="p-2 border-b cursor-pointer hover:bg-gray-100" data-patient-id="${p.id}" data-patient-name="${p.name}">\n            <div class=\"text-sm font-medium\">${p.name}</div>\n            <div class=\"text-xs text-gray-500\">TC: ${p.tcNumber||'N/A'} • ${p.phone||''}</div>\n          </div>`).join('') : '<div class="text-sm text-gray-500 p-2">Sonuç yok</div>';
         // Attach click handlers
         Array.from(resultsContainer.children).forEach(el => {
           el.addEventListener('click', () => {
             const id = el.getAttribute('data-patient-id');
             hiddenSel.value = id;
             // Visual selection
             Array.from(resultsContainer.children).forEach(c => c.classList.remove('bg-blue-50'));
             el.classList.add('bg-blue-50');
           });
         });
       };

       const debounce = (fn, wait=300) => { let t = null; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn.apply(this, args), wait); }; };

       const performSearch = debounce(async (q) => {
         if (!q || q.trim().length === 0) {
           // Show a short list of local patients as fallback
           renderResults(patients);
           return;
         }

         // Use backend search when possible
         if (window.BackendServiceManager && window.BackendServiceManager.getService) {
           try {
             const svc = window.BackendServiceManager.getService('patients');
             const resp = await svc.search(q, { per_page: 20 });
             // Support multiple shapes of response
             const found = (resp && resp.patients) ? resp.patients : (Array.isArray(resp) ? resp : (resp && resp.data ? resp.data : []));
             renderResults(found);
             return;
           } catch (err) {
             console.warn('Backend patient search failed, falling back to local search', err);
           }
         }

         // Local search fallback
         const localMatches = (patients || []).filter(p => {
            const hay = `${p.name} ${p.tcNumber || ''} ${p.phone || ''}`.toLowerCase();
            return hay.includes(q.toLowerCase());
         });
         // Do not artificially limit local match count here; let the results container scroll
         renderResults(localMatches);
       }, 250);

       // Initial render — show a larger local fallback (no tight small limit) and rely on search bar for narrowing
       renderResults(patients);

       input.addEventListener('input', (e) => performSearch(e.target.value));
       input.addEventListener('keydown', (e) => {
         if (e.key === 'Enter') {
           // If a suggestion is visible, pick the first
           const first = resultsContainer.querySelector('[data-patient-id]');
           if (first) { first.click(); }
         }
       });
     } catch (err) { console.warn('Patient assignment search setup failed', err); }
   };

  proto.selectPatientForDocument = async function(documentId, patientId) {
    try {
      const sgkDocs = JSON.parse(localStorage.getItem('sgk_documents')||'[]'); const docIndex = sgkDocs.findIndex(doc=>doc.id===documentId);
      if (docIndex === -1) { Utils.showToast('Belge bulunamadı','error'); return; }
      const patients = this.getAllPatients(); let selectedPatient = patients.find(p=>p.id===patientId);
      // If patient not present locally, try to fetch from backend and persist locally for consistent behavior
      if (!selectedPatient && window.BackendServiceManager && window.BackendServiceManager.getService) {
        try {
          const svc = window.BackendServiceManager.getService('patients');
          const resp = await svc.getById(patientId);
          const remote = resp && (resp.patient || resp || null);
          if (remote) {
            // Normalize shape
            remote.name = remote.name || `${remote.firstName||''} ${remote.lastName||''}`.trim();
            // Persist into local storage patients list so other components can find it
            try {
              const stored = JSON.parse(localStorage.getItem('patients')||'[]'); stored.push(remote); localStorage.setItem('patients', JSON.stringify(stored));
              selectedPatient = remote;
            } catch (inner) { console.warn('Could not persist remote patient locally', inner); selectedPatient = remote; }
          }
        } catch (err) { console.warn('Failed to fetch patient from backend', err); }
      }

      if (!selectedPatient) { Utils.showToast('Hasta bulunamadı','error'); return; }
      sgkDocs[docIndex].patientId = patientId; sgkDocs[docIndex].patientMatch = { ...sgkDocs[docIndex].patientMatch, matched:true, patient:selectedPatient, manualAssignment:true };
      localStorage.setItem('sgk_documents', JSON.stringify(sgkDocs)); const patientDocs = JSON.parse(localStorage.getItem('patient_documents')||'{}'); if (!patientDocs[patientId]) patientDocs[patientId]=[]; Object.keys(patientDocs).forEach(pid=>{ patientDocs[pid]=patientDocs[pid].filter(doc=>doc.id!==documentId); }); patientDocs[patientId].push(sgkDocs[docIndex]); localStorage.setItem('patient_documents', JSON.stringify(patientDocs)); Utils.showToast(`Belge ${selectedPatient.name} hastasına atandı`, 'success'); location.reload();
    } catch (error) { console.error('Patient assignment failed:', error); Utils.showToast('Hasta ataması başarısız','error'); }
  };

  proto.generateIntelligentFilename = function(processedData) {
    try {
      const patientMatch = processedData.patientMatch; const documentType = processedData.documentType; let patientName = 'Bilinmeyen_Hasta'; let confidenceIndicator = '';
      if (patientMatch?.matched && patientMatch.patient) { patientName = this.sanitizeFilename(patientMatch.patient.name); if (patientMatch.matchLevel === 'high') confidenceIndicator=''; else if (patientMatch.matchLevel === 'medium') confidenceIndicator='_VERIFY'; else confidenceIndicator='_MANUAL'; }
      else if (patientMatch?.extractedInfo?.name) { patientName = this.sanitizeFilename(patientMatch.extractedInfo.name); confidenceIndicator='_UNMATCHED'; }
      let docType = 'belge'; if (documentType?.type) { const typeMap = { 'recete':'Recete','pil_recete':'Pil_Recete','cihaz_recete':'Cihaz_Recete','odyo':'Odyometri','uygunluk':'Uygunluk_Raporu','muayene_raporu':'Muayene_Raporu' }; docType = typeMap[documentType.type] || documentType.type; }
      if (documentType?.confidence && documentType.confidence < 0.8) docType += '_CHECK'; const now = new Date(); const timestamp = now.toISOString().slice(0,10).replace(/-/g,''); const timeHour = now.toTimeString().slice(0,2) + now.toTimeString().slice(3,5); const filename = `${patientName}_${docType}_${timestamp}_${timeHour}${confidenceIndicator}`; return filename;
    } catch (error) { console.error('Filename generation error:', error); return `SGK_Document_${Date.now()}`; }
  };

})();