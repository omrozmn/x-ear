/**
 * SGK Document Upload Pipeline with Modular Architecture
 * Now uses specialized modules for better maintainability
 */

// Modular components are provided via global shims or vendor wrappers in the public build.
// Avoid using ES module imports here because the browser will attempt to fetch
// non-existent /src/... paths and cause 404s. Prefer global constructors/instances
// (e.g. window.OCREngine, window.PDFConverter, window.SGK.PatientMatcher, etc.)
// If a module is not present at runtime, lightweight shims are available (see image-processor.js).

class SGKDocumentPipeline {
    constructor(options = {}) {
        this.maxFileSize = 15 * 1024 * 1024; // 15MB
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
        this.targetPDFSize = 500 * 1024; // 500KB target
        this.initialized = false;

        // Initialize modular components
        this.fileValidator = new FileValidator({
            maxFileSize: this.maxFileSize,
            supportedFormats: this.supportedFormats,
            debug: options.debug
        });

        this.imageProcessor = new ImageProcessor({
            debug: options.debug,
            maxDimension: 1200
        });

        this.ocrEngine = new OCREngine({
            debug: options.debug,
            language: 'tur+eng'
        });

        this.patientMatcher = new PatientMatcher({
            debug: options.debug,
            similarityThreshold: 0.75
        });

        // PDF Converter: prefer real PDFConverter, but gracefully fallback if it's not present
        try {
            if (typeof PDFConverter === 'function') {
                this.pdfConverter = new PDFConverter({
                    debug: options.debug,
                    targetSizeKB: this.targetPDFSize / 1024
                });
            } else if (window.pdfConverter && typeof window.pdfConverter === 'object') {
                this.pdfConverter = window.pdfConverter;
            } else {
                throw new Error('PDFConverter not available');
            }
        } catch (err) {
            console.warn('PDFConverter not available or failed to construct; using inline fallback. Error:', err?.message || err);
            // Inline fallback PDF converter that provides minimal, non-throwing API so pipeline can continue
            this.pdfConverter = (function() {
                function dataURItoBlob(dataURI) {
                    const parts = dataURI.split(',');
                    const meta = parts[0].match(/:(.*?);/);
                    const mime = meta ? meta[1] : 'image/jpeg';
                    const binary = atob(parts[1] || '');
                    const len = binary.length;
                    const u8 = new Uint8Array(len);
                    for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
                    return new Blob([u8], { type: mime });
                }

                return {
                    initialize: async function() { return true; },
                    convertImageToPDF: async function(imageData, filename) {
                        // If imageData is a dataURL, convert to a blob and return a simple object expected by pipeline
                        try {
                            if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                                const blob = dataURItoBlob(imageData);
                                return { data: blob, name: filename, estimatedSize: blob.size };
                            }
                            // If passed a File/Blob, return it as-is wrapped in an object
                            if (imageData instanceof Blob || (typeof File !== 'undefined' && imageData instanceof File)) {
                                return { data: imageData, name: filename, estimatedSize: imageData.size };
                            }
                            // Otherwise return a null-safe placeholder so downstream code can still continue
                            return { data: null, name: filename, estimatedSize: 0 };
                        } catch (e) {
                            console.warn('Fallback PDF conversion failed:', e);
                            return { data: null, name: filename, estimatedSize: 0 };
                        }
                    },
                    compress: async function(pdfData) {
                        // No compression in fallback; just pass through
                        return pdfData;
                    }
                };
            })();
        }

        // Prefer explicit SGK namespaced StorageManager to avoid colliding with
        // browser/platform APIs that may expose a non-constructible `StorageManager`.
        // Resolve a safe constructor or instance for storageManager
        let StorageCtor = null;
        if (window.SGK && typeof window.SGK.StorageManager === 'function') {
            StorageCtor = window.SGK.StorageManager;
        } else if (typeof StorageManager === 'function') {
            // Attempt to instantiate to ensure it's a constructible JS class (not a native non-constructible host object)
            try {
                new StorageManager();
                StorageCtor = StorageManager;
            } catch (err) {
                console.warn('Global StorageManager exists but is not constructible; skipping it to avoid Illegal constructor error.', err);
            }
        }

        if (StorageCtor) {
            this.storageManager = new StorageCtor({ debug: options.debug });
        } else if (window.SGK && window.SGK.storageManager) {
            // Use an already-instantiated SGK storage manager if present
            this.storageManager = window.SGK.storageManager;
        } else {
            // Inline lightweight fallback (namespaced) so we never rely on the ambiguous global name
            class SGKInlineStorageManager {
                constructor(opts = {}) { this.opts = opts || {}; }
                async savePatientDocument(patientId, doc) {
                    const key = 'sgk_documents_v1';
                    const existing = JSON.parse(localStorage.getItem(key) || '[]');
                    const entry = Object.assign({ id: 'sgk-' + Date.now(), savedAt: new Date().toISOString(), patientId }, doc);
                    existing.push(entry);
                    localStorage.setItem(key, JSON.stringify(existing));
                    return entry;
                }
                async add(doc) { return this.savePatientDocument(doc.patientId || null, doc); }
                async saveUnlimited(docs) { const res = []; for (const d of docs) res.push(await this.add(d)); return res; }
                async retrievePatientDocuments(patientId) { const key = 'sgk_documents_v1'; const all = JSON.parse(localStorage.getItem(key) || '[]'); return patientId ? all.filter(x => x.patientId === patientId) : all; }
            }
            this.storageManager = new SGKInlineStorageManager({ debug: options.debug });
        }

