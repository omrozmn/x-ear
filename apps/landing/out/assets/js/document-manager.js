// X-Ear CRM - Document Management with OCR
class DocumentManager {
    constructor() {
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        
        // Initialize enhanced image processor with rotation correction and GPU acceleration
        this.imageProcessor = new ImageProcessor({ 
            debug: false,
            enableRotationCorrection: true,
            enableGPUAcceleration: true,
            rotationTolerance: 2.0,
            maxDimension: 1200
        });
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDocuments();
    }

    setupEventListeners() {
        // File upload handlers
        document.addEventListener('change', (e) => {
            if (e.target.type === 'file' && e.target.dataset.documentType) {
                this.handleFileUpload(e.target, e.target.dataset.documentType);
            }
        });

        // Drag and drop handlers
        document.addEventListener('dragover', (e) => {
            if (e.target.classList.contains('document-drop-zone')) {
                e.preventDefault();
                e.target.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            if (e.target.classList.contains('document-drop-zone')) {
                e.target.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', (e) => {
            if (e.target.classList.contains('document-drop-zone')) {
                e.preventDefault();
                e.target.classList.remove('drag-over');
                this.handleFileDrop(e.target, e.dataTransfer.files);
            }
        });
    }

    async handleFileUpload(input, documentType) {
        const files = Array.from(input.files);
        const patientId = input.dataset.patientId;

        for (const file of files) {
            if (!this.validateFile(file)) continue;
            
            try {
                // Check if this is an SGK document upload
                if (this.isSGKDocument(documentType, file.name)) {
                    console.log('🏥 Processing as SGK document via pipeline');
                    
                    // Use SGK pipeline for SGK documents
                    if (window.sgkPipeline) {
                        await window.sgkPipeline.uploadFile(file, input.parentElement);
                    } else {
                        console.warn('SGK Pipeline not available, falling back to regular processing');
                        await this.processDocument(file, documentType, patientId);
                    }
                } else {
                    // Use regular processing for other documents
                    await this.processDocument(file, documentType, patientId);
                }
            } catch (error) {
                console.error('Document processing failed:', error);
                Utils.showToast(`Belge işlenirken hata oluştu: ${error.message}`, 'error');
            }
        }
    }

    async handleFileDrop(dropZone, files) {
        const documentType = dropZone.dataset.documentType;
        const patientId = dropZone.dataset.patientId;

        for (const file of files) {
            if (!this.validateFile(file)) continue;
            
            try {
                // Check if this is an SGK document upload
                if (this.isSGKDocument(documentType, file.name)) {
                    console.log('🏥 Processing as SGK document via pipeline');
                    
                    // Use SGK pipeline for SGK documents
                    if (window.sgkPipeline) {
                        await window.sgkPipeline.uploadFile(file, dropZone);
                    } else {
                        console.warn('SGK Pipeline not available, falling back to regular processing');
                        await this.processDocument(file, documentType, patientId);
                    }
                } else {
                    // Use regular processing for other documents
                    await this.processDocument(file, documentType, patientId);
                }
            } catch (error) {
                console.error('Document processing failed:', error);
                Utils.showToast(`Belge işlenirken hata oluştu: ${error.message}`, 'error');
            }
        }
    }

    // Check if document should be processed via SGK pipeline
    isSGKDocument(documentType, fileName) {
        const sgkTypes = [
            'sgk_device_report',
            'sgk_battery_report', 
            'prescription',
            'audiometry',
            'sgk_report'
        ];
        
        const sgkKeywords = ['sgk', 'recete', 'reçete', 'odyometri', 'audiometri', 'rapor'];
        
        // Check document type
        if (sgkTypes.includes(documentType)) {
            return true;
        }
        
        // Check filename for SGK keywords
        const lowerFileName = fileName.toLowerCase();
        return sgkKeywords.some(keyword => lowerFileName.includes(keyword));
    }

    validateFile(file) {
        if (!this.supportedFormats.includes(file.type)) {
            Utils.showToast('Desteklenmeyen dosya formatı. JPG, PNG, WebP veya PDF kullanın.', 'error');
            return false;
        }

        if (file.size > this.maxFileSize) {
            Utils.showToast('Dosya çok büyük. Maksimum 10MB dosya yükleyebilirsiniz.', 'error');
            return false;
        }

        return true;
    }

    async processDocument(file, documentType, patientId) {
        Utils.showToast('Belge işleniyor...', 'info');

        // Create document record
        const documentId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const document = {
            id: documentId,
            patientId: patientId,
            type: documentType,
            originalName: file.name,
            size: file.size,
            mimeType: file.type,
            uploadedAt: new Date().toISOString(),
            status: 'processing'
        };

        // Process based on file type
        if (file.type.startsWith('image/')) {
            await this.processImage(document, file);
        } else if (file.type === 'application/pdf') {
            await this.processPDF(document, file);
        }

        // Save document
        this.saveDocument(document);
        
        // Update UI
        this.renderDocumentItem(document);
        
        Utils.showToast('Belge başarıyla yüklendi ve işlendi', 'success');
    }

    async processImage(document, file) {
        try {
            // Step 1: Apply enhanced document edge detection with rotation correction
            console.log('📸 Applying enhanced document edge detection with rotation correction...');
            const edgeDetectionResult = await this.imageProcessor.detectDocumentEdgesAndCrop(file);
            
            // Use cropped image for better OCR results
            const imageToProcess = edgeDetectionResult.croppedImage;
            document.originalData = await this.fileToBase64(file);
            document.processedImage = imageToProcess;
            document.edgeDetection = {
                processingApplied: edgeDetectionResult.processingApplied,
                rotationCorrected: edgeDetectionResult.rotationCorrected,
                rotationAngle: edgeDetectionResult.rotationAngle,
                gpuAccelerated: edgeDetectionResult.metadata?.gpuAccelerated,
                contourDetected: !!edgeDetectionResult.contour,
                metadata: edgeDetectionResult.metadata
            };

            // Initialize OCR engine if not already done
            if (!window.ocrEngine) {
                window.ocrEngine = new OCREngine();
            }
            await window.ocrEngine.initialize();

            // Perform OCR using our enhanced engine with processed image
            console.log('🔍 Performing OCR on processed image...');
            const ocrResult = await window.ocrEngine.processImage(imageToProcess, file.name);
            const extractedText = ocrResult?.text || '';
            document.extractedText = extractedText;

            // Extract patient information
            const patientInfo = window.ocrEngine.extractPatientInfo(extractedText);
            document.extractedPatientInfo = patientInfo;

            // Classify document type
            const documentClassification = window.ocrEngine.classifyDocument(extractedText);
            document.classifiedType = documentClassification.type;
            document.classificationConfidence = documentClassification.confidence;

            // Generate intelligent filename
            const patientName = patientInfo.name || 
                               this.getCurrentPatientName() || 
                               'Bilinmeyen_Hasta';
            document.extractedName = window.ocrEngine.generateDocumentFilename(
                patientName, 
                documentClassification.type, 
                file.name
            );

            // Initialize PDF converter if not already done
            if (!window.pdfConverter) {
                window.pdfConverter = new PDFConverter();
            }
            await window.pdfConverter.initialize();

            // Convert to PDF with all enhancements using the processed image
            console.log('📄 Converting to PDF with enhancements...');
            const pdfResult = await window.pdfConverter.convertImageToPDF(imageToProcess, document.extractedName, {
                fixOrientation: true,
                cropPaper: true,
                enhanceImage: true,
                patientName: patientName,
                addMetadata: true
            });

            document.pdfData = pdfResult.data;
            document.pdfName = pdfResult.name;
            document.compressionRatio = pdfResult.compressionRatio;
            document.status = 'completed';

            console.log(`✅ Document processed successfully: ${document.extractedName}`);
            console.log(`📊 OCR Confidence: ${patientInfo.confidence?.toFixed(2) || 'N/A'}`);
            console.log(`📋 Document Type: ${documentClassification.type} (${(documentClassification.confidence * 100).toFixed(1)}%)`);
            console.log(`🖼️ Edge Detection: ${edgeDetectionResult.processingApplied ? 'Applied' : 'Skipped'}`);

        } catch (error) {
            document.status = 'error';
            document.error = error.message;
            console.error('❌ Image processing failed:', error);
            throw error;
        }
    }

    // Helper to get current patient name
    getCurrentPatientName() {
        // Try multiple sources for current patient name
        if (window.patientDetailsManager && window.patientDetailsManager.currentPatient) {
            return window.patientDetailsManager.currentPatient.name ||
                   `${window.patientDetailsManager.currentPatient.firstName || ''} ${window.patientDetailsManager.currentPatient.lastName || ''}`.trim();
        }
        
        // Try to get from page elements
        const patientNameElement = document.querySelector('.patient-name, [data-patient-name], .profile-name');
        if (patientNameElement) {
            return patientNameElement.textContent.trim();
        }
        
        // Try to get from URL or other sources
        const urlParams = new URLSearchParams(window.location.search);
        const patientId = urlParams.get('id');
        if (patientId && window.sampleData && window.sampleData.patients) {
            const patient = window.sampleData.patients.find(p => p.id === patientId);
            if (patient) {
                return patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
            }
        }
        
        return null;
    }

    async processPDF(document, file) {
        try {
            // Convert PDF to base64
            const base64 = await this.fileToBase64(file);
            document.pdfData = base64;

            // Extract text from PDF (simplified)
            document.extractedText = await this.extractPDFText(file);
            document.extractedName = this.extractDocumentName(document.extractedText);
            document.status = 'completed';

        } catch (error) {
            document.status = 'error';
            document.error = error.message;
            throw error;
        }
    }

    async performOCR(file) {
        // Simulated OCR - In production, use a service like Tesseract.js or cloud OCR
        return new Promise((resolve) => {
            setTimeout(() => {
                // Mock OCR results based on document type
                const mockResults = {
                    'sgk_device_report': {
                        text: 'SGK CİHAZ RAPORU\nHasta Adı: Test Hastası\nTC: 12345678901\nCihaz Türü: İşitme Cihazı\nTarih: ' + new Date().toLocaleDateString('tr-TR'),
                        confidence: 0.95
                    },
                    'sgk_battery_report': {
                        text: 'SGK PİL RAPORU\nHasta Adı: Test Hastası\nTC: 12345678901\nPil Türü: Zinc Air\nTarih: ' + new Date().toLocaleDateString('tr-TR'),
                        confidence: 0.92
                    },
                    'prescription': {
                        text: 'REÇETE\nDoktor: Dr. Test\nHasta: Test Hastası\nTanı: İşitme Kaybı\nTedavi: İşitme Cihazı',
                        confidence: 0.88
                    },
                    'audiometry': {
                        text: 'AUDİOMETRİ SONUCU\nHasta: Test Hastası\nSağ Kulak: 40dB kayıp\nSol Kulak: 35dB kayıp\nTarih: ' + new Date().toLocaleDateString('tr-TR'),
                        confidence: 0.90
                    },
                    'warranty': {
                        text: 'GARANTİ SERTİFİKASI\nÜrün: İşitme Cihazı\nSeri No: HC2024001\nGaranti Süresi: 2 Yıl',
                        confidence: 0.93
                    }
                };

                const defaultResult = {
                    text: 'BELGE\nTarih: ' + new Date().toLocaleDateString('tr-TR') + '\nİçerik algılandı',
                    confidence: 0.75
                };

                resolve(mockResults[file.name?.includes('sgk') ? 'sgk_device_report' : 'prescription'] || defaultResult);
            }, 1500); // Simulate processing time
        });
    }

    extractDocumentName(text) {
        // Extract meaningful document names from OCR text
        const patterns = [
            /SGK\s+CİHAZ\s+RAPORU/i,
            /SGK\s+PİL\s+RAPORU/i,
            /REÇETE/i,
            /AUDİOMETRİ/i,
            /GARANTİ/i,
            /FATURA/i,
            /SENET/i
        ];

        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return pattern.source.replace(/[\\^$*+?.()|[\]{}]/g, '').replace(/\s+/g, ' ').trim();
            }
        }

        return null;
    }

