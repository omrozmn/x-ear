/**
 * Patient Matching Service with NLP Enhancement
 * Provides advanced patient matching capabilities using both traditional fuzzy matching
 * and semantic similarity from PaddleOCR NLP for improved accuracy in Turkish text processing.
 * 
 * Features:
 * - Fuzzy string matching for typos and OCR errors
 * - Semantic similarity matching for name variations
 * - TC number validation and matching
 * - Date of birth parsing and matching
 * - Multi-criteria scoring with confidence intervals
 * - Turkish name normalization and variations
 */

class PatientMatchingService {
    constructor(options = {}) {
        this.debug = options.debug || false;
        this.nlpService = null;
        this.nlpEnabled = options.enableNLP !== false;
        
        // Matching thresholds
        this.thresholds = {
            exactMatch: 0.95,
            strongMatch: 0.85,
            goodMatch: 0.75,
            weakMatch: 0.65,
            noMatch: 0.50
        };
        
        // Weights for different matching criteria
        this.weights = {
            name: 0.4,
            surname: 0.3,
            tcNumber: 0.2,
            birthDate: 0.1
        };
        
        // Cache for performance
        this.matchCache = new Map();
        this.maxCacheSize = 1000;
        
        // Turkish name variations and nicknames
        this.nameVariations = this.loadTurkishNameVariations();
        
        if (this.debug) console.log('🎯 Patient Matching Service initialized');
    }

    /**
     * Initialize NLP service for semantic matching
     */
    async initialize() {
        if (this.nlpEnabled && typeof PaddleNLPService !== 'undefined') {
            try {
                console.log('🧠 Initializing NLP for Patient Matching...');
                this.nlpService = new PaddleNLPService({ 
                    debug: this.debug,
                    language: 'tr' 
                });
                await this.nlpService.initialize();
                console.log('✅ Patient Matching NLP initialized');
            } catch (error) {
                console.warn('⚠️ NLP initialization failed for Patient Matching:', error);
                this.nlpEnabled = false;
            }
        }
    }

    /**
     * Find best matching patients from database
     */
    async findMatches(extractedInfo, patientDatabase) {
        try {
            const startTime = Date.now();
            
            if (!extractedInfo || !patientDatabase || patientDatabase.length === 0) {
                return [];
            }

            // Generate cache key
            const cacheKey = this.generateCacheKey(extractedInfo);
            if (this.matchCache.has(cacheKey)) {
                return this.matchCache.get(cacheKey);
            }

            console.log('🔍 Finding patient matches for:', {
                name: extractedInfo.name,
                tcNo: extractedInfo.tcNo ? '***' + extractedInfo.tcNo.slice(-4) : 'none',
                confidence: extractedInfo.confidence
            });

            const matches = [];

            // Process each patient in database
            for (const patient of patientDatabase) {
                const matchResult = await this.calculatePatientMatch(extractedInfo, patient);
                
                if (matchResult.score >= this.thresholds.noMatch) {
                    matches.push({
                        patient,
                        ...matchResult
                    });
                }
            }

            // Sort by score (highest first)
            matches.sort((a, b) => b.score - a.score);

            // Take top 10 matches
            const topMatches = matches.slice(0, 10);

            // Add match level classification
            topMatches.forEach(match => {
                match.level = this.getMatchLevel(match.score);
            });

            const processingTime = Date.now() - startTime;
            console.log(`✅ Patient matching completed in ${processingTime}ms, found ${topMatches.length} matches`);

            // Cache results
            this.matchCache.set(cacheKey, topMatches);
            if (this.matchCache.size > this.maxCacheSize) {
                const firstKey = this.matchCache.keys().next().value;
                this.matchCache.delete(firstKey);
            }

            return topMatches;

        } catch (error) {
            console.error('❌ Patient matching failed:', error);
            return [];
        }
    }

