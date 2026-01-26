import { useState, useMemo, useCallback } from 'react';

interface FuzzySearchOptions {
  threshold?: number;
  maxDistance?: number;
  caseSensitive?: boolean;
  includeScore?: boolean;
  minLength?: number;
  keys?: string[];
}

interface SearchResult<T> {
  item: T;
  score: number;
  matches: Array<{
    key: string;
    value: string;
    indices: number[][];
  }>;
}

export function useFuzzySearch<T>(
  items: T[],
  options: FuzzySearchOptions = {}
) {
  const {
    threshold = 0.6,
    maxDistance = 3,
    caseSensitive = false,
    minLength = 1,
    keys = []
  } = options;

  const [query, setQuery] = useState('');

  // Levenshtein distance calculation
  const levenshteinDistance = useCallback((str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }, []);

  // Calculate fuzzy score
  const calculateScore = useCallback((searchText: string, targetText: string): number => {
    if (!searchText || !targetText) return 0;

    const search = caseSensitive ? searchText : searchText.toLowerCase();
    const target = caseSensitive ? targetText : targetText.toLowerCase();

    // Exact match gets highest score
    if (search === target) return 1;

    // Substring match gets high score
    if (target.includes(search)) {
      return 0.8 - (search.length / target.length) * 0.2;
    }

    // Fuzzy match using Levenshtein distance
    const distance = levenshteinDistance(search, target);
    const maxLength = Math.max(search.length, target.length);

    if (distance > maxDistance) return 0;

    return Math.max(0, 1 - (distance / maxLength));
  }, [caseSensitive, levenshteinDistance, maxDistance]);

  // Get searchable text from item
  const getSearchableText = useCallback((item: T, key?: string): string => {
    if (!item) return '';

    if (key) {
      const value = (item as Record<string, unknown>)[key];
      return typeof value === 'string' ? value : String(value || '');
    }

    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      return Object.values(item).join(' ');
    }

    return String(item);
  }, []);

  // Perform fuzzy search
  const searchResults = useMemo(() => {
    if (!query || query.length < minLength) {
      return items.map(item => ({
        item,
        score: 1,
        matches: []
      }));
    }

    const results: SearchResult<T>[] = [];

    items.forEach(item => {
      let bestScore = 0;
      const matches: SearchResult<T>['matches'] = [];

      if (keys.length > 0) {
        // Search in specified keys
        keys.forEach(key => {
          const text = getSearchableText(item, key);
          const score = calculateScore(query, text);

          if (score > bestScore) {
            bestScore = score;
          }

          if (score >= threshold) {
            matches.push({
              key,
              value: text,
              indices: [] // Could be enhanced to show match positions
            });
          }
        });
      } else {
        // Search in entire item
        const text = getSearchableText(item);
        bestScore = calculateScore(query, text);

        if (bestScore >= threshold) {
          matches.push({
            key: 'all',
            value: text,
            indices: []
          });
        }
      }

      if (bestScore >= threshold) {
        results.push({
          item,
          score: bestScore,
          matches
        });
      }
    });

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }, [items, query, keys, threshold, minLength, getSearchableText, calculateScore]);

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    results: searchResults,
    search,
    clearSearch,
    hasResults: searchResults.length > 0,
    isEmpty: !query || query.length < minLength
  };
}

export type { SearchResult, FuzzySearchOptions };