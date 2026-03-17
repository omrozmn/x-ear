/**
 * PaddleOCR NLP Service for X-Ear CRM
 * Provides Turkish medical document processing with Named Entity Recognition,
 * document classification, semantic similarity, and intent recognition.
 * 
 * Features:
 * - Medical NER for Turkish documents
 * - Document type classification
 * - Semantic patient matching
 * - Natural language query processing
 * - Medical terminology understanding
 */

var API_BASE = window.__API_BASE_URL__ || 'http://localhost:5003';

class PaddleNLPService {
    constructor(options = {}) {
        this.debug = options.debug || false;
        this.language = options.language || 'tr';
        this.nlp = null;
        this.customModels = new Map();
        this.entityCache = new Map();
        this.similarityCache = new Map();
        this.initialized = false;

                // Initialize real PaddleOCR backend client
        this.backendClient = new PaddleBackendClient({
            baseURL: (window.APIConfig && window.APIConfig.BACKEND_BASE_URL) ||
                     options.backendURL ||
                     API_BASE,
            debug: this.debug,
            fallbackService: this // Use this class as fallback
        });
        
        // Medical entity types for Turkish healthcare documents
        this.medicalEntityTypes = {
            PERSON: 'Hasta Adı',
            TC_NUMBER: 'TC Kimlik No',
            DATE: 'Tarih',
            MEDICAL_CONDITION: 'Tıbbi Durum',
            MEDICATION: 'İlaç',
            DEVICE_TYPE: 'Cihaz Türü',
            DOCTOR: 'Doktor',
            HOSPITAL: 'Hastane',
            DIAGNOSIS: 'Tanı',
            TREATMENT: 'Tedavi'
        };
        
        // Turkish medical terminology mappings
        this.medicalTerms = this.loadMedicalTerminology();
        
        if (this.debug) console.log('🧠 PaddleOCR NLP Service initialized');
    }

    /**
     * Initialize PaddleOCR models and custom components
     */
    async initialize() {
        try {
            console.log('🔄 Initializing Enhanced PaddleOCR NLP Service...');
            
                        // Try to connect to real PaddleOCR backend first
            const backendConnected = await this.backendClient.initialize();
            
            if (backendConnected) {
                console.log('✅ Connected to real Python PaddleOCR backend');
                this.initialized = true;
                return;
            }
            
            // Fallback to JavaScript simulation
            console.log('🔄 Using JavaScript NLP simulation as fallback...');
            this.nlp = await this.initializeSimulatedNLP();
            
            // Load custom models
            await this.loadCustomModels();
            
            // Initialize entity validation
            this.initializeEntityValidation();
            
            this.initialized = true;
            console.log('✅ PaddleOCR NLP Service initialized with fallback');
            
        } catch (error) {
            console.error('❌ Failed to initialize PaddleOCR NLP Service:', error);
            throw error;
        }
    }

    /**
     * Initialize simulated NLP functionality
     * In production, this would load actual PaddleOCR models
     */
    async initializeSimulatedNLP() {
        return {
            process: (text) => this.processText(text),
            extractEntities: (text) => this.extractEntities(text),
            classifyDocument: (text) => this.classifyDocument(text),
            calculateSimilarity: (text1, text2) => this.calculateSemanticSimilarity(text1, text2),
            parseIntent: (query) => this.parseIntent(query)
        };
    }

    /**
     * Load custom medical models
     */
    async loadCustomModels() {
        // Medical NER model for Turkish healthcare documents
        this.customModels.set('medical_ner', {
            name: 'Turkish Medical NER',
            entities: this.medicalEntityTypes,
            patterns: this.createMedicalNERPatterns()
        });
        
        // Document classification model
        this.customModels.set('doc_classifier', {
            name: 'Medical Document Classifier',
            classes: this.createDocumentClasses(),
            features: this.createClassificationFeatures()
        });
        
        // Patient similarity model
        this.customModels.set('patient_matcher', {
            name: 'Patient Similarity Matcher',
            embeddings: this.createPatientEmbeddings(),
            similarity_threshold: 0.75
        });
        
        if (this.debug) console.log('📚 Custom medical models loaded');
    }

