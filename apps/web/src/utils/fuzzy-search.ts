/**
 * Advanced Fuzzy Search Utilities
 * Provides intelligent fuzzy string matching capabilities for party and product search
 */

export interface FuzzySearchOptions {
  threshold?: number; // Minimum similarity score (0-1)
  caseSensitive?: boolean;
  includeScore?: boolean;
  keys?: string[]; // Object keys to search in
  weights?: Record<string, number>; // Field weights for scoring
  maxResults?: number; // Maximum number of results
  enablePhonetic?: boolean; // Enable phonetic matching
  enableTypoTolerance?: boolean; // Enable typo tolerance
}

export interface FuzzySearchResult<T> {
  item: T;
  score: number;
  matches: Array<{
    key: string;
    value: string;
    score: number;
    type: 'exact' | 'partial' | 'fuzzy' | 'phonetic';
    startIndex?: number;
    endIndex?: number;
  }>;
  relevance: 'high' | 'medium' | 'low';
}

export interface SearchableItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  category?: string;
  barcode?: string;
  serialNumber?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLength;
}

/**
 * Check if string contains substring with fuzzy matching
 */
export function fuzzyContains(haystack: string, needle: string, threshold = 0.6): boolean {
  if (!haystack || !needle) return false;

  const haystackLower = haystack.toLowerCase();
  const needleLower = needle.toLowerCase();

  // Exact substring match
  if (haystackLower.includes(needleLower)) return true;

  // Fuzzy matching for each word in needle
  const needleWords = needleLower.split(/\s+/);
  const haystackWords = haystackLower.split(/\s+/);

  return needleWords.every(needleWord => {
    return haystackWords.some(haystackWord => {
      return calculateSimilarity(haystackWord, needleWord) >= threshold;
    });
  });
}

/**
 * Perform fuzzy search on array of objects
 */
export function fuzzySearch<T extends object>(
  items: T[],
  query: string,
  options: FuzzySearchOptions = {}
): FuzzySearchResult<T>[] {
  const {
    threshold = 0.3,
    caseSensitive = false,
    // includeScore = true, // Unused
    keys = []
  } = options;

  if (!query.trim()) return items.map(item => ({
    item,
    score: 1,
    matches: [],
    relevance: 'high' as const
  }));

  const searchQuery = caseSensitive ? query : query.toLowerCase();
  const results: FuzzySearchResult<T>[] = [];

  for (const item of items) {
    let maxScore = 0;
    const matches: Array<{
      key: string;
      value: string;
      score: number;
      type: 'exact' | 'partial' | 'fuzzy' | 'phonetic';
      startIndex?: number;
      endIndex?: number;
    }> = [];

    // Search in specified keys or all string properties
    const searchKeys = keys.length > 0 ? keys : Object.keys(item).filter(key =>
      typeof (item as any)[key] === 'string'
    );

    for (const key of searchKeys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (item as any)[key];
      if (typeof value !== 'string') continue;

      const searchValue = caseSensitive ? value : value.toLowerCase();

      // Calculate different types of matches
      let score = 0;
      let matchType: 'exact' | 'partial' | 'fuzzy' | 'phonetic' = 'fuzzy';
      let startIndex = -1;
      let endIndex = -1;

      // Exact match (highest score)
      if (searchValue === searchQuery) {
        score = 1;
        matchType = 'exact';
        startIndex = 0;
        endIndex = searchQuery.length;
      }
      // Starts with (high score)
      else if (searchValue.startsWith(searchQuery)) {
        score = 0.9;
        matchType = 'partial';
        startIndex = 0;
        endIndex = searchQuery.length;
      }
      // Contains (medium score)
      else if (searchValue.includes(searchQuery)) {
        score = 0.8;
        matchType = 'partial';
        startIndex = searchValue.indexOf(searchQuery);
        endIndex = startIndex + searchQuery.length;
      }
      // Fuzzy similarity (variable score)
      else {
        score = calculateSimilarity(searchValue, searchQuery);
        matchType = 'fuzzy';
      }

      if (score >= threshold) {
        matches.push({
          key,
          value,
          score,
          type: matchType,
          startIndex: startIndex >= 0 ? startIndex : undefined,
          endIndex: endIndex >= 0 ? endIndex : undefined
        });
        maxScore = Math.max(maxScore, score);
      }
    }

    if (maxScore >= threshold) {
      const relevance: 'high' | 'medium' | 'low' =
        maxScore >= 0.8 ? 'high' : maxScore >= 0.5 ? 'medium' : 'low';

      results.push({
        item,
        score: maxScore,
        matches,
        relevance
      });
    }
  }

  // Sort by score (descending)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Highlight matching parts in text
 */
export function highlightMatches(text: string, query: string, className = 'bg-yellow-200'): string {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `<span class="${className}">$1</span>`);
}

/**
 * Get search suggestions based on partial input
 */
/**
 * Product-specific search function with enhanced fuzzy matching
 */
export function searchProducts<T extends SearchableItem>(
  query: string,
  products: T[],
  options?: Partial<FuzzySearchOptions>
): FuzzySearchResult<T>[] {
  const productOptions: FuzzySearchOptions = {
    threshold: 0.2,
    maxResults: 20,
    keys: ['name', 'brand', 'model', 'barcode', 'serialNumber', 'category', 'description'],
    weights: {
      name: 1.0,
      brand: 0.9,
      model: 0.9,
      barcode: 1.0,
      serialNumber: 1.0,
      category: 0.7,
      description: 0.5
    },
    enablePhonetic: true,
    enableTypoTolerance: true,
    ...options
  };

  const results = fuzzySearch(products, query, productOptions);

  // Apply maxResults limit if specified
  if (productOptions.maxResults) {
    return results.slice(0, productOptions.maxResults);
  }

  return results;
}

/**
 * Get search suggestions based on partial input
 */
export function getSearchSuggestions<T extends object>(
  items: T[],
  partialQuery: string,
  keys: string[] = [],
  maxSuggestions = 5
): string[] {
  if (!partialQuery.trim()) return [];

  const suggestions = new Set<string>();
  const query = partialQuery.toLowerCase();

  for (const item of items) {
    const searchKeys = keys.length > 0 ? keys : Object.keys(item).filter(key =>
      typeof (item as any)[key] === 'string'
    );

    for (const key of searchKeys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (item as any)[key];
      if (typeof value !== 'string') continue;

      const words = value.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.startsWith(query) && word.length > query.length) {
          suggestions.add(word);
        }
      }
    }

    if (suggestions.size >= maxSuggestions) break;
  }

  return Array.from(suggestions).slice(0, maxSuggestions);
}