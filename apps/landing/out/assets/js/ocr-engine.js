// OCR Engine - Dedicated OCR functionality for X-Ear CRM
// Handles Turkish document OCR, patient name extraction, and document classification

class OCREngine {
    constructor(options = {}) {
        this.isInitialized = false;
        this.tesseractWorker = null;
        this.turkishNames = this.loadTurkishNames();
        this.dynamicNames = {
            male: new Set(),
            female: new Set(), 
            surnames: new Set()
        };
        this.loadDynamicNames();
        
        // NLP Integration for enhanced processing
        this.nlpService = null;
        this.nlpEnabled = options.enableNLP !== false;
        this.enhancedProcessing = options.enhancedProcessing || false;
        this.debug = options.debug || false;
        // Keep original options accessible to other methods
        this.options = options || {};
        
        // Enhanced caching with NLP results
        this.resultCache = new Map();
        this.nlpCache = new Map();
        this.maxCacheSize = options.maxCacheSize || 100;
        
        console.log('🔧 OCR Engine initialized with NLP enhancement:', this.nlpEnabled);
    }

    // Initialize Tesseract worker and NLP service
    async initialize() {
        if (this.isInitialized) return;

        try {
            console.log('🔄 Initializing OCR Engine with NLP...');
            
            // Check if Tesseract is available
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract library not loaded');
            }

            // Initialize Tesseract with optimized parameters for medical documents
            this.tesseractWorker = await Tesseract.createWorker({
                logger: m => this.debug ? console.log('Tesseract:', m) : null
            });

            // Allow configuration of tessdata path via global SGKConfig if available
            const tessDataPath = (window.SGKConfig && window.SGKConfig.tessdataPath) || null;
            if (tessDataPath && typeof this.tesseractWorker.setParameters === 'function') {
                try {
                    // instruct worker where to fetch traineddata if runtime supports it
                    await this.tesseractWorker.setParameters({ tessdata_dir: tessDataPath });
                } catch (e) {
                    // non-fatal - continue
                    if (this.debug) console.warn('Could not apply tessdata_dir parameter', e);
                }
            }

            // Try to load preferred languages first, but fall back safely when tessdata are missing
            const desiredLang = this.options.language || 'tur+eng';
            let initializedLang = null;
            try {
                await this.tesseractWorker.loadLanguage(desiredLang);
                await this.tesseractWorker.initialize(desiredLang);
                initializedLang = desiredLang;
            } catch (langErr) {
                console.warn('⚠️ Tesseract failed to load desired languages:', desiredLang, langErr);
                // Fallback: try English-only to keep OCR functional in degraded environments
                try {
                    await this.tesseractWorker.loadLanguage('eng');
                    await this.tesseractWorker.initialize('eng');
                    initializedLang = 'eng';
                    console.warn('🔁 Fallback to English-only OCR');
                } catch (engErr) {
                    console.error('❌ Tesseract failed to initialize any language. Disabling OCR worker to avoid runtime errors.', engErr);
                    // Disable the worker but keep the service initialized so the pipeline can fall back to OCR-less behavior
                    try { await this.tesseractWorker.terminate(); } catch (e) {}
                    this.tesseractWorker = null;
                    this.isInitialized = true; // mark initialized to avoid retries
                    return;
                }
            }

            // Set optimized parameters for Turkish medical documents (or for fallback English) and avoid unconditional OSD usage
            try {
                await this.tesseractWorker.setParameters({
                    // Use a non-OSD PSM in degraded environments to avoid requests for osd.traineddata
                    tessedit_pageseg_mode: initializedLang && initializedLang.includes('tur') ? '1' : '6',
                    tessedit_ocr_engine_mode: '3',
                    tessedit_char_whitelist: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZabcçdefgğhıijklmnoöprsştuüvyz0123456789:.-/ ',
                    preserve_interword_spaces: '1',
                    tessjs_create_hocr: '1',
                    tessjs_create_tsv: '1'
                });
            } catch (paramErr) {
                if (this.debug) console.warn('Could not set some Tesseract parameters, continuing:', paramErr);
            }
            
            // Initialize NLP service if enabled
            if (this.nlpEnabled && typeof PaddleNLPService !== 'undefined') {
                try {
                    this.nlpService = new PaddleNLPService({ 
                        debug: this.debug,
                        language: 'tr' 
                    });
                    await this.nlpService.initialize();
                    console.log('🧠 NLP service integrated successfully');
                } catch (nlpError) {
                    console.warn('⚠️ NLP service failed to initialize, continuing without NLP:', nlpError);
                    this.nlpEnabled = false;
                }
            }
            
            this.isInitialized = true;
            console.log('✅ OCR Engine with NLP initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize OCR:', error);
            throw error;
        }
    }

    // Process image and extract text with NLP enhancement
    async processImage(imageData, fileName) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log(`🔄 Processing OCR with NLP for: ${fileName}`);
            const startTime = Date.now();
            
            // Generate cache key
            const cacheKey = this.generateImageCacheKey(imageData, fileName);
            
            // Check cache first
            if (this.resultCache.has(cacheKey)) {
                console.log(`📦 Cache hit for ${fileName}`);
                return this.resultCache.get(cacheKey);
            }
            
            // Preprocess image for better OCR accuracy
            const preprocessedImage = await this.preprocessImageForOCR(imageData);
            
            // Perform OCR with enhanced image
            const { data: { text, confidence } } = await this.tesseractWorker.recognize(preprocessedImage);
            
            // Validate OCR results
            const extractedText = text || '';
            const ocrConfidence = confidence || 0;
            
            const ocrTime = Date.now() - startTime;
            console.log(`✅ OCR completed for: ${fileName} (${ocrTime}ms)`);
            console.log('📝 Extracted text length:', extractedText.length);
            console.log('📝 First 200 chars:', extractedText.substring(0, 200));
            console.log('🎯 OCR confidence:', ocrConfidence);
            
            // Check if OCR extracted meaningful text
            if (extractedText.length === 0) {
                console.warn(`⚠️ No text extracted from ${fileName}`);
            }
            
            // Prepare result object
            const result = {
                text: extractedText,
                ocrConfidence: ocrConfidence,
                processingTime: ocrTime,
                fileName,
                enhanced: false,
                nlpResults: null
            };
            
            // Apply NLP enhancement if available and we have text
            if (this.nlpEnabled && this.nlpService && this.nlpService.isReady() && extractedText.length > 20) {
                try {
                    const nlpStartTime = Date.now();
                    console.log('🧠 Applying NLP enhancement...');
                    
                    // Check NLP cache
                    const nlpCacheKey = this.generateTextCacheKey(extractedText);
                    let nlpResults;
                    
                    if (this.nlpCache.has(nlpCacheKey)) {
                        nlpResults = this.nlpCache.get(nlpCacheKey);
                        console.log('📦 NLP cache hit');
                    } else {
                        // Process with NLP
                        nlpResults = await this.nlpService.processDocument(extractedText, 'medical');
                        
                        // Cache NLP results
                        this.nlpCache.set(nlpCacheKey, nlpResults);
                        if (this.nlpCache.size > this.maxCacheSize) {
                            const firstKey = this.nlpCache.keys().next().value;
                            this.nlpCache.delete(firstKey);
                        }
                    }
                    
                    const nlpTime = Date.now() - nlpStartTime;
                    console.log(`🧠 NLP processing completed (${nlpTime}ms)`);
                    console.log('🎯 NLP confidence:', nlpResults.confidence);
                    console.log('📊 Entities found:', Object.keys(nlpResults.entities).length);
                    
                    // Enhance result with NLP data
                    result.enhanced = true;
                    result.nlpResults = nlpResults;
                    result.processingTime += nlpTime;
                    result.combinedConfidence = this.calculateCombinedConfidence(confidence, nlpResults.confidence);
                    
                } catch (nlpError) {
                    console.warn('⚠️ NLP processing failed, continuing with OCR only:', nlpError);
                    result.nlpError = nlpError.message;
                }
            }
            
            // Cache the complete result
            this.resultCache.set(cacheKey, result);
            if (this.resultCache.size > this.maxCacheSize) {
                const firstKey = this.resultCache.keys().next().value;
                this.resultCache.delete(firstKey);
            }
            
            return result;
            
        } catch (error) {
            console.error(`❌ OCR processing failed for ${fileName}:`, error);
            throw error;
        }
    }

    // Extract patient information from OCR text or NLP results
    async extractPatientInfo(ocrResult) {
        console.log('🔍 Extracting patient info from OCR result...');
        
        // Handle both string text and enhanced result object
        let text = '';
        if (typeof ocrResult === 'string') {
            text = ocrResult;
        } else if (ocrResult && typeof ocrResult === 'object') {
            text = ocrResult.text || '';
        }
        
        // Safety check for valid text
        if (!text || typeof text !== 'string') {
            console.warn('⚠️ extractPatientInfo: No valid text found in OCR result');
            return {
                name: '',
                tcNo: '',
                birthDate: '',
                confidence: 0,
                method: 'error',
                entities: {},
                medicalInfo: {},
                error: 'No text extracted from image'
            };
        }
        
        const nlpResults = (ocrResult && typeof ocrResult === 'object') ? ocrResult.nlpResults : null;
        
        const info = {
            name: '',
            tcNo: '',
            birthDate: '',
            confidence: 0,
            method: 'legacy', // 'legacy', 'nlp', or 'hybrid'
            entities: {},
            medicalInfo: {}
        };

        // Use NLP results if available (preferred method)
        if (nlpResults && nlpResults.entities) {
            console.log('🧠 Using NLP-enhanced extraction...');
            info.method = 'nlp';
            
            // Extract person names from NLP entities
            if (nlpResults.entities.PERSON && nlpResults.entities.PERSON.length > 0) {
                const bestPerson = nlpResults.entities.PERSON.reduce((best, current) => 
                    current.confidence > best.confidence ? current : best
                );
                info.name = bestPerson.text;
                info.confidence += bestPerson.confidence * 0.4;
                info.entities.person = nlpResults.entities.PERSON;
                console.log('🧠 NLP Name found:', bestPerson.text, 'Confidence:', bestPerson.confidence);
            }
            
            // Extract TC numbers from NLP entities
            if (nlpResults.entities.TC_NUMBER && nlpResults.entities.TC_NUMBER.length > 0) {
                const validTCs = nlpResults.entities.TC_NUMBER.filter(tc => tc.validated);
                if (validTCs.length > 0) {
                    info.tcNo = validTCs[0].text;
                    info.confidence += 0.4;
                    info.entities.tcNumber = validTCs;
                    console.log('🧠 NLP TC found:', validTCs[0].text);
                }
            }
            
            // Extract dates from NLP entities
            if (nlpResults.entities.DATE && nlpResults.entities.DATE.length > 0) {
                const birthDates = nlpResults.entities.DATE.filter(date => 
                    date.type === 'birth' || date.text.includes('doğ') || date.text.includes('birth')
                );
                if (birthDates.length > 0) {
                    info.birthDate = birthDates[0].standardFormat || birthDates[0].text;
                    info.confidence += 0.2;
                    info.entities.dates = nlpResults.entities.DATE;
                }
            }
            
            // Extract medical information
            if (nlpResults.entities.MEDICAL_CONDITION) {
                info.medicalInfo.conditions = nlpResults.entities.MEDICAL_CONDITION;
            }
            if (nlpResults.entities.DEVICE_TYPE) {
                info.medicalInfo.devices = nlpResults.entities.DEVICE_TYPE;
            }
            
            // Use document classification
            if (nlpResults.classification) {
                info.documentType = nlpResults.classification.type;
                info.documentConfidence = nlpResults.classification.confidence;
            }
        }

        // Fall back to legacy extraction if NLP didn't find enough or as backup
        if (!info.name || !info.tcNo || info.confidence < 0.5) {
            console.log('� Applying legacy extraction as backup...');
            const legacyInfo = await this.extractPatientInfoLegacy(text);
            
            // Combine results intelligently
            if (!info.name && legacyInfo.name) {
                info.name = legacyInfo.name;
                info.confidence += legacyInfo.confidence * 0.7; // Lower weight for legacy
                info.method = info.method === 'nlp' ? 'hybrid' : 'legacy';
            }
            
            if (!info.tcNo && legacyInfo.tcNo) {
                info.tcNo = legacyInfo.tcNo;
                info.confidence += 0.3;
                info.method = info.method === 'nlp' ? 'hybrid' : 'legacy';
            }
            
            if (!info.birthDate && legacyInfo.birthDate) {
                info.birthDate = legacyInfo.birthDate;
                info.confidence += 0.2;
                info.method = info.method === 'nlp' ? 'hybrid' : 'legacy';
            }
        }

        // Normalize confidence to 0-1 range
        info.confidence = Math.min(info.confidence, 1.0);
        
        console.log('✅ Patient info extraction completed:', {
            method: info.method,
            name: info.name,
            tcNo: info.tcNo ? '***' + info.tcNo.slice(-4) : '',
            confidence: info.confidence.toFixed(2)
        });

        return info;
    }

    // Legacy patient information extraction (original method) - now with PaddleOCR integration
    async extractPatientInfoLegacy(text) {
        const info = {
            name: '',
            tcNo: '',
            birthDate: '',
            confidence: 0
        };

        // Safety check for text parameter
        if (!text || typeof text !== 'string') {
            console.warn('⚠️ extractPatientInfoLegacy: Invalid or missing text parameter');
            return info;
        }

        const normalizedText = this.normalizeTurkish(text);

        // Extract TC number
        const tcPatterns = [
            /(?:TC|T\.C\.?|TCKN|T\.C\.K\.N\.?)[\s\.:]*(\d{11})/gi,
            /(?:KIMLIK|KIMLIK\s+NO|KIMLIK\s+NUMARASI)[\s\.:]*(\d{11})/gi,
            /\b(\d{11})\b/g
        ];

        for (const pattern of tcPatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                const tcNo = match[0].replace(/\D/g, '');
                if (tcNo.length === 11 && this.validateTCNumber(tcNo)) {
                    info.tcNo = tcNo;
                    info.confidence += 0.3;
                    break;
                }
            }
        }

        // If no full TC found, attempt partial TC extraction (labelled or nearby digit groups)
        if (!info.tcNo) {
            try {
                const labelledPartial = /(?:TC|T\.C\.?|TCKN|KIMLIK)[\s\.:]*([0-9]{4,10})/gi;
                let m;
                while ((m = labelledPartial.exec(normalizedText)) !== null) {
                    if (m[1]) {
                        const candidate = m[1].replace(/\D/g, '');
                        if (candidate.length >= 3 && candidate.length <= 10) {
                            info.partialTC = candidate;
                            break;
                        }
                    }
                }

                if (!info.partialTC) {
                    const tokens = normalizedText.match(/\d{3,6}/g) || [];
                    if (tokens.length > 0) {
                        // find token nearest to probable labels
                        const tcLabelIndex = normalizedText.search(/(?:TC|T\.C\.?|KIMLIK)/i);
                        if (tcLabelIndex !== -1) {
                            let best = null; let bestDist = Infinity;
                            for (const t of tokens) {
                                const idx = normalizedText.indexOf(t);
                                if (idx !== -1) {
                                    const dist = Math.abs(idx - tcLabelIndex);
                                    if (dist < bestDist) { best = t; bestDist = dist; }
                                }
                            }
                            if (best) info.partialTC = best;
                        } else {
                            // fallback: longest token
                            info.partialTC = tokens.sort((a,b) => b.length - a.length)[0];
                        }
                    }
                }

                if (info.partialTC) {
                    // partialTC is helpful but less certain
                    info.confidence += 0.15;
                    console.log('🔎 Legacy extractor found partial TC:', info.partialTC);
                }
            } catch (err) { console.warn('Partial TC legacy extraction failed:', err); }
        }

        // Extract name using enhanced Turkish patterns with PaddleOCR integration - DIRECT CALL
        const nameResult = await this.extractTurkishNameMedical(normalizedText);
        if (nameResult.name) {
            info.name = nameResult.name;
            info.confidence += nameResult.confidence;
        }

        // Extract birth date
        const birthDatePatterns = [
            /(?:DOGUM|DOĞUM|BIRTH)[\s\w]*[:.]?\s*(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/gi,
            /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/g
        ];

        for (const pattern of birthDatePatterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                const parts = match[0].match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/);
                if (parts) {
                    const day = parts[1].padStart(2, '0');
                    const month = parts[2].padStart(2, '0');
                    const year = parts[3];
                    info.birthDate = `${year}-${month}-${day}`;
                    info.confidence += 0.2;
                    console.log('✅ Birth date found:', info.birthDate);
                    break;
                }
            }
        }

        console.log('📊 Final patient info:', info);
        return info;
    }

    /**
     * Extract capitalized names from text (common in official documents)
     */
    extractCapitalizedNames(text) {
        // Look for patterns like "AHMET YILMAZ" or "FATMA ÖZKAN"
        const capitalizedPattern = /\b[A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,})+\b/g;
        const matches = text.match(capitalizedPattern) || [];
        
        let bestMatch = { name: '', confidence: 0 };
        
        for (const match of matches) {
            // Clean the match from medical suffixes first
            const cleanedMatch = this.cleanMedicalNameSuffixes(match);
            const words = cleanedMatch.split(/\s+/);
            let allValidNames = true;
            let totalConfidence = 0;
            
            for (const word of words) {
                const validation = this.isValidTurkishName(word);
                if (!validation.valid) {
                    allValidNames = false;
                    break;
                }
                totalConfidence += validation.confidence;
            }
            
            if (allValidNames && words.length >= 2 && words.length <= 3) {
                const avgConfidence = totalConfidence / words.length;
                // Boost confidence for capitalized names as they're common in documents
                const finalConfidence = Math.min(1.0, avgConfidence + 0.1);
                
                if (finalConfidence > bestMatch.confidence) {
                    // Convert to proper case
                    const properCaseName = words.map(word => 
                        word.charAt(0) + word.slice(1).toLowerCase()
                    ).join(' ');
                    
                    bestMatch = { name: properCaseName, confidence: finalConfidence };
                    
                    // Add to dynamic database for future recognition
                    this.addNameToDatabase(properCaseName);
                }
            }
        }
        
        return bestMatch;
    }

    /**
     * Extract Turkish names specifically from medical documents with enhanced patterns
     * This is the PRIMARY and STRONGEST extraction method
     * Includes PaddleOCR backend integration
     */
    async extractTurkishNameMedical(text) {
        if (this.debug) console.log('🔍 Extracting patient name with medical patterns + PaddleOCR');

        // First try PaddleOCR backend if available (highest priority)
        try {
            const paddleOCRResult = await this.tryPaddleOCRExtraction(text);
            if (paddleOCRResult && paddleOCRResult.name) {
                if (this.debug) console.log('✅ PaddleOCR extracted name:', paddleOCRResult.name);
                return {
                    name: paddleOCRResult.name,
                    confidence: paddleOCRResult.confidence || 0.9,
                    method: 'paddleocr_backend'
                };
            }
        } catch (error) {
            if (this.debug) console.log('⚠️ PaddleOCR backend not available, using patterns:', error.message);
        }

        // Pre-pass: if there is an explicit 'Hasta Ad / Hasta Adı / Adı Soyadı' label, extract the following tokens as patient name (highest priority)
        try {
            const labelPatterns = [
                /HASTA\s*AD(?:I)?\s*(?:SOYAD(?:I)?)?[\s:\-\.]*([A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,}){0,2})/gi,
                /HASTA\s*AD(?:I)?\s*(?:SOYAD(?:I)?)?[\s:\-\.]*([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+(?:\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+){1,2})/gi,
                /ADI\s*SOYADI[\s:\-\.]*([A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,}){0,2})/gi,
                /ADI\s*SOYADI[\s:\-\.]*([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+(?:\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+){1,2})/gi
            ];

            for (const lp of labelPatterns) {
                let lm;
                while ((lm = lp.exec(text)) !== null) {
                    let candidate = lm[1] ? lm[1].trim() : '';
                    if (!candidate) continue;

                    // If candidate is ALL CAPS, convert to proper case
                    if (candidate === candidate.toUpperCase()) {
                        candidate = candidate.split(/\s+/).map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
                    }

                    // Clean from trailing non-name tokens
                    candidate = candidate.replace(/[\,\.;:\|\-\(\)]+$/g, '').trim();

                    // Quick validation: ensure candidate appears to be a person name
                    if (!this.isValidPersonName(candidate)) {
                        if (this.debug) console.log(`🚫 Label-extracted candidate failed validation: "${candidate}"`);
                        continue;
                    }

                    // Avoid company/institution detection if label was explicit
                    if (this.debug) console.log(`🔎 Label-based name extraction succeeded: "${candidate}" (label match at index ${lm.index})`);

                    return { name: candidate, confidence: 0.95, method: 'label_based' };
                }
            }
        } catch (labelErr) {
            if (this.debug) console.warn('Label-based extraction failed:', labelErr);
        }

        // Continue with pattern-based extraction
        const words = text.split(/\s+/).filter(word => word.length > 1);
        let bestMatch = { name: '', confidence: 0 };
        
        // Enhanced medical document patterns - focus on patient-specific sections
        const medicalNamePatterns = [
            // Pattern 1: "HASTA ADI SOYADI: ONUR AYDOĞDU" (ALL CAPS - highest priority for SGK)
            /(?:HASTA\s*ADI?\s*SOYADI?)[\s:]+([A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,}){1,2})(?!\s+(?:DOKTOR|DR\.|HEKIM|MUDUR|MÜDÜR|SORUMLU))/gi,
            // Pattern 2: "HASTA ADI SOYADI: Onur Aydoğdu" (Mixed case)
            /(?:HASTA\s*ADI?\s*SOYADI?)[\s:]+([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+(?:\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+){1,2})(?!\s+(?:DOKTOR|DR\.|HEKIM|MUDUR|MÜDÜR|SORUMLU))/gi,
            // Pattern 3: "HASTA ADI: MEHMET YILMAZ" (ALL CAPS field)
            /(?:HASTA\s*(?:ADI|ADINI)|PATIENT\s*NAME)[\s:]+([A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,}){1,2})(?!\s+(?:DOKTOR|DR\.|HEKIM|MUDUR|MÜDÜR|SORUMLU))/gi,
            // Pattern 4: "HASTA ADI: Mehmet Yilmaz" (Mixed case field)
            /(?:HASTA\s*(?:ADI|ADINI)|PATIENT\s*NAME)[\s:]+([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+(?:\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]+){1,2})(?!\s+(?:DOKTOR|DR\.|HEKIM|MUDUR|MÜDÜR|SORUMLU))/gi,
            // Pattern 5: "ADI SOYADI: AYŞE KAYA" (ALL CAPS)
            /(?:ADI?\s*SOYADI?|NAME\s*SURNAME)[\s:]+([A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,}){1,2})(?!\s+(?:DOKTOR|DR\.|HEKIM|MUDUR|MÜDÜR|SORUMLU))/gi,
            // Pattern 6: Names with gender prefixes (like "ERKEK ONUR AYDOGDU")
            /(?:ERKEK|KADIN|MALE|FEMALE)[\s]+([A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,}){0,2})(?!\s+(?:DOKTOR|DR\.|HEKIM))/gi,
            // Pattern 7: Names followed by patient-specific medical terms (ALL CAPS)
            /\b([A-ZÇĞIİÖŞÜ]{2,}\s+[A-ZÇĞIİÖŞÜ]{2,})\s+(?:CINSIYETI|CINSIYET|YASI|DOGUM|TARIH|ADRES|TELEFON)(?!\s+(?:DOKTOR|HEKIM|MUDUR|MÜDÜR))/gi
        ];
        
        // Try each pattern
        for (const pattern of medicalNamePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                let candidateName = match[1];
                
                // Clean and normalize the extracted name
                candidateName = candidateName.trim();
                candidateName = candidateName.replace(/\s+/g, ' '); // Multiple spaces to single
                
                // Convert all caps to proper case for better readability
                if (candidateName === candidateName.toUpperCase() && candidateName.length > 3) {
                    candidateName = candidateName.split(' ').map(word => 
                        word.charAt(0) + word.slice(1).toLowerCase()
                    ).join(' ');
                }
                
                console.log(`🔍 Found candidate name: "${candidateName}" using pattern ${medicalNamePatterns.indexOf(pattern) + 1}`);
                
                // Clean name from common medical document suffixes
                candidateName = this.cleanMedicalNameSuffixes(candidateName);
                
                // Check if this name appears in an administrative context (avoid staff/doctor names)
                if (this.isInAdministrativeContext(candidateName, text, match.index)) {
                    console.log(`🚫 Skipping name in administrative context: "${candidateName}"`);
                    continue;
                }
                
                // Validate that this is actually a person name, not institutional text
                if (!this.isValidPersonName(candidateName)) {
                    console.log(`🚫 Name failed validation: "${candidateName}"`);
                    continue;
                }
                
                // Validate the extracted name
                const words = candidateName.split(' ');
                if (words.length >= 2 && words.length <= 3) {
                    let allValidNames = true;
                    let totalConfidence = 0;
                    
                    for (const word of words) {
                        const validation = this.isValidTurkishName(word);
                        if (!validation.valid) {
                            allValidNames = false;
                            break;
                        }
                        totalConfidence += validation.confidence;
                    }
                    
                    if (allValidNames) {
                        const avgConfidence = totalConfidence / words.length;
                        // Higher confidence for pattern-matched names
                        const finalConfidence = Math.min(1.0, avgConfidence + 0.2);
                        
                        if (finalConfidence > bestMatch.confidence) {
                            bestMatch = { name: candidateName, confidence: finalConfidence };
                            this.addNameToDatabase(candidateName);
                        }
                    }
                }
            }
        }
        
        // Fallback: Try capitalized names if no medical patterns found
        if (bestMatch.confidence < 0.5) {
            const capitalizedMatch = this.extractCapitalizedNames(text);
            if (capitalizedMatch.confidence > bestMatch.confidence) {
                bestMatch = capitalizedMatch;
            }
        }
        
        return bestMatch;
    }

    // Try PaddleOCR backend extraction
    async tryPaddleOCRExtraction(text) {
        try {
            const response = await fetch('http://localhost:5003/extract_patient', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text }),
                timeout: 5000
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.patient_info) {
                    return result.patient_info;
                }
            }
        } catch (error) {
            // Silent fail - fallback to JavaScript
            if (this.debug) console.log('PaddleOCR backend error:', error);
        }
        return null;
    }

    // Classify document type based on keywords
    classifyDocument(text) {
        const normalizedText = this.normalizeTurkish(text.toLowerCase());
        
        const documentTypes = {
            'cihaz_recete': {
                keywords: ['işitme cihazı', 'isitme cihazi', 'hearing aid', 'cihaz reçete', 'cihaz recete', 'protez', 'aparey'],
                weight: [5, 5, 4, 5, 5, 3, 3],
                displayName: 'Cihaz Reçete'
            },
            'pil_recete': {
                keywords: ['pil', 'batarya', 'battery', 'pil reçete', 'pil recete', 'işitme cihazı pili', 'isitme cihazi pili'],
                weight: [4, 3, 3, 5, 5, 5, 5],
                displayName: 'Pil Reçete'
            },
            'odyogram': {
                keywords: ['odyogram', 'audiogram', 'işitme testi', 'isitme testi', 'hearing test', 'audiometri', 'tone audiometry'],
                weight: [5, 5, 4, 4, 4, 4, 4],
                displayName: 'Odyogram'
            },
            'uygunluk_belgesi': {
                keywords: ['uygunluk belgesi', 'uygunluk', 'sağlık raporu', 'saglik raporu', 'hekim raporu', 'doktor raporu', 'tıbbi rapor', 'tibbi rapor'],
                weight: [5, 3, 4, 4, 4, 4, 4, 4],
                displayName: 'Uygunluk Belgesi'
            },
            'sgk_raporu': {
                keywords: ['sgk', 's.g.k', 'sosyal güvenlik', 'sosyal guvenlik', 'sosyal güvenlik kurumu', 'sosyal guvenlik kurumu'],
                weight: [4, 4, 3, 3, 5, 5],
                displayName: 'SGK Raporu'
            },
            'recete': {
                keywords: ['recete', 'reçete', 'prescription', 'ilaç', 'ilac', 'doktor', 'dr.', 'hastane'],
                weight: [3, 3, 2, 2, 2, 2, 2, 1],
                displayName: 'Reçete'
            },
            'kimlik': {
                keywords: ['kimlik', 'tc', 't.c', 'nüfus', 'nufus', 'vatandaşlık', 'vatandaslik'],
                weight: [3, 3, 3, 2, 2, 2, 2],
                displayName: 'Kimlik Belgesi'
            }
        };

        let bestMatch = { type: 'diger', confidence: 0, displayName: 'Diğer' };
        
        for (const [type, config] of Object.entries(documentTypes)) {
            let score = 0;
            let matchCount = 0;
            
            config.keywords.forEach((keyword, index) => {
                const weight = config.weight[index] || 1;
                const regex = new RegExp(keyword, 'gi');
                const matches = (normalizedText.match(regex) || []).length;
                
                if (matches > 0) {
                    score += matches * weight;
                    matchCount++;
                }
            });
            
            // Calculate confidence based on score and match diversity
            const confidence = matchCount > 0 ? (score / 20) + (matchCount / config.keywords.length) * 0.3 : 0;
            
            if (confidence > bestMatch.confidence) {
                bestMatch = { 
                    type, 
                    confidence: Math.min(confidence, 1),
                    displayName: config.displayName
                };
            }
        }
        
        console.log('📋 Document classification:', bestMatch);
        return bestMatch;
    }

    // Generate filename based on patient name and document type
    generateDocumentFilename(patientName, documentType, originalFileName) {
        // Clean patient name for filename
        const cleanName = patientName
            .replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/Ğ/g, 'G')
            .replace(/Ü/g, 'U')
            .replace(/Ş/g, 'S')
            .replace(/İ/g, 'I')
            .replace(/Ö/g, 'O')
            .replace(/Ç/g, 'C');

        // Map document types to Turkish names
        const typeMap = {
            'recete': 'Reçete',
            'rapor': 'Rapor',
            'sgk_raporu': 'SGK_Raporu',
            'kimlik': 'Kimlik',
            'test_sonucu': 'Test_Sonucu',
            'diger': 'Belge'
        };

        const docTypeName = typeMap[documentType] || 'Belge';
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        
        return `${cleanName}_${docTypeName}_${timestamp}.pdf`;
    }

    // Turkish text normalization
    normalizeTurkish(text) {
        // Safety check for input
        if (!text || typeof text !== 'string') {
            console.warn('⚠️ normalizeTurkish: Invalid input, returning empty string');
            return '';
        }
        
        try {
            return text
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .replace(/[^\w\s]/g, ' ')       // Replace non-word chars with spaces
                .replace(/\s+/g, ' ')           // Normalize whitespace
                .trim();
        } catch (error) {
            console.error('❌ Error in normalizeTurkish:', error);
            return '';
        }
    }

    // Validate Turkish name against database
    isValidTurkishName(name) {
        if (!name || name.length < 2) return { valid: false, confidence: 0 };
        
        const cleanName = this.cleanName(name);
        const upperName = cleanName.toUpperCase();
        const lowerName = cleanName.toLowerCase();
        
        // Check against Turkish names database (static)
        const inStaticMale = this.turkishNames.maleNames.includes(lowerName);
        const inStaticFemale = this.turkishNames.femaleNames.includes(lowerName);
        const inStaticSurname = this.turkishNames.surnames.includes(lowerName);
        
        // Check against dynamic names database (learned from patients)
        const inDynamicMale = this.dynamicNames.male.has(upperName);
        const inDynamicFemale = this.dynamicNames.female.has(upperName);
        const inDynamicSurname = this.dynamicNames.surnames.has(upperName);
        
        // Determine validity and confidence
        if (inStaticMale || inStaticFemale || inStaticSurname) {
            return { valid: true, confidence: 0.95 };
        }
        
        if (inDynamicMale || inDynamicFemale || inDynamicSurname) {
            return { valid: true, confidence: 0.85 };
        }
        
        // Fallback: check if it looks like a Turkish name pattern
        const turkishCharPattern = /^[A-ZÇĞIİÖŞÜa-zçğıiöşü]+$/;
        const properCase = /^[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]*$/;
        const allCaps = /^[A-ZÇĞIİÖŞÜ]+$/;
        
        if (turkishCharPattern.test(cleanName) && (properCase.test(cleanName) || allCaps.test(cleanName))) {
            if (cleanName.length >= 3 && cleanName.length <= 15) {
                return { valid: true, confidence: 0.6 };
            }
        }
        
        return { valid: false, confidence: 0 };
    }

    // Clean name for comparison
    cleanName(name) {
        return name
            .replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '')
            .replace(/^[a-z]/, letter => letter.toUpperCase());
    }

    // Validate TC number
    validateTCNumber(tcNo) {
        if (!tcNo || tcNo.length !== 11) return false;
        
        const digits = tcNo.split('').map(Number);
        
        // First digit cannot be 0
        if (digits[0] === 0) return false;
        
        // TC number validation algorithm
        const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
        
        const check1 = (sum1 * 7 - sum2) % 10;
        const check2 = (sum1 + sum2 + digits[9]) % 10;
        
        return check1 === digits[9] && check2 === digits[10];
    }

    // Load comprehensive Turkish names database
    loadTurkishNames() {
        return {
            maleNames: [
                'ahmet', 'mehmet', 'mustafa', 'ali', 'hasan', 'hüseyin', 'ibrahim', 'ismail', 'osman', 'süleyman',
                'yusuf', 'ömer', 'abdullah', 'murat', 'fatih', 'burak', 'emre', 'serkan', 'onur', 'tolga',
                'barış', 'cem', 'deniz', 'kemal', 'orhan', 'selim', 'taner', 'ufuk', 'volkan', 'yakup',
                'erkan', 'gökhan', 'hakan', 'ihan', 'koray', 'levent', 'metin', 'necati', 'özkan', 'recep',
                'sinan', 'tahir', 'umut', 'veli', 'yavuz', 'zafer', 'alper', 'berk', 'can', 'doğan',
                'enes', 'furkan', 'güneş', 'halil', 'ilker', 'kaan', 'mert', 'nazım', 'oğuz', 'polat',
                'rıza', 'sait', 'turgut', 'uğur', 'yasin', 'zeki', 'baran', 'ege', 'kaya', 'sercan'
            ],
            femaleNames: [
                'fatma', 'ayşe', 'emine', 'hatice', 'zeynep', 'şule', 'sultan', 'zeliha', 'elif', 'meryem',
                'özlem', 'gül', 'sevgi', 'pınar', 'derya', 'esra', 'ayşegül', 'filiz', 'gülsüm', 'hacer',
                'nurten', 'şirin', 'tülay', 'yeliz', 'zuhal', 'aynur', 'burcu', 'demet', 'ebru', 'figen',
                'hülya', 'inci', 'jale', 'leyla', 'mine', 'nalan', 'oya', 'perihan', 'reyhan', 'sibel',
                'tuğba', 'ümit', 'vildan', 'yelda', 'zehra', 'belgin', 'denise', 'gülay', 'hande', 'ipek',
                'müge', 'nilay', 'özge', 'seda', 'tuba', 'yasemin', 'arzu', 'canan', 'dilek', 'eda',
                'fulya', 'hülya', 'meltem', 'neslihan', 'serpil', 'aysun', 'banu', 'ceyda', 'gonca',
                'selin', 'songül', 'ahu', 'aylin', 'bahar', 'çiğdem', 'duygu', 'evrim', 'gizem', 'hilal'
            ],
            surnames: [
                'yılmaz', 'kaya', 'demir', 'şahin', 'çelik', 'yıldız', 'yıldırım', 'öztürk', 'aydin', 'özdemir',
                'arslan', 'doğan', 'kılıç', 'aslan', 'çetin', 'kara', 'koç', 'kurt', 'özkan', 'şimşek',
                'polat', 'erdoğan', 'uçar', 'karaca', 'aydoğdu', 'korkmaz', 'gül', 'turan', 'aktaş', 'çakır',
                'özer', 'akın', 'erdem', 'kaplan', 'güneş', 'bulut', 'tekin', 'soylu', 'ateş', 'topal',
                'bal', 'yaman', 'bozkurt', 'güler', 'karadeniz', 'ertürk', 'sezer', 'akan', 'taş', 'güçlü',
                'türk', 'kahraman', 'sevim', 'duran', 'sever', 'yüksel', 'çiftçi', 'beyaz', 'işık', 'dal',
                'karadağ', 'önal', 'kiraz', 'coşkun', 'bilgin', 'mutlu', 'ural', 'çınar', 'akgün', 'acar'
            ]
        };
    }

    // Clean up resources
    async cleanup() {
        if (this.tesseractWorker) {
            await this.tesseractWorker.terminate();
            this.tesseractWorker = null;
            this.isInitialized = false;
            console.log('🧹 OCR Engine cleaned up');
        }
    }

    /**
     * Load dynamic names from localStorage and patient database
     */
    loadDynamicNames() {
        try {
            // Load from localStorage
            const stored = localStorage.getItem('ocrDynamicNames');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.dynamicNames.male = new Set(parsed.male || []);
                this.dynamicNames.female = new Set(parsed.female || []);
                this.dynamicNames.surnames = new Set(parsed.surnames || []);
                console.log(`📚 Loaded ${parsed.male?.length || 0} male, ${parsed.female?.length || 0} female, ${parsed.surnames?.length || 0} surnames from cache`);
            }

            // Load from existing patient database if available
            this.loadNamesFromPatientDatabase();
        } catch (error) {
            console.warn('⚠️ Could not load dynamic names:', error);
        }
    }

    /**
     * Load names from existing patient database
     */
    loadNamesFromPatientDatabase() {
        let sources = [];
        
        // Check multiple possible sources for patient data
        if (window.sampleData && window.sampleData.patients) {
            sources.push({ name: 'sampleData.patients', data: window.sampleData.patients });
        }
        
        if (window.samplePatients && Array.isArray(window.samplePatients)) {
            sources.push({ name: 'samplePatients', data: window.samplePatients });
        }
        
        // Check localStorage for patient data
        try {
            const storedPatients = localStorage.getItem('patients');
            if (storedPatients) {
                const parsed = JSON.parse(storedPatients);
                if (Array.isArray(parsed)) {
                    sources.push({ name: 'localStorage.patients', data: parsed });
                }
            }
        } catch (e) {
            console.warn('Could not load patients from localStorage:', e);
        }
        
        // Check for patient details manager
        if (window.patientDetailsManager && window.patientDetailsManager.patients) {
            sources.push({ name: 'patientDetailsManager', data: window.patientDetailsManager.patients });
        }
        
        let totalAdded = { male: 0, female: 0, surnames: 0 };
        
        // Initialize tracking if not already done
        if (!this.lastProcessedCounts) {
            this.lastProcessedCounts = this.getCurrentPatientCounts();
        }
        
        sources.forEach(source => {
            if (!Array.isArray(source.data)) return;
            
            console.log(`📚 Processing ${source.data.length} patients from ${source.name}`);
            
            source.data.forEach(patient => {
                if (!patient.name && !patient.firstName) return;
                
                // Get full name
                let fullName = patient.name;
                if (!fullName && patient.firstName) {
                    fullName = patient.lastName ? 
                        `${patient.firstName} ${patient.lastName}` : 
                        patient.firstName;
                }
                
                if (!fullName) return;
                
                const nameParts = fullName.trim().toUpperCase().split(/\s+/);
                if (nameParts.length < 2) return;
                
                const firstName = nameParts[0];
                const lastName = nameParts[nameParts.length - 1];
                
                // Add surname if new
                if (!this.dynamicNames.surnames.has(lastName) && 
                    !this.turkishNames.surnames.includes(lastName.toLowerCase())) {
                    this.dynamicNames.surnames.add(lastName);
                    totalAdded.surnames++;
                }
                
                // Determine gender and add first name
                let gender = null;
                if (patient.gender) {
                    gender = patient.gender.toLowerCase();
                } else if (patient.cinsiyet) {
                    gender = patient.cinsiyet.toLowerCase();
                }
                
                // Check if first name exists in static database to infer gender
                const maleInStatic = this.turkishNames.maleNames.includes(firstName.toLowerCase());
                const femaleInStatic = this.turkishNames.femaleNames.includes(firstName.toLowerCase());
                
                if (gender) {
                    const isMale = gender.includes('e') || gender.includes('m'); // erkek/male
                    const targetSet = isMale ? this.dynamicNames.male : this.dynamicNames.female;
                    const staticSet = isMale ? this.turkishNames.maleNames : this.turkishNames.femaleNames;
                    
                    if (!targetSet.has(firstName) && !staticSet.includes(firstName.toLowerCase())) {
                        targetSet.add(firstName);
                        if (isMale) totalAdded.male++;
                        else totalAdded.female++;
                    }
                } else if (maleInStatic && !this.dynamicNames.male.has(firstName)) {
                    // Already in male static, don't add to dynamic
                } else if (femaleInStatic && !this.dynamicNames.female.has(firstName)) {
                    // Already in female static, don't add to dynamic
                } else if (!maleInStatic && !femaleInStatic) {
                    // Unknown gender, add to male by default
                    if (!this.dynamicNames.male.has(firstName) && !this.dynamicNames.female.has(firstName)) {
                        this.dynamicNames.male.add(firstName);
                        totalAdded.male++;
                    }
                }
            });
        });
        
        if (totalAdded.male > 0 || totalAdded.female > 0 || totalAdded.surnames > 0) {
            console.log(`📈 Learned ${totalAdded.male} new male names, ${totalAdded.female} new female names, ${totalAdded.surnames} new surnames from ${sources.length} sources`);
            this.saveDynamicNames();
        } else {
            console.log('📚 No new names to learn from patient database');
        }
        
        // Set up periodic reloading to catch new patients (but avoid reprocessing same data)
        if (!this.patientDatabaseReloadInterval) {
            this.lastProcessedCounts = {}; // Track last processed counts to avoid reprocessing
            
            this.patientDatabaseReloadInterval = setInterval(() => {
                // Only reload if we detect new data
                const currentCounts = this.getCurrentPatientCounts();
                const hasNewData = Object.keys(currentCounts).some(source => 
                    currentCounts[source] !== this.lastProcessedCounts[source]
                );
                
                if (hasNewData) {
                    console.log('📚 New patient data detected, reloading names...');
                    this.loadNamesFromPatientDatabase();
                    this.lastProcessedCounts = currentCounts;
                }
            }, 30000); // Check every 30 seconds
        }
    }

    /**
     * Get current patient counts from all sources to detect changes
     */
    getCurrentPatientCounts() {
        const counts = {};
        
        // Check all data sources
        if (window.sampleData?.patients) {
            counts['sampleData.patients'] = window.sampleData.patients.length;
        }
        if (window.samplePatients) {
            counts['samplePatients'] = window.samplePatients.length;
        }
        if (window.patientDetailsManager?.patients) {
            counts['patientDetailsManager'] = window.patientDetailsManager.patients.length;
        }
        
        return counts;
    }

    /**
     * Add a new name to the dynamic database
     */
    addNameToDatabase(fullName, gender = null) {
        if (!fullName || typeof fullName !== 'string') return false;

        const nameParts = fullName.trim().toUpperCase().split(/\s+/);
        if (nameParts.length < 2) return false;

        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        let added = false;

        // Add surname if new
        if (!this.dynamicNames.surnames.has(lastName) && !this.turkishNames.surnames.includes(lastName.toLowerCase())) {
            this.dynamicNames.surnames.add(lastName);
            added = true;
            console.log(`📝 Added new surname: ${lastName}`);
        }

        // Add first name based on gender
        if (gender) {
            const isMale = gender.toLowerCase().includes('e') || gender.toLowerCase().includes('m'); // erkek/male
            const targetSet = isMale ? this.dynamicNames.male : this.dynamicNames.female;
            const staticSet = isMale ? this.turkishNames.maleNames : this.turkishNames.femaleNames;

            if (!targetSet.has(firstName) && !staticSet.includes(firstName.toLowerCase())) {
                targetSet.add(firstName);
                added = true;
                console.log(`📝 Added new ${isMale ? 'male' : 'female'} name: ${firstName}`);
            }
        } else {
            // No gender specified, try to infer or add to appropriate set
            const inMaleStatic = this.turkishNames.maleNames.includes(firstName.toLowerCase());
            const inFemaleStatic = this.turkishNames.femaleNames.includes(firstName.toLowerCase());
            
            if (!inMaleStatic && !inFemaleStatic) {
                // Not in static database, add to male by default (can be improved with gender detection AI)
                if (!this.dynamicNames.male.has(firstName) && !this.dynamicNames.female.has(firstName)) {
                    this.dynamicNames.male.add(firstName);
                    added = true;
                    console.log(`📝 Added new name (default male): ${firstName}`);
                }
            }
        }

        if (added) {
            this.saveDynamicNames();
        }

        return added;
    }

    /**
     * Hook to be called when a new patient is saved
     * This ensures OCR learns from every new patient immediately
     */
    onPatientSaved(patientData) {
        if (!patientData) return;
        
        let fullName = patientData.name;
        if (!fullName && patientData.firstName) {
            fullName = patientData.lastName ? 
                `${patientData.firstName} ${patientData.lastName}` : 
                patientData.firstName;
        }
        
        if (fullName) {
            const gender = patientData.gender || patientData.cinsiyet || null;
            const added = this.addNameToDatabase(fullName, gender);
            
            if (added) {
                console.log(`🎯 OCR learned new names from saved patient: ${fullName}`);
            }
        }
    }

    /**
     * Save dynamic names to localStorage
     */
    saveDynamicNames() {
        try {
            const toSave = {
                male: Array.from(this.dynamicNames.male),
                female: Array.from(this.dynamicNames.female),
                surnames: Array.from(this.dynamicNames.surnames),
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('ocrDynamicNames', JSON.stringify(toSave));
            console.log('💾 Dynamic names saved to localStorage');
        } catch (error) {
            console.warn('⚠️ Could not save dynamic names:', error);
        }
    }

    /**
     * Generate cache key for image processing results
     */
    generateImageCacheKey(imageData, fileName) {
        // Create a simple hash of the image data and filename
        const str = `${fileName}-${imageData.length || 0}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Generate cache key for text processing
     */
    generateTextCacheKey(text) {
        // Create a hash of the text content
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Clean medical document suffixes from names
     */
    cleanMedicalNameSuffixes(name) {
        if (!name || typeof name !== 'string') return name;
        
        // Common medical document suffixes and institutional terms to remove from names
        const medicalSuffixes = [
            'CINSIYETI', 'CINSIYET', 'GENDER',
            'YASI', 'YAŞI', 'AGE', 'YEARS',
            'DOGUM', 'DOĞUM', 'BIRTH', 'BORN',
            'TARIH', 'TARIHI', 'DATE',
            'ADRES', 'ADRESI', 'ADDRESS',
            'TELEFON', 'TELEFONU', 'PHONE', 'TEL',
            'NO', 'NUMARASI', 'NUMBER',
            'TC', 'TCKN', 'ID',
            'ERKEK', 'KADIN', 'MALE', 'FEMALE',
            'BAY', 'BAYAN', 'MR', 'MRS', 'MS',
            'HASTA', 'PATIENT',
            // Professional titles and administrative terms
            'DOKTOR', 'DOCTOR', 'DR.', 'DR', 'HEKIM', 'PHYSICIAN',
            'MUDUR', 'MÜDÜR', 'MANAGER', 'DIRECTOR',
            'SORUMLU', 'RESPONSIBLE', 'SAYIN', 'FILIA',
            'ODYOLOG', 'AUDIOLOGIST', 'TEKNISYEN', 'TECHNICIAN',
            'HEMŞIRE', 'HEMSHIRE', 'NURSE', 'ASISTAN', 'ASSISTANT',
            // Institutional terms
            'SOSYAL', 'GUVENLIK', 'GÜVENLIK', 'KURUMU',
            'SOCIAL', 'SECURITY', 'INSTITUTION',
            'SAGLIK', 'SAĞLIK', 'HEALTH', 'HASTANE', 'HOSPITAL',
            'DEVLET', 'STATE', 'KAMU', 'PUBLIC',
            'BAKANLIGI', 'BAKANLIĞI', 'MINISTRY',
            'MUDURLUGU', 'MÜDÜRLÜĞÜ', 'DIRECTORATE'
        ];
        
        let cleanedName = name.trim();
        
        // Remove institutional terms from the beginning and end
        for (const suffix of medicalSuffixes) {
            // Remove from beginning
            const beginPattern = new RegExp(`^${suffix}\\s+`, 'gi');
            cleanedName = cleanedName.replace(beginPattern, '');
            
            // Remove from end
            const endPattern = new RegExp(`\\s+${suffix}$`, 'gi');
            cleanedName = cleanedName.replace(endPattern, '');
            
            // Remove from middle if surrounded by non-name words
            const middlePattern = new RegExp(`\\s+${suffix}\\s+`, 'gi');
            cleanedName = cleanedName.replace(middlePattern, ' ');
        }
        
        // Remove trailing punctuation
        cleanedName = cleanedName.replace(/[:\.,;]+$/, '');
        
        // Clean up multiple spaces
        cleanedName = cleanedName.replace(/\s+/g, ' ');
        
        return cleanedName.trim();
    }

    /**
     * Check if a name appears in an administrative/staff context to avoid extracting doctor/staff names
     */
    isInAdministrativeContext(candidateName, fullText, matchIndex) {
        if (!candidateName || !fullText || matchIndex === undefined) return false;
        
        // Get context around the match (150 characters before and after)
        const contextStart = Math.max(0, matchIndex - 150);
        const contextEnd = Math.min(fullText.length, matchIndex + candidateName.length + 150);
        const context = fullText.substring(contextStart, contextEnd).toUpperCase();
        
        // Company/institutional context indicators
        const companyContexts = [
            'KULLANICISI',       // "...ŞTİ. KULLANICISI"
            'LTD',               // "LTD. ŞTİ."
            'STI', 'ŞTİ',        // "ŞTİ."
            'ANONIM',            // "Anonim Şirketi"
            'LIMITED',           // "Limited Şirketi"
            'SIRKET', 'ŞIRKET',  // "Şirket"
            'FIRMA',             // "Firma"
            'COMPANY',           // "Company"
            'CORPORATION',       // "Corporation"
            'INCORPORATION',     // "Inc."
            'TIBBI', 'TIBBİ',    // "Tıbbi Cihazlar"
            'CIHAZLAR',          // "Cihazlar"
            'DEVICES',           // "Medical Devices"
            'MEDICAL',           // "Medical"
            'HEALTHCARE'         // "Healthcare"
        ];
        
        // Administrative/authority context indicators
        const administrativeContexts = [
            'SORUMLU',           // "Sorumlu Müdür"
            'MUDUR', 'MÜDÜR',    // "Müdür", "Müdürlüğü"
            'FILIA',             // "Filia Sayın"
            'SAYIN',             // "Sayın" (used for officials)
            'DOKTOR',            // "Doktor"
            'DR.',               // "Dr."
            'HEKIM',             // "Hekim"
            'ODYOLOG',           // "Odyolog"
            'TEKNISYEN',         // "Teknisyen"
            'UZMAN',             // "Uzman"
            'ASISTAN',           // "Asistan"
            'HEMŞIRE', 'HEMSHIRE', // "Hemşire"
            'DIRECTOR',          // "Director"
            'MANAGER',           // "Manager"
            'RESPONSIBLE',       // "Responsible"
            'PHYSICIAN',         // "Physician"
            'AUDIOLOGIST',       // "Audiologist"
            'TECHNICIAN'         // "Technician"
        ];
        
        // Check for company context (high priority - avoid company employee names)
        for (const companyKeyword of companyContexts) {
            if (context.includes(companyKeyword)) {
                const keywordIndex = context.indexOf(companyKeyword);
                const nameIndex = context.indexOf(candidateName.toUpperCase());

                // If name is close to company keywords, likely a company employee
                if (Math.abs(keywordIndex - nameIndex) < 100) {
                    // Exception: if the text near the name contains an explicit patient label
                    // (e.g. 'Hasta Ad', 'Ad Soyad', 'Hasta Adı:'), prefer that and DO NOT mark as company
                    const labelWindowStart = Math.max(0, nameIndex - 60);
                    const labelWindowEnd = Math.min(context.length, nameIndex + 60);
                    const nearby = context.substring(labelWindowStart, labelWindowEnd);
                    const patientLabelPatterns = [/HASTA\s+AD(?:I|I:|\s+SOYAD)?/i, /AD\s+SOYAD[:\s\-]/i, /HASTA\s*AD[İI]?[:\s\-]/i, /AD[:\s\-]*[A-ZÇĞİÖŞÜ]/i];
                    const hasPatientLabel = patientLabelPatterns.some(p => p.test(nearby));
                    if (hasPatientLabel) {
                        if (typeof console !== 'undefined') console.log(`✅ Found explicit patient label near "${candidateName}", skipping company detection`);
                        continue; // do not treat as company context
                    }
                    console.log(`🚫 Company context detected: "${candidateName}" near "${companyKeyword}"`);
                    return true;
                }
            }
        }
        
        // Check if the name appears near administrative keywords
        for (const adminKeyword of administrativeContexts) {
            if (context.includes(adminKeyword)) {
                // Check if the keyword is close to our candidate name (within 50 characters)
                const keywordIndex = context.indexOf(adminKeyword);
                const nameIndex = context.indexOf(candidateName.toUpperCase());
                
                if (Math.abs(keywordIndex - nameIndex) < 50) {
                    console.log(`🚫 Administrative context detected: "${candidateName}" near "${adminKeyword}"`);
                    return true;
                }
            }
        }
        
        // Check for specific SGK administrative patterns
        const sgkAdminPatterns = [
            /(?:SORUMLU\s+MUDUR|SORUMLU\s+MÜDÜR|FILIA\s+SAYIN)/i,
            /(?:DOKTOR|DR\.)\s*[\w\s]*SAYIN/i,
            /SAYIN\s*[\w\s]*(?:DOKTOR|DR\.)/i,
            /(?:LTD|STI|ŞTİ)\s*\.?\s*KULLANICISI/i,
            /TIBBI\s+CIHAZLAR/i,
            /TIBBİ\s+CIHAZLAR/i
        ];
        
        for (const pattern of sgkAdminPatterns) {
            if (pattern.test(context)) {
                console.log(`🚫 SGK institutional pattern detected for: "${candidateName}"`);
                return true;
            }
        }
        
        return false;
    }

    /**
     * Validate that extracted text is actually a person name, not institutional text
     */
    isValidPersonName(name) {
        if (!name || typeof name !== 'string') return false;
        
        const upperName = name.toUpperCase();
        const words = name.trim().split(/\s+/);
        
        // Reject if it contains institutional keywords
        const institutionalKeywords = [
            'KURUMU', 'KURUM', 'HASTANE', 'HOSPITAL',
            'SAGLIK', 'SAĞLIK', 'HEALTH', 'MEDICAL',
            'SOSYAL', 'SOCIAL', 'GUVENLIK', 'GÜVENLIK', 'SECURITY',
            'DEVLET', 'STATE', 'KAMU', 'PUBLIC',
            'BAKANLIGI', 'BAKANLIĞI', 'MINISTRY',
            'MUDURLUGU', 'MÜDÜRLÜĞÜ', 'DIRECTORATE',
            'UNIVERSITE', 'ÜNİVERSİTE', 'UNIVERSITY',
            'FAKULTE', 'FAKÜLTE', 'FACULTY',
            'BOLUM', 'BÖLÜM', 'DEPARTMENT',
            'MERKEZ', 'CENTER', 'CENTRE',
            'ENSTITU', 'ENSTİTÜ', 'INSTITUTE',
            'VAKIF', 'VAKFI', 'FOUNDATION',
            // Medical professional titles and administrative terms
            'DOKTOR', 'DOCTOR', 'DR.', 'DR', 'HEKIM', 'PHYSICIAN',
            'MUDUR', 'MÜDÜR', 'MANAGER', 'DIRECTOR',
            'SORUMLU', 'RESPONSIBLE', 'SAYIN', 'FILIA',
            'ODYOLOG', 'AUDIOLOGIST', 'TEKNISYEN', 'TECHNICIAN',
            'HEMŞIRE', 'HEMSHIRE', 'NURSE', 'ASISTAN', 'ASSISTANT',
            // Company/business terms
            'KULLANICISI', 'USER', 'CLIENT', 'CUSTOMER',
            'LTD', 'LIMITED', 'STI', 'ŞTİ', 'ANONIM', 'SIRKET', 'ŞIRKET',
            'COMPANY', 'CORPORATION', 'FIRMA', 'BUSINESS',
            'TIBBI', 'TIBBİ', 'CIHAZLAR', 'DEVICES', 'EQUIPMENT'
        ];
        
        for (const keyword of institutionalKeywords) {
            if (upperName.includes(keyword)) {
                console.log(`🚫 Rejected institutional text: "${name}" (contains "${keyword}")`);
                return false;
            }
        }
        
        // Reject if it's purely institutional (no actual name words)
        const pureInstitutionalWords = ['SOSYAL', 'GUVENLIK', 'KURUMU', 'SAGLIK', 'HASTANE'];
        const nameWords = words.filter(word => {
            const upperWord = word.toUpperCase();
            return !pureInstitutionalWords.includes(upperWord);
        });
        
        if (nameWords.length === 0) {
            console.log(`🚫 Rejected purely institutional text: "${name}"`);
            return false;
        }
        
        // Reject if it's too short or too long
        if (words.length < 1 || words.length > 4) {
            return false;
        }
        
        // Reject if any word is too short (likely not a name)
        for (const word of words) {
            if (word.length < 2) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Calculate combined confidence from OCR and NLP results
     */
    calculateCombinedConfidence(ocrConfidence, nlpConfidence) {
        // Weighted average favoring NLP for structured content
        const ocrWeight = 0.4;
        const nlpWeight = 0.6;
        
        return (ocrConfidence * ocrWeight) + (nlpConfidence * nlpWeight);
    }

    /**
     * Enable or disable NLP processing
     */
    toggleNLP(enabled) {
        this.nlpEnabled = enabled;
        console.log(`🧠 NLP processing ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get processing statistics
     */
    getStats() {
        return {
            initialized: this.isInitialized,
            nlpEnabled: this.nlpEnabled,
            nlpReady: this.nlpService ? this.nlpService.isReady() : false,
            cacheSize: this.resultCache.size,
            nlpCacheSize: this.nlpCache.size,
            dynamicNamesCount: {
                male: this.dynamicNames.male.size,
                female: this.dynamicNames.female.size,
                surnames: this.dynamicNames.surnames.size
            }
        };
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.resultCache.clear();
        this.nlpCache.clear();
        console.log('🗑️ OCR caches cleared');
    }

    /**
     * Preprocess image for better OCR accuracy - Conservative approach
     * @param {string|File|Blob} imageData - Image data to preprocess
     * @returns {Promise<string>} - Enhanced image data
     */
    async preprocessImageForOCR(imageData) {
        try {
            // For high-quality scanned documents, minimal processing is often better
            console.log('🔧 Applying conservative image preprocessing for OCR...');
            
            // Create canvas for image processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Load image
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                
                if (typeof imageData === 'string') {
                    img.src = imageData;
                } else {
                    const reader = new FileReader();
                    reader.onload = (e) => { img.src = e.target.result; };
                    reader.readAsDataURL(imageData);
                }
            });
            
            // Set canvas size - keep original dimensions for best OCR
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw original image with high quality settings
            ctx.imageSmoothingEnabled = false; // No smoothing for text
            ctx.drawImage(img, 0, 0);
            
            // For most scanned documents, the original is often best
            // Only apply minimal enhancements if needed
            if (this.shouldEnhanceImage(img)) {
                console.log('📈 Applying minimal contrast enhancement...');
                
                // Get image data for processing
                const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageDataObj.data;
                
                // Apply very mild contrast enhancement
                for (let i = 0; i < data.length; i += 4) {
                    // Mild contrast enhancement (1.1x instead of 1.5x)
                    const contrast = 1.1;
                    
                    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));     // Red
                    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128)); // Green
                    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128)); // Blue
                    // Alpha channel (data[i + 3]) remains unchanged
                }
                
                // Put enhanced image data back
                ctx.putImageData(imageDataObj, 0, 0);
            } else {
                console.log('✅ Using original image without processing - already high quality');
            }
            
            // Return image with high quality
            return canvas.toDataURL('image/png'); // PNG for lossless
            
        } catch (error) {
            console.warn('⚠️ Image preprocessing failed, using original:', error);
            return imageData; // Fallback to original image
        }
    }
    
    /**
     * Determine if image needs enhancement based on quality analysis
     */
    shouldEnhanceImage(img) {
        // For now, we'll be conservative and avoid processing unless clearly needed
        // In the future, this could analyze the image to determine if enhancement is beneficial
        return false; // Default to no processing for best quality
    }

    /**
     * Check if text contains institutional/administrative keywords
     * Used to filter out non-patient names from OCR results
     */
    isInstitutionalText(text) {
        if (!text || typeof text !== 'string') return false;
        
        const upperText = text.toUpperCase();
        
        // Institutional keywords that indicate this is not a patient name
        const institutionalKeywords = [
            // Government and official institutions
            'KURUMU', 'KURUM', 'HASTANE', 'HOSPITAL',
            'SAGLIK', 'SAĞLIK', 'HEALTH', 'MEDICAL',
            'SOSYAL', 'SOCIAL', 'GUVENLIK', 'GÜVENLIK', 'SECURITY',
            'DEVLET', 'STATE', 'KAMU', 'PUBLIC',
            'BAKANLIGI', 'BAKANLIĞI', 'MINISTRY',
            'MUDURLUGU', 'MÜDÜRLÜĞÜ', 'DIRECTORATE',
            'UNIVERSITE', 'ÜNİVERSİTE', 'UNIVERSITY',
            'FAKULTE', 'FAKÜLTE', 'FACULTY',
            'BOLUM', 'BÖLÜM', 'DEPARTMENT',
            'MERKEZ', 'CENTER', 'CENTRE',
            'ENSTITU', 'ENSTİTÜ', 'INSTITUTE',
            'VAKIF', 'VAKFI', 'FOUNDATION',
            
            // Medical and administrative titles
            'DOKTOR', 'DOCTOR', 'DR.', 'DR', 'HEKIM', 'PHYSICIAN',
            'MUDUR', 'MÜDÜR', 'MANAGER', 'DIRECTOR',
            'SORUMLU', 'RESPONSIBLE', 'FILIA',
            'ODYOLOG', 'AUDIOLOGIST', 'TEKNISYEN', 'TECHNICIAN',
            'HEMŞIRE', 'HEMSHIRE', 'NURSE', 'ASISTAN', 'ASSISTANT',
            'UZMAN', 'SPECIALIST', 'PROF', 'PROFESSOR',
            
            // Business and company terms
            'KULLANICISI', 'USER', 'CLIENT', 'CUSTOMER',
            'LTD', 'LIMITED', 'STI', 'ŞTİ', 'ANONIM', 'SIRKET', 'ŞIRKET',
            'COMPANY', 'CORPORATION', 'FIRMA', 'BUSINESS',
            'TIBBI', 'TIBBİ', 'CIHAZLAR', 'DEVICES', 'EQUIPMENT',
            
            // Document and form-related terms
            'RAPOR', 'REPORT', 'BELGE', 'DOCUMENT',
            'FORM', 'FORMUL', 'BAŞVURU', 'APPLICATION',
            'ONAY', 'APPROVAL', 'ONAYLI', 'APPROVED',
            'RUHSAT', 'LICENSE', 'IZIN', 'İZİN', 'PERMIT'
        ];
        
        // Check if text contains any institutional keywords
        for (const keyword of institutionalKeywords) {
            if (upperText.includes(keyword)) {
                return true;
            }
        }
        
        // Check for specific institutional patterns
        const institutionalPatterns = [
            /\b(?:SOSYAL\s+GUVENLIK|SOSYAL\s+GÜVENLIK)\b/i,
            /\b(?:DEVLET\s+HASTANE|STATE\s+HOSPITAL)\b/i,
            /\b(?:SAGLIK\s+BAKANLIGI|SAĞLIK\s+BAKANLIĞI)\b/i,
            /\b(?:UNIVERSITE\s+HASTANE|ÜNİVERSİTE\s+HASTANE)\b/i,
            /\b(?:TIBBI\s+CIHAZ|TIBBİ\s+CIHAZ)\b/i,
            /\b(?:LTD\s*\.|ŞTİ\s*\.)\b/i
        ];
        
        for (const pattern of institutionalPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        
        return false;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.OCREngine = OCREngine;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OCREngine;
}