    async imageToPDF(file, documentName) {
        // Simulated PDF conversion - In production, use jsPDF or similar
        return new Promise((resolve) => {
            setTimeout(() => {
                // Mock PDF data (base64)
                const mockPdfData = 'data:application/pdf;base64,JVBERi0xLjQKJdP0zOEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSA0IDAgUgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCi9GMSA4IFRmCjEwIDUwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyNDUgMDAwMDAgbiAKMDAwMDAwMDMyMiAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQxNQolJUVPRg==';
                resolve(mockPdfData);
            }, 1000);
        });
    }

    async extractPDFText(file) {
        // Simulated PDF text extraction
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve('PDF belgesi yüklendi ve metin çıkarıldı.');
            }, 500);
        });
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    saveDocument(document) {
        // Save to localStorage
        const documents = Storage.load('patient_documents') || {};
        if (!documents[document.patientId]) {
            documents[document.patientId] = [];
        }
        documents[document.patientId].push(document);
        Storage.save('patient_documents', documents);
    }

    loadDocuments() {
        // Load documents from storage
        return Storage.load('patient_documents') || {};
    }

    getPatientDocuments(patientId) {
        const allDocuments = this.loadDocuments();
        return allDocuments[patientId] || [];
    }

    renderDocumentItem(document) {
        const container = document.querySelector(`[data-document-list="${document.patientId}"]`);
        if (!container) return;

        const statusIcon = this.getStatusIcon(document.status);
        const statusText = this.getStatusText(document.status);
        const typeText = this.getDocumentTypeText(document.type);

        const documentHTML = `
            <div class="document-item border border-gray-200 rounded-lg p-4 mb-3" data-document-id="${document.id}">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-lg">${this.getDocumentTypeIcon(document.type)}</span>
                            <h4 class="font-medium text-gray-900">
                                ${document.extractedName || typeText}
                            </h4>
                            <span class="text-xs px-2 py-1 rounded-full ${this.getStatusClass(document.status)}">
                                ${statusIcon} ${statusText}
                            </span>
                        </div>
                        
                        <div class="text-sm text-gray-600 mb-2">
                            <p><strong>Orijinal Dosya:</strong> ${document.originalName}</p>
                            <p><strong>Boyut:</strong> ${this.formatFileSize(document.size)}</p>
                            <p><strong>Yüklenme:</strong> ${new Date(document.uploadedAt).toLocaleString('tr-TR')}</p>
                            ${document.confidence ? `<p><strong>OCR Güvenilirlik:</strong> ${Math.round(document.confidence * 100)}%</p>` : ''}
                        </div>

                        ${document.extractedText ? `
                            <div class="bg-gray-50 rounded p-3 mt-2">
                                <p class="text-xs text-gray-500 mb-1">Çıkarılan Metin:</p>
                                <p class="text-sm text-gray-700">${document.extractedText.substring(0, 200)}${document.extractedText.length > 200 ? '...' : ''}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex flex-col space-y-2 ml-4">
                        ${document.pdfData ? `
                            <button onclick="documentManager.downloadPDF('${document.id}')" 
                                    class="btn-secondary text-xs px-3 py-1">
                                📄 PDF İndir
                            </button>
                        ` : ''}
                        <button onclick="documentManager.viewDocument('${document.id}')" 
                                class="btn-secondary text-xs px-3 py-1">
                            👁️ Görüntüle
                        </button>
                        <button onclick="documentManager.deleteDocument('${document.id}')" 
                                class="btn-secondary text-xs px-3 py-1 text-red-600">
                            🗑️ Sil
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('afterbegin', documentHTML);
    }

    getDocumentTypeIcon(type) {
        const icons = {
            'sgk_device_report': '🏥',
            'sgk_battery_report': '🔋',
            'prescription': '📋',
            'audiometry': '🎧',
            'warranty': '🛡️',
            'invoice': '🧾',
            'promissory_note': '📝',
            'other': '📄'
        };
        return icons[type] || icons['other'];
    }

    getDocumentTypeText(type) {
        const types = {
            'sgk_device_report': 'SGK Cihaz Raporu',
            'sgk_battery_report': 'SGK Pil Raporu',
            'prescription': 'Reçete',
            'audiometry': 'Audiometri',
            'warranty': 'Garanti',
            'invoice': 'Fatura',
            'promissory_note': 'Senet',
            'other': 'Diğer Belge'
        };
        return types[type] || types['other'];
    }

    getStatusIcon(status) {
        const icons = {
            'processing': '⏳',
            'completed': '✅',
            'error': '❌'
        };
        return icons[status] || '❓';
    }

    getStatusText(status) {
        const texts = {
            'processing': 'İşleniyor',
            'completed': 'Tamamlandı',
            'error': 'Hata'
        };
        return texts[status] || 'Bilinmiyor';
    }

    getStatusClass(status) {
        const classes = {
            'processing': 'bg-yellow-100 text-yellow-800',
            'completed': 'bg-green-100 text-green-800',
            'error': 'bg-red-100 text-red-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadPDF(documentId) {
        const allDocuments = this.loadDocuments();
        const document = Object.values(allDocuments).flat().find(doc => doc.id === documentId);
        
        if (!document || !document.pdfData) {
            Utils.showToast('PDF bulunamadı', 'error');
            return;
        }

        // Create download link
        const link = document.createElement('a');
        link.href = document.pdfData;
        link.download = `${document.extractedName || document.originalName}.pdf`;
        link.click();
    }

    viewDocument(documentId) {
        const allDocuments = this.loadDocuments();
        const document = Object.values(allDocuments).flat().find(doc => doc.id === documentId);
        
        if (!document) {
            Utils.showToast('Belge bulunamadı', 'error');
            return;
        }

        // Open in modal or new window
        this.showDocumentModal(document);
    }

    showDocumentModal(document) {
        const modalHTML = `
            <div class="modal-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div class="modal-container bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full m-4">
                    <div class="modal-header border-b p-6">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold">
                                ${this.getDocumentTypeIcon(document.type)} ${document.extractedName || this.getDocumentTypeText(document.type)}
                            </h3>
                            <button onclick="this.closest('.modal-overlay').remove()" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body p-6 max-h-[70vh] overflow-y-auto">
                        ${document.originalData ? `
                            <div class="mb-4">
                                <h4 class="font-medium mb-2">Orijinal Görsel:</h4>
                                <img src="${document.originalData}" alt="Document" class="max-w-full h-auto border rounded">
                            </div>
                        ` : ''}
                        
                        ${document.extractedText ? `
                            <div class="mb-4">
                                <h4 class="font-medium mb-2">Çıkarılan Metin:</h4>
                                <div class="bg-gray-50 rounded p-4">
                                    <pre class="whitespace-pre-wrap text-sm">${document.extractedText}</pre>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <strong>Dosya Adı:</strong> ${document.originalName}
                            </div>
                            <div>
                                <strong>Boyut:</strong> ${this.formatFileSize(document.size)}
                            </div>
                            <div>
                                <strong>Tür:</strong> ${this.getDocumentTypeText(document.type)}
                            </div>
                            <div>
                                <strong>Yüklenme:</strong> ${new Date(document.uploadedAt).toLocaleString('tr-TR')}
                            </div>
                            ${document.confidence ? `
                                <div>
                                    <strong>OCR Güvenilirlik:</strong> ${Math.round(document.confidence * 100)}%
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer border-t p-6">
                        <div class="flex justify-end space-x-3">
                            ${document.pdfData ? `
                                <button onclick="documentManager.downloadPDF('${document.id}')" class="btn-primary">
                                    📄 PDF İndir
                                </button>
                            ` : ''}
                            <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    deleteDocument(documentId) {
        if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;

        const allDocuments = this.loadDocuments();
        let found = false;
        
        for (const patientId in allDocuments) {
            const index = allDocuments[patientId].findIndex(doc => doc.id === documentId);
            if (index !== -1) {
                allDocuments[patientId].splice(index, 1);
                found = true;
                break;
            }
        }

        if (found) {
            Storage.save('patient_documents', allDocuments);
            
            // Remove from UI
            const documentElement = document.querySelector(`[data-document-id="${documentId}"]`);
            if (documentElement) {
                documentElement.remove();
            }
            
            Utils.showToast('Belge silindi', 'success');
        } else {
            Utils.showToast('Belge bulunamadı', 'error');
        }
    }
}

// Initialize document manager
window.documentManager = new DocumentManager();
