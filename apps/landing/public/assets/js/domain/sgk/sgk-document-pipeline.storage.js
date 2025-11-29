(function(){
  if (typeof SGKDocumentPipeline === 'undefined') return;
  const proto = SGKDocumentPipeline.prototype;

  proto.saveToPatientDocuments = async function(processedData) {
    console.log('💾 (storage) saveToPatientDocuments');
    try {
      if (!processedData) throw new Error('İşlenen veri bulunamadı');

      // If no exact patient match, attempt safe auto-assignment using high-confidence candidate
      let matchedPatient = processedData.patientMatch?.patient || null;
      if (!matchedPatient && processedData.patientMatch && Array.isArray(processedData.patientMatch.candidates) && processedData.patientMatch.candidates.length > 0) {
        const top = processedData.patientMatch.candidates[0];
        const AUTO_ASSIGN_THRESHOLD = 0.85;
        const highTrustMethods = ['tc_search', 'direct_keyword_search'];
        const methodIndicatesTrust = highTrustMethods.includes(processedData.patientMatch.method);
        if (top && top.patient && top.patient.id && ( (typeof top.confidence === 'number' && top.confidence >= AUTO_ASSIGN_THRESHOLD) || methodIndicatesTrust )) {
          console.log('💡 Auto-assigning top candidate as patient based on heuristic', top.patient.name, top.confidence, 'method:', processedData.patientMatch.method);
          matchedPatient = top.patient;
          // Mark as auto-assigned so downstream code can show that this was heuristically chosen
          processedData.patientMatch = { ...(processedData.patientMatch || {}), matched: true, patient: matchedPatient, autoAssigned: true };
        }
      }

      // If still no matched patient, save as unmatched rather than throwing so pipeline does not crash
      if (!matchedPatient) {
        console.warn('No patient matched - saving document as unmatched for manual review');
        const unmatchedDoc = { id: 'sgk_doc_' + Date.now() + '_' + Math.random().toString(36).substr(2,9), patientId: null, patientName: processedData.patientMatch?.extractedInfo?.name || 'Bilinmeyen Hasta', documentType: processedData.documentType?.type || 'other', filename: processedData.pdfData?.name || processedData.originalFilename || 'document.pdf', fileSize: processedData.compressedPDF?.estimatedSize || processedData.pdfData?.size || 0, uploadDate: new Date().toISOString(), ocrText: processedData.ocrText || '', ocrSuccess: !!processedData.ocrText, patientMatch: processedData.patientMatch || null, documentTypeConfidence: processedData.documentType?.confidence || 0, processingSteps: { edgeDetection: processedData.processingApplied || false, ocrCompleted: !!processedData.ocrText, patientMatched: false, typeDetected: !!processedData.documentType, pdfConverted: !!processedData.pdfData, compressed: !!processedData.compressedPDF }, pdfData: processedData.compressedPDF?.data || processedData.pdfData?.data, originalImage: processedData.originalImage, croppedImage: processedData.croppedImage, metadata: { ocrEngine: 'Tesseract.js', documentDetection: processedData.contour ? 'automatic' : 'manual', compressionRatio: processedData.compressedPDF?.targetQuality || 1, processingTime: Date.now() - (processedData.startTime || Date.now()) } };
        // Persist unmatched document into a separate queue and also general SGK documents for visibility
        await this.saveUnmatchedDocumentToStorage(unmatchedDoc);
        return { success: true, saved: true, unmatched: true, method: 'unmatched_local', document: unmatchedDoc };
      }

      const patient = matchedPatient; if (!patient.id) throw new Error('Hasta ID bulunamadı');
      const document = { id: 'sgk_doc_' + Date.now() + '_' + Math.random().toString(36).substr(2,9), patientId: patient.id, patientName: patient.name || 'Bilinmeyen Hasta', documentType: processedData.documentType?.type || 'other', filename: processedData.pdfData?.name || processedData.originalFilename || 'document.pdf', fileSize: processedData.compressedPDF?.estimatedSize || processedData.pdfData?.size || 0, uploadDate: new Date().toISOString(), ocrText: processedData.ocrText || '', ocrSuccess: !!processedData.ocrText, patientMatch: processedData.patientMatch, documentTypeConfidence: processedData.documentType?.confidence || 0, processingSteps: { edgeDetection: processedData.processingApplied || false, ocrCompleted: !!processedData.ocrText, patientMatched: processedData.patientMatch?.matched || false, typeDetected: !!processedData.documentType, pdfConverted: !!processedData.pdfData, compressed: !!processedData.compressedPDF }, pdfData: processedData.compressedPDF?.data || processedData.pdfData?.data, originalImage: processedData.originalImage, croppedImage: processedData.croppedImage, metadata: { ocrEngine: 'Tesseract.js', documentDetection: processedData.contour ? 'automatic' : 'manual', compressionRatio: processedData.compressedPDF?.targetQuality || 1, processingTime: Date.now() - (processedData.startTime || Date.now()) } };
      if (!document.patientId || !document.id) throw new Error('Belge verisi doğrulanamadı - kritik alanlar eksik');
      // Save using storageManager if it supports unlimited save
      if (this.storageManager && typeof this.storageManager.saveUnlimited === 'function') {
        const res = await this.storageManager.saveUnlimited([document]);
        return { success: true, saved: true, method: 'unlimited', result: res, document };
      }
      // Fallback to local storage saving
      this.saveDocumentToStorage(document);
      return { success: true, saved: true, method: 'localStorage', document };
    } catch (error) {
      console.error('Save failed:', error);
      throw new Error('Belge kaydetme başarısız: ' + error.message);
    }
  };

  // Save unmatched documents (no patientId) into a dedicated bucket and the general SGK list
  proto.saveUnmatchedDocumentToStorage = async function(document) {
    try {
      if (!document || !document.id) throw new Error('Invalid unmatched document');

      // Helper: basic fingerprint to detect same upload (filename + short OCR preview)
      const fingerprint = (doc) => {
        try {
          return `${doc.filename || ''}::${String((doc.ocrText||'').slice(0,200)).replace(/\s+/g,' ')}::${doc.patientName||''}`.trim();
        } catch (e) { return `${doc.filename || ''}::${doc.patientName||''}`; }
      };

      // Save to unmatched_documents (dedupe by fingerprint)
      const unmatchedKey = 'unmatched_documents';
      const unmatched = JSON.parse(localStorage.getItem(unmatchedKey) || '[]');
      const fp = fingerprint(document);
      let replaced = false;
      for (let i = 0; i < unmatched.length; i++) {
        try {
          if (unmatched[i].id === document.id || fingerprint(unmatched[i]) === fp) {
            // update existing entry in-place
            unmatched[i] = Object.assign({}, unmatched[i], document);
            replaced = true;
            break;
          }
        } catch (e) { continue; }
      }
      if (!replaced) {
        // Limit to 50 unmatched documents to prevent quota issues
        if (unmatched.length >= 50) unmatched.shift();
        unmatched.push(document);
      }

      try {
        localStorage.setItem(unmatchedKey, JSON.stringify(unmatched));
      } catch (quotaError) {
        if (quotaError.name === 'QuotaExceededError') {
          console.warn('Quota exceeded for unmatched_documents, clearing old entries');
          localStorage.setItem(unmatchedKey, JSON.stringify([document]));
          Utils.showToast('Depolama alanı dolu, eski unmatched belgeler temizlendi', 'warning');
        } else {
          throw quotaError;
        }
      }

      // Also add/update in general sgk_documents so it appears in lists (idempotent)
      const sgkKey = 'sgk_documents';
      const sgkDocuments = JSON.parse(localStorage.getItem(sgkKey) || '[]');
      let foundIndex = -1;
      for (let i = 0; i < sgkDocuments.length; i++) {
        const s = sgkDocuments[i];
        if (s.id === document.id || fingerprint(s) === fp) {
          foundIndex = i; break;
        }
      }
      if (foundIndex !== -1) {
        sgkDocuments[foundIndex] = Object.assign({}, sgkDocuments[foundIndex], document);
      } else {
        sgkDocuments.push(document);
      }
      try { localStorage.setItem(sgkKey, JSON.stringify(sgkDocuments)); } catch (e) { console.warn('Failed to persist sgk_documents after unmatched save', e); }

      console.log('✅ Unmatched document saved for manual review:', document.filename || document.id);
      return { success: true, saved: true, document };
    } catch (error) { console.error('Failed to save unmatched document:', error); throw error; }
  };

  proto.saveDocumentToStorage = function(document) {
    try {
      if (!document || !document.patientId || !document.id) throw new Error('Eksik belge bilgisi: Hasta ID veya belge ID bulunamadı');
      if (!window.localStorage) throw new Error('Tarayıcı depolama desteği bulunamadı');

      // Check storage quota before saving
      const testKey = 'quota_test_' + Date.now();
      try { localStorage.setItem(testKey, 'test'); localStorage.removeItem(testKey); } catch (quotaError) { if (quotaError.name === 'QuotaExceededError') throw new Error('Depolama alanı dolu. Lütfen eski belgeleri silin.'); throw new Error('Depolama erişim hatası: ' + quotaError.message); }

      // Save to patient-specific storage (dedupe by id or fingerprint)
      const patientDocuments = JSON.parse(localStorage.getItem('patient_documents') || '{}');
      if (!patientDocuments[document.patientId]) patientDocuments[document.patientId] = [];

      // Create fingerprint used for deduplication
      const docFingerprint = (doc) => `${doc.patientId}::${doc.filename || ''}::${String((doc.ocrText||'').slice(0,200)).replace(/\s+/g,' ')}`;
      let updated = false;
      for (let i = 0; i < patientDocuments[document.patientId].length; i++) {
        const existing = patientDocuments[document.patientId][i];
        if (existing.id === document.id || docFingerprint(existing) === docFingerprint(document)) {
          // Update in place to avoid duplicates
          patientDocuments[document.patientId][i] = Object.assign({}, existing, document);
          updated = true; break;
        }
      }
      if (!updated) patientDocuments[document.patientId].push(document);
      localStorage.setItem('patient_documents', JSON.stringify(patientDocuments));

      // Also save/update in general SGK documents (dedupe)
      const sgkDocuments = JSON.parse(localStorage.getItem('sgk_documents') || '[]');
      let foundIdx = -1;
      for (let i = 0; i < sgkDocuments.length; i++) {
        const s = sgkDocuments[i];
        if (s.id === document.id || (s.patientId === document.patientId && s.filename === document.filename)) { foundIdx = i; break; }
      }
      if (foundIdx !== -1) {
        sgkDocuments[foundIdx] = Object.assign({}, sgkDocuments[foundIdx], document);
      } else {
        sgkDocuments.push(document);
      }
      localStorage.setItem('sgk_documents', JSON.stringify(sgkDocuments));

      console.log('✅ Document saved to storage successfully (idempotent)');
    } catch (error) { console.error('Storage save failed:', error); throw new Error('Belge kaydetme hatası: ' + error.message); }
  };

  proto.enhancedSaveToPatients = async function(processedDocuments) {
    try {
      let savedCount = 0; let errorCount = 0; const results = [];
      for (const doc of processedDocuments) {
        try {
          if (doc.patientMatch?.matched && doc.patientMatch?.patient?.id) {
            const saveResult = await this.saveToPatientDocuments(doc);
            this.updatePatientSGKWorkflowStatus(doc.patientMatch.patient.id, 'documents_uploaded', `${doc.documentType?.label || 'Belge'} yüklendi: ${doc.filename}`);
            await this.createSGKReportEntry(doc);
            savedCount++; results.push({ success:true, filename:doc.filename, patientName:doc.patientMatch.patient.name, workflowStatus:'documents_uploaded' });
          }
        } catch (docError) { errorCount++; results.push({ success:false, filename:doc.filename, error: docError.message }); }
      }
      return { success: savedCount>0, savedCount, errorCount, results };
    } catch (error) {
      console.error('Enhanced save to patients failed:', error);
      return { success:false, savedCount:0, errorCount: processedDocuments.length, error: error.message };
    }

  };

  proto.createSGKReportEntry = async function(doc) {
    try {
      if (!doc.patientMatch?.patient?.id) throw new Error('Invalid patient information');
      const patient = doc.patientMatch.patient; const reportEntry = { id: doc.id, patientId: patient.id, patientName: patient.name, tcNumber: patient.tcNumber, reportType: doc.documentType?.label || doc.documentType?.name || 'SGK Belgesi', filename: doc.filename, uploadDate: doc.uploadDate, saveDate: new Date().toISOString(), status: 'documents_uploaded', workflowStatus: 'documents_uploaded', source: 'sgk_pipeline', documentData: { originalSize: doc.originalSize, pdfSize: doc.pdfSize, ocrConfidence: doc.ocrConfidence, extractedInfo: doc.extractedPatientInfo, matchConfidence: doc.patientMatch.confidence } };
      const sgkReports = JSON.parse(localStorage.getItem('sgk_reports') || '[]'); const filteredReports = sgkReports.filter(r=>r.id !== doc.id); filteredReports.push(reportEntry); localStorage.setItem('sgk_reports', JSON.stringify(filteredReports)); console.log(`✅ SGK report entry created for ${patient.name}: ${doc.filename}`); return reportEntry;
    } catch (error) { console.error('Failed to create SGK report entry:', error); throw error; }
  };

  proto.savePatientData = function(patients) {
    try {
      if (window.sampleData) window.sampleData.patients = patients; if (window.samplePatients) window.samplePatients = patients; localStorage.setItem('patients', JSON.stringify(patients));
    } catch (error) { console.error('Patient data save failed:', error); throw error; }
  };

})();