// SGK storage helpers extracted from inline sgk.html
(function (global) {
  // Helper: unified read/write that prefers centralized SGKStorage when available
  function _readRaw() {
    try {
      if (window.SGKStorage && typeof window.SGKStorage.getAll === 'function') {
        return window.SGKStorage.getAll() || [];
      }
      const raw = localStorage.getItem(window.STORAGE_KEYS?.SGK_DOCUMENTS || 'xear_sgk_documents') || localStorage.getItem(window.STORAGE_KEYS?.SGK_DOCUMENTS_PLAIN || 'sgk_documents') || '[]';
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Storage: failed to read raw SGK storage', e);
      return [];
    }
  }

  function _writeRaw(docs) {
    try {
      if (window.SGKStorage && typeof window.SGKStorage.saveAll === 'function') {
        return window.SGKStorage.saveAll(Array.isArray(docs) ? docs : []);
      }
      localStorage.setItem(window.STORAGE_KEYS?.SGK_DOCUMENTS || 'xear_sgk_documents', JSON.stringify(Array.isArray(docs) ? docs : []));
    } catch (e) {
      console.warn('Storage: failed to write raw SGK storage', e);
    }
  }

  // Migration helper: idempotently move legacy keys into SGKStorage
  async function migrateLegacyKeys() {
    try {
      if (!(window.SGKStorage && typeof window.SGKStorage.add === 'function')) {
        console.warn('Migrate: SGKStorage not available, aborting migration');
        return { migrated: 0, message: 'SGKStorage not available' };
      }

      const legacyKeys = [ window.STORAGE_KEYS?.SGK_DOCUMENTS_PLAIN || 'sgk_documents', window.STORAGE_KEYS?.SGK_DOCUMENTS || 'xear_sgk_documents', 'xear_patients_documents', window.STORAGE_KEYS?.PATIENT_DOCUMENTS || 'xear_patient_documents' ];
      let migrated = 0;
      for (const key of legacyKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (Array.isArray(data)) {
            for (const doc of data) {
              // Avoid duplicates: check by id
              const existing = (await (window.SGKStorage.getAll() || [])).find(d => d.id && doc.id && d.id === doc.id);
              if (!existing) {
                window.SGKStorage.add(Object.assign({}, doc));
                migrated++;
              }
            }
          } else if (typeof data === 'object') {
            // patient keyed objects
            for (const pid of Object.keys(data)) {
              const docs = data[pid] || [];
              for (const doc of docs) {
                const existing = (await (window.SGKStorage.getAll() || [])).find(d => d.id && doc.id && d.id === doc.id);
                if (!existing) {
                  window.SGKStorage.add(Object.assign({}, doc, { patientId: pid }));
                  migrated++;
                }
              }
            }
          }
        } catch (e) {
          console.warn('Migrate: failed processing legacy key', key, e);
        }
      }

      return { migrated };
    } catch (err) {
      console.error('Migrate legacy keys failed:', err);
      return { migrated: 0, error: err.message };
    }
  }

  async function checkStorageQuota() {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      const usedMB = (totalSize / 1024 / 1024).toFixed(2);
      const maxMB = 5; // conservative estimate
      const canSave = totalSize < (maxMB * 1024 * 1024 * 0.8);
      return { usedMB: parseFloat(usedMB), maxMB, canSave };
    } catch (error) {
      console.error('Storage check failed:', error);
      return { usedMB: 0, maxMB: 5, canSave: false };
    }
  }

  async function safeStorageSet(key, value) {
    try {
      const testKey = 'test_' + Date.now();
      localStorage.setItem(testKey, value);
      localStorage.removeItem(testKey);
      localStorage.setItem(key, value);
      console.log(`✅ Safely stored ${key} (${(value.length / 1024).toFixed(1)}KB)`);
    } catch (error) {
      console.error(`❌ Storage failed for ${key}:`, error);
      if (error.name === 'QuotaExceededError' || (error.message && error.message.includes('quota'))) {
        await cleanupOldStorage();
        try {
          localStorage.setItem(key, value);
          console.log(`✅ Stored ${key} after cleanup`);
        } catch (retryError) {
          throw new Error('Storage quota exceeded even after cleanup');
        }
      } else {
        throw error;
      }
    }
  }

  async function cleanupOldStorage() {
    console.log('🧹 Cleaning up old storage data...');
    try {
      const sgkDocs = JSON.parse(localStorage.getItem('xear_sgk_documents') || '[]');
      if (sgkDocs.length > 50) {
        sgkDocs.sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0));
        const keepDocs = sgkDocs.slice(0, 50);
        localStorage.setItem('xear_sgk_documents', JSON.stringify(keepDocs));
      }

      const patientDocs = JSON.parse(localStorage.getItem('xear_patients_documents') || '{}');
      let cleaned = false;
      for (const patientId in patientDocs) {
        const docs = patientDocs[patientId];
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          if (doc.fileData || doc.croppedImage || doc.compressedPDF) {
            docs[i] = Object.assign({}, doc, {
              fileData: null,
              croppedImage: null,
              compressedPDF: null,
              hasImage: !!doc.croppedImage,
              hasPDF: !!doc.compressedPDF,
              cleanedAt: new Date().toISOString()
            });
            cleaned = true;
          }
        }
      }
      if (cleaned) {
        localStorage.setItem('xear_patients_documents', JSON.stringify(patientDocs));
      }

      for (let key in localStorage) {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          const parts = key.split('_');
          const timestamp = parts[1] ? parseInt(parts[1]) : null;
          if (timestamp && Date.now() - timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Storage cleanup failed:', error);
    }
  }

  // Expose migration helper to UI and dev tools
  global.SGK = global.SGK || {};
  global.SGK.storage = global.SGK.storage || {};
  global.SGK.storage.migrateLegacyKeys = migrateLegacyKeys;

  function getStorageBreakdown() {
    try {
      const sgkDocs = JSON.parse(localStorage.getItem('xear_sgk_documents') || '[]');
      const patientDocs = JSON.parse(localStorage.getItem('xear_patients_documents') || '{}');
      const patientDocCount = Object.values(patientDocs).reduce((total, docs) => total + (Array.isArray(docs) ? docs.length : 1), 0);
      return {
        sgkDocs: sgkDocs.length,
        patientDocs: patientDocCount,
        totalKeys: Object.keys(localStorage).length
      };
    } catch (error) {
      return { sgkDocs: 0, patientDocs: 0, totalKeys: 0 };
    }
  }

  function calculateStorageUsage() {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      const percentage = (totalSize / estimatedLimit) * 100;
      return {
        used: totalSize,
        usedMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        estimatedLimit: estimatedLimit,
        limitMB: Math.round(estimatedLimit / (1024 * 1024)),
        percentage: Math.round(percentage)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  function showStorageWarning(usage) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'fixed top-4 left-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded z-50';
    warningDiv.innerHTML = `\n      <div class="flex items-start">\n        <div class="flex-1">\n          <strong>⚠️ Depolama Uyarısı</strong>\n          <p class="text-sm mt-1">Depolama alanının %${usage.percentage}'i dolu (${usage.usedMB} MB / ~${usage.limitMB} MB)</p>\n          <p class="text-xs mt-1">Arka plan kaydetme sistemi aktif - depolama sınırı olmadan çalışır</p>\n        </div>\n        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-yellow-600 hover:text-yellow-800">×</button>\n      </div>\n    `;
    document.body.appendChild(warningDiv);
    setTimeout(() => { if (warningDiv.parentElement) warningDiv.remove(); }, 10000);
  }

  async function saveNewPipelineDocument(doc) {
    try {
      if (!doc) throw new Error('Belge verisi bulunamadı');
      // Normalize minimal metadata
      const optimizedDoc = {
        id: doc.id || 'sgk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        filename: doc.fileName || doc.filename || 'unknown',
        fileType: doc.fileType || doc.type || 'image/jpeg',
        patientId: doc.matchedPatient?.id || doc.patientId || null,
        patientName: doc.matchedPatient?.name || doc.patientName || null,
        saveDate: doc.processingDate || new Date().toISOString(),
        ocrText: (doc.extractedText || doc.ocrText || '').substring(0, 1000),
        ocrConfidence: doc.ocrConfidence || 0,
        documentType: doc.documentType || { type: 'other', confidence: 0 },
        originalSize: doc.fileData ? doc.fileData.length : 0,
        optimized: true
      };

      // Prefer centralized SGKStorage when available
      if (window.SGKStorage && typeof window.SGKStorage.add === 'function') {
        // Avoid duplicate id
        const all = window.SGKStorage.getAll() || [];
        const existingIndex = all.findIndex(d => d.id === optimizedDoc.id);
        if (existingIndex !== -1 && typeof window.SGKStorage.update === 'function') {
          window.SGKStorage.update(Object.assign({}, all[existingIndex], optimizedDoc));
        } else {
          window.SGKStorage.add(optimizedDoc);
        }
      } else {
        // Write into shared SGK storage key
        const sgkDocs = JSON.parse(localStorage.getItem('xear_sgk_documents') || '[]');
        const existingIndex = sgkDocs.findIndex(d => d.id === optimizedDoc.id);
        if (existingIndex !== -1) {
          sgkDocs[existingIndex] = Object.assign({}, sgkDocs[existingIndex], optimizedDoc);
        } else {
          sgkDocs.push(optimizedDoc);
        }
        await safeStorageSet('xear_sgk_documents', JSON.stringify(sgkDocs));
      }
      console.log(`✅ Optimized document saved: ${optimizedDoc.filename}`);
      return optimizedDoc;
    } catch (error) {
      console.error('Failed to save new pipeline document:', error);
      throw error;
    }
  }

  async function saveDocumentToPatient(doc) {
    try {
      if (!doc) throw new Error('Belge verisi bulunamadı');
      if (!doc.matchedPatient || !doc.matchedPatient.id) {
        throw new Error('Geçersiz hasta bilgisi - Hasta ID bulunamadı');
      }

      const storageCheck = await checkStorageQuota();
      if (!storageCheck.canSave) {
        throw new Error(`Depolama alanı yetersiz. Kullanılan: ${storageCheck.usedMB}MB`);
      }

      const documentData = {
        id: doc.id || 'sgk_doc_' + Date.now(),
        originalName: doc.fileName || doc.filename || 'unknown',
        suggestedName: generateDocumentName(doc.matchedPatient.name, doc.documentType?.displayName || doc.documentType?.name || 'Belge', doc.fileName || doc.filename),
        type: doc.fileType || 'image/jpeg',
        thumbnail: doc.thumbnail || null,
        uploadDate: doc.processingDate || new Date().toISOString(),
        ocrProcessed: true,
        ocrData: {
          text: (doc.extractedText || doc.ocrText || '').substring(0, 1000),
          confidence: doc.ocrConfidence || 0,
          extractedPatientInfo: doc.extractedPatientInfo || {},
          classification: doc.documentType || { type: 'other', confidence: 0 }
        },
        patientMatch: {
          patientId: doc.matchedPatient.id,
          patientName: doc.matchedPatient.name,
          matchConfidence: doc.matchedPatient.matchConfidence || 1
        },
        source: 'sgk_pipeline'
      };

      // Prefer centralized storage
      if (window.SGKStorage && typeof window.SGKStorage.add === 'function') {
        const payload = Object.assign({}, documentData, { patientId: doc.matchedPatient.id });
        window.SGKStorage.add(payload);
      } else {
        const patientKey = `xear_patient_documents_${doc.matchedPatient.id}`;
        const patientDocuments = JSON.parse(localStorage.getItem(patientKey) || '[]');
        patientDocuments.push(documentData);
        await safeStorageSet(patientKey, JSON.stringify(patientDocuments));
      }

      console.log(`✅ Optimized document saved for patient ${doc.matchedPatient.name}: ${documentData.originalName}`);
      return documentData;
    } catch (error) {
      console.error('Failed to save document to patient:', error);
      throw error;
    }
  }

  function generateDocumentName(patientName, documentType, originalName) {
    try {
      const date = new Date().toISOString().split('T')[0];
      const clean = str => (str || '').toString()
        .replace(/[çÇ]/g, 'c')
        .replace(/[ğĞ]/g, 'g')
        .replace(/[ıİI]/g, 'i')
        .replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's')
        .replace(/[üÜ]/g, 'u')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_');

      const extension = originalName ? originalName.split('.').pop() : 'pdf';
      return `${clean(patientName || 'Bilinmeyen_Hasta')}_${clean(documentType || 'Belge')}_${date}.${extension}`;
    } catch (error) {
      console.error('Generate document name error:', error);
      return `SGK_Document_${Date.now()}.pdf`;
    }
  }

  // Export functions
  global.SGK = global.SGK || {};
  global.SGK.storage = global.SGK.storage || {};
  Object.assign(global.SGK.storage, {
    checkStorageQuota,
    safeStorageSet,
    cleanupOldStorage,
    getStorageBreakdown,
    calculateStorageUsage,
    showStorageWarning,
    saveNewPipelineDocument,
    saveDocumentToPatient,
    saveAllToPatients: async function(){
      // default implementation attempts to use storageManager if available
      try {
        if (typeof window.saveAllToPatients === 'function') return await window.saveAllToPatients();
        // Fallback: iterate current processedDocuments and save to patient storage synchronously
        const toSave = (global.processedDocuments || []).filter(d => (d.status === 'auto_matched' || d.status === 'manual_matched') && d.matchedPatient);
        for (const d of toSave) {
          await saveDocumentToPatient(d);
        }
        return { success: true, documentCount: toSave.length };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  });

  // Provide documentManagement global for other modules that expect it
  global.documentManagement = global.documentManagement || {};
  Object.assign(global.documentManagement, {
    saveDocumentToPatient: saveDocumentToPatient
  });

})(window);
