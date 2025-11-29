// SGK page initialization extracted from inline script
(function (global) {
  async function handleBulkFileUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.length > 50) { alert('Maksimum 50 dosya yükleyebilirsiniz.'); return; }

    // Ensure storage manager available
    try {
      if (!window.SGK?.storageManager) {
        try {
          if (typeof loadScript === 'function') {
            await loadScript('/assets/js/sgk/manager/sgk-storage-manager.js');
          } else {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = '/assets/js/sgk/manager/sgk-storage-manager.js';
              s.async = false;
              s.onload = () => resolve();
              s.onerror = () => reject(new Error('Failed to load SGK storage manager'));
              document.head.appendChild(s);
            });
          }
          // allow globals registered by the script to settle
          await new Promise(r => setTimeout(r, 50));
        } catch (err) {
          console.warn('Could not load storage manager', err);
        }
      }
      if (window.SGK?.storageManager) {
        try { window.SGK.storageManager.enableBackgroundProcessing = true; } catch(e){}
        try { window.SGK.storageManager.showBackgroundProcessingBadge(true); } catch(e){}
      }
    } catch (e) { console.warn('Could not load storage manager', e); }

    const processingStatus = document.getElementById('processingStatus');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    processingStatus.classList.remove('hidden'); progressBar.style.width = '0%';
    progressText.textContent = `0/${files.length} dosya işlendi - Arka planda çalışıyor, sayfayı kapatabilirsiniz`;

    global.processedDocuments = [];
    const ocrResultsEl = document.getElementById('ocrResults'); if (ocrResultsEl) ocrResultsEl.classList.add('hidden');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        progressText.textContent = `${i + 1}/${files.length} dosya işleniyor: ${file.name} (Gelişmiş işleme...)`;
        const result = await window.SGK.processing.processFileWithOCR(file, i);
        // processedDocuments push handled inside processing function
        const progress = ((i + 1) / files.length) * 100; progressBar.style.width = `${progress}%`;
        if (result.status === 'error') {
          progressText.textContent = `${i + 1}/${files.length} dosya işlendi (${result.fileName}: Hata!) - Arka planda çalışıyor`;
        } else if (result.compressedPDF) {
          const sizeMB = result.pdfSize ? (result.pdfSize / 1024 / 1024).toFixed(2) : '?';
          progressText.textContent = `${i + 1}/${files.length} dosya işlendi (${result.fileName}: PDF ${sizeMB}MB) - Arka planda çalışıyor`;
        } else {
          progressText.textContent = `${i + 1}/${files.length} dosya işlendi (${result.fileName}: Temel işleme) - Arka planda çalışıyor`;
        }
        if (window.SGK?.storageManager) {
          localStorage.setItem('background_processing_status', JSON.stringify({ totalFiles: files.length, processedFiles: i + 1, currentFile: result.fileName, startTime: Date.now(), canLeave: true }));
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        global.processedDocuments.push({ id: `file_${Date.now()}_${i}`, fileName: file.name, status: 'error', error: error.message });
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Finalize UI
    if (typeof window.SGK?.ui?.displayOCRResults === 'function') window.SGK.ui.displayOCRResults();
    if (typeof window.updateStatistics === 'function') window.updateStatistics();

    const pdfCount = global.processedDocuments.filter(d => d.compressedPDF).length;
    const totalSize = global.processedDocuments.filter(d => d.pdfSize).reduce((s, d) => s + (d.pdfSize || 0), 0);
    progressText.textContent = `✅ İşlem tamamlandı! ${global.processedDocuments.length} dosya işlendi, ${pdfCount} PDF oluşturuldu (Toplam: ${window.SGK && window.SGK.processing ? window.SGK.processing.formatFileSize(totalSize) : totalSize}) - Artık güvenle sayfayı kapatabilirsiniz`;

    if (window.SGK?.storageManager) {
      localStorage.removeItem('background_processing_status');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SGK Dosya İşleme Tamamlandı', { body: `${global.processedDocuments.length} dosya başarıyla işlendi.`, icon: '/assets/img/logo.png' });
      }
      window.SGK.storageManager.showBackgroundProcessingBadge(false);
    }

    if (pdfCount > 0) Utils.showToast(`${pdfCount} PDF belgesi hazır! Önizleme ve indirme butonlarını kullanabilirsiniz.`, 'success');
  }

  // Replace attachBulkUploadHandlers to use handleBulkFileUpload and drag/drop
  function attachBulkUploadHandlers() {
    const bulkInput = document.getElementById('bulkOCRUpload');
    const bulkArea = document.getElementById('bulkUploadArea');
    if (!bulkInput || !bulkArea) return;
    bulkInput.addEventListener('change', handleBulkFileUpload);
    bulkArea.addEventListener('dragover', (evt) => { evt.preventDefault(); bulkArea.classList.add('border-blue-400'); });
    bulkArea.addEventListener('dragleave', (evt) => { bulkArea.classList.remove('border-blue-400'); });
    bulkArea.addEventListener('drop', async (evt) => { evt.preventDefault(); bulkArea.classList.remove('border-blue-400'); const files = Array.from(evt.dataTransfer.files || []); if (files.length) { const fakeEvt = { target: { files } }; await handleBulkFileUpload(fakeEvt); } });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Ensure sidebar and header are rendered (fixes missing sidebar issue)
    try {
      const sidebarContainer = document.getElementById('sidebar-container');
      // Prefer any available SidebarWidget constructor provided globally or namespaced under window.SGK
      const SidebarCtor = (typeof SidebarWidget !== 'undefined' && SidebarWidget) || (window.SGK && window.SGK.SidebarWidget) || null;
      if (sidebarContainer && SidebarCtor) {
        // Instantiate with SGK active page so the SGK submenu is highlighted
        const sidebar = new SidebarCtor('sgk');
        try { sidebarContainer.innerHTML = sidebar.render(); } catch (e) { console.warn('Sidebar render produced an error:', e); }

        // Provide a global toggle for compatibility but only define if not already present
        if (typeof window.toggleSidebar !== 'function') {
          window.toggleSidebar = function () {
            const nav = document.querySelector('.sidebar-nav');
            if (nav) {
              nav.classList.toggle('collapsed');
              try { localStorage.setItem('sidebarCollapsed', String(nav.classList.contains('collapsed'))); } catch(e) { /* ignore */ }
            }
          };
        }
      }
    } catch (e) { console.warn('Sidebar render failed in init:', e); }

    try {
      const headerContainer = document.getElementById('header-container');
      if (headerContainer && typeof HeaderWidget !== 'undefined') {
        const header = new HeaderWidget('SGK Raporları');
        headerContainer.innerHTML = header.render();
        if (typeof header.attachEventListeners === 'function') header.attachEventListeners();
      }
    } catch (e) { console.warn('Header render failed in init:', e); }

    // Initialize the SGK document pipeline
    (async function initPipeline() {
      // If the constructor isn't present yet, try to load the pipeline script dynamically.
      if (typeof SGKDocumentPipeline === 'undefined') {
        try {
          if (typeof loadScript === 'function') {
            // loadScript may already be available in utils; prefer it when present
            await loadScript('/assets/js/domain/sgk/sgk-document-pipeline.js');
          } else {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = '/assets/js/domain/sgk/sgk-document-pipeline.js';
              s.async = false; // preserve execution order
              s.onload = () => resolve();
              s.onerror = () => reject(new Error('Failed to load SGK Document Pipeline'));
              document.head.appendChild(s);
            });
          }
          // small delay to allow global assignments in loaded script
          await new Promise(r => setTimeout(r, 20));
        } catch (err) {
          console.warn('Failed to dynamically load SGK Document Pipeline:', err);
        }
      }

      if (typeof SGKDocumentPipeline !== 'undefined') {
        try {
          window.sgkPipeline = new SGKDocumentPipeline();
          console.log('✅ SGK Document Pipeline initialized');
        } catch (e) {
          console.error('Failed to initialize SGK Document Pipeline:', e);
        }
      } else {
        console.warn('⚠️ SGK Document Pipeline not available');
      }
    })();

    if (typeof DocumentManager !== 'undefined') {
      window.documentManager = new DocumentManager();
      console.log('✅ Document Manager initialized');
    }

    // QuickLook modal test
    (async function initQuickLook() {
      if (typeof QuickLookModal === 'undefined') {
        try {
          if (typeof loadScript === 'function') {
            await loadScript('/assets/js/components/quick-look-modal.js');
          } else {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script');
              s.src = '/assets/js/components/quick-look-modal.js';
              s.async = false;
              s.onload = () => resolve();
              s.onerror = () => reject(new Error('Failed to load QuickLookModal'));
              document.head.appendChild(s);
            });
          }
          await new Promise(r => setTimeout(r, 20));
        } catch (err) {
          console.warn('QuickLookModal load failed', err);
        }
      }

      if (typeof QuickLookModal !== 'undefined') {
        try { new QuickLookModal({ debug: true }); } catch (e) { console.warn('QuickLookModal test failed', e); }
      }
    })();

    if (!window.patientDatabase) {
      window.patientDatabase = [
        { id: '1', name: 'Ahmet Yılmaz', tcNo: '12345678901', phone: '0532 123 4567' },
        { id: '2', name: 'Ayşe Demir', tcNo: '12345678902', phone: '0533 234 5678' },
        { id: '3', name: 'Mehmet Kaya', tcNo: '12345678903', phone: '0534 345 6789' }
      ];
    }

    // Load SGK reports after short delay
    setTimeout(() => {
      const existingReports = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.SGK_REPORTS || 'sgk_reports') || '[]');
      if (existingReports.length === 0) {
        if (typeof window.createSampleSGKReports === 'function') {
          window.createSampleSGKReports();
        }
      } else {
        if (typeof window.loadSGKReports === 'function') {
          window.loadSGKReports();
        }
      }

      if (typeof window.checkBackgroundProcessingStatus === 'function') {
        window.checkBackgroundProcessingStatus();
      }

    }, 1000);

    attachBulkUploadHandlers();
  });

})(window);
