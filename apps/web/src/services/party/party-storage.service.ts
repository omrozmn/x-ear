import type { Party as OrvalParty } from '../../types/party';
import { PartyFilters, PartySearchResult, PartySearchItem, PartyStatus, PartySegment } from '../../types/party';
import { indexedDBManager } from '../../utils/indexeddb';

/**
 * Party Storage Service
 * Handles IndexedDB operations for party data with offline-first approach
 * Follows 500 LOC limit and single responsibility principle
 */
export class PartyStorageService {
  private readonly CACHE_KEY_PREFIX = 'party_';

  constructor() {
    // Initialize IndexedDB manager
    this.init();
  }

  /**
   * Initialize IndexedDB for party storage
   */
  async init(): Promise<void> {
    await indexedDBManager.init();
  }

  /**
   * Store parties in IndexedDB
   */
  async storeParties(parties: OrvalParty[]): Promise<void> {
    await indexedDBManager.saveParties(parties);
  }

  /**
   * Get all parties from IndexedDB
   */
  async getAllParties(): Promise<OrvalParty[]> {
    return await indexedDBManager.getParties();
  }

  /**
   * Get party by ID from IndexedDB
   */
  async getPartyById(id: string): Promise<OrvalParty | null> {
    const parties = await this.getAllParties();
    return parties.find(p => p.id === id) || null;
  }

  /**
   * Search parties with filters
   */
  async searchParties(filters: PartyFilters): Promise<PartySearchResult> {
    const allParties = await this.getAllParties();
    let filteredParties = allParties;

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredParties = filteredParties.filter(party =>
        party.firstName?.toLowerCase().includes(searchTerm) ||
        party.lastName?.toLowerCase().includes(searchTerm) ||
        (party.phone && party.phone.includes(searchTerm)) ||
        party.tcNumber?.includes(searchTerm) ||
        party.email?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filteredParties = filteredParties.filter(party => party.status && filters.status!.includes(party.status as PartyStatus));
    }

    // Apply segment filter
    if (filters.segment && filters.segment.length > 0) {
      filteredParties = filteredParties.filter(party => party.segment && filters.segment!.includes(party.segment as PartySegment));
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedParties = filteredParties.slice(startIndex, endIndex);

    return {
      parties: paginatedParties as unknown as PartySearchItem[],
      total: allParties.length,
      totalCount: allParties.length,
      filteredCount: filteredParties.length,
      page,
      pageSize: limit,
      hasMore: endIndex < filteredParties.length
    };
  }

  /**
   * Update party in IndexedDB
   */
  async updateParty(party: OrvalParty): Promise<void> {
    const parties = await this.getAllParties();
    const index = parties.findIndex(p => p.id === party.id);

    if (index >= 0) {
      parties[index] = { ...party, updatedAt: new Date().toISOString() };
    } else {
      parties.push({ ...party, updatedAt: new Date().toISOString() });
    }

    await this.storeParties(parties);
  }

  /**
   * Delete party from IndexedDB
   */
  async deleteParty(id: string): Promise<void> {
    const parties = await this.getAllParties();
    const filteredParties = parties.filter(p => p.id !== id);
    await this.storeParties(filteredParties);
  }

  /**
   * Clear all parties from IndexedDB
   */
  async clearAllParties(): Promise<void> {
    await this.storeParties([]);
  }

  /**
   * Get party count
   */
  async getPartyCount(): Promise<number> {
    const parties = await this.getAllParties();
    return parties.length;
  }

  /**
   * Check if party exists
   */
  async partyExists(id: string): Promise<boolean> {
    const party = await this.getPartyById(id);
    return party !== null;
  }

  /**
   * Cache party data with TTL
   */
  async cachePartyData(key: string, data: unknown, ttl?: number): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
    await indexedDBManager.setCache(cacheKey, data, ttl);
  }

  /**
   * Get cached party data
   */
  async getCachedPartyData(key: string): Promise<unknown | null> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
    return await indexedDBManager.getCache(cacheKey);
  }

  /**
   * Clear cached party data
   */
  async clearCachedPartyData(key: string): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
    await indexedDBManager.deleteCache(cacheKey);
  }
}