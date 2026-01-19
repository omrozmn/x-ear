/**
 * Party Cache Service
 * @fileoverview Handles party data caching and offline storage
 * @version 1.0.0
 */

import { Party } from '../../types/party';
import { indexedDBManager } from '../../utils/indexeddb';

export interface CacheStats {
  totalParties: number;
  lastUpdated: string | null;
  cacheSize: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of parties to cache
  priority?: 'high' | 'normal' | 'low';
}

export interface SimpleCacheFilters {
  search?: string;
  status?: string[];
  segment?: string[];
  tags?: string[];
  acquisitionType?: string[];
  page?: number;
  limit?: number;
}

export interface PartySearchResult {
  parties: PartySearchItem[];
  totalCount: number;
  filteredCount: number;
}

export interface PartySearchItem {
  id?: string;
  firstName: string;
  lastName: string;
  tcNumber: string;
  phone: string;
  email?: string;
  status?: string;
  segment?: string;
  registrationDate?: string;
  lastVisitDate?: string;
  deviceCount: number;
  hasInsurance: boolean;
  outstandingBalance: number;
  priority: number;
  labels?: string[]; // Optional labels array for compatibility
}

export class PartyCacheService {
  private readonly CACHE_PREFIX = 'party_cache_';
  private readonly METADATA_KEY = 'party_cache_metadata';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 10000;

  async cacheParties(parties: Party[], options: CacheOptions = {}): Promise<void> {
    try {
      // Store parties in IndexedDB
      await indexedDBManager.saveParties(parties);

      // Update cache metadata
      await this.updateCacheMetadata(parties.length);

      // Set individual cache entries with TTL
      const ttl = options.ttl || this.DEFAULT_TTL;
      const cachePromises = parties.map(party =>
        indexedDBManager.setCache(
          `${this.CACHE_PREFIX}${party.id}`,
          party,
          ttl
        )
      );

      await Promise.all(cachePromises);
    } catch (error) {
      console.error('Failed to cache parties:', error);
      throw error;
    }
  }

  async getCachedParty(partyId: string): Promise<Party | null> {
    try {
      // Try IndexedDB first
      const party = await indexedDBManager.getParty(partyId);
      if (party) {
        return party;
      }

      // Fallback to cache
      const cached = await indexedDBManager.getCache(`${this.CACHE_PREFIX}${partyId}`);
      if (!cached) return null;

      return cached as Party;
    } catch (error) {
      console.error(`Failed to get cached party ${partyId}:`, error);
      return null;
    }
  }

  async getCachedParties(): Promise<Party[]> {
    try {
      return await indexedDBManager.getParties();
    } catch (error) {
      console.error('Failed to get cached parties:', error);
      return [];
    }
  }

