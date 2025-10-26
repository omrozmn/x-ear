/**
 * Fuzzy Search Utility
 * Advanced search algorithm for product/inventory search
 * Migrated from legacy FuzzySearchUtil
 */

export interface FuzzySearchOptions {
  threshold?: number;
  maxDistance?: number;
  caseSensitive?: boolean;
  includeScore?: boolean;
  minLength?: number;
}

export interface FuzzySearchResult {
  item: any;
  score: number;
  matches: number[];
}

export class FuzzySearchUtil {
  private options: Required<FuzzySearchOptions>;

  constructor(options: FuzzySearchOptions = {}) {
    this.options = {
      threshold: options.threshold ?? 0.6,
      maxDistance: options.maxDistance ?? 3,
      caseSensitive: options.caseSensitive ?? false,
      includeScore: options.includeScore ?? true,
      minLength: options.minLength ?? 1
    };
  }

  /**
   * Search items using fuzzy matching algorithm
   */
  search(query: string, items: any[], searchFields: string[] = ['name', 'brand', 'model']): FuzzySearchResult[] {
    if (!query || query.length < this.options.minLength) {
      return items.map(item => ({
        item,
        score: 1,
        matches: []
      }));
    }

    const normalizedQuery = this.options.caseSensitive ? query : query.toLowerCase();
    const results: FuzzySearchResult[] = [];

    for (const item of items) {
      let bestScore = 0;
      let bestMatches: number[] = [];

      for (const field of searchFields) {
        const fieldValue = item[field];
        if (!fieldValue) continue;

        const normalizedField = this.options.caseSensitive ? fieldValue : fieldValue.toLowerCase();
        const score = this.calculateFuzzyScore(normalizedQuery, normalizedField);

        if (score > bestScore) {
          bestScore = score;
          bestMatches = this.findMatches(normalizedQuery, normalizedField);
        }
      }

      if (bestScore >= this.options.threshold) {
        results.push({
          item,
          score: bestScore,
          matches: bestMatches
        });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Calculate fuzzy matching score between query and text
   */
  private calculateFuzzyScore(query: string, text: string): number {
    if (query === text) return 1.0;

    const queryLen = query.length;
    const textLen = text.length;

    if (queryLen === 0) return 0;
    if (textLen === 0) return 0;

    // Exact substring match gets high score
    if (text.includes(query)) {
      return 0.9;
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(query, text);
    const maxLen = Math.max(queryLen, textLen);
    const similarity = 1 - (distance / maxLen);

    // Boost score for prefix matches
    if (text.startsWith(query)) {
      return Math.min(1.0, similarity + 0.2);
    }

    // Boost score for word boundary matches
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.toLowerCase().startsWith(query.toLowerCase())) {
        return Math.min(1.0, similarity + 0.15);
      }
    }

    return similarity;
  }

  /**
   * Find character positions where query matches in text
   */
  private findMatches(query: string, text: string): number[] {
    const matches: number[] = [];
    let queryIndex = 0;

    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i].toLowerCase() === query[queryIndex].toLowerCase()) {
        matches.push(i);
        queryIndex++;
      }
    }

    return matches;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

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
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Filter results by minimum score
   */
  filterByScore(results: FuzzySearchResult[], minScore: number): FuzzySearchResult[] {
    return results.filter(result => result.score >= minScore);
  }

  /**
   * Get top N results
   */
  getTopResults(results: FuzzySearchResult[], limit: number): FuzzySearchResult[] {
    return results.slice(0, limit);
  }
}

// React hook for fuzzy search
export const useFuzzySearch = (options?: FuzzySearchOptions) => {
  const fuzzySearch = new FuzzySearchUtil(options);

  const search = (query: string, items: any[], searchFields?: string[]) => {
    return fuzzySearch.search(query, items, searchFields);
  };

  return { search };
};