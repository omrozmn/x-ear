import { Party } from '../types/party';
import { levenshteinDistance } from './fuzzy-search';

export interface PartyMatch {
  id: string;
  parties: Party[];
  similarity: number;
  matchReasons: string[];
  confidence: 'high' | 'medium' | 'low';
  status: 'pending' | 'reviewed' | 'merged' | 'ignored';
  matchType: 'exact' | 'fuzzy' | 'partial';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface MatchingConfig {
  weights: {
    tcNumber: number;
    phone: number;
    email: number;
    name: number;
    birthDate: number;
    address: number;
  };
  thresholds: {
    high: number;
    medium: number;
    low: number;
  };
  fuzzyMatching: {
    enabled: boolean;
    nameThreshold: number;
    phoneThreshold: number;
    addressThreshold: number;
  };
  exactMatching: {
    tcNumber: boolean;
    phone: boolean;
    email: boolean;
  };
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  weights: {
    tcNumber: 0.35,
    phone: 0.25,
    email: 0.15,
    name: 0.15,
    birthDate: 0.07,
    address: 0.03
  },
  thresholds: {
    high: 0.85,
    medium: 0.65,
    low: 0.45
  },
  fuzzyMatching: {
    enabled: true,
    nameThreshold: 0.8,
    phoneThreshold: 0.9,
    addressThreshold: 0.7
  },
  exactMatching: {
    tcNumber: true,
    phone: true,
    email: true
  }
};

export class PartyMatcher {
  private config: MatchingConfig;

  constructor(config: MatchingConfig = DEFAULT_MATCHING_CONFIG) {
    this.config = config;
  }

