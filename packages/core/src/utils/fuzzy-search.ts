import Fuse, { IFuseOptions, FuseResult } from 'fuse.js';

export interface FuzzySearchOptions<T> extends IFuseOptions<T> {
  // Additional custom options can be added here
}

export interface FuzzySearchResult<T> {
  item: T;
  score?: number;
  matches?: FuseResult<T>['matches'];
}

export class FuzzySearch<T> {
  private fuse: Fuse<T>;
  private originalData: T[];
  private options: FuzzySearchOptions<T>;

  constructor(data: T[], options: FuzzySearchOptions<T> = {}) {
    this.originalData = data;
    
    // Default options optimized for performance and accuracy
    const defaultOptions: FuzzySearchOptions<T> = {
      threshold: 0.3, // Lower = more strict matching
      distance: 100, // Maximum distance for fuzzy matching
      minMatchCharLength: 2, // Minimum character length to trigger search
      findAllMatches: false, // Stop at first match for performance
      includeScore: true,
      includeMatches: true,
      shouldSort: true,
      ...options,
    };

    this.options = defaultOptions;
    this.fuse = new Fuse(data, defaultOptions);
  }

  /**
   * Perform fuzzy search on the data
   */
  search(query: string): FuzzySearchResult<T>[] {
    if (!query || query.length < 2) {
      return this.originalData.map(item => ({ item }));
    }

    const results = this.fuse.search(query);
    return results.map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches,
    }));
  }

  /**
   * Update the search data
   */
  setData(data: T[]): void {
    this.originalData = data;
    this.fuse.setCollection(data);
  }

  /**
   * Add new items to the search data
   */
  addItems(items: T[]): void {
    this.originalData = [...this.originalData, ...items];
    this.fuse.setCollection(this.originalData);
  }

  /**
   * Remove items from the search data
   */
  removeItems(predicate: (item: T) => boolean): void {
    this.originalData = this.originalData.filter(item => !predicate(item));
    this.fuse.setCollection(this.originalData);
  }

  /**
   * Get all original data
   */
  getAllData(): T[] {
    return this.originalData;
  }

  /**
   * Get search statistics
   */
  getStats() {
    return {
      totalItems: this.originalData.length,
      searchKeys: this.options.keys ?? [],
      threshold: this.options.threshold ?? 0.3,
    };
  }
}

/**
 * Factory function for creating fuzzy search instances
 */
export function createFuzzySearch<T>(
  data: T[],
  options: FuzzySearchOptions<T> = {}
): FuzzySearch<T> {
  return new FuzzySearch(data, options);
}

/**
 * Simple utility function for one-off searches
 */
export function fuzzySearch<T>(
  data: T[],
  query: string,
  options: FuzzySearchOptions<T> = {}
): FuzzySearchResult<T>[] {
  const searcher = new FuzzySearch(data, options);
  return searcher.search(query);
}

/**
 * Predefined search configurations for common use cases
 */
export const FuzzySearchPresets = {
  // For searching user names, titles, etc.
  strict: {
    threshold: 0.2,
    distance: 50,
    minMatchCharLength: 3,
  },
  
  // For general purpose searching
  balanced: {
    threshold: 0.3,
    distance: 100,
    minMatchCharLength: 2,
  },
  
  // For very lenient searching
  lenient: {
    threshold: 0.6,
    distance: 200,
    minMatchCharLength: 1,
  },
  
  // For exact matching with typo tolerance
  exactWithTypos: {
    threshold: 0.1,
    distance: 20,
    minMatchCharLength: 3,
    findAllMatches: true,
  },
} as const;

export type FuzzySearchPreset = keyof typeof FuzzySearchPresets;