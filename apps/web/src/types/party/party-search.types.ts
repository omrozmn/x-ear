/**
 * Party Search & Filter Types
 * @fileoverview Search, filtering, and matching related types
 * @version 1.0.0
 */

import type {
  PartyStatus,
  PartySegment,
  PartyLabel,
  DeviceType,
  DeviceSide,
  InsuranceType
} from './party-base.types';

export interface PartyFilters {
  status?: PartyStatus[];
  segment?: PartySegment[];
  labels?: PartyLabel[];
  hasDevice?: boolean;
  deviceType?: DeviceType[];
  deviceSide?: DeviceSide[];
  hasInsurance?: boolean;
  insuranceType?: InsuranceType[];
  ageRange?: AgeRange;
  registrationDateRange?: DateRange;
  lastVisitDateRange?: DateRange;
  city?: string;
  district?: string;
  assignedTo?: string[];
  hasOutstandingBalance?: boolean;
  balanceRange?: AmountRange;
  hasAppointments?: boolean;
  appointmentDateRange?: DateRange;
  branchId?: string;
  tags?: string[];
  acquisitionType?: string[];
  search?: string; // Standard search string
  page?: number;
  limit?: number;
}

export interface AgeRange {
  min?: number;
  max?: number;
}

export interface DateRange {
  start?: string; // ISO date
  end?: string; // ISO date
}

export interface AmountRange {
  min?: number;
  max?: number;
}

export interface PartySearchResult {
  parties: PartySearchItem[];
  total: number; // For compatibility
  totalCount: number;
  filteredCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets?: SearchFacets;
  searchTime?: number; // ms
}

export interface PartySearchItem {
  id: string;
  firstName: string;
  lastName: string;
  tcNumber?: string;
  phone?: string;
  email?: string;
  status: PartyStatus;
  segment: PartySegment;
  labels: PartyLabel[];
  registrationDate: string;
  lastVisitDate?: string;
  deviceCount: number;
  hasInsurance: boolean;
  outstandingBalance: number;
  priority: number;
  matchScore?: number; // for search relevance
}

export interface SearchFacets {
  status: FacetCount[];
  segment: FacetCount[];
  labels: FacetCount[];
  deviceTypes: FacetCount[];
  cities: FacetCount[];
  insuranceTypes: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
  selected?: boolean;
}

// Party Matching Types
export interface PartyMatchRequest {
  firstName?: string;
  lastName?: string;
  tcNumber?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  tcNo?: string; // Compatibility
  name?: string; // Compatibility
  threshold?: number; // 0-1, minimum match score
}

export interface PartyMatchCandidate {
  party: PartySearchItem;
  score: number; // for compatibility
  matchScore: number;
  matchReasons: MatchReason[];
  matchedFields: string[]; // for compatibility
  confidence: 'high' | 'medium' | 'low'; // for compatibility
}

export interface MatchReason {
  field: string;
  score: number;
  explanation: string;
}

export interface PartyStats {
  total: number; // Compatibility
  totalParties: number;
  activeParties: number;
  newThisMonth: number;
  withDevices: number;
  withInsurance: number;
  averageAge: number;
  topCities: CityStats[];
  statusDistribution: StatusStats[];
  segmentDistribution: SegmentStats[];
  byStatus: Record<string, number>; // Compatibility
  bySegment: Record<string, number>; // Compatibility
}

export interface CityStats {
  city: string;
  count: number;
  percentage: number;
}

export interface StatusStats {
  status: PartyStatus;
  count: number;
  percentage: number;
}

export interface SegmentStats {
  segment: PartySegment;
  count: number;
  percentage: number;
}