    /**
     * Process text with NLP pipeline (enhanced with real PaddleOCR)
     */
    async processDocument(text, documentType = 'medical') {
        if (!this.initialized) {
            await this.initialize();
        }
        
        // Try real PaddleOCR backend first
        if (this.backendClient.isReady()) {
            try {
                const result = await this.backendClient.processDocument(text, documentType);
                
                if (this.debug) {
                    console.log('🐍 Real PaddleOCR processing completed:', {
                        textLength: text.length,
                        entitiesFound: Object.keys(result.entities || {}).length,
                        classification: result.classification?.type,
                        confidence: result.confidence,
                        source: result.source
                    });
                }
                
                return result;
            } catch (error) {
                console.warn('🔄 PaddleOCR backend failed, using fallback:', error.message);
            }
        }
        
        // Fallback to JavaScript simulation
        return this.processDocumentFallback(text, documentType);
    }

    /**
     * Fallback processing with JavaScript simulation
     */
    async processDocumentFallback(text, documentType = 'medical') {
        const cacheKey = this.generateCacheKey(text, documentType);
        if (this.entityCache.has(cacheKey)) {
            return this.entityCache.get(cacheKey);
        }
        
        try {
            const startTime = Date.now();
            
            // Process text through simulated NLP pipeline
            const doc = await this.nlp.process(text);
            
            const result = {
                entities: await this.extractEntitiesAdvanced(text, documentType),
                classification: await this.classifyDocumentAdvanced(text, documentType),
                keyPhrases: this.extractKeyPhrases(text),
                medicalTerms: this.identifyMedicalTerms(text),
                confidence: this.calculateOverallConfidence(text),
                processingTime: Date.now() - startTime,
                source: 'javascript_fallback'
            };
            
            // Cache result for future use
            this.entityCache.set(cacheKey, result);
            
            if (this.debug) {
                console.log('🔄 Fallback NLP processing completed:', {
                    textLength: text.length,
                    entitiesFound: Object.keys(result.entities).length,
                    classification: result.classification.type,
                    confidence: result.confidence,
                    processingTime: result.processingTime + 'ms',
                    source: result.source
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ NLP processing failed:', error);
            return this.getFallbackResult(text);
        }
    }

    /**
     * Backwards-compatible alias used by some consumers and by the simulated NLP
     * adapter. Ensures calling `nlp.process(text)` works by delegating to
     * processDocument which handles backend vs fallback logic.
     */
    async processText(text, documentType = 'medical') {
        // Delegate to the unified processing method so both backend and
        // simulated paths follow the same logic and caching.
        return this.processDocument(text, documentType);
    }

    /**
     * Advanced entity extraction with medical context
     */
    async extractEntitiesAdvanced(text, documentType) {
        const entities = {};
        const normalizedText = this.normalizeText(text);
        
        // Extract person names with Turkish NLP context
        const personEntities = this.extractPersonEntities(normalizedText);
        if (personEntities.length > 0) {
            entities.PERSON = personEntities.map(entity => ({
                text: entity.text,
                confidence: entity.confidence,
                startChar: entity.start,
                endChar: entity.end,
                context: entity.context
            }));
        }
        
        // Extract TC numbers with validation
        const tcEntities = this.extractTCNumbers(normalizedText);
        if (tcEntities.length > 0) {
            entities.TC_NUMBER = tcEntities.map(entity => ({
                text: entity.text,
                confidence: entity.confidence,
                validated: this.validateTCNumber(entity.text),
                startChar: entity.start,
                endChar: entity.end
            }));
        }
        
        // Extract dates with Turkish formats
        const dateEntities = this.extractDates(normalizedText);
        if (dateEntities.length > 0) {
            entities.DATE = dateEntities.map(entity => ({
                text: entity.text,
                standardFormat: entity.standardFormat,
                confidence: entity.confidence,
                type: entity.dateType, // birth, appointment, report
                startChar: entity.start,
                endChar: entity.end
            }));
        }
        
        // Extract medical conditions and diagnoses
        const medicalEntities = this.extractMedicalConditions(normalizedText);
        if (medicalEntities.length > 0) {
            entities.MEDICAL_CONDITION = medicalEntities.map(entity => ({
                text: entity.text,
                category: entity.category,
                icd10Code: entity.icd10Code,
                confidence: entity.confidence,
                startChar: entity.start,
                endChar: entity.end
            }));
        }
        
        // Extract device types and medical equipment
        const deviceEntities = this.extractDeviceTypes(normalizedText);
        if (deviceEntities.length > 0) {
            entities.DEVICE_TYPE = deviceEntities.map(entity => ({
                text: entity.text,
                category: entity.category,
                specifications: entity.specifications,
                confidence: entity.confidence,
                startChar: entity.start,
                endChar: entity.end
            }));
        }
        
        return entities;
    }

    /**
     * Advanced document classification with confidence scoring
     */
    async classifyDocumentAdvanced(text, documentType) {
        const normalizedText = this.normalizeText(text);
        const features = this.extractClassificationFeatures(normalizedText);
        
        const documentClasses = this.customModels.get('doc_classifier').classes;
        let bestMatch = { type: 'other', confidence: 0, subType: null };
        
        for (const [className, classConfig] of Object.entries(documentClasses)) {
            const score = this.calculateClassificationScore(features, classConfig);
            
            if (score > bestMatch.confidence) {
                bestMatch = {
                    type: className,
                    confidence: Math.min(score, 1.0),
                    subType: this.determineSubType(normalizedText, className),
                    requiredFields: classConfig.requiredFields || [],
                    processingInstructions: classConfig.processing || {}
                };
            }
        }
        
        // Add context-specific enhancements
        if (bestMatch.type === 'sgk_report') {
            bestMatch.sgkSpecific = this.analyzeSGKDocument(normalizedText);
        }
        
        return bestMatch;
    }

    /**
     * Calculate semantic similarity between texts (enhanced with real PaddleOCR)
     */
    async calculateSemanticSimilarity(text1, text2) {
        // Try real PaddleOCR backend first
        if (this.backendClient.isReady()) {
            try {
                const result = await this.backendClient.calculateSemanticSimilarity(text1, text2);
                return {
                    similarity: result.similarity,
                    breakdown: {
                        semantic: result.similarity,
                        method: result.method,
                        tokens1: result.tokens1,
                        tokens2: result.tokens2
                    },
                    confidence: 0.95, // High confidence for real PaddleOCR
                    source: result.source,
                    processingTime: result.processingTime
                };
            } catch (error) {
                console.warn('🔄 PaddleOCR similarity failed, using fallback:', error.message);
            }
        }
        
        // Fallback to JavaScript simulation
        return this.calculateSemanticSimilarityFallback(text1, text2);
    }

    /**
     * Fallback similarity calculation
     */
    async calculateSemanticSimilarityFallback(text1, text2) {
        const cacheKey = `${this.hashText(text1)}-${this.hashText(text2)}`;
        if (this.similarityCache.has(cacheKey)) {
            return this.similarityCache.get(cacheKey);
        }
        
        try {
            // Normalize both texts
            const norm1 = this.normalizeText(text1);
            const norm2 = this.normalizeText(text2);
            
            // Extract features for comparison
            const features1 = this.extractSemanticFeatures(norm1);
            const features2 = this.extractSemanticFeatures(norm2);
            
            // Calculate multiple similarity scores
            const scores = {
                lexical: this.calculateLexicalSimilarity(norm1, norm2),
                semantic: this.calculateEmbeddingSimilarity(features1, features2),
                medical: this.calculateMedicalTermSimilarity(norm1, norm2),
                structural: this.calculateStructuralSimilarity(features1, features2)
            };
            
            // Weighted combination
            const finalScore = (
                scores.lexical * 0.25 +
                scores.semantic * 0.35 +
                scores.medical * 0.25 +
                scores.structural * 0.15
            );
            
            const result = {
                similarity: Math.min(finalScore, 1.0),
                breakdown: scores,
                confidence: this.calculateSimilarityConfidence(scores),
                source: 'javascript_fallback'
            };
            
            this.similarityCache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            console.error('❌ Similarity calculation failed:', error);
            return { similarity: 0, confidence: 0, source: 'error' };
        }
    }

    /**
     * Parse natural language intent from search queries
     */
    async parseIntent(query) {
        const normalizedQuery = this.normalizeText(query.toLowerCase());
        
        // Intent patterns for Turkish medical queries
        const intentPatterns = {
            FIND_PATIENTS: [
                /hasta.*(bul|ara|göster|listele)/,
                /(bul|ara|göster|listele).*hasta/,
                /hangi hasta/,
                /hasta.*kim/
            ],
            SEARCH_DOCUMENTS: [
                /belge.*(bul|ara|göster)/,
                /rapor.*(bul|ara|göster)/,
                /dosya.*(bul|ara|göster)/,
                /(hangi|ne).*belge/
            ],
            SHOW_APPOINTMENTS: [
                /randevu.*(göster|listele|bul)/,
                /(bugün|yarın|bu hafta).*randevu/,
                /appointment.*(show|list|find)/
            ],
            DEVICE_INQUIRY: [
                /cihaz.*(hangi|ne|kim)/,
                /(işitme cihazı|hearing aid).*(bul|ara)/,
                /protez.*(göster|listele)/
            ],
            SGK_RELATED: [
                /sgk.*(rapor|belge|başvuru)/,
                /sosyal güvenlik/,
                /(onay|red|beklemede).*sgk/
            ]
        };
        
        let detectedIntent = { type: 'UNKNOWN', confidence: 0, parameters: {} };
        
        // Match against intent patterns
        for (const [intentType, patterns] of Object.entries(intentPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(normalizedQuery)) {
                    const confidence = this.calculateIntentConfidence(normalizedQuery, pattern);
                    if (confidence > detectedIntent.confidence) {
                        detectedIntent = {
                            type: intentType,
                            confidence,
                            parameters: this.extractIntentParameters(normalizedQuery, intentType),
                            originalQuery: query,
                            processedQuery: normalizedQuery
                        };
                    }
                }
            }
        }
        
        // Extract entities from query for parameters
        if (detectedIntent.type !== 'UNKNOWN') {
            const queryEntities = await this.extractEntitiesAdvanced(query, 'query');
            detectedIntent.entities = queryEntities;
        }
        
        return detectedIntent;
    }

    /**
     * Extract person entities with Turkish name patterns
     */
    extractPersonEntities(text) {
        const entities = [];
        
        // Turkish name patterns
        const namePatterns = [
            // Capitalized names: "Mehmet Özkan", "Ayşe Kaya"
            /\b([A-ZÇĞIÏÖŞÜ][a-zçğıiöşü]{2,})\s+([A-ZÇĞIÏÖŞÜ][a-zçğıiöşü]{2,})\b/g,
            // With middle names: "Ahmet Can Özkan"
            /\b([A-ZÇĞIÏÖŞÜ][a-zçğıiöşü]{2,})\s+([A-ZÇĞIÏÖŞÜ][a-zçğıiöşü]{2,})\s+([A-ZÇĞIÏÖŞÜ][a-zçğıiöşü]{2,})\b/g,
            // After "Hasta Adı:", "Ad Soyad:" etc.
            /(?:hasta\s+ad[ıi]|ad\s+soyad|patient\s+name)[\s:]+([A-ZÇĞIÏÖŞÜ][a-zçğıiöşü\s]{5,})/gi
        ];
        
        namePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const fullName = match[0].trim();
                if (this.isValidTurkishName(fullName)) {
                    entities.push({
                        text: fullName,
                        start: match.index,
                        end: match.index + fullName.length,
                        confidence: this.calculateNameConfidence(fullName),
                        context: this.getEntityContext(text, match.index, fullName.length)
                    });
                }
            }
        });
        
