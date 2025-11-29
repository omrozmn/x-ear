// SGK processing functions extracted from inline sgk.html
(function (global) {
  // Keep processedDocuments as a global so UI and other code can access it
  global.processedDocuments = global.processedDocuments || [];

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${Math.round(bytes * 10) / 10} ${units[i]}`;
  }

  async function _toDataURL(input) {
    if (!input) return null;
    if (typeof input === 'string' && input.startsWith('data:')) return input;
    if (input instanceof Blob) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(input);
      });
    }
    if (input instanceof File) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(input);
      });
    }
    return String(input);
  }

  async function preprocessImageForOCR(file) {
    try {
      // If pipeline provides an image processor, use it
      if (typeof ImageProcessor !== 'undefined') {
        const ip = new ImageProcessor({});
        const result = await ip.detectDocumentEdgesAndCrop(file);
        return result.croppedImage || result.originalImageData || await _toDataURL(file);
      }

      // Fallback: convert to data URL
      return await _toDataURL(file);
    } catch (error) {
      console.warn('Preprocess image failed:', error);
      return await _toDataURL(file);
    }
  }

  async function processFileWithOCR(file, index) {
    const fileId = `file_${Date.now()}_${index}`;
    // Push a lightweight placeholder immediately so the UI can show a preview while heavy processing runs
    try {
      const quickPreview = await _toDataURL(file).catch(()=>null);
      const placeholder = {
        id: fileId,
        fileName: file.name,
        fileData: null,
        ocrText: '',
        ocrConfidence: 0,
        extractedPatientInfo: null,
        documentType: null,
        matchedPatient: null,
        status: 'processing',
        processingDate: new Date().toISOString(),
        compressedPDF: null,
        pdfSize: 0,
        croppedImage: null,
        originalImage: quickPreview,
        pipelineData: { placeholder: true }
      };
      global.processedDocuments.push(placeholder);
      // Refresh UI so user sees immediate preview
      if (typeof window.displayOCRResults === 'function') window.displayOCRResults();
    } catch (e) { console.warn('Could not create initial preview placeholder', e); }

    try {
      console.log('🔄 Processing file with SGK pipeline (migrated)...', file.name);
      if (typeof SGKDocumentPipeline === 'undefined') {
        console.warn('SGK Document Pipeline not available, falling back to basic OCR');
        return await processFileBasicOCR(file, index);
      }

      const pipeline = window.sgkPipeline || new SGKDocumentPipeline();
      // Create temp container for pipeline if needed
      const tempContainer = document.createElement('div'); tempContainer.style.display = 'none'; document.body.appendChild(tempContainer);
      try {
        const pipelineResult = await pipeline.processPipeline(file, tempContainer);
        document.body.removeChild(tempContainer);

        // Ensure we have a stable preview image for the UI modal
        const previewCandidate = pipelineResult.croppedImage || pipelineResult.croppedImageData || pipelineResult.originalImageData || await _toDataURL(file).catch(()=>null);
        // Build the final doc and update the placeholder in-place if present
         let patientInfo = pipelineResult.extractedPatientInfo || null;
         let documentType = pipelineResult.documentType || null;
         let matchedPatient = null;

         if (!patientInfo && pipelineResult.ocrText) {
           patientInfo = window.SGK.helpers.extractPatientInfo(pipelineResult.ocrText);
         }

         if (!documentType) {
           documentType = pipeline.classifyDocument ? pipeline.classifyDocument(pipelineResult.ocrText || '') : window.SGK.helpers.classifyDocument(pipelineResult.ocrText || '');
         }

         if (pipelineResult.patientMatch && pipelineResult.patientMatch.matched) {
           matchedPatient = { ...pipelineResult.patientMatch.patient, matchConfidence: pipelineResult.patientMatch.confidence };
         } else if (patientInfo && patientInfo.name) {
           const patients = pipeline.getAllPatients ? pipeline.getAllPatients() : (window.patientDatabase || []);
           const matches = pipeline.fuzzySearchPatients ? pipeline.fuzzySearchPatients(patients, patientInfo) : [];
           if (matches.length > 0 && matches[0].confidence > 0.15) {
             matchedPatient = { ...matches[0].patient, matchConfidence: matches[0].confidence };
           }
         }

         // Emergency and nuclear fallbacks (keep original heuristics)
         if (!matchedPatient && patientInfo && patientInfo.name) {
           const knownPatients = { 'onur': 'Onur Aydoğdu', 'aydoğdu': 'Onur Aydoğdu', 'rahime': 'Rahime Çelik', 'çelik': 'Rahime Çelik', 'sercan': 'Sercan Kubilay', 'kubilay': 'Sercan Kubilay', 'sami': 'Sami Karatay', 'karatay': 'Sami Karatay' };
           const extractedLower = (patientInfo.name || '').toLowerCase();
           for (const [keyword, fullName] of Object.entries(knownPatients)) {
             if (extractedLower.includes(keyword)) {
               const patient = (window.patientDatabase || []).find(p => p.name === fullName);
               if (patient) { matchedPatient = { ...patient, matchConfidence: 0.9 }; break; }
             }
           }
         }

         if (!matchedPatient && pipelineResult.ocrText) {
           const ocrTextLower = (pipelineResult.ocrText || '').toLowerCase();
           const knownNames = [ { keywords: ['onur','aydoğdu'], name: 'Onur Aydoğdu' }, { keywords: ['rahime','çelik'], name: 'Rahime Çelik' }, { keywords: ['sercan','kubilay'], name: 'Sercan Kubilay' }, { keywords: ['sami','karatay'], name: 'Sami Karatay' } ];
           for (const nameInfo of knownNames) {
             const foundKeywords = nameInfo.keywords.filter(k => ocrTextLower.includes(k));
             if (foundKeywords.length >= 1) {
               const patient = (window.patientDatabase || []).find(p => p.name === nameInfo.name);
               if (patient) { matchedPatient = { ...patient, matchConfidence: 0.95 }; patientInfo = patientInfo || {}; patientInfo.name = nameInfo.name; break; }
             }
           }
         }

        const pdfSize = pipelineResult.compressedPDF ? Math.round((pipelineResult.compressedPDF.length || 0) * 0.75) : 0;

        const doc = {
          id: fileId,
          fileName: file.name,
          fileData: pipelineResult.croppedImageData || pipelineResult.originalImageData,
          ocrText: pipelineResult.ocrText,
          ocrConfidence: pipelineResult.ocrConfidence,
          extractedPatientInfo: patientInfo,
          documentType: documentType,
          matchedPatient: matchedPatient,
          status: matchedPatient ? 'auto_matched' : 'manual_review',
          processingDate: new Date().toISOString(),
          compressedPDF: pipelineResult.compressedPDF,
          pdfSize: pdfSize,
          croppedImage: pipelineResult.croppedImageData,
          originalImage: previewCandidate,
          pipelineData: pipelineResult
        };

        // Replace the placeholder entry created earlier
        const idx = global.processedDocuments.findIndex(d => d.id === fileId);
        if (idx >= 0) {
          global.processedDocuments[idx] = { ...global.processedDocuments[idx], ...doc };
        } else {
          global.processedDocuments.push(doc);
        }
        // Trigger UI refresh
        if (typeof window.displayOCRResults === 'function') window.displayOCRResults();
         return doc;

      } catch (pipelineError) {
        console.warn('Pipeline error, falling back to basic OCR', pipelineError);
        if (tempContainer.parentElement) tempContainer.remove();
        return await processFileBasicOCR(file, index);
      }
    } catch (error) {
      console.error('Error in processFileWithOCR:', error);
      const doc = { id: fileId, fileName: file.name, status: 'error', error: error.message };
      global.processedDocuments.push(doc);
      if (typeof window.displayOCRResults === 'function') window.displayOCRResults();
      return doc;
    }
  }

  async function processFileBasicOCR(file, index) {
    const fileId = `basic_${Date.now()}_${index}`;
    try {
      console.log('🔄 Running basic OCR fallback for file:', file.name);

      // Use global OCREngine if present
      let ocrEngine = null;
      if (typeof OCREngine !== 'undefined') {
        ocrEngine = new OCREngine({ debug: false, enableNLP: false });
        try { await ocrEngine.initialize(); } catch (e) { /* continue */ }
      }

      let ocrResult = null;
      if (ocrEngine) {
        ocrResult = await ocrEngine.processImage(file, file.name);
      } else {
        // No OCREngine available; attempt a very small JS-only fallback by reading text from filename
        ocrResult = { text: '', ocrConfidence: 0, processingTime: 0, fileName: file.name, enhanced: false };
      }

      // Extract patient info if possible
      let extracted = null;
      try {
        if (ocrEngine && typeof ocrEngine.extractPatientInfo === 'function') {
          extracted = await ocrEngine.extractPatientInfo(ocrResult);
        } else {
          extracted = { name: '', tcNo: '', birthDate: '', confidence: 0 };
        }
      } catch (e) {
        extracted = { name: '', tcNo: '', birthDate: '', confidence: 0 };
      }

      // Try a minimal matching attempt using window.patientDatabase
      let matchedPatient = null;
      try {
        const pd = window.patientDatabase || window.sampleData?.patients || [];
        const nameLower = (extracted.name || '').toLowerCase();
        if (nameLower && pd.length > 0) {
          const found = pd.find(p => ((p.name || '').toLowerCase() === nameLower) || ((p.firstName || '').toLowerCase() === nameLower));
          if (found) matchedPatient = { ...found, matchConfidence: 0.85 };
        }
      } catch (e) { matchedPatient = null; }

      const doc = {
        id: fileId,
        fileName: file.name,
        fileData: null,
        ocrText: ocrResult?.text || '',
        ocrConfidence: ocrResult?.ocrConfidence || 0,
        extractedPatientInfo: extracted,
        documentType: null,
        matchedPatient: matchedPatient,
        status: matchedPatient ? 'auto_matched' : 'manual_review',
        processingDate: new Date().toISOString(),
        pipelineData: { fallback: true, source: ocrEngine ? 'tesseract' : 'none' }
      };

      // Save to localStorage unmatched bucket if no patient matched
      try {
        if (!matchedPatient) {
          const unmatched = JSON.parse(localStorage.getItem('unmatched_documents') || '[]');
          unmatched.push(doc);
          localStorage.setItem('unmatched_documents', JSON.stringify(unmatched));
          console.log('💾 Saved unmatched document to localStorage:', file.name);
        } else {
          // Save to patient_documents structure to preserve integration with UI
          const patientDocuments = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENT_DOCUMENTS_PLAIN || 'patient_documents') || '{}');
          if (!patientDocuments[matchedPatient.id]) patientDocuments[matchedPatient.id] = [];
          patientDocuments[matchedPatient.id].push(doc);
          localStorage.setItem(window.STORAGE_KEYS?.PATIENT_DOCUMENTS_PLAIN || 'patient_documents', JSON.stringify(patientDocuments));
          console.log('💾 Saved basic OCR document to patient_documents for:', matchedPatient.name);
        }
      } catch (saveErr) {
        console.warn('⚠️ Failed to persist basic OCR result locally:', saveErr);
      }

      global.processedDocuments.push(doc);
      return doc;
    } catch (error) {
      console.error('❌ Basic OCR processing failed:', error);
      const doc = { id: fileId, fileName: file.name, status: 'error', error: error.message };
      global.processedDocuments.push(doc);
      return doc;
    }
  }

  // Expose functions
  global.SGK = global.SGK || {};
  global.SGK.processing = global.SGK.processing || {};
  Object.assign(global.SGK.processing, {
    formatFileSize,
    preprocessImageForOCR,
    processFileWithOCR
  });

})(window);
