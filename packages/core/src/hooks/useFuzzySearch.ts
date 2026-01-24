import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FuseOptionKey } from 'fuse.js';
import { 
  FuzzySearch, 
  FuzzySearchOptions, 
  FuzzySearchResult, 
  createFuzzySearch,
  FuzzySearchPreset,
  FuzzySearchPresets
} from '../utils/fuzzy-search';

export interface UseFuzzySearchOptions<T> extends FuzzySearchOptions<T> {
  debounceMs?: number;
  minQueryLength?: number;
  preset?: FuzzySearchPreset;
}

export interface UseFuzzySearchReturn<T> {
  results: FuzzySearchResult<T>[];
  query: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
  totalResults: number;
  hasResults: boolean;
  clearSearch: () => void;
  setData: (data: T[]) => void;
  addItems: (items: T[]) => void;
  removeItems: (predicate: (item: T) => boolean) => void;
  stats: {
    totalItems: number;
    searchKeys: FuseOptionKey<T>[];
    threshold: number;
  };
}

/**
 * React hook for fuzzy search functionality with debouncing and state management
 */
export function useFuzzySearch<T>(
  initialData: T[],
  options: UseFuzzySearchOptions<T> = {}
): UseFuzzySearchReturn<T> {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    preset,
    ...fuzzyOptions
  } = options;

  // Apply preset if specified
  const finalOptions = useMemo(() => {
    if (preset && FuzzySearchPresets[preset]) {
      return { ...FuzzySearchPresets[preset], ...fuzzyOptions };
    }
    return fuzzyOptions;
  }, [preset, fuzzyOptions]);

  // State management
  const [query, setQueryState] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [data, setDataState] = useState<T[]>(initialData);

  // Create fuzzy search instance
  const fuzzySearch = useMemo(() => {
    return createFuzzySearch(data, finalOptions);
  }, [data, finalOptions]);

  // Debounce query updates
  useEffect(() => {
    if (query.length === 0) {
      setDebouncedQuery('');
      setIsSearching(false);
      return;
    }

    if (query.length < minQueryLength) {
      setDebouncedQuery('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, minQueryLength]);

  // Perform search
  const results = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      return data.map(item => ({ item }));
    }
    return fuzzySearch.search(debouncedQuery);
  }, [debouncedQuery, fuzzySearch, data, minQueryLength]);

  // Computed values
  const totalResults = results.length;
  const hasResults = totalResults > 0;

  // Callback functions
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
    setIsSearching(false);
  }, []);

  const setData = useCallback((newData: T[]) => {
    setDataState(newData);
  }, []);

  const addItems = useCallback((items: T[]) => {
    setDataState(prevData => [...prevData, ...items]);
  }, []);

  const removeItems = useCallback((predicate: (item: T) => boolean) => {
    setDataState(prevData => prevData.filter(item => !predicate(item)));
  }, []);

  const stats = useMemo(() => {
    const raw = fuzzySearch.getStats() as {
      totalItems?: number;
      searchKeys?: FuseOptionKey<T>[];
      threshold?: number;
    };
    return {
      totalItems: raw.totalItems ?? data.length,
      searchKeys: raw.searchKeys ?? [],
      threshold: raw.threshold ?? 0.3,
    };
  }, [fuzzySearch, data.length]);

  return {
    results,
    query,
    setQuery,
    isSearching,
    totalResults,
    hasResults,
    clearSearch,
    setData,
    addItems,
    removeItems,
    stats,
  };
}

/**
 * Simplified hook for basic fuzzy search without advanced features
 */
export function useSimpleFuzzySearch<T>(
  data: T[],
  query: string,
  options: FuzzySearchOptions<T> = {}
): FuzzySearchResult<T>[] {
  const fuzzySearch = useMemo(() => {
    return createFuzzySearch(data, options);
  }, [data, options]);

  return useMemo(() => {
    if (!query || query.length < 2) {
      return data.map(item => ({ item }));
    }
    return fuzzySearch.search(query);
  }, [query, fuzzySearch, data]);
}

/**
 * Hook for fuzzy search with custom filtering and sorting
 */
export function useAdvancedFuzzySearch<T>(
  data: T[],
  options: UseFuzzySearchOptions<T> & {
    filter?: (item: T, result: FuzzySearchResult<T>) => boolean;
    sort?: (a: FuzzySearchResult<T>, b: FuzzySearchResult<T>) => number;
    limit?: number;
  } = {}
): UseFuzzySearchReturn<T> & {
  filteredResults: FuzzySearchResult<T>[];
} {
  const { filter, sort, limit, ...searchOptions } = options;
  const searchResult = useFuzzySearch(data, searchOptions);

  const filteredResults = useMemo(() => {
    let results = searchResult.results;

    // Apply custom filter
    if (filter) {
      results = results.filter(result => filter(result.item, result));
    }

    // Apply custom sort
    if (sort) {
      results = [...results].sort(sort);
    }

    // Apply limit
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }, [searchResult.results, filter, sort, limit]);

  return {
    ...searchResult,
    filteredResults,
  };
}