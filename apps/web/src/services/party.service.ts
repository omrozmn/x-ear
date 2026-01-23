import {
  PartyFilters,
  PartySearchResult,
  PartyStats,
  PartyDevice,
  PartyNote,
  PartyMatchCandidate,
  PartyMatchRequest,
  Communication,
  Party,
  DateRange
} from '../types/party';
import {
  PartyRead as OrvalParty,
  PartyCreate,
  PartyUpdate,
  ListPartiesParams
} from "@/api/generated/schemas";
import {
  listParties,
  // getParty, // Not used in this file
  createParty,
  updateParty,
  deleteParty
} from "@/api/client/parties.client";
// import { outbox } from '../utils/outbox'; // Not used
import { PARTYS_DATA } from '../constants/storage-keys';
import { indexedDBManager } from '../utils/indexeddb';
// import { AxiosResponse } from 'axios'; // Not used
import { convertOrvalToLegacyParty } from '../types/party/party-adapter';

export class PartyService {
  private parties: Party[] = [];
  private initialized = false;

  constructor() {
    // Don't initialize in constructor - wait for first use
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    // Initialize IndexedDB
    await indexedDBManager.init();

    await this.loadParties();
    this.initialized = true;

    // Listen for storage changes (localStorage fallback only)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  // Ensure initialization before any operation
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === PARTYS_DATA) {
      this.loadParties();
    }
  }

  // Data persistence
  private async loadParties(): Promise<void> {
    // First try to load from IndexedDB cache
    try {
      const cachedParties = await indexedDBManager.getParties();
      if (cachedParties.length > 0) {
        this.parties = cachedParties;

        // Optionally refresh from API in background
        this.refreshFromAPI().catch(error =>
          console.warn('Background API refresh failed:', error)
        );
        return;
      }
    } catch (error) {
      console.warn('Failed to load from IndexedDB, trying API:', error);
    }

    // If no cache, load from API regardless of manual token check. 
    // The apiClient interceptor handles auth headers and 401 retries automatically.
    try {
      await this.refreshFromAPI();
    } catch (err) {
      console.warn('Party API refresh attempt failed', err);
    }
  }

  private async refreshFromAPI(): Promise<void> {
    // Try to page through backend API and aggregate parties into IndexedDB cache.
    // If anything fails, fall back to localStorage.
    try {
      const aggregated: Party[] = [];
      let cursor: string | undefined;
      const perPage = 100;

      // Use cursor-based pagination for better performance with large datasets
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Call generated API client with proper typing
        const params: ListPartiesParams = { per_page: perPage };
        if (cursor) {
          params.cursor = cursor;
        }


        // Orval's customInstance now returns the data directly (unwrapped)
        const payload = await listParties(params);
        if (!payload || !Array.isArray(payload.data)) break;

        const chunk = payload.data || [];
        // Map Orval party to local party (handle nulls)
        const mappedChunk = chunk.map(p => ({
          ...p,
          tcNumber: p.tcNumber || p.identityNumber || undefined
        }));
        aggregated.push(...mappedChunk as unknown as Party[]);

        // Check if there are more pages using cursor-based pagination
        // ResponseEnvelopeListPartyRead has 'meta' for pagination info
        const meta = payload.meta;
        if (!meta?.hasNext || !meta?.nextCursor) {
          break;
        }

        cursor = meta.nextCursor;

        // Safety check to prevent infinite loops
        if (chunk.length === 0) break;
      }

      if (aggregated.length > 0) {
        // Use Party directly
        this.parties = aggregated;

        // Cache in IndexedDB
        await indexedDBManager.saveParties(aggregated);
      }
    } catch (error) {
      console.warn('API refresh failed, trying localStorage fallback:', error);

      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(PARTYS_DATA);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.parties = Array.isArray(parsed) ? parsed : [];
        }
      } catch (fallbackError) {
        console.error('Both API and localStorage failed:', fallbackError);
        this.parties = [];
      }
    }
  }

  private async saveParties(): Promise<void> {
    try {
      // Save to IndexedDB as primary cache
      await indexedDBManager.saveParties(this.parties);

      // Keep a small fallback in localStorage (just metadata, not full data)
      const metadata = {
        count: this.parties.length,
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      await indexedDBManager.saveFallbackToLocalStorage(PARTYS_DATA + '_meta', metadata);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('parties:updated', {
        detail: { parties: this.parties }
      }));
    } catch (error) {
      console.error('Failed to save parties to IndexedDB:', error);

      // Emergency fallback to localStorage (should be avoided)
      try {
        await indexedDBManager.saveFallbackToLocalStorage(PARTYS_DATA, this.parties);
        console.warn('Used localStorage emergency fallback for party data');
      } catch (fallbackError) {
        console.error('Failed to save parties even to localStorage fallback:', fallbackError);
      }
    }
  }

  // CRUD Operations
  async createParty(partyData: Omit<Party, 'id' | 'createdAt' | 'updatedAt'>): Promise<Party> {
    await this.ensureInitialized();
    try {

      // Validate required fields (TC number is optional per DB schema)
      if (!partyData.firstName?.trim()) {
        throw new Error('First name is required');
      }
      if (!partyData.lastName?.trim()) {
        throw new Error('Last name is required');
      }
      if (!partyData.phone?.trim()) {
        throw new Error('Party phone is required');
      }

      // Validate TC number if provided
      if (partyData.tcNumber) {
        const isValidTc = await this.validateTcNumber(partyData.tcNumber);
        if (!isValidTc) {
          throw new Error('TC number already exists');
        }
      }

      // **CRITICAL: POST to backend API first!**
      // Note: We cast to PartyCreate because frontend Party type might satisfy it
      const response = await createParty(partyData as unknown as PartyCreate);

      // Extract data from wrapper if it exists, otherwise use response directly
      // Orval response is typed as ResponseEnvelopePartyRead
      const userData = response?.data;

      if (!userData) {
        throw new Error('Failed to create party on server');
      }

      const createdParty = convertOrvalToLegacyParty(userData);

      // Update local cache
      this.parties.push(createdParty);
      this.saveParties();

      // Dispatch events for UI update
      window.dispatchEvent(new CustomEvent('party:created', {
        detail: { party: createdParty }
      }));

      return createdParty;
    } catch (error) {
      console.error('Failed to create party:', error);
      throw error instanceof Error ? error : new Error('Failed to create party');
    }
  }

  async updateParty(id: string, updates: Partial<Party>): Promise<Party | null> {
    await this.ensureInitialized();
    try {

      if (!id?.trim()) {
        throw new Error('Party ID is required');
      }

      const index = this.parties.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Party not found');
      }

      // Validate TC number if being updated
      if (updates.tcNumber && updates.tcNumber !== this.parties[index].tcNumber) {
        const isValidTc = await this.validateTcNumber(updates.tcNumber, id);
        if (!isValidTc) {
          throw new Error('TC number already exists');
        }
      }

      // **CRITICAL: PUT to backend API first!**
      const response = await updateParty(id, updates as unknown as PartyUpdate);

      // Extract data from wrapper if it exists, otherwise use response directly
      const userData = response?.data;

      if (!userData) {
        throw new Error('Failed to update party on server');
      }

      const updatedParty = convertOrvalToLegacyParty(userData);

      // Update local cache
      this.parties[index] = updatedParty;
      this.saveParties();

      // Dispatch events for UI update
      window.dispatchEvent(new CustomEvent('party:updated', {
        detail: { party: updatedParty }
      }));

      return updatedParty;
    } catch (error) {
      console.error('Failed to update party:', error);
      throw error instanceof Error ? error : new Error('Failed to update party');
    }
  }

  async deleteParty(id: string): Promise<boolean> {
    await this.ensureInitialized();
    try {

      if (!id?.trim()) {
        throw new Error('Party ID is required');
      }

      const index = this.parties.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Party not found');
        // Check for success (ResponseEnvelope usually has success field, or check status if full response)
        // Assuming response has success field or we treat absence of error as success
        // const success = response?.success ?? true;

        // if (!success) {
        //   throw new Error('Failed to delete party from server');
        // }
      }

      const party = this.parties[index];

      // **CRITICAL: DELETE from backend API first!**
      // Function returns unknown/void on success (204 or empty 200)
      // Axios will throw if status is 4xx or 5xx
      await deleteParty(id);

      // Remove from local cache
      this.parties.splice(index, 1);
      this.saveParties();

      // Dispatch events for UI update
      window.dispatchEvent(new CustomEvent('party:deleted', {
        detail: { id, party }
      }));

      return true;
    } catch (error) {
      console.error('Failed to delete party:', error);
      throw error instanceof Error ? error : new Error('Failed to delete party');
    }
  }

  // Query operations
  async getParty(id: string): Promise<Party | null> {
    await this.ensureInitialized();
    try {

      if (!id?.trim()) {
        return null;
      }

      return this.parties.find(p => p.id === id) || null;
    } catch (error) {
      console.error('Failed to get party:', error);
      return null;
    }
  }

  async getParties(filters: PartyFilters = {}): Promise<PartySearchResult> {
    await this.ensureInitialized();
    try {

      let filteredParties = [...this.parties];

      // Apply filters with error handling
      if (filters.search?.trim()) {
        const searchLower = filters.search.toLowerCase();
        filteredParties = filteredParties.filter(p =>
          (p.firstName && p.firstName.toLowerCase().includes(searchLower)) ||
          (p.lastName && p.lastName.toLowerCase().includes(searchLower)) ||
          (p.phone && String(p.phone).toLowerCase().includes(searchLower)) ||
          (p.tcNumber && String(p.tcNumber).toLowerCase().includes(searchLower)) ||
          (p.email && p.email.toLowerCase().includes(searchLower))
        );
      }

      if (filters.status) {
        filteredParties = filteredParties.filter(p => p.status === filters.status);
      }

      if (filters.segment) {
        filteredParties = filteredParties.filter(p => p.segment === filters.segment);
      }

      if (filters.acquisitionType) {
        filteredParties = filteredParties.filter(p => p.acquisitionType === filters.acquisitionType);
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredParties = filteredParties.filter(p =>
          p.tags && filters.tags!.some(tag => p.tags!.includes(tag))
        );
      }

      const f = filters as Record<string, unknown>;
      if (filters.registrationDateRange || f.dateRange) {
        try {
          const range = filters.registrationDateRange || (f.dateRange as DateRange);
          if (range.start && range.end) {
            const start = new Date(range.start);
            const end = new Date(range.end);
            filteredParties = filteredParties.filter(p => {
              if (!p.createdAt) return false;
              const created = new Date(p.createdAt);
              return created >= start && created <= end;
            });
          }
        } catch (e) {
          console.error('Date range filter error:', e);
        }
      }

      // Sort by creation date (newest first)
      filteredParties.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      // Apply pagination
      const page = filters.page || 1;
      const pageSize = filters.limit || 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedParties = filteredParties.slice(startIndex, endIndex);
      const hasMore = endIndex < filteredParties.length;

      return {
        parties: paginatedParties as unknown as Party[],
        total: filteredParties.length,
        totalCount: this.parties.length,
        filteredCount: filteredParties.length,
        page: page,
        pageSize: pageSize,
        hasMore: hasMore
      };
    } catch (error) {
      console.error('Failed to get parties:', error);
      return {
        parties: [],
        total: 0,
        totalCount: 0,
        filteredCount: 0,
        page: 1,
        pageSize: 0,
        hasMore: false
      };
    }
  }

  async getPartyStats(): Promise<PartyStats> {
    await this.ensureInitialized();
    try {

      const stats: PartyStats = {
        total: this.parties.length,
        totalParties: this.parties.length,
        activeParties: this.parties.filter(p => p.status === 'active' || p.status === 'ACTIVE').length,
        newThisMonth: 0, // Placeholder
        withDevices: 0, // Placeholder
        withInsurance: 0, // Placeholder
        averageAge: 0, // Placeholder
        topCities: [],
        statusDistribution: [],
        segmentDistribution: [],
        byStatus: {},
        bySegment: {}
      };

      this.parties.forEach(party => {
        try {
          // Status counts
          if (party.status) {
            stats.byStatus[party.status] = (stats.byStatus[party.status] || 0) + 1;
          }

          // Segment counts
          if (party.segment) {
            stats.bySegment[party.segment] = (stats.bySegment[party.segment] || 0) + 1;
          }
        } catch (error) {
          console.warn('Error processing party stats for party:', party.id, error);
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get party stats:', error);
      // Return empty stats on error
      return {
        total: 0,
        totalParties: 0,
        activeParties: 0,
        newThisMonth: 0,
        withDevices: 0,
        withInsurance: 0,
        averageAge: 0,
        topCities: [],
        statusDistribution: [],
        segmentDistribution: [],
        byStatus: {},
        bySegment: {}
      };
    }
  }

  // Party matching for OCR/document processing
  async findMatches(request: PartyMatchRequest): Promise<PartyMatchCandidate[]> {
    await this.init();

    const candidates: PartyMatchCandidate[] = [];

    for (const party of this.parties) {
      const matchResult = this.calculatePartyMatch(request, party);
      if (matchResult.score > 0.3) { // Minimum threshold
        candidates.push(matchResult);
      }
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, 10); // Return top 10 matches
  }

  private calculatePartyMatch(request: PartyMatchRequest, party: Party): PartyMatchCandidate {
    let score = 0;
    const matchedFields: string[] = [];

    // Exact TC number match (highest priority)
    if (request.tcNo && party.tcNumber && request.tcNo === party.tcNumber) {
      score += 0.8;
      matchedFields.push('tcNumber');
    }

    // Name similarity
    if (request.name && (party.firstName || party.lastName)) {
      const partyName = `${party.firstName || ''} ${party.lastName || ''}`.trim();
      const nameSimilarity = this.calculateStringSimilarity(request.name, partyName);
      if (nameSimilarity > 0.6) {
        score += nameSimilarity * 0.4;
        matchedFields.push('name');
      }
    }

    // Birth date match
    if (request.birthDate && party.birthDate) {
      if (request.birthDate === party.birthDate) {
        score += 0.3;
        matchedFields.push('birthDate');
      }
    }

    // Phone number match
    if (request.phone && party.phone) {
      const phoneSimilarity = this.calculateStringSimilarity(request.phone, party.phone);
      if (phoneSimilarity > 0.8) {
        score += phoneSimilarity * 0.2;
        matchedFields.push('phone');
      }
    }

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (score >= 0.8) confidence = 'high';
    else if (score >= 0.6) confidence = 'medium';

    return {
      party,
      score,
      matchScore: score,
      matchReasons: [],
      matchedFields,
      confidence
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
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
  }

  // Utility methods
  private generateId(): string {
    return `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async validateTcNumber(tcNumber: string, excludePartyId?: string): Promise<boolean> {
    try {
      await this.init();

      if (!tcNumber?.trim()) {
        return false;
      }

      // Basic TC number validation (11 digits)
      if (!/^\d{11}$/.test(tcNumber)) {
        return false;
      }

      // Check for duplicates
      return !this.parties.some(p =>
        p.tcNumber === tcNumber && p.id !== excludePartyId
      );
    } catch (error) {
      console.error('Failed to validate TC number:', error);
      return false;
    }
  }

  // Bulk operations
  async bulkUpdateParties(updates: Array<{ id: string; data: Partial<Party> }>): Promise<Party[]> {
    const updatedParties: Party[] = [];
    const errors: string[] = [];

    for (const update of updates) {
      try {
        if (!update.id?.trim()) {
          errors.push('Missing party ID in bulk update');
          continue;
        }

        const party = await this.updateParty(update.id, update.data);
        if (party) {
          updatedParties.push(party);
        }
      } catch (error) {
        errors.push(`Failed to update party ${update.id}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.warn('Bulk update errors:', errors);
    }

    return updatedParties;
  }

  // Export/Import
  async exportParties(): Promise<string> {
    try {
      await this.init();
      return JSON.stringify(this.parties, null, 2);
    } catch (error) {
      console.error('Failed to export parties:', error);
      throw new Error('Failed to export parties');
    }
  }

  async importParties(data: string): Promise<{ success: number; errors: string[] }> {
    try {
      await this.init();

      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid data format');
      }

      const results = { success: 0, errors: [] as string[] };

      for (const partyData of parsed) {
        try {
          await this.createParty(partyData);
          results.success++;
        } catch (error) {
          results.errors.push(`Failed to import party: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Bulk Upload (New P1 Feature)
  async bulkUploadParties(file: File): Promise<{ processed: number; success: boolean; errors: unknown[] }> {
    await this.ensureInitialized();
    try {
      // Use Orval-generated function
      const { createPartyBulkUpload } = await import('@/api/generated/parties/parties');
      const response = await createPartyBulkUpload({ file });

      // Response is typed now
      const result = response;

      // Refresh local cache after bulk upload
      await this.refreshFromAPI();

      return {
        success: result?.data?.success || false,
        processed: (result?.data?.created || 0) + (result?.data?.updated || 0),
        errors: result?.data?.errors || []
      };
    } catch (error) {
      console.error('Bulk upload failed:', error);
      throw error;
    }
  }

  /**
   * Calculate priority score for a party
   */
  calculatePriorityScore(party: Party): number {
    let score = 0;

    // Age factor (elderly parties get higher priority)
    if (party.birthDate) {
      const age = new Date().getFullYear() - new Date(party.birthDate).getFullYear();
      if (age >= 65) score += 20;
      else if (age >= 50) score += 10;
    }

    // Missing information penalty
    if (!party.phone || !party.email) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Add a note to a party
   */
  addNote(party: Party, note: Omit<PartyNote, 'id'>): Party {
    const newNote: PartyNote = {
      ...note,
      id: this.generateId()
    };

    return {
      ...party,
      notes: [...(party.notes || []), newNote]
    };
  }

  /**
   * Update a device for a party
   */
  updateDevice(party: Party, deviceId: string, updates: Partial<PartyDevice>): Party {
    const devices = party.devices || [];
    const updatedDevices = devices.map(device =>
      device.id === deviceId ? { ...device, ...updates } : device
    );

    return {
      ...party,
      devices: updatedDevices
    };
  }

  /**
   * Add communication to a party
   */
  addCommunication(party: Party, communication: Omit<Communication, 'id'>): Party {
    const newCommunication = {
      ...communication,
      id: this.generateId(),
      date: communication.timestamp || new Date().toISOString()
    };

    return {
      ...party,
      communications: [...(party.communications || []), newCommunication]
    };
  }

  /**
   * Add device to a party
   */
  addDevice(party: Party, device: Omit<PartyDevice, 'id'>): Party {
    const newDevice: PartyDevice = {
      ...device,
      id: this.generateId()
    };

    return {
      ...party,
      devices: [...(party.devices || []), newDevice]
    };
  }

  /**
   * Get high priority parties
   */
  async getHighPriorityParties(): Promise<Party[]> {
    const allParties = await this.getParties();
    return allParties.parties
      .filter(party => this.calculatePriorityScore(party) >= 50)
      .sort((a, b) => this.calculatePriorityScore(b) - this.calculatePriorityScore(a));
  }

  /**
   * Reset service state - clears in-memory cache and IndexedDB
   * MUST be called when user switches roles or tenants to prevent data leakage
   */
  async reset(): Promise<void> {
    // Clearing all party cache for tenant isolation

    // Clear in-memory cache
    this.parties = [];
    this.initialized = false;

    // Clear IndexedDB
    try {
      await indexedDBManager.clearAll();
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
  }
}

// Singleton instance
export const partyService = new PartyService();

