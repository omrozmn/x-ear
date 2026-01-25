import { SEARCH_ANALYTICS } from '../constants/storage-keys';

interface SearchAnalytics {
  query: string;
  timestamp: number;
  resultCount: number;
  searchType: 'basic' | 'fuzzy';
  executionTime: number;
  selectedResult?: string;
  userAction?: 'click' | 'select' | 'dismiss';
  context: string; // e.g., 'inventory', 'products', 'parties'
}

interface SearchPerformanceMetrics {
  averageExecutionTime: number;
  totalSearches: number;
  fuzzySearchUsage: number;
  basicSearchUsage: number;
  popularQueries: Array<{ query: string; count: number }>;
  clickThroughRate: number;
  noResultsRate: number;
}

class SearchAnalyticsService {
  private analytics: SearchAnalytics[] = [];
  private readonly STORAGE_KEY = SEARCH_ANALYTICS;
  private readonly MAX_ENTRIES = 1000;

  constructor() {
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.analytics = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load search analytics:', error);
      this.analytics = [];
    }
  }

  private saveAnalytics(): void {
    try {
      // Keep only the most recent entries
      if (this.analytics.length > this.MAX_ENTRIES) {
        this.analytics = this.analytics.slice(-this.MAX_ENTRIES);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.analytics));
    } catch (error) {
      console.warn('Failed to save search analytics:', error);
    }
  }

  trackSearch(params: {
    query: string;
    resultCount: number;
    searchType: 'basic' | 'fuzzy';
    executionTime: number;
    context: string;
  }): string {
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const analytics: SearchAnalytics = {
      ...params,
      timestamp: Date.now(),
    };

    this.analytics.push(analytics);
    this.saveAnalytics();
    
    return searchId;
  }

  trackUserAction(query: string, action: 'click' | 'select' | 'dismiss', selectedResult?: string): void {
    // Find the most recent search with this query
    const recentSearch = [...this.analytics]
      .reverse()
      .find(a => a.query === query && Date.now() - a.timestamp < 300000); // 5 minutes

    if (recentSearch) {
      recentSearch.userAction = action;
      recentSearch.selectedResult = selectedResult;
      this.saveAnalytics();
    }
  }

  getPerformanceMetrics(context?: string, timeRange?: { start: number; end: number }): SearchPerformanceMetrics {
    let filteredAnalytics = this.analytics;

    // Filter by context if provided
    if (context) {
      filteredAnalytics = filteredAnalytics.filter(a => a.context === context);
    }

    // Filter by time range if provided
    if (timeRange) {
      filteredAnalytics = filteredAnalytics.filter(
        a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    if (filteredAnalytics.length === 0) {
      return {
        averageExecutionTime: 0,
        totalSearches: 0,
        fuzzySearchUsage: 0,
        basicSearchUsage: 0,
        popularQueries: [],
        clickThroughRate: 0,
        noResultsRate: 0,
      };
    }

    const totalSearches = filteredAnalytics.length;
    const fuzzySearches = filteredAnalytics.filter(a => a.searchType === 'fuzzy').length;
    const basicSearches = filteredAnalytics.filter(a => a.searchType === 'basic').length;
    const searchesWithActions = filteredAnalytics.filter(a => a.userAction).length;
    const noResultSearches = filteredAnalytics.filter(a => a.resultCount === 0).length;

    // Calculate popular queries
    const queryCount = new Map<string, number>();
    filteredAnalytics.forEach(a => {
      const count = queryCount.get(a.query) || 0;
      queryCount.set(a.query, count + 1);
    });

    const popularQueries = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      averageExecutionTime: filteredAnalytics.reduce((sum, a) => sum + a.executionTime, 0) / totalSearches,
      totalSearches,
      fuzzySearchUsage: (fuzzySearches / totalSearches) * 100,
      basicSearchUsage: (basicSearches / totalSearches) * 100,
      popularQueries,
      clickThroughRate: (searchesWithActions / totalSearches) * 100,
      noResultsRate: (noResultSearches / totalSearches) * 100,
    };
  }

  getSearchTrends(context?: string, days: number = 7): Array<{
    date: string;
    searches: number;
    fuzzySearches: number;
    basicSearches: number;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    let filteredAnalytics = this.analytics.filter(
      a => a.timestamp >= startDate.getTime() && a.timestamp <= endDate.getTime()
    );

    if (context) {
      filteredAnalytics = filteredAnalytics.filter(a => a.context === context);
    }

    const trends: Map<string, { searches: number; fuzzySearches: number; basicSearches: number }> = new Map();

    // Initialize all dates in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      trends.set(dateKey, { searches: 0, fuzzySearches: 0, basicSearches: 0 });
    }

    // Aggregate data by date
    filteredAnalytics.forEach(a => {
      const date = new Date(a.timestamp).toISOString().split('T')[0];
      const existing = trends.get(date);
      if (existing) {
        existing.searches++;
        if (a.searchType === 'fuzzy') {
          existing.fuzzySearches++;
        } else {
          existing.basicSearches++;
        }
      }
    });

    return Array.from(trends.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  clearAnalytics(): void {
    this.analytics = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  exportAnalytics(): string {
    return JSON.stringify(this.analytics, null, 2);
  }
}

export const searchAnalytics = new SearchAnalyticsService();
export type { SearchAnalytics, SearchPerformanceMetrics };