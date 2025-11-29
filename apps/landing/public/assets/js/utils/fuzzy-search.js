/**
 * Fuzzy Search Utility
 * Provides elastic search capabilities with fuzzy matching, case-insensitive search,
 * and Levenshtein distance algorithms for better search experience
 */

class FuzzySearchUtil {
    constructor(options = {}) {
        this.options = {
            threshold: 0.6, // Minimum similarity score (0-1)
            maxDistance: 3, // Maximum Levenshtein distance
            caseSensitive: false,
            includeScore: false,
            minLength: 1, // Minimum query length for fuzzy search
            ...options
        };
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} - Distance between strings
     */
    levenshteinDistance(a, b) {
        if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
        
        const matrix = [];
        const aLen = a.length;
        const bLen = b.length;

        // Initialize matrix
        for (let i = 0; i <= bLen; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= aLen; j++) {
            matrix[0][j] = j;
        }

        // Fill matrix
        for (let i = 1; i <= bLen; i++) {
            for (let j = 1; j <= aLen; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[bLen][aLen];
    }

    /**
     * Calculate similarity score between two strings (0-1)
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} - Similarity score
     */
    similarity(a, b) {
        if (!a || !b) return 0;
        
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1;
        
        const distance = this.levenshteinDistance(a, b);
        return 1 - (distance / maxLen);
    }

    /**
     * Normalize text for comparison
     * @param {string} text - Text to normalize
     * @returns {string} - Normalized text
     */
    normalize(text) {
        if (!text) return '';
        
        let normalized = text.toString().trim();
        
        if (!this.options.caseSensitive) {
            normalized = normalized.toLowerCase();
        }
        
        // Remove diacritics (Turkish characters)
        normalized = normalized
            .replace(/ğ/g, 'g')
            .replace(/Ğ/g, 'G')
            .replace(/ü/g, 'u')
            .replace(/Ü/g, 'U')
            .replace(/ş/g, 's')
            .replace(/Ş/g, 'S')
            .replace(/ı/g, 'i')
            .replace(/İ/g, 'I')
            .replace(/ö/g, 'o')
            .replace(/Ö/g, 'O')
            .replace(/ç/g, 'c')
            .replace(/Ç/g, 'C');
        
        return normalized;
    }

    /**
     * Check if query matches text using fuzzy logic
     * @param {string} query - Search query
     * @param {string} text - Text to search in
     * @returns {boolean|object} - Match result
     */
    isMatch(query, text) {
        if (!query || !text) return false;
        
        const normalizedQuery = this.normalize(query);
        const normalizedText = this.normalize(text);
        
        // Exact match
        if (normalizedText.includes(normalizedQuery)) {
            return this.options.includeScore ? { match: true, score: 1, type: 'exact' } : true;
        }
        
        // Skip fuzzy search for very short queries
        if (normalizedQuery.length < this.options.minLength) {
            return this.options.includeScore ? { match: false, score: 0, type: 'none' } : false;
        }
        
        // Fuzzy match using similarity
        const score = this.similarity(normalizedQuery, normalizedText);
        const isMatch = score >= this.options.threshold;
        
        if (this.options.includeScore) {
            return {
                match: isMatch,
                score: score,
                type: isMatch ? 'fuzzy' : 'none'
            };
        }
        
        return isMatch;
    }

    /**
     * Search in array of items with fuzzy matching
     * @param {string} query - Search query
     * @param {Array} items - Array of items to search
     * @param {string|Function} searchField - Field name or function to extract searchable text
     * @returns {Array} - Filtered and sorted results
     */
    search(query, items, searchField) {
        if (!query || !items || !Array.isArray(items)) {
            return items || [];
        }
        
        const normalizedQuery = this.normalize(query);
        if (!normalizedQuery) return items;
        
        const results = [];
        
        items.forEach(item => {
            let searchText = '';
            
            if (typeof searchField === 'function') {
                searchText = searchField(item);
            } else if (typeof searchField === 'string') {
                searchText = item[searchField];
            } else {
                // Default: search in common fields
                searchText = [
                    item.name,
                    item.title,
                    item.label,
                    item.value,
                    item.company_name,
                    item.companyName
                ].filter(Boolean).join(' ');
            }
            
            const matchResult = this.isMatch(normalizedQuery, searchText);
            
            if (this.options.includeScore && matchResult.match) {
                results.push({
                    item: item,
                    score: matchResult.score,
                    type: matchResult.type
                });
            } else if (!this.options.includeScore && matchResult) {
                results.push(item);
            }
        });
        
        // Sort by score if includeScore is enabled
        if (this.options.includeScore) {
            results.sort((a, b) => {
                // Exact matches first
                if (a.type === 'exact' && b.type !== 'exact') return -1;
                if (b.type === 'exact' && a.type !== 'exact') return 1;
                
                // Then by score
                return b.score - a.score;
            });
            
            return results.map(r => r.item);
        }
        
        return results;
    }

    /**
     * Multi-field search with fuzzy matching
     * @param {string} query - Search query
     * @param {Array} items - Array of items to search
     * @param {Array} fields - Array of field names to search in
     * @returns {Array} - Filtered results
     */
    multiFieldSearch(query, items, fields) {
        if (!query || !items || !Array.isArray(items) || !fields || !Array.isArray(fields)) {
            return items || [];
        }
        
        const normalizedQuery = this.normalize(query);
        if (!normalizedQuery) return items;
        
        return items.filter(item => {
            return fields.some(field => {
                const fieldValue = item[field];
                if (!fieldValue) return false;
                
                return this.isMatch(normalizedQuery, fieldValue);
            });
        });
    }

    /**
     * Search with word tokenization (splits query into words)
     * @param {string} query - Search query
     * @param {Array} items - Array of items to search
     * @param {string|Function} searchField - Field name or function to extract searchable text
     * @returns {Array} - Filtered results
     */
    tokenizedSearch(query, items, searchField) {
        if (!query || !items || !Array.isArray(items)) {
            return items || [];
        }
        
        const queryTokens = this.normalize(query).split(/\s+/).filter(token => token.length > 0);
        if (queryTokens.length === 0) return items;
        
        return items.filter(item => {
            let searchText = '';
            
            if (typeof searchField === 'function') {
                searchText = searchField(item);
            } else if (typeof searchField === 'string') {
                searchText = item[searchField];
            } else {
                searchText = [
                    item.name,
                    item.title,
                    item.label,
                    item.value,
                    item.company_name,
                    item.companyName
                ].filter(Boolean).join(' ');
            }
            
            const normalizedText = this.normalize(searchText);
            
            // All tokens must match (AND logic)
            return queryTokens.every(token => {
                // Try exact match first
                if (normalizedText.includes(token)) return true;
                
                // Try fuzzy match for longer tokens
                if (token.length >= this.options.minLength) {
                    const words = normalizedText.split(/\s+/);
                    return words.some(word => this.similarity(token, word) >= this.options.threshold);
                }
                
                return false;
            });
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuzzySearchUtil;
} else {
    window.FuzzySearchUtil = FuzzySearchUtil;
}