    /**
     * Calculate match score for a single patient
     */
    async calculatePatientMatch(extractedInfo, patient) {
        const scores = {
            name: 0,
            surname: 0,
            tcNumber: 0,
            birthDate: 0,
            overall: 0
        };

        const details = {
            nameMethod: 'none',
            surnameMethod: 'none',
            tcNumberMatch: false,
            birthDateMatch: false,
            semanticSimilarity: 0
        };

        // Extract patient name parts
        const patientFullName = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        const patientNameParts = this.parseFullName(patientFullName);
        const extractedNameParts = this.parseFullName(extractedInfo.name || '');

        // 1. Name matching
        if (extractedNameParts.firstName && patientNameParts.firstName) {
            const nameMatch = await this.matchNames(
                extractedNameParts.firstName, 
                patientNameParts.firstName,
                'firstName'
            );
            scores.name = nameMatch.score;
            details.nameMethod = nameMatch.method;
        }

        // 2. Surname matching
        if (extractedNameParts.lastName && patientNameParts.lastName) {
            const surnameMatch = await this.matchNames(
                extractedNameParts.lastName, 
                patientNameParts.lastName,
                'lastName'
            );
            scores.surname = surnameMatch.score;
            details.surnameMethod = surnameMatch.method;
        }

        // 3. TC Number matching (exact match required)
        if (extractedInfo.tcNo && patient.tcNo) {
            scores.tcNumber = extractedInfo.tcNo === patient.tcNo ? 1.0 : 0.0;
            details.tcNumberMatch = scores.tcNumber > 0;
        }

        // 4. Birth Date matching
        if (extractedInfo.birthDate && patient.birthDate) {
            scores.birthDate = this.matchDates(extractedInfo.birthDate, patient.birthDate);
            details.birthDateMatch = scores.birthDate > 0.8;
        }

        // 5. Semantic similarity (if NLP is available)
        if (this.nlpEnabled && this.nlpService && this.nlpService.isReady()) {
            try {
                const extractedText = `${extractedInfo.name || ''} ${extractedInfo.tcNo || ''} ${extractedInfo.birthDate || ''}`.trim();
                const patientText = `${patientFullName} ${patient.tcNo || ''} ${patient.birthDate || ''}`.trim();
                
                if (extractedText && patientText) {
                    const similarity = await this.nlpService.calculateSemanticSimilarity(extractedText, patientText);
                    details.semanticSimilarity = similarity.similarity;
                }
            } catch (error) {
                if (this.debug) console.warn('Semantic similarity calculation failed:', error);
            }
        }

        // Calculate weighted overall score
        scores.overall = (
            scores.name * this.weights.name +
            scores.surname * this.weights.surname +
            scores.tcNumber * this.weights.tcNumber +
            scores.birthDate * this.weights.birthDate
        );

        // Boost score with semantic similarity
        if (details.semanticSimilarity > 0) {
            scores.overall = (scores.overall * 0.8) + (details.semanticSimilarity * 0.2);
        }

        // Special case: Perfect TC match should score very high
        if (scores.tcNumber === 1.0) {
            scores.overall = Math.max(scores.overall, 0.95);
        }

        return {
            score: Math.min(scores.overall, 1.0),
            scores,
            details,
            confidence: this.calculateMatchConfidence(scores, details)
        };
    }

    /**
     * Match two names using multiple methods
     */
    async matchNames(name1, name2, type) {
        const normalized1 = this.normalizeTurkishName(name1);
        const normalized2 = this.normalizeTurkishName(name2);

        let bestScore = 0;
        let bestMethod = 'none';

        // 1. Exact match (normalized)
        if (normalized1 === normalized2) {
            return { score: 1.0, method: 'exact' };
        }

        // 2. Check name variations/nicknames
        const variationScore = this.checkNameVariations(normalized1, normalized2, type);
        if (variationScore > bestScore) {
            bestScore = variationScore;
            bestMethod = 'variation';
        }

        // 3. Fuzzy matching (Levenshtein distance)
        const fuzzyScore = this.calculateFuzzyScore(normalized1, normalized2);
        if (fuzzyScore > bestScore) {
            bestScore = fuzzyScore;
            bestMethod = 'fuzzy';
        }

        // 4. Semantic similarity (if available)
        if (this.nlpEnabled && this.nlpService && this.nlpService.isReady()) {
            try {
                const similarity = await this.nlpService.calculateSemanticSimilarity(name1, name2);
                if (similarity.similarity > bestScore) {
                    bestScore = similarity.similarity;
                    bestMethod = 'semantic';
                }
            } catch (error) {
                // Silently fall back to other methods
            }
        }

        // 5. Partial matching (for compound names)
        const partialScore = this.calculatePartialMatch(normalized1, normalized2);
        if (partialScore > bestScore) {
            bestScore = partialScore;
            bestMethod = 'partial';
        }

        return { score: bestScore, method: bestMethod };
    }

    /**
     * Parse full name into components
     */
    parseFullName(fullName) {
        if (!fullName || typeof fullName !== 'string') {
            return { firstName: '', lastName: '' };
        }

        const parts = fullName.trim().split(/\s+/);
        
        if (parts.length === 1) {
            return { firstName: parts[0], lastName: '' };
        } else if (parts.length === 2) {
            return { firstName: parts[0], lastName: parts[1] };
        } else {
            // For names with more than 2 parts, assume first is firstName, rest is lastName
            return { 
                firstName: parts[0], 
                lastName: parts.slice(1).join(' ') 
            };
        }
    }

    /**
     * Normalize Turkish names for matching
     */
    normalizeTurkishName(name) {
        if (!name) return '';
        
        return name
            .toLowerCase()
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .trim();
    }

