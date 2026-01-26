/**
 * Saved Queries Utilities
 * Manages saved search queries for party search functionality
 */

import { SAVED_VIEWS } from '../constants/storage-keys';

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  filters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  lastUsed?: Date;
  isDefault?: boolean;
  tags?: string[];
}

export interface SavedQueryOptions {
  maxQueries?: number;
  storageKey?: string;
}

const DEFAULT_OPTIONS: Required<SavedQueryOptions> = {
  maxQueries: 50,
  storageKey: SAVED_VIEWS
};

/**
 * Saved Queries Manager Class
 */
export class SavedQueriesManager {
  private options: Required<SavedQueryOptions>;

  constructor(options: SavedQueryOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Load all saved queries from localStorage
   */
  loadQueries(): SavedQuery[] {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (!stored) return [];

      const queries = JSON.parse(stored);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return queries.map((query: any) => ({
        ...query,
        createdAt: new Date(query.createdAt),
        updatedAt: new Date(query.updatedAt),
        lastUsed: query.lastUsed ? new Date(query.lastUsed) : undefined
      }));
    } catch (error) {
      console.error('Failed to load saved queries:', error);
      return [];
    }
  }

  /**
   * Save queries to localStorage
   */
  private saveQueries(queries: SavedQuery[]): void {
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(queries));
    } catch (error) {
      console.error('Failed to save queries:', error);
      throw new Error('Sorgu kaydedilemedi');
    }
  }

  /**
   * Create a new saved query
   */
  createQuery(
    name: string,
    query: string,
    filters: Record<string, unknown>,
    options: {
      description?: string;
      isDefault?: boolean;
      tags?: string[];
    } = {}
  ): SavedQuery {
    const queries = this.loadQueries();

    // Check if name already exists
    if (queries.some(q => q.name === name)) {
      throw new Error('Bu isimde bir sorgu zaten mevcut');
    }

    // Remove oldest queries if limit exceeded
    if (queries.length >= this.options.maxQueries) {
      queries.sort((a, b) => a.lastUsed?.getTime() || 0 - (b.lastUsed?.getTime() || 0));
      queries.splice(0, queries.length - this.options.maxQueries + 1);
    }

    const newQuery: SavedQuery = {
      id: this.generateId(),
      name,
      description: options.description,
      query,
      filters,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      isDefault: options.isDefault || false,
      tags: options.tags || []
    };

    queries.push(newQuery);
    this.saveQueries(queries);

    return newQuery;
  }

  /**
   * Update an existing query
   */
  updateQuery(id: string, updates: Partial<Omit<SavedQuery, 'id' | 'createdAt' | 'usageCount'>>): SavedQuery {
    const queries = this.loadQueries();
    const index = queries.findIndex(q => q.id === id);

    if (index === -1) {
      throw new Error('Sorgu bulunamadı');
    }

    const updatedQuery = {
      ...queries[index],
      ...updates,
      updatedAt: new Date()
    };

    queries[index] = updatedQuery;
    this.saveQueries(queries);

    return updatedQuery;
  }

  /**
   * Delete a saved query
   */
  deleteQuery(id: string): void {
    const queries = this.loadQueries();
    const filteredQueries = queries.filter(q => q.id !== id);

    if (filteredQueries.length === queries.length) {
      throw new Error('Sorgu bulunamadı');
    }

    this.saveQueries(filteredQueries);
  }

  /**
   * Get a specific query by ID
   */
  getQuery(id: string): SavedQuery | null {
    const queries = this.loadQueries();
    return queries.find(q => q.id === id) || null;
  }

  /**
   * Use a saved query (increment usage count and update last used)
   */
  useQuery(id: string): SavedQuery {
    const queries = this.loadQueries();
    const index = queries.findIndex(q => q.id === id);

    if (index === -1) {
      throw new Error('Sorgu bulunamadı');
    }

    queries[index].usageCount++;
    queries[index].lastUsed = new Date();

    this.saveQueries(queries);
    return queries[index];
  }

  /**
   * Get queries sorted by usage frequency
   */
  getPopularQueries(limit = 10): SavedQuery[] {
    const queries = this.loadQueries();
    return queries
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get recently used queries
   */
  getRecentQueries(limit = 10): SavedQuery[] {
    const queries = this.loadQueries();
    return queries
      .filter(q => q.lastUsed)
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, limit);
  }

  /**
   * Get default queries
   */
  getDefaultQueries(): SavedQuery[] {
    const queries = this.loadQueries();
    return queries.filter(q => q.isDefault);
  }

  /**
   * Search queries by name or description
   */
  searchQueries(searchTerm: string): SavedQuery[] {
    const queries = this.loadQueries();
    const term = searchTerm.toLowerCase();

    return queries.filter(q =>
      q.name.toLowerCase().includes(term) ||
      (q.description && q.description.toLowerCase().includes(term)) ||
      (q.tags && q.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }

  /**
   * Export queries as JSON
   */
  exportQueries(): string {
    const queries = this.loadQueries();
    return JSON.stringify(queries, null, 2);
  }

  /**
   * Import queries from JSON
   */
  importQueries(jsonData: string, options: { merge?: boolean } = {}): void {
    try {
      const importedQueries: SavedQuery[] = JSON.parse(jsonData);

      if (!Array.isArray(importedQueries)) {
        throw new Error('Geçersiz format');
      }

      const existingQueries = options.merge ? this.loadQueries() : [];
      const allQueries = [...existingQueries];

      for (const query of importedQueries) {
        // Validate query structure
        if (!query.id || !query.name || !query.query) {
          continue;
        }

        // Check for duplicates
        const existingIndex = allQueries.findIndex(q => q.id === query.id);
        if (existingIndex !== -1) {
          allQueries[existingIndex] = {
            ...query,
            createdAt: new Date(query.createdAt),
            updatedAt: new Date(query.updatedAt),
            lastUsed: query.lastUsed ? new Date(query.lastUsed) : undefined
          };
        } else {
          allQueries.push({
            ...query,
            createdAt: new Date(query.createdAt),
            updatedAt: new Date(query.updatedAt),
            lastUsed: query.lastUsed ? new Date(query.lastUsed) : undefined
          });
        }
      }

      this.saveQueries(allQueries);
    } catch (error) {
      console.error('Failed to import queries:', error);
      throw new Error('Sorgu içe aktarma başarısız');
    }
  }

  /**
   * Clear all saved queries
   */
  clearAllQueries(): void {
    localStorage.removeItem(this.options.storageKey);
  }

  /**
   * Generate unique ID for queries
   */
  private generateId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default instance
export const savedQueriesManager = new SavedQueriesManager();

// Utility functions for common operations
export const savedQueries = {
  load: () => savedQueriesManager.loadQueries(),
  create: (name: string, query: string, filters: Record<string, unknown>, options: { description?: string, isDefault?: boolean, tags?: string[] } = {}) =>
    savedQueriesManager.createQuery(name, query, filters, options),
  update: (id: string, updates: Partial<Omit<SavedQuery, 'id' | 'createdAt' | 'usageCount'>>) => savedQueriesManager.updateQuery(id, updates),
  delete: (id: string) => savedQueriesManager.deleteQuery(id),
  use: (id: string) => savedQueriesManager.useQuery(id),
  getPopular: (limit?: number) => savedQueriesManager.getPopularQueries(limit),
  getRecent: (limit?: number) => savedQueriesManager.getRecentQueries(limit),
  search: (term: string) => savedQueriesManager.searchQueries(term)
};