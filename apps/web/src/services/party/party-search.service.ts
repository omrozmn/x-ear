/**
 * Party Search Service
 * @fileoverview Handles party search, filtering, and matching operations
 * @version 1.0.0
 */

import type { PartyRead as Party } from "@/api/generated/schemas";
import { PartyFilters, PartySegment, PartyAcquisitionType } from '../../types/party';
import Fuse from 'fuse.js';

export interface PartySearchResult {
  parties: Party[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PartyMatchCandidate {
  party: Party;
  score: number;
  matchedFields: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface PartyMatchRequest {
  firstName?: string;
  lastName?: string;
  tcNo?: string;
  phone?: string;
  birthDate?: string;
}

export class PartySearchService {
  private fuseInstance: Fuse<Party> | null = null;

  constructor() {
    this.initializeFuse();
  }

  private initializeFuse(): void {
    const fuseOptions = {
      keys: [
        { name: 'firstName', weight: 0.3 },
        { name: 'lastName', weight: 0.3 },
        { name: 'phone', weight: 0.2 },
        { name: 'tcNumber', weight: 0.15 },
        { name: 'email', weight: 0.1 },
        { name: 'tags', weight: 0.05 }
      ],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2
    };

    this.fuseInstance = new Fuse([], fuseOptions);
  }

  updateSearchIndex(parties: Party[]): void {
    if (this.fuseInstance) {
      this.fuseInstance.setCollection(parties);
    }
  }

  searchParties(parties: Party[], filters: PartyFilters = {}): PartySearchResult {
    let filteredParties = [...parties];

    // Apply text search first
    if (filters.search && filters.search.trim()) {
      if (this.fuseInstance) {
        const searchResults = this.fuseInstance.search(filters.search.trim());
        filteredParties = searchResults.map(result => result.item);
      } else {
        // Fallback to simple text search
        const searchTerm = filters.search.toLowerCase();
        filteredParties = parties.filter(party =>
          party.firstName?.toLowerCase().includes(searchTerm) ||
          party.lastName?.toLowerCase().includes(searchTerm) ||
          party.phone?.includes(searchTerm) ||
          party.tcNumber?.includes(searchTerm) ||
          party.email?.toLowerCase().includes(searchTerm)
        );
      }
    }

    // Apply filters
    filteredParties = this.applyFilters(filteredParties, filters);

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedParties = filteredParties.slice(startIndex, endIndex);

    return {
      parties: paginatedParties,
      total: filteredParties.length,
      page,
      pageSize: limit,
      hasMore: endIndex < filteredParties.length
    };
  }

  private applyFilters(parties: Party[], filters: PartyFilters): Party[] {
    return parties.filter(party => {
      // Status filter
      if (filters.status && filters.status.length > 0 && (!party.status || !filters.status.includes(party.status))) {
        return false;
      }

      // Segment filter
      if (filters.segment && filters.segment.length > 0 && (!party.segment || !filters.segment.includes(party.segment as PartySegment))) {
        return false;
      }

      // Acquisition type filter
      if (filters.acquisitionType && filters.acquisitionType.length > 0 && (!party.acquisitionType || !filters.acquisitionType.includes(party.acquisitionType as PartyAcquisitionType))) {
        return false;
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag =>
          (party.tags as string[])?.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }

  findMatches(request: PartyMatchRequest, parties: Party[]): PartyMatchCandidate[] {
    const candidates: PartyMatchCandidate[] = [];

    for (const party of parties) {
      const match = this.calculatePartyMatch(request, party);
      if (match.score > 0.3) { // Only include matches above threshold
        candidates.push(match);
      }
    }

    // Sort by score descending
    return candidates.sort((a, b) => b.score - a.score);
  }

  private calculatePartyMatch(request: PartyMatchRequest, party: Party): PartyMatchCandidate {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const matchedFields: string[] = [];

    // Name matching (weight: 0.4) - using firstName and lastName
    if ((request.firstName || request.lastName) && (party.firstName || party.lastName)) {
      const requestFullName = `${request.firstName || ''} ${request.lastName || ''}`.trim();
      const partyFullName = `${party.firstName || ''} ${party.lastName || ''}`.trim();
      const nameScore = this.calculateStringSimilarity(requestFullName, partyFullName);
      totalScore += nameScore * 0.4;
      maxPossibleScore += 0.4;
      if (nameScore > 0.7) {
        matchedFields.push('name');
      }
    }

    // TC Number matching (weight: 0.3)
    if (request.tcNo && party.tcNumber) {
      const tcScore = request.tcNo === party.tcNumber ? 1 : 0;
      totalScore += tcScore * 0.3;
      maxPossibleScore += 0.3;
      if (tcScore > 0) {
        matchedFields.push('tcNumber');
      }
    }

    // Phone matching (weight: 0.2)
    if (request.phone && party.phone) {
      const phoneScore = this.calculatePhoneSimilarity(request.phone, party.phone);
      totalScore += phoneScore * 0.2;
      maxPossibleScore += 0.2;
      if (phoneScore > 0.8) {
        matchedFields.push('phone');
      }
    }

    // Birth date matching (weight: 0.1)
    if (request.birthDate && party.birthDate) {
      const birthDateScore = request.birthDate === party.birthDate ? 1 : 0;
      totalScore += birthDateScore * 0.1;
      maxPossibleScore += 0.1;
      if (birthDateScore > 0) {
        matchedFields.push('birthDate');
      }
    }

    // Normalize score
    const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (normalizedScore > 0.8) {
      confidence = 'high';
    } else if (normalizedScore > 0.6) {
      confidence = 'medium';
    }

    return {
      party,
      score: normalizedScore,
      matchedFields,
      confidence
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(s1, s2);
    return 1 - (distance / maxLength);
  }

  private calculatePhoneSimilarity(phone1: string, phone2: string): number {
    // Normalize phone numbers (remove spaces, dashes, parentheses)
    const normalize = (phone: string) => phone.replace(/[\s\-()]/g, '');

    const p1 = normalize(phone1);
    const p2 = normalize(phone2);

    // Exact match
    if (p1 === p2) return 1;

    // Check if one is a substring of the other (for international vs local format)
    if (p1.includes(p2) || p2.includes(p1)) return 0.9;

    // Use string similarity as fallback
    return this.calculateStringSimilarity(p1, p2);
  }

  private levenshteinDistance(str1: string, str2: string): number {
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
}

export const partySearchService = new PartySearchService();