  async searchCachedParties(filters: SimpleCacheFilters): Promise<PartySearchResult> {
    try {
      const allParties = await this.getCachedParties();
      let filteredParties = [...allParties];

      // Apply filters
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredParties = filteredParties.filter(party =>
          party.firstName?.toLowerCase().includes(searchTerm) ||
          party.lastName?.toLowerCase().includes(searchTerm) ||
          party.phone?.includes(searchTerm) ||
          party.tcNumber?.includes(searchTerm) ||
          party.email?.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.status && filters.status.length > 0) {
        filteredParties = filteredParties.filter(party =>
          party.status && filters.status!.includes(party.status)
        );
      }

      if (filters.segment && filters.segment.length > 0) {
        filteredParties = filteredParties.filter(party =>
          party.segment && filters.segment!.includes(party.segment)
        );
      }

      if (filters.acquisitionType && filters.acquisitionType.length > 0) {
        filteredParties = filteredParties.filter(party =>
          party.acquisitionType && filters.acquisitionType!.includes(party.acquisitionType)
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredParties = filteredParties.filter(party =>
          party.tags?.some(tag => filters.tags!.includes(tag))
        );
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;
      const paginatedParties = filteredParties.slice(offset, offset + limit);

      // Convert to PartySearchItem format
      const searchItems: PartySearchItem[] = paginatedParties.map(party => ({
        id: party.id || '',
        firstName: party.firstName || '',
        lastName: party.lastName || '',
        tcNumber: party.tcNumber || '',
        phone: party.phone || '',
        email: party.email || '',
        status: party.status || 'active',
        segment: party.segment || 'NEW',
        registrationDate: party.createdAt || '',
        lastVisitDate: party.updatedAt || '',
        deviceCount: 0, // Device count would need to be fetched separately
        hasInsurance: !!(party.sgkInfo && typeof party.sgkInfo === 'object' && Object.keys(party.sgkInfo).length > 0),
        outstandingBalance: 0, // This would need to be calculated from actual data
        priority: party.priorityScore || 0,
        labels: (party.tags as string[]) || [] // Map tags to labels for compatibility
      }));

      return {
        parties: searchItems,
        totalCount: filteredParties.length,
        filteredCount: filteredParties.length
      };
    } catch (error) {
      console.error('Failed to search cached parties:', error);
      return {
        parties: [],
        totalCount: 0,
        filteredCount: 0
      };
    }
  }

  async updateCachedParty(party: Party): Promise<void> {
    try {
      await indexedDBManager.updateParty(party);
      await indexedDBManager.setCache(`${this.CACHE_PREFIX}${party.id}`, party);
    } catch (error) {
      console.error(`Failed to update cached party ${party.id}:`, error);
      throw error;
    }
  }

  async removeCachedParty(partyId: string): Promise<void> {
    try {
      await indexedDBManager.deleteParty(partyId);
      await indexedDBManager.deleteCache(`${this.CACHE_PREFIX}${partyId}`);
    } catch (error) {
      console.error(`Failed to remove cached party ${partyId}:`, error);
      throw error;
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    try {
      const parties = await this.getCachedParties();
      const metadata = await indexedDBManager.getCache(this.METADATA_KEY) as { lastUpdated?: string } | null;

      const stats: CacheStats = {
        totalParties: parties.length,
        lastUpdated: metadata?.lastUpdated || null,
        cacheSize: this.calculateCacheSize(parties),
        oldestEntry: null,
        newestEntry: null
      };

      if (parties.length > 0) {
        const partiesWithCreatedAt = parties.filter(p => p.createdAt);
        if (partiesWithCreatedAt.length > 0) {
          const sortedByCreated = [...partiesWithCreatedAt].sort((a, b) =>
            new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
          );
          stats.oldestEntry = sortedByCreated[0].createdAt!;
          stats.newestEntry = sortedByCreated[sortedByCreated.length - 1].createdAt!;
        }
      }

      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalParties: 0,
        lastUpdated: null,
        cacheSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  async clearCache(): Promise<void> {
    try {
      // Clear all parties from IndexedDB
      const parties = await this.getCachedParties();
      const deletePromises = parties
        .filter(party => party.id)
        .map(party => this.removeCachedParty(party.id!));

      await Promise.all(deletePromises);

      // Clear metadata
      await indexedDBManager.deleteCache(this.METADATA_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  async optimizeCache(): Promise<void> {
    try {
      const parties = await this.getCachedParties();

      // Remove old entries if cache is too large
      if (parties.length > this.MAX_CACHE_SIZE) {
        const partiesWithUpdatedAt = parties.filter(p => p.updatedAt);
        const sortedByUpdated = [...partiesWithUpdatedAt].sort((a, b) =>
          new Date(a.updatedAt!).getTime() - new Date(b.updatedAt!).getTime()
        );

        const toRemove = sortedByUpdated.slice(0, parties.length - this.MAX_CACHE_SIZE);
        const removePromises = toRemove
          .filter(party => party.id)
          .map(party => this.removeCachedParty(party.id!));

        await Promise.all(removePromises);
      }
    } catch (error) {
      console.error('Failed to optimize cache:', error);
    }
  }

  async isPartyCached(partyId: string): Promise<boolean> {
    try {
      const party = await this.getCachedParty(partyId);
      return party !== null;
    } catch (error) {
      console.error(`Failed to check if party ${partyId} is cached:`, error);
      return false;
    }
  }

  async preloadParties(partyIds: string[]): Promise<void> {
    // This would typically fetch parties from API and cache them
    // For now, it's a placeholder for the actual implementation
    console.log('Preloading parties:', partyIds);
  }

  private async updateCacheMetadata(partyCount: number): Promise<void> {
    try {
      const metadata = {
        lastUpdated: new Date().toISOString(),
        partyCount,
        version: '1.0.0'
      };

      await indexedDBManager.setCache(this.METADATA_KEY, metadata);
    } catch (error) {
      console.error('Failed to update cache metadata:', error);
    }
  }

  private calculateCacheSize(parties: Party[]): number {
    // Rough estimation of cache size in bytes
    const jsonString = JSON.stringify(parties);
    return new Blob([jsonString]).size;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }
}

export const partyCacheService = new PartyCacheService();