  /**
   * Ana eşleştirme fonksiyonu - tüm hastaları analiz eder
   */
  public findAllMatches(parties: Party[]): PartyMatch[] {
    const matches: PartyMatch[] = [];
    const processedPairs = new Set<string>();

    for (let i = 0; i < parties.length; i++) {
      for (let j = i + 1; j < parties.length; j++) {
        const party1 = parties[i];
        const party2 = parties[j];
        const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;

        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const match = this.compareParties(party1, party2);
        if (match && match.similarity >= this.config.thresholds.low) {
          matches.push({
            ...match,
            id: `match-${i}-${j}`,
            parties: [party1, party2]
          });
        }
      }
    }

    // Benzerlik skoruna göre sırala
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * İki hastayı karşılaştırır
   */
  public compareParties(party1: Party, party2: Party): Omit<PartyMatch, 'id' | 'parties'> | null {
    let totalScore = 0;
    let totalWeight = 0;
    const matchReasons: string[] = [];
    let matchType: 'exact' | 'fuzzy' | 'partial' = 'partial';
    let hasExactMatch = false;

    // TC Kimlik No karşılaştırması
    if (party1.tcNumber && party2.tcNumber) {
      if (party1.tcNumber === party2.tcNumber) {
        totalScore += this.config.weights.tcNumber;
        matchReasons.push('Aynı TC Kimlik Numarası');
        hasExactMatch = true;
        matchType = 'exact';
      }
      totalWeight += this.config.weights.tcNumber;
    }

    // Telefon karşılaştırması
    if (party1.phone && party2.phone) {
      const phoneScore = this.comparePhones(party1.phone, party2.phone);
      if (phoneScore.isExact) {
        matchReasons.push('Aynı telefon numarası');
        hasExactMatch = true;
        if (matchType !== 'exact') matchType = 'exact';
      } else if (phoneScore.isFuzzy) {
        matchReasons.push(`Benzer telefon numarası (${Math.round(phoneScore.similarity * 100)}% benzerlik)`);
        if (matchType === 'partial') matchType = 'fuzzy';
      }
      totalScore += phoneScore.similarity * this.config.weights.phone;
      totalWeight += this.config.weights.phone;
    }

    // E-posta karşılaştırması
    if (party1.email && party2.email) {
      const emailScore = this.compareEmails(party1.email, party2.email);
      if (emailScore.isExact) {
        matchReasons.push('Aynı e-posta adresi');
        hasExactMatch = true;
        if (matchType !== 'exact') matchType = 'exact';
      }
      totalScore += emailScore.similarity * this.config.weights.email;
      totalWeight += this.config.weights.email;
    }

    // İsim karşılaştırması
    const party1Name = party1.firstName && party1.lastName ? `${party1.firstName} ${party1.lastName}` : '';
    const party2Name = party2.firstName && party2.lastName ? `${party2.firstName} ${party2.lastName}` : '';

    if (party1Name && party2Name) {
      const nameScore = this.compareNames(party1Name, party2Name);
      if (nameScore.isExact) {
        matchReasons.push('Aynı isim');
        hasExactMatch = true;
      } else if (nameScore.isFuzzy) {
        matchReasons.push(`Benzer isim (${Math.round(nameScore.similarity * 100)}% benzerlik)`);
        if (matchType === 'partial') matchType = 'fuzzy';
      }
      totalScore += nameScore.similarity * this.config.weights.name;
      totalWeight += this.config.weights.name;
    }

    // Doğum tarihi karşılaştırması
    if (party1.birthDate && party2.birthDate) {
      if (party1.birthDate === party2.birthDate) {
        totalScore += this.config.weights.birthDate;
        matchReasons.push('Aynı doğum tarihi');
        hasExactMatch = true;
      }
      totalWeight += this.config.weights.birthDate;
    }

    // Adres karşılaştırması
    const getAddressString = (p: Party): string => {
      const addr = p.address;
      if (typeof addr === 'string') return addr;
      // Handle legacy object address structure if it exists in runtime but not in type
      if (addr && typeof addr === 'object') {
        const addrObj = addr as Record<string, unknown>;
        const full = addrObj.full || addrObj.full_address || addrObj.fullAddress;
        if (typeof full === 'string') return full;
      }
      return p.addressFull || p.address_full || '';
    };

    const party1Address = getAddressString(party1);
    const party2Address = getAddressString(party2);

    if (party1Address && party2Address) {
      const addressScore = this.compareAddresses(party1Address, party2Address);
      if (addressScore.isFuzzy) {
        matchReasons.push(`Benzer adres (${Math.round(addressScore.similarity * 100)}% benzerlik)`);
        if (matchType === 'partial') matchType = 'fuzzy';
      }
      totalScore += addressScore.similarity * this.config.weights.address;
      totalWeight += this.config.weights.address;
    }

    if (totalWeight === 0 || matchReasons.length === 0) {
      return null;
    }

    const similarity = totalScore / totalWeight;
    const confidence = this.getConfidenceLevel(similarity);
    const riskLevel = this.getRiskLevel(similarity, matchReasons, hasExactMatch);

    return {
      similarity,
      matchReasons,
      confidence,
      status: 'pending',
      matchType,
      riskLevel
    };
  }

  /**
   * Telefon numaralarını karşılaştırır
   */
  private comparePhones(phone1: string, phone2: string): { similarity: number; isExact: boolean; isFuzzy: boolean } {
    const clean1 = this.cleanPhone(phone1);
    const clean2 = this.cleanPhone(phone2);

    if (clean1 === clean2) {
      return { similarity: 1, isExact: true, isFuzzy: false };
    }

    if (this.config.fuzzyMatching.enabled) {
      const similarity = 1 - (levenshteinDistance(clean1, clean2) / Math.max(clean1.length, clean2.length));
      const isFuzzy = similarity >= this.config.fuzzyMatching.phoneThreshold;
      return { similarity: isFuzzy ? similarity : 0, isExact: false, isFuzzy };
    }

    return { similarity: 0, isExact: false, isFuzzy: false };
  }

  /**
   * E-posta adreslerini karşılaştırır
   */
  private compareEmails(email1: string, email2: string): { similarity: number; isExact: boolean } {
    const clean1 = email1.toLowerCase().trim();
    const clean2 = email2.toLowerCase().trim();

    return {
      similarity: clean1 === clean2 ? 1 : 0,
      isExact: clean1 === clean2
    };
  }

  /**
   * İsimleri karşılaştırır
   */
  private compareNames(name1: string, name2: string): { similarity: number; isExact: boolean; isFuzzy: boolean } {
    const clean1 = this.cleanName(name1);
    const clean2 = this.cleanName(name2);

    if (clean1 === clean2) {
      return { similarity: 1, isExact: true, isFuzzy: false };
    }

    if (this.config.fuzzyMatching.enabled) {
      const similarity = this.calculateNameSimilarity(clean1, clean2);
      const isFuzzy = similarity >= this.config.fuzzyMatching.nameThreshold;
      return { similarity: isFuzzy ? similarity : 0, isExact: false, isFuzzy };
    }

    return { similarity: 0, isExact: false, isFuzzy: false };
  }

  /**
   * Adresleri karşılaştırır
   */
  private compareAddresses(address1: string, address2: string): { similarity: number; isFuzzy: boolean } {
    if (!this.config.fuzzyMatching.enabled) {
      return { similarity: 0, isFuzzy: false };
    }

    const clean1 = this.cleanAddress(address1);
    const clean2 = this.cleanAddress(address2);

    const similarity = this.calculateAddressSimilarity(clean1, clean2);
    const isFuzzy = similarity >= this.config.fuzzyMatching.addressThreshold;

    return { similarity: isFuzzy ? similarity : 0, isFuzzy };
  }

  /**
   * İsim benzerliği hesaplama (gelişmiş)
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const words1 = name1.split(' ').filter(w => w.length > 1);
    const words2 = name2.split(' ').filter(w => w.length > 1);

    if (words1.length === 0 || words2.length === 0) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    // Her kelimeyi diğer tüm kelimelerle karşılaştır
    for (const word1 of words1) {
      let bestMatch = 0;
      for (const word2 of words2) {
        const similarity = 1 - (levenshteinDistance(word1, word2) / Math.max(word1.length, word2.length));
        bestMatch = Math.max(bestMatch, similarity);
      }
      totalSimilarity += bestMatch;
      comparisons++;
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  /**
   * Adres benzerliği hesaplama
   */
  private calculateAddressSimilarity(address1: string, address2: string): number {
    // Adresleri kelimelere böl ve ortak kelimeleri say
    const words1 = address1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = address2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return totalWords > 0 ? commonWords.length / totalWords : 0;
  }

  /**
   * Güven seviyesini belirle
   */
  private getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' {
    if (similarity >= this.config.thresholds.high) return 'high';
    if (similarity >= this.config.thresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Risk seviyesini belirle
   */
  private getRiskLevel(similarity: number, matchReasons: string[], hasExactMatch: boolean): 'critical' | 'high' | 'medium' | 'low' {
    // TC Kimlik No veya telefon eşleşmesi varsa kritik
    if (hasExactMatch && (matchReasons.some(r => r.includes('TC Kimlik') || r.includes('telefon')))) {
      return 'critical';
    }

    if (similarity >= 0.9) return 'critical';
    if (similarity >= 0.8) return 'high';
    if (similarity >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * Telefon numarasını temizle
   */
  private cleanPhone(phone: string): string {
    return phone.replace(/\D/g, ''); // Sadece rakamları bırak
  }

  /**
   * İsmi temizle
   */
  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Özel karakterleri kaldır
      .replace(/\s+/g, ' '); // Çoklu boşlukları tek boşluğa çevir
  }

  /**
   * Adresi temizle
   */
  private cleanAddress(address: string): string {
    return address
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Konfigürasyonu güncelle
   */
  public updateConfig(newConfig: Partial<MatchingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Belirli bir hasta için potansiyel eşleşmeleri bul
   */
  public findMatchesForParty(targetParty: Party, parties: Party[]): PartyMatch[] {
    const matches: PartyMatch[] = [];

    for (let i = 0; i < parties.length; i++) {
      const party = parties[i];
      if (party.id === targetParty.id) continue;

      const match = this.compareParties(targetParty, party);
      if (match && match.similarity >= this.config.thresholds.low) {
        matches.push({
          ...match,
          id: `match-${targetParty.id}-${party.id}`,
          parties: [targetParty, party]
        });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }
}

// Singleton instance
export const partyMatcher = new PartyMatcher();

// Utility functions
export const getMatchColor = (confidence: string): string => {
  switch (confidence) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'critical': return 'text-red-700 bg-red-100 border-red-300';
    case 'high': return 'text-orange-700 bg-orange-100 border-orange-300';
    case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    case 'low': return 'text-green-700 bg-green-100 border-green-300';
    default: return 'text-gray-700 bg-gray-100 border-gray-300';
  }
};