        return entities;
    }

    /**
     * Extract TC numbers with validation
     */
    extractTCNumbers(text) {
        const entities = [];
        const tcPatterns = [
            /(?:TC|T\.C\.?|TCKN|T\.C\.K\.N\.?|Kimlik\s+No)[\s\.:]*(\d{11})/gi,
            /\b(\d{11})\b/g
        ];
        
        tcPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const tcNumber = match[1] || match[0].replace(/\D/g, '');
                if (tcNumber.length === 11 && this.validateTCNumber(tcNumber)) {
                    entities.push({
                        text: tcNumber,
                        start: match.index,
                        end: match.index + match[0].length,
                        confidence: 0.95, // High confidence for validated TC numbers
                        validated: true
                    });
                }
            }
        });
        
        return entities;
    }

    /**
     * Extract medical conditions with Turkish medical terminology
     */
    extractMedicalConditions(text) {
        const entities = [];
        const medicalTerms = this.medicalTerms.conditions;
        
        Object.entries(medicalTerms).forEach(([condition, variants]) => {
            variants.forEach(variant => {
                const regex = new RegExp(`\\b${variant}\\b`, 'gi');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    entities.push({
                        text: match[0],
                        start: match.index,
                        end: match.index + match[0].length,
                        category: condition,
                        confidence: 0.85,
                        icd10Code: this.getICD10Code(condition)
                    });
                }
            });
        });
        
        return entities;
    }

    /**
     * Load Turkish medical terminology
     */
    loadMedicalTerminology() {
        return {
            conditions: {
                'hearing_loss': [
                    'işitme kaybı', 'işitme azalması', 'sağırlık', 'hearing loss',
                    'sensörinöral işitme kaybı', 'iletim tipi işitme kaybı',
                    'karma tip işitme kaybı', 'presbyküzi', 'ototoksisite'
                ],
                'tinnitus': [
                    'kulak çınlaması', 'tinnitus', 'çınlama', 'uğultu',
                    'sübjektif tinnitus', 'objektif tinnitus'
                ],
                'vertigo': [
                    'vertigo', 'baş dönmesi', 'denge bozukluğu', 'meniere',
                    'vestibüler nörit', 'benign pozisyonel vertigo'
                ]
            },
            devices: {
                'hearing_aids': [
                    'işitme cihazı', 'hearing aid', 'işitme aleti',
                    'BTE', 'ITE', 'CIC', 'RIC', 'kulak arkası cihaz',
                    'kulak içi cihaz', 'tamamen kanal içi'
                ],
                'cochlear_implants': [
                    'koklear implant', 'cochlear implant', 'bionic ear',
                    'işitme implantı', 'elektronik kulak'
                ]
            },
            procedures: {
                'audiometry': [
                    'odyometri', 'audiometry', 'işitme testi',
                    'ses alan ölçümü', 'timpanometri', 'ABR'
                ],
                'surgery': [
                    'ameliyat', 'surgery', 'cerrahı', 'operasyon',
                    'mastoidektomi', 'stapedektomi', 'timpanoplasti'
                ]
            }
        };
    }

    /**
     * Create document classification classes
     */
    createDocumentClasses() {
        return {
            sgk_device_report: {
                keywords: ['sgk', 'cihaz raporu', 'işitme cihazı', 'protez'],
                patterns: [/sgk.*cihaz.*rapor/i, /işitme.*cihaz.*rapor/i],
                requiredFields: ['patient_info', 'device_type', 'doctor_signature'],
                confidence_threshold: 0.7
            },
            prescription: {
                keywords: ['reçete', 'prescription', 'ilaç', 'doktor'],
                patterns: [/reçete/i, /prescription/i, /dr\./i],
                requiredFields: ['patient_info', 'medication', 'doctor_info'],
                confidence_threshold: 0.8
            },
            audiometry_report: {
                keywords: ['odyometri', 'audiometry', 'işitme testi', 'dB HL'],
                patterns: [/odyometri.*rapor/i, /işitme.*test/i, /\d+\s*dB/i],
                requiredFields: ['patient_info', 'test_results', 'frequencies'],
                confidence_threshold: 0.75
            },
            medical_report: {
                keywords: ['rapor', 'report', 'muayene', 'bulgular'],
                patterns: [/tıbbi.*rapor/i, /muayene.*rapor/i, /bulgular/i],
                requiredFields: ['patient_info', 'findings', 'doctor_signature'],
                confidence_threshold: 0.6
            }
        };
    }

    /**
     * Validate Turkish TC number using algorithm
     */
    validateTCNumber(tcNumber) {
        if (!/^\d{11}$/.test(tcNumber)) return false;
        
        const digits = tcNumber.split('').map(Number);
        
        // First digit cannot be 0
        if (digits[0] === 0) return false;
        
        // Calculate check digits
        const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
        
        const check1 = (sum1 * 7 - sum2) % 10;
        const check2 = (sum1 + sum2 + digits[9]) % 10;
        
        return check1 === digits[9] && check2 === digits[10];
    }

    /**
     * Generate cache key for processed results
     */
    generateCacheKey(text, type) {
        return `${type}-${this.hashText(text)}`;
    }

    /**
     * Simple hash function for text
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Normalize Turkish text for processing
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Get fallback result when NLP processing fails
     */
    getFallbackResult(text) {
        return {
            entities: {},
            classification: { type: 'other', confidence: 0 },
            keyPhrases: [],
            medicalTerms: [],
            confidence: 0,
            fallback: true,
            error: 'NLP processing failed, using fallback'
        };
    }

    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(text) {
        const textLength = text.length;
        const hasStructure = /[:\-\.]/.test(text);
        const hasMedicalTerms = this.identifyMedicalTerms(text).length > 0;
        
        let confidence = 0.5; // Base confidence
        
        if (textLength > 50) confidence += 0.1;
        if (textLength > 200) confidence += 0.1;
        if (hasStructure) confidence += 0.1;
        if (hasMedicalTerms) confidence += 0.2;
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Identify medical terms in text
     */
    identifyMedicalTerms(text) {
        const terms = [];
        const normalizedText = this.normalizeText(text);
        
        Object.values(this.medicalTerms).forEach(category => {
            Object.values(category).forEach(termList => {
                termList.forEach(term => {
                    if (normalizedText.includes(this.normalizeText(term))) {
                        terms.push(term);
                    }
                });
            });
        });
        
        return [...new Set(terms)]; // Remove duplicates
    }

    /**
     * Check if service is ready for use
     */
    isReady() {
        return this.initialized;
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            initialized: this.initialized,
            cacheSize: this.entityCache.size,
            similarityCacheSize: this.similarityCache.size,
            modelsLoaded: this.customModels.size,
            language: this.language
        };
    }

    /**
     * Create medical NER patterns for Turkish healthcare
     */
    createMedicalNERPatterns() {
        return {
            // Turkish medical entity patterns
            PERSON: [
                /\b[A-ZÇĞIÖŞÜ][a-zçğıiöşü]+ [A-ZÇĞIÖŞÜ][a-zçğıöşü]+\b/g, // Turkish names
                /\b(?:Dr|Prof|Doç|Uz)\. [A-ZÇĞIÖŞÜ][a-zçğıiöşü]+ [A-ZÇĞIÖŞÜ][a-zçğıöşü]+\b/g
            ],
            MEDICAL_CONDITION: [
                /\b(?:otoskleroz|otitis media|işitme kaybı|vertigo|tinnitus|meniere)\b/gi,
                /\b(?:sensorinöral|iletim|mikst) (?:tip )?işitme kaybı\b/gi
            ],
            MEDICATION: [
                /\b(?:antibiyotik|kortikosteroid|diüretik|antihistaminik)\b/gi,
                /\b[A-Za-z]+(?:ol|in|ine|ate)\b/g // Generic drug suffixes
            ],
            DEVICE: [
                /\b(?:işitme cihazı|koklear implant|kemik ankrajlı cihaz)\b/gi,
                /\b(?:BTE|ITE|CIC|RIC) (?:tip )?cihaz\b/gi
            ],
            DATE: [
                /\b\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}\b/g,
                /\b(?:\d{1,2}\s+)?(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+\d{4}\b/gi
            ],
            MEASUREMENT: [
                /\b\d+\s*(?:dB|Hz|kHz|ml|mg|cm|mm)\b/gi,
                /\b\d+[.,]\d+\s*(?:dB|Hz|kHz|ml|mg|cm|mm)\b/gi
            ]
        };
    }

    /**
     * Create document classification classes
     */
    createDocumentClasses() {
        return {
            'medical_report': {
                name: 'Tıbbi Rapor',
                keywords: ['rapor', 'muayene', 'tanı', 'bulgular', 'öneri'],
                confidence_threshold: 0.7
            },
            'prescription': {
                name: 'Reçete',
                keywords: ['reçete', 'ilaç', 'doz', 'kullanım', 'günde'],
                confidence_threshold: 0.8
            },
            'test_results': {
                name: 'Test Sonuçları',
                keywords: ['test', 'sonuç', 'değer', 'normal', 'anormal'],
                confidence_threshold: 0.75
            },
            'sgk_document': {
                name: 'SGK Belgesi',
                keywords: ['sgk', 'sosyal güvenlik', 'sigorta', 'onay', 'başvuru'],
                confidence_threshold: 0.8
            },
            'patient_notes': {
                name: 'Hasta Notları',
                keywords: ['not', 'gözlem', 'takip', 'durum', 'değişiklik'],
                confidence_threshold: 0.6
            }
        };
    }

    /**
     * Create classification features
     */
    createClassificationFeatures() {
        return {
            'text_length': { weight: 0.1, normalize: true },
            'medical_terms_count': { weight: 0.3, normalize: true },
            'structure_score': { weight: 0.2, normalize: true },
            'keyword_density': { weight: 0.4, normalize: true }
        };
    }

    /**
     * Create patient embeddings for similarity matching
     */
    createPatientEmbeddings() {
        return {
            'name_embedding': { 
                weight: 0.4, 
                method: 'levenshtein_normalized',
                features: ['name', 'surname'] 
            },
            'demographic_embedding': { 
                weight: 0.2, 
                method: 'categorical_match',
                features: ['age_group', 'gender', 'city'] 
            },
            'medical_embedding': { 
                weight: 0.3, 
                method: 'jaccard_similarity',
                features: ['conditions', 'medications', 'devices'] 
            },
            'temporal_embedding': { 
                weight: 0.1, 
                method: 'date_proximity',
                features: ['last_visit', 'registration_date'] 
            }
        };
    }

    /**
     * Initialize entity validation patterns
     */
    initializeEntityValidation() {
        this.validationPatterns = {
            PERSON: {
                minLength: 2,
                maxLength: 50,
                pattern: /^[A-ZÇĞIİÖŞÜa-zçğıiöşü\s]+$/,
                required: ['name']
            },
            MEDICAL_CONDITION: {
                minLength: 3,
                maxLength: 100,
                pattern: /^[A-ZÇĞIİÖŞÜa-zçğıiöşü\s\-]+$/,
                categories: ['acute', 'chronic', 'hereditary']
            },
            MEDICATION: {
                minLength: 2,
                maxLength: 50,
                pattern: /^[A-Za-z0-9\s\-]+$/,
                dosagePattern: /\d+\s*(mg|ml|gr|cc)/
            },
            DEVICE: {
                minLength: 3,
                maxLength: 100,
                categories: ['hearing_aid', 'cochlear_implant', 'bone_anchored'],
                brands: ['Phonak', 'Oticon', 'Widex', 'Starkey', 'ReSound']
            },
            DATE: {
                formats: ['DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
                range: { min: '1900-01-01', max: '2030-12-31' }
            },
            MEASUREMENT: {
                units: ['dB', 'Hz', 'kHz', 'ml', 'mg', 'cm', 'mm'],
                ranges: {
                    'dB': { min: 0, max: 120 },
                    'Hz': { min: 20, max: 20000 },
                    'ml': { min: 0, max: 1000 }
                }
            }
        };

        if (this.debug) console.log('🛡️ Entity validation patterns initialized');
    }
}

// Export for use in other modules
window.PaddleNLPService = PaddleNLPService;