    /**
     * Check for Turkish name variations and nicknames
     */
    checkNameVariations(name1, name2, type) {
        const variations = this.nameVariations[type] || {};
        
        // Check if either name is a variation of the other
        for (const [canonical, variants] of Object.entries(variations)) {
            const allVariants = [canonical, ...variants];
            
            if (allVariants.includes(name1) && allVariants.includes(name2)) {
                return 0.9; // High score for known variations
            }
        }
        
        return 0;
    }

    /**
     * Calculate fuzzy matching score using Levenshtein distance
     */
    calculateFuzzyScore(str1, str2) {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;

        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;

        const distance = this.levenshteinDistance(str1, str2);
        return Math.max(0, (maxLength - distance) / maxLength);
    }

    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Calculate partial matching score for compound names
     */
    calculatePartialMatch(name1, name2) {
        const parts1 = name1.split(/\s+/);
        const parts2 = name2.split(/\s+/);
        
        let matches = 0;
        let totalParts = Math.max(parts1.length, parts2.length);
        
        for (const part1 of parts1) {
            for (const part2 of parts2) {
                if (part1 === part2 || this.calculateFuzzyScore(part1, part2) > 0.8) {
                    matches++;
                    break;
                }
            }
        }
        
        return totalParts > 0 ? matches / totalParts : 0;
    }

    /**
     * Match dates with tolerance for different formats
     */
    matchDates(date1, date2) {
        if (!date1 || !date2) return 0;
        
        // Try to parse both dates
        const parsed1 = this.parseDate(date1);
        const parsed2 = this.parseDate(date2);
        
        if (!parsed1 || !parsed2) return 0;
        
        // Exact match
        if (parsed1.getTime() === parsed2.getTime()) return 1.0;
        
        // Check if year matches (common for birth years)
        if (parsed1.getFullYear() === parsed2.getFullYear()) {
            return 0.7;
        }
        
        return 0;
    }

    /**
     * Parse date from various Turkish formats
     */
    parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Try common Turkish date formats
        const formats = [
            /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // DD.MM.YYYY
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
            /(\d{4})-(\d{1,2})-(\d{1,2})/,    // YYYY-MM-DD
            /(\d{1,2})\s+(\w+)\s+(\d{4})/     // DD Month YYYY
        ];
        
        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                try {
                    if (format === formats[2]) { // YYYY-MM-DD
                        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                    } else { // DD.MM.YYYY or DD/MM/YYYY
                        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        // Try direct parsing as fallback
        try {
            return new Date(dateStr);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get match level based on score
     */
    getMatchLevel(score) {
        if (score >= this.thresholds.exactMatch) return 'exact';
        if (score >= this.thresholds.strongMatch) return 'strong';
        if (score >= this.thresholds.goodMatch) return 'good';
        if (score >= this.thresholds.weakMatch) return 'weak';
        return 'poor';
    }

    /**
     * Calculate confidence for the match
     */
    calculateMatchConfidence(scores, details) {
        let confidence = scores.overall;
        
        // Boost confidence for multiple matching criteria
        let criteriaCount = 0;
        if (scores.name > 0.7) criteriaCount++;
        if (scores.surname > 0.7) criteriaCount++;
        if (scores.tcNumber > 0) criteriaCount++;
        if (scores.birthDate > 0.7) criteriaCount++;
        
        if (criteriaCount >= 2) {
            confidence += 0.1 * (criteriaCount - 1);
        }
        
        // Boost for semantic similarity
        if (details.semanticSimilarity > 0.7) {
            confidence += 0.05;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Generate cache key for matching results
     */
    generateCacheKey(extractedInfo) {
        const key = `${extractedInfo.name || ''}-${extractedInfo.tcNo || ''}-${extractedInfo.birthDate || ''}`;
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Load Turkish name variations and nicknames
     */
    loadTurkishNameVariations() {
        return {
            firstName: {
                'mehmet': ['mehmed', 'muhammed', 'muhammet'],
                'ahmet': ['ahmed'],
                'mustafa': ['mustafa'],
                'ayşe': ['ayse', 'aise'],
                'fatma': ['fatima'],
                'hatice': ['hatica', 'hatije'],
                'zeynep': ['zeyneb'],
                'ali': ['aly'],
                'hasan': ['hassan'],
                'hüseyin': ['huseyin', 'hussein'],
                'ibrahim': ['ibrahım'],
                'süleyman': ['suleyman', 'süleyman'],
                'ismail': ['ismaıl']
            },
            lastName: {
                // Common surname variations could be added here
            }
        };
    }

    /**
     * Clear matching cache
     */
    clearCache() {
        this.matchCache.clear();
        if (this.debug) console.log('🗑️ Patient matching cache cleared');
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            nlpEnabled: this.nlpEnabled,
            nlpReady: this.nlpService ? this.nlpService.isReady() : false,
            cacheSize: this.matchCache.size,
            thresholds: this.thresholds,
            weights: this.weights
        };
    }
}

// Export for use in other modules
window.PatientMatchingService = PatientMatchingService;