        // Legacy properties for backward compatibility
        this.nlpService = null;
        this.nlpEnabled = options.enableNLP !== false;
        this.debug = options.debug || false;
        this.patientMatchingThreshold = 0.75;
        this.fuzzyMatchingEnabled = true;

        console.log('🏥 SGK Document Pipeline initialized with modular architecture');
    }

    /**
     * Step 1: File Upload with validation
     */
    async uploadFile(file, dropZone = null) {
        try {
            console.log('📤 Step 1: File Upload - ' + file.name);
            
            // Validate file
            if (!this.validateFile(file)) {
                throw new Error('File validation failed');
            }

            // Show preview
            const preview = await this.createPreview(file);
            this.displayPreview(preview, dropZone);

            // Start processing pipeline
            const result = await this.processPipeline(file);
            
            return result;
        } catch (error) {
            console.error('❌ Upload failed:', error);
            throw error;
        }
    }

    validateFile(file) {
        // Check file type
        if (!this.supportedFormats.includes(file.type)) {
            Utils.showToast('Desteklenmeyen dosya formatı. PDF, JPG, PNG veya TIFF kullanın.', 'error');
            return false;
        }

        // Check file size (15MB limit)
        if (file.size > this.maxFileSize) {
            Utils.showToast('Dosya çok büyük. Maksimum 15MB dosya yükleyebilirsiniz.', 'error');
            return false;
        }

        return true;
    }

    async createPreview(file) {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            } else if (file.type === 'application/pdf') {
                // For PDF, create a placeholder preview
                resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI1MCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSIxMDAiIHk9IjEyNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiI+UERGIERvY3VtZW50PC90ZXh0Pjwvc3ZnPg==');
            }
        });
    }

    displayPreview(preview, container) {
        if (!container) return;
        
        const previewHTML = `
            <div class="upload-preview mt-4">
                <img src="${preview}" alt="Preview" class="max-w-full h-48 object-contain border rounded">
                <div class="mt-2 text-sm text-gray-600">
                    Dosya yüklendi, işleniyor...
                    <div class="progress-bar mt-2 bg-gray-200 rounded-full h-2">
                        <div class="progress-fill bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = previewHTML;
    }

    updateProgress(container, step, total, message) {
        const progressBar = container?.querySelector('.progress-fill');
        const progressText = container?.querySelector('.text-sm.text-gray-600');
        
        if (progressBar) {
            const percentage = (step / total) * 100;
            progressBar.style.width = percentage + '%';
        }
        
        if (progressText) {
            progressText.firstChild.textContent = message;
        }
    }

    /**
     * Main processing pipeline
     */
    async processPipeline(file) {
        const container = document.querySelector('.upload-preview');
        let processedData = {};

        try {
            // Step 1.1: Detect document edges and crop using enhanced ImageProcessor with rotation correction
            this.updateProgress(container, 1, 8, 'Belge kenarları tespit ediliyor ve döndürme düzeltmesi yapılıyor...');
            processedData = await this.imageProcessor.detectDocumentEdgesAndCrop(file);
            
            console.log('✂️ Enhanced ImageProcessor edge detection completed:', {
                processingApplied: processedData.processingApplied,
                contourDetected: !!processedData.contour,
                rotationCorrected: processedData.rotationCorrected,
                rotationAngle: processedData.rotationAngle,
                gpuAccelerated: processedData.metadata?.gpuAccelerated,
                metadata: processedData.metadata
            });

            // Step 2: OCR text extraction
            this.updateProgress(container, 2, 8, 'Metin çıkarılıyor (OCR)...');
            processedData.ocrText = await this.extractTextFromImage(processedData.croppedImage || file);

            // Hybrid enhancement: send OCR text to Paddle NLP for final extraction/classification when available
            if (this.nlpEnabled && processedData.ocrText && processedData.ocrText.length > 20) {
                processedData.nlpAttempted = true; // mark that we tried to enrich via NLP
                try {
                    const nlp = await this.ensureNLPServiceInitialized(2500);
                    if (nlp && typeof nlp.processDocument === 'function' && nlp.isReady && nlp.isReady()) {
                        if (this.debug) console.log('🔁 Sending OCR text to Paddle NLP for enrichment (hybrid flow)');
                        try {
                            const nlpResult = await nlp.processDocument(processedData.ocrText, 'sgk_document');
                            processedData.nlpResults = nlpResult;

                            // If NLP provides a stronger document classification, prefer it
                            if (nlpResult.classification && (!processedData.documentType || (nlpResult.classification.confidence > (processedData.documentType.confidence || 0)))) {
                                processedData.documentType = {
                                    type: nlpResult.classification.type,
                                    displayName: nlpResult.classification.type,
                                    confidence: nlpResult.classification.confidence,
                                    method: 'paddle_nlp'
                                };
                            }

                            // If NLP produced validated TC numbers, try to match patient by TC first
                            if (nlpResult.entities && Array.isArray(nlpResult.entities.TC_NUMBER) && nlpResult.entities.TC_NUMBER.length > 0) {
                                const tcEntity = nlpResult.entities.TC_NUMBER.find(t => t.validated) || nlpResult.entities.TC_NUMBER[0];
                                if (tcEntity && tcEntity.text) {
                                    const tc = String(tcEntity.text).replace(/\D/g, '');
                                    if (tc.length >= 3) {
                                        const patients = this.getAllPatients();
                                        // Prefer exact 11-digit match
                                        const exact = patients.find(p => String(p.tcNumber || p.tc || p.identityNumber || '').replace(/\D/g, '') === tc);
                                        if (exact) {
                                            processedData.patientMatch = { matched: true, patient: exact, confidence: 0.98, extractedInfo: { name: exact.name, tcNo: tc } };
                                        } else {
                                            // Try suffix or inclusion match (partial TC)
                                            const candidates = patients.filter(p => {
                                                const cleaned = String(p.tcNumber || p.tc || '').replace(/\D/g, '');
                                                return cleaned && (cleaned.endsWith(tc) || cleaned.includes(tc));
                                            });
                                            if (candidates.length) {
                                                processedData.patientMatch = { matched: true, patient: candidates[0], confidence: 0.8, candidates: candidates.map(c => ({ patient: c, confidence: 0.7 })) };
                                            }
                                        }
                                    }
                                }
                            }

                            // If still no TC-driven match, but PERSON entities exist, use the best PERSON and delegate matching
                            if (!processedData.patientMatch?.matched && nlpResult.entities && Array.isArray(nlpResult.entities.PERSON) && nlpResult.entities.PERSON.length > 0) {
                                const bestPerson = nlpResult.entities.PERSON.reduce((best, cur) => (cur.confidence > (best.confidence || 0) ? cur : best), nlpResult.entities.PERSON[0]);
                                const personName = bestPerson.text;
                                // Ask patientMatcher to find matches by name when possible
                                if (this.patientMatcher && typeof this.patientMatcher.matchPatient === 'function') {
                                    try {
                                        const pm = await this.patientMatcher.matchPatient(personName);
                                        if (pm && pm.matched) processedData.patientMatch = pm;
                                    } catch (pmErr) {
                                        // fallback to default matching by full OCR text
                                        if (this.debug) console.warn('PatientMatcher.matchPatient failed on PERSON entity, falling back to generic match', pmErr);
                                    }
                                }
                            }

                        } catch (nlpErr) {
                            console.warn('Paddle NLP enrichment failed (processing):', nlpErr);
                        }
                    }
                } catch (initErr) {
                    if (this.debug) console.warn('NLP init/enrichment skipped:', initErr);
                }
            }

            // Step 3: Patient matching
            this.updateProgress(container, 3, 8, 'Hasta eşleştiriliyor...');
            // If an NLP-driven patientMatch was already determined, skip heavy matching
            if (!processedData.patientMatch || !processedData.patientMatch.matched) {
                processedData.patientMatch = await this.matchPatientByName(processedData.ocrText);
            }

            // Step 4: Document type detection
            this.updateProgress(container, 4, 8, 'Belge türü tespit ediliyor...');
            processedData.documentType = await this.detectDocumentType(processedData.ocrText, file.name);

            // Step 5: Convert to PDF
            this.updateProgress(container, 5, 8, 'PDF\'e dönüştürülüyor...');
            processedData.pdfData = await this.convertToPDF(processedData.croppedImage || file, processedData);

            // Step 6: Compress PDF
            this.updateProgress(container, 6, 8, 'PDF sıkıştırılıyor...');
            processedData.compressedPDF = await this.compressPDF(processedData.pdfData);

            // Step 7: Save file
            this.updateProgress(container, 7, 8, 'Dosya kaydediliyor...');
            processedData.savedDocument = await this.saveToPatientDocuments(processedData);

            // Step 8: Update UI
            this.updateProgress(container, 8, 8, 'Tamamlandı!');
            this.showInPatientDocuments(processedData.savedDocument);

            return processedData;

        } catch (error) {
            this.updateProgress(container, 0, 8, 'Hata: ' + error.message);
            throw error;
        }
    }

    /**
     * Step 1.1: Enhanced document edge detection and cropping
     */
    async detectDocumentEdgesAndCrop(file) {
        // Delegate heavy image processing to the ImageProcessor module when available.
        if (this.imageProcessor && typeof this.imageProcessor.detectDocumentEdgesAndCrop === 'function') {
            return await this.imageProcessor.detectDocumentEdgesAndCrop(file);
        }

        // Minimal fallback: return a simple dataURL preview and mark that no heavy processing was applied.
        try {
            const dataUrl = await this.fileToImageData(file);
            return {
                croppedImage: dataUrl,
                originalImage: dataUrl,
                contour: null,
                processingApplied: false
            };
        } catch (err) {
            return {
                croppedImage: null,
                originalImage: null,
                contour: null,
                processingApplied: false,
                error: err?.message || String(err)
            };
        }
    }

    // Replace lower-level image helpers with delegating stubs that prefer the ImageProcessor module.
    detectDocumentBounds(imageData) {
        if (this.imageProcessor && typeof this.imageProcessor.detectDocumentBounds === 'function') {
            return this.imageProcessor.detectDocumentBounds(imageData);
        }
        // Lightweight fallback: attempt a very small heuristic using dimensions only
        try {
            const width = imageData.width || 0;
            const height = imageData.height || 0;
            return { left: 0, top: 0, right: width, bottom: height };
        } catch (e) {
            return null;
        }
    }

    convertToGrayscale(data, width, height) {
        if (this.imageProcessor && typeof this.imageProcessor.convertToGrayscale === 'function') {
            return this.imageProcessor.convertToGrayscale(data, width, height);
        }
        // Very small, fast grayscale conversion fallback
        const gray = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        return gray;
    }

    applyGaussianBlur(data, width, height) {
        if (this.imageProcessor && typeof this.imageProcessor.applyGaussianBlur === 'function') {
            return this.imageProcessor.applyGaussianBlur(data, width, height);
        }
        // Fallback: return input (no-op) to keep pipeline safe and fast
        return data;
    }

    applyCanny(data, width, height, lowThreshold, highThreshold) {
        if (this.imageProcessor && typeof this.imageProcessor.applyCanny === 'function') {
            return this.imageProcessor.applyCanny(data, width, height, lowThreshold, highThreshold);
        }
        // Lightweight fallback: simple gradient thresholding (fast but imprecise)
        const edges = new Uint8ClampedArray(width * height);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                edges[y * width + x] = gray > highThreshold ? 255 : 0;
            }
        }
        return edges;
    }

    findContours(edges, width, height) {
        if (this.imageProcessor && typeof this.imageProcessor.findContours === 'function') {
            return this.imageProcessor.findContours(edges, width, height);
        }
        // Minimal fallback: return bounding box for non-empty edge map
        let found = false;
        for (let i = 0; i < edges.length; i++) if (edges[i] > 0) { found = true; break; }
        if (!found) return [];
        return [[{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]];
    }

    selectBestDocumentContour(contours, width, height) {
        if (this.imageProcessor && typeof this.imageProcessor.selectBestDocumentContour === 'function') {
            return this.imageProcessor.selectBestDocumentContour(contours, width, height);
        }
        if (!contours || contours.length === 0) return null;
        return contours[0];
    }

    // Lightweight fallbacks for helper geometry functions so other code can still call them
    calculateContourArea(contour) {
        if (!contour || contour.length < 3) return 0;
        // Delegate
        if (this.imageProcessor && typeof this.imageProcessor.calculateContourArea === 'function') {
            return this.imageProcessor.calculateContourArea(contour);
        }
        let area = 0;
        for (let i = 0; i < contour.length; i++) {
            const j = (i + 1) % contour.length;
            area += contour[i].x * contour[j].y - contour[j].x * contour[i].y;
        }
        return Math.abs(area) / 2;
    }

    calculateAspectRatio(contour) {
        if (this.imageProcessor && typeof this.imageProcessor.calculateAspectRatio === 'function') {
            return this.imageProcessor.calculateAspectRatio(contour);
        }
        try {
            const w = Math.max(
                this.distance(contour[0], contour[1]),
                this.distance(contour[2], contour[3])
            );
            const h = Math.max(
                this.distance(contour[1], contour[2]),
                this.distance(contour[3], contour[0])
            );
            return Math.min(w, h) / Math.max(w, h);
        } catch (e) {
            return 1;
        }
    }

    calculateRectangularity(contour) {
        if (this.imageProcessor && typeof this.imageProcessor.calculateRectangularity === 'function') {
            return this.imageProcessor.calculateRectangularity(contour);
        }
        return 1; // optimistic fallback
    }

    calculateAngle(p1, p2, p3) {
        if (this.imageProcessor && typeof this.imageProcessor.calculateAngle === 'function') {
            return this.imageProcessor.calculateAngle(p1, p2, p3);
        }
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const cos = dot / (mag1 * mag2 || 1);
        const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
        return angle * (180 / Math.PI);
    }

    applySmartCrop(imageData, width, height) {
        if (this.imageProcessor && typeof this.imageProcessor.applySmartCrop === 'function') {
            return this.imageProcessor.applySmartCrop(imageData, width, height);
        }
        // Keep the lightweight margin crop fallback that was already present
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const margin = Math.min(width, height) * 0.05;
        const cropX = Math.max(0, Math.floor(margin));
        const cropY = Math.max(0, Math.floor(margin));
        const cropWidth = Math.min(width - 2 * cropX, width);
        const cropHeight = Math.min(height - 2 * cropY, height);
        canvas.width = cropWidth; canvas.height = cropHeight;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = width; tempCanvas.height = height;
        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        return canvas.toDataURL('image/jpeg', 0.95);
    }

    applyCropAndCorrection(img, contour, originalWidth, originalHeight) {
        if (this.imageProcessor && typeof this.imageProcessor.applyCropAndCorrection === 'function') {
            return this.imageProcessor.applyCropAndCorrection(img, contour, originalWidth, originalHeight);
        }
        // Minimal fallback that preserves previous simple behavior
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let minX = contour[0].x, maxX = contour[0].x, minY = contour[0].y, maxY = contour[0].y;
        contour.forEach(point => { minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y); });
        const outputWidth = Math.floor(Math.max(this.distance(contour[0], contour[1]), this.distance(contour[2], contour[3])));
        const outputHeight = Math.floor(Math.max(this.distance(contour[1], contour[2]), this.distance(contour[3], contour[0])));
        canvas.width = outputWidth; canvas.height = outputHeight;
        const scaleX = img.width / originalWidth; const scaleY = img.height / originalHeight;
        ctx.drawImage(img, minX * scaleX, minY * scaleY, (maxX - minX) * scaleX, (maxY - minY) * scaleY, 0, 0, outputWidth, outputHeight);
        return { canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.95) };
    }

    distance(p1, p2) {
        if (!p1 || !p2) return 0;
        if (this.imageProcessor && typeof this.imageProcessor.distance === 'function') {
            return this.imageProcessor.distance(p1, p2);
        }
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    fourPointTransform(img, contour) {
        // Keep the delegator version (if imageProcessor provides it)
        if (this.imageProcessor && typeof this.imageProcessor.fourPointTransform === 'function') {
            return this.imageProcessor.fourPointTransform(img, contour);
        }
        // Fallback simple crop
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let minX = contour[0].x, maxX = contour[0].x, minY = contour[0].y, maxY = contour[0].y;
        contour.forEach(point => { minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y); });
        const width = maxX - minX; const height = maxY - minY; canvas.width = width; canvas.height = height; ctx.drawImage(img, minX, minY, width, height, 0, 0, width, height); return canvas.toDataURL('image/jpeg', 0.9);
    }

    /**
     * Step 2: Extract text from image using OCR
     */
    async extractTextFromImage(imageData) {
        console.log('📝 Step 2: OCR Text Extraction (delegated)');
        try {
            if (this.ocrEngine && typeof this.ocrEngine.processImage === 'function') {
                const ocrResult = await this.ocrEngine.processImage(imageData, 'sgk_document');
                return ocrResult?.text || '';
            }

            // Fallback to global window OCR engine
            if (window.ocrEngine && typeof window.ocrEngine.processImage === 'function') {
                const ocrResult = await window.ocrEngine.processImage(imageData, 'sgk_document');
                return ocrResult?.text || '';
            }

            // Minimal fallback: return empty string to indicate OCR was not available
            console.warn('⚠️ OCR engine not available, returning empty text');
            return '';
        } catch (error) {
            console.error('❌ OCR failed (delegated):', error);
            throw new Error('OCR işlemi başarısız: ' + (error?.message || String(error)));
        }
    }

    async matchPatientByName(ocrText) {
        console.log('👤 Step 3: Patient Matching (delegated)');
        try {
            if (this.patientMatcher && typeof this.patientMatcher.match === 'function') {
                return await this.patientMatcher.match(ocrText);
            }
            if (this.patientMatcher && typeof this.patientMatcher.matchPatient === 'function') {
                return await this.patientMatcher.matchPatient(ocrText);
            }

            // Fallback lightweight matching: try to find any patient whose name appears as substring in OCR text
            const patients = this.getAllPatients();
            const textLower = (ocrText || '').toLowerCase();
            for (const p of patients) {
                if (!p.name) continue;
                const nameLower = p.name.toLowerCase();
                if (textLower.includes(nameLower) || nameLower.includes(textLower)) {
                    return { matched: true, patient: p, confidence: 0.8, extractedInfo: { name: p.name }, candidates: [{ patient: p, confidence: 0.8 }] };
                }
            }

            return { matched: false, confidence: 0, extractedInfo: {}, candidates: [] };
        } catch (error) {
            console.error('❌ Patient matching failed (delegated):', error);
            return { matched: false, confidence: 0, error: error?.message || String(error), candidates: [] };
        }
    }

    /**
     * Step 4: Detect document type
     */
    async detectDocumentType(ocrText, fileName) {
        console.log('📋 Step 4: Document Type Detection');
        
        try {
            // Use enhanced OCR engine classification if available
            if (window.ocrEngine && window.ocrEngine.classifyDocument) {
                const classification = window.ocrEngine.classifyDocument(ocrText);
                console.log('🧠 OCR Engine classification:', classification);
                
                if (classification.confidence > 0.3) {
                    return {
                        type: classification.type,
                        displayName: classification.displayName,
                        confidence: classification.confidence,
                        method: 'ocr_engine'
                    };
                }
            }
            
            // Fallback to pattern-based detection
            const text = ocrText.toLowerCase();
            const name = fileName.toLowerCase();
            
            // Check for specific SGK document types with enhanced patterns
            if (text.includes('reçete') || text.includes('recete') || name.includes('recete')) {
                if (text.includes('pil') || name.includes('pil')) {
                    return { 
                        type: 'pil_recete', 
                        displayName: 'Pil Reçete',
                        confidence: 0.9,
                        method: 'pattern_match'
                    };
                } else if (text.includes('cihaz') || text.includes('işitme') || text.includes('isitme') || name.includes('cihaz')) {
                    return { 
                        type: 'cihaz_recete', 
                        displayName: 'Cihaz Reçete',
                        confidence: 0.9,
                        method: 'pattern_match'
                    };
                } else {
                    return { 
                        type: 'recete', 
                        displayName: 'Reçete',
                        confidence: 0.8,
                        method: 'pattern_match'
                    };
                }
            }
            
            if (text.includes('odyogram') || text.includes('audiogram') || text.includes('odyometri') || text.includes('audiometri') || name.includes('odyo')) {
                return { 
                    type: 'odyogram', 
                    displayName: 'Odyogram',
                    confidence: 0.95,
                    method: 'pattern_match'
                };
            }
            
            if (text.includes('uygunluk') || (text.includes('rapor') && (text.includes('sgk') || name.includes('sgk')))) {
                return { 
                    type: 'uygunluk_belgesi', 
                    displayName: 'Uygunluk Belgesi',
                    confidence: 0.9,
                    method: 'pattern_match'
                };
            }
            
            if (text.includes('muayene') && text.includes('rapor')) {
                return { 
                    type: 'sgk_raporu', 
                    displayName: 'SGK Raporu',
                    confidence: 0.85,
                    method: 'pattern_match'
                };
            }
            
            console.log('⚠️ Document type not clearly identified, using default');
            return { 
                type: 'diger', 
                displayName: 'Diğer',
                confidence: 0.1,
                method: 'default'
            };
            
        } catch (error) {
            console.error('❌ Error in document type detection:', error);
            return { 
                type: 'diger', 
                displayName: 'Diğer',
                confidence: 0.1,
                method: 'error_fallback'
            };
        }
    }

    /**
     * Step 5: Convert to PDF with enhanced compression support
     */
    async convertToPDF(imageData, processedData) {
        console.log('📄 Step 5: Converting to PDF (delegated)');
        try {
            if (this.pdfConverter && typeof this.pdfConverter.convertImageToPDF === 'function') {
                return await this.pdfConverter.convertImageToPDF(imageData, this.generateIntelligentFilename(processedData), processedData);
            }
            if (window.pdfConverter && typeof window.pdfConverter.convertImageToPDF === 'function') {
                return await window.pdfConverter.convertImageToPDF(imageData, this.generateIntelligentFilename(processedData), processedData);
            }
            throw new Error('PDF converter not available');
        } catch (error) {
            console.error('❌ PDF conversion failed (delegated):', error);
            throw new Error('PDF dönüştürme başarısız: ' + (error?.message || String(error)));
        }
    }

    /**
     * Step 6: Enhanced PDF compression with aggressive size reduction
     */
    async compressPDF(pdfData) {
        console.log('🗜️ Step 6: Enhanced PDF compression (delegated)');
        try {
            if (this.pdfConverter && typeof this.pdfConverter.compress === 'function') {
                return await this.pdfConverter.compress(pdfData);
            }
            if (window.pdfConverter && typeof window.pdfConverter.compress === 'function') {
                return await window.pdfConverter.compress(pdfData);
            }
            // Minimal fallback: return original
            return pdfData;
        } catch (error) {
            console.error('❌ PDF compression failed (delegated):', error);
            return pdfData;
        }
    }

    /**
     * Step 7: Save to patient documents
     */
    async saveToPatientDocuments(processedData) {
        console.log('💾 Step 7: Saving to patient documents (delegated)');
        try {
            const document = {
                id: 'sgk_doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                patientId: processedData.patientMatch?.patient?.id || processedData.patientMatch?.patientId || null,
                patientName: processedData.patientMatch?.patient?.name || processedData.patientMatch?.extractedInfo?.name || 'Bilinmeyen Hasta',
                documentType: processedData.documentType?.type || 'other',
                filename: (processedData.pdfData && processedData.pdfData.name) || processedData.originalFilename || this.generateIntelligentFilename(processedData),
                fileSize: processedData.compressedPDF?.estimatedSize || processedData.pdfData?.size || 0,
                uploadDate: new Date().toISOString(),
                ocrText: processedData.ocrText || '',
                ocrSuccess: !!processedData.ocrText,
                patientMatch: processedData.patientMatch,
                documentTypeConfidence: processedData.documentType?.confidence || 0,
                pdfData: processedData.compressedPDF?.data || processedData.pdfData?.data,
                originalImage: processedData.originalImage,
                croppedImage: processedData.croppedImage,
                metadata: processedData.metadata || {},
                // NLP indicators for UI
                nlpResults: processedData.nlpResults || null,
                nlpAttempted: !!processedData.nlpAttempted,
                nlpReady: !!(processedData.nlpResults),
            };

            // Prefer storage manager
            if (this.storageManager && typeof this.storageManager.saveDocumentToPatient === 'function') {
                await this.storageManager.saveDocumentToPatient(document);
                return document;
            }
            if (this.storageManager && typeof this.storageManager.add === 'function') {
                await this.storageManager.add(document);
                return document;
            }

            // Fallback to local storage as before
            this.saveDocumentToStorage(document);
            return document;
        } catch (error) {
            console.error('❌ Save failed (delegated):', error);
            throw new Error('Belge kaydetme başarısız: ' + (error?.message || String(error)));
        }
    }

    saveDocumentToStorage(document) {
        // Keep localStorage fallback but prefer storageManager if available
        if (this.storageManager && typeof this.storageManager.saveToLocalFallback === 'function') {
            try {
                return this.storageManager.saveToLocalFallback(document);
            } catch (err) {
                console.warn('StorageManager local fallback failed, falling back to inline implementation', err);
            }
        }

        try {
            // Validate document structure
            if (!document || !document.patientId || !document.id) {
                throw new Error('Eksik belge bilgisi: Hasta ID veya belge ID bulunamadı');
            }

            // Check localStorage availability and quota
            if (!window.localStorage) {
                throw new Error('Tarayıcı depolama desteği bulunamadı');
            }

            // Check storage quota before saving
            const testKey = 'quota_test_' + Date.now();
            try {
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
            } catch (quotaError) {
                if (quotaError.name === 'QuotaExceededError') {
                    throw new Error('Depolama alanı dolu. Lütfen eski belgeleri silin.');
                }
                throw new Error('Depolama erişim hatası: ' + quotaError.message);
            }

            // Save to patient-specific storage
            const patientDocuments = JSON.parse(localStorage.getItem('patient_documents') || '{}');
            
            if (!patientDocuments[document.patientId]) {
                patientDocuments[document.patientId] = [];
            }
            
            patientDocuments[document.patientId].push(document);
            localStorage.setItem('patient_documents', JSON.stringify(patientDocuments));
            
            // Also save to general SGK documents
            const sgkDocuments = JSON.parse(localStorage.getItem('sgk_documents') || '[]');
            sgkDocuments.push(document);
            localStorage.setItem('sgk_documents', JSON.stringify(sgkDocuments));
            
            console.log('✅ Document saved to storage successfully');
            
        } catch (error) {
            console.error('❌ Storage save failed:', error);
            // Re-throw with more specific error message
            throw new Error('Belge kaydetme hatası: ' + error.message);
        }
    }

    /**
     * Step 8: Show in patient documents UI
     */
    showInPatientDocuments(document) {
        // Prefer UI module when available
        if (window.SGK && window.SGK.ui && typeof window.SGK.ui.renderDocumentInUI === 'function') {
            try {
                window.SGK.ui.renderDocumentInUI(document);
                return;
            } catch (e) {
                console.warn('SGK UI render failed, falling back to pipeline UI', e);
            }
        }

        // Fallback to existing inline UI render
        this.renderDocumentInUI(document, document.querySelector?.('[data-document-list]') || document.querySelector?.('.documents-list') || document.querySelector?.('#documentsTab'));
    }

    renderDocumentInUI(document, container) {
        const statusBadge = document.ocrSuccess ? 
            '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">✅ İşlendi</span>' :
            '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">⚠️ Kısmi</span>';
        
        const matchBadge = document.patientMatch?.matched ?
            '<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">👤 Eşleşti</span>' :
            '<span class="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">❓ Manuel</span>';
        
        const nlpBadge = (doc) => {
            if (doc.nlpReady && doc.nlpResults) {
                const c = Math.round((doc.nlpResults.confidence || 0) * 100);
                return `<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">🔒 Sunucu doğrulandı ${c}%</span>`;
            }
            if (doc.nlpAttempted && !doc.nlpReady) {
                return `<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">☁️ Sunucu denendi (yanıt yok)</span>`;
            }
            if (this.nlpEnabled) {
                return `<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">☁️ Sunucu bulunamadı</span>`;
            }
            return `<span class="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">—</span>`;
        };
        
        const documentHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-4 mb-3" data-document-id="${document.id}">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-2">
                            <span class="text-lg">${this.getTypeIcon(document.documentType)}</span>
                            <h4 class="font-medium text-gray-900">${this.getTypeDisplayName(document.documentType)}</h4>
                            ${statusBadge}
                            ${matchBadge}
                            ${nlpBadge(document)}
                        </div>
                        
                        <div class="text-sm text-gray-600 mb-2">
                            <p><strong>Dosya:</strong> ${document.filename}</p>
                            <p><strong>Boyut:</strong> ${this.formatFileSize(document.fileSize)}</p>
                            <p><strong>Yüklenme:</strong> ${new Date(document.uploadDate).toLocaleString('tr-TR')}</p>
                            ${document.patientMatch?.extractedInfo?.name ? 
                                `<p><strong>Tespit Edilen Hasta:</strong> ${document.patientMatch.extractedInfo.name}</p>` : ''}
                        </div>
                        
                        <div class="flex space-x-2 text-xs text-gray-500">
                            <span>OCR: ${document.documentTypeConfidence ? Math.round(document.documentTypeConfidence * 100) + '%' : 'N/A'}</span>
                            <span>•</span>
                            <span>Tür: ${document.documentTypeConfidence ? Math.round(document.documentTypeConfidence * 100) + '%' : 'N/A'}</span>
                            ${document.patientMatch?.confidence ? 
                                `<span>•</span><span>Eşleşme: ${Math.round(document.patientMatch.confidence * 100)}%</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="flex flex-col space-y-2 ml-4">
                        <button onclick="sgkPipeline.downloadDocument('${document.id}')" 
                                class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                            📄 İndir
                        </button>
                        <button onclick="sgkPipeline.viewDocument('${document.id}')" 
                                class="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600">
                            👁️ Görüntüle
                        </button>
                        ${!document.patientMatch?.matched ? 
                            `<button onclick="sgkPipeline.assignPatient('${document.id}')" 
                                     class="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600">
                                🎯 Ata
                            </button>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // If the document already exists in the UI, update it instead of inserting a duplicate.
        try {
            const root = container || document.querySelector?.('#documentsTab') || document.querySelector?.('.documents-list');
            if (!root) {
                console.warn('No container found for rendering document UI, skipping render');
                return;
            }
            const existingNode = root.querySelector(`[data-document-id="${document.id}"]`);
            if (existingNode) {
                // Replace existing node HTML to reflect updated data (idempotent update)
                existingNode.outerHTML = documentHTML;
                return;
            }
            root.insertAdjacentHTML('afterbegin', documentHTML);
        } catch (err) {
            console.error('Failed to render document in UI (idempotent update failed):', err);
            // Best-effort fallback: attempt naive insert
            try { document.querySelector('.documents-list')?.insertAdjacentHTML('afterbegin', documentHTML); } catch (e) { console.warn('Final UI insert fallback failed', e); }
        }
    }

    // New utility: unified patient list accessor used by matching fallbacks and UI
    getAllPatients() {
        try {
            // 1) Prefer patientMatcher's authoritative list if available
            if (this.patientMatcher && typeof this.patientMatcher.getAllPatients === 'function') {
                const pm = this.patientMatcher.getAllPatients();
                if (Array.isArray(pm)) return pm;
            }

            // 2) Common global variables used across the app (backward compatibility)
            if (window.patientDatabase && Array.isArray(window.patientDatabase)) return window.patientDatabase;
            if (window.sampleData && Array.isArray(window.sampleData.patients)) return window.sampleData.patients;
            if (window.samplePatients && Array.isArray(window.samplePatients)) return window.samplePatients;

            // 3) Local storage fallback
            const stored = localStorage.getItem('patients');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) return parsed;
                    if (parsed && Array.isArray(parsed.patients)) return parsed.patients;
                } catch (e) {
                    console.warn('Failed to parse patients from localStorage fallback', e);
                }
            }

            // 4) Last resort: empty list
            return [];
        } catch (error) {
            console.error('getAllPatients failed:', error);
            return [];
        }
    }

    /**
     * Utility: Generate a smart filename based on document content and type
     */
    generateIntelligentFilename(processedData) {
        try {
            const patientId = processedData.patientMatch?.patient?.id || processedData.patientMatch?.patientId || 'unknown';
            const patientName = (processedData.patientMatch?.patient?.name || processedData.patientMatch?.extractedInfo?.name || 'Bilinmeyen Hasta').replace(/[\/\\\:\*\?"<>\|]/g, '_');
            const documentType = processedData.documentType?.displayName || 'Belge';
            const date = new Date(processedData.uploadDate || Date.now()).toISOString().slice(0, 10);
            const time = new Date(processedData.uploadDate || Date.now()).toTimeString().slice(0, 8).replace(/:/g, '-');
            return `${date}_${time}_${patientId}_${patientName}_${documentType}.pdf`.replace(/\s+/g, '_');
        } catch (error) {
            console.error('Filename generation error:', error);
            return 'belge.pdf';
        }
    }

    /**
     * Step 0: Initialize pipeline (deprecated, use constructor options)
     */
    async init(options = {}) {
        console.warn('SGKDocumentPipeline.init is deprecated, use constructor options instead');
        this.debug = options.debug || this.debug;
        this.nlpEnabled = options.enableNLP !== false;
        // Re-initialize components if needed
        if (options.reset) {
            this.fileValidator = new FileValidator({
                maxFileSize: this.maxFileSize,
                supportedFormats: this.supportedFormats,
                debug: this.debug
            });
    
            this.imageProcessor = new ImageProcessor({
                debug: this.debug,
                maxDimension: 1200
            });
    
            this.ocrEngine = new OCREngine({
                debug: this.debug,
                language: 'tur+eng'
            });
    
            this.patientMatcher = new PatientMatcher({
                debug: this.debug,
                similarityThreshold: 0.75
            });
    
            this.pdfConverter = new PDFConverter({
                debug: this.debug,
                targetSizeKB: this.targetPDFSize / 1024
            });
        }
    }

    /**
     * Legacy: direct file processing (deprecated, use uploadFile)
     */
    async processFile(file, dropZone = null) {
        console.warn('SGKDocumentPipeline.processFile is deprecated, use uploadFile instead');
        return this.uploadFile(file, dropZone);
    }

    // Ensure NLP service (Paddle) is available and initialized with a short timeout
    async ensureNLPServiceInitialized(timeoutMs = 2500) {
        if (!this.nlpEnabled) return null;
        if (this.nlpService) return this.nlpService;
        if (typeof PaddleNLPService !== 'function') {
            if (this.debug) console.warn('PaddleNLPService not available in global scope');
            return null;
        }

        try {
            this.nlpService = new PaddleNLPService({ debug: this.debug });
            // initialize but guard with timeout so UI isn't blocked by slow backend
            await Promise.race([
                this.nlpService.initialize(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('nlp-init-timeout')), timeoutMs))
            ]);
            return this.nlpService;
        } catch (err) {
            console.warn('NLP service initialization failed or timed out:', err?.message || err);
            // Keep fallback behavior (nlpService may have initialized in fallback mode)
            if (this.nlpService && this.nlpService.initialized) return this.nlpService;
            return null;
        }
    }
}