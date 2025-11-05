/**
 * Patient Search & Filter Types
 * @fileoverview Search, filtering, and matching related types
 * @version 1.0.0
 */

import type { 
  PatientStatus, 
  PatientSegment, 
  PatientLabel,
  DeviceType,
  DeviceSide,
  InsuranceType
} from './patient-base.types';

export interface PatientFilters {
  status?: PatientStatus[];
  segment?: PatientSegment[];
  labels?: PatientLabel[];
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

export interface PatientSearchResult {
  patients: PatientSearchItem[];
  totalCount: number;
  filteredCount: number;
  facets?: SearchFacets;
  searchTime?: number; // ms
}

export interface PatientSearchItem {
  id: string;
  firstName: string;
  lastName: string;
  tcNumber?: string;
  phone?: string;
  email?: string;
  status: PatientStatus;
  segment: PatientSegment;
  labels: PatientLabel[];
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

// Patient Matching Types
export interface PatientMatchRequest {
  firstName?: string;
  lastName?: string;
  tcNumber?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  threshold?: number; // 0-1, minimum match score
}

export interface PatientMatchCandidate {
  patient: PatientSearchItem;
  matchScore: number;
  matchReasons: MatchReason[];
}

export interface MatchReason {
  field: string;
  score: number;
  explanation: string;
}

export interface PatientStats {
  totalPatients: number;
  activePatients: number;
  newThisMonth: number;
  withDevices: number;
  withInsurance: number;
  averageAge: number;
  topCities: CityStats[];
  statusDistribution: StatusStats[];
  segmentDistribution: SegmentStats[];
}

export interface CityStats {
  city: string;
  count: number;
  percentage: number;
}

export interface StatusStats {
  status: PatientStatus;
  count: number;
  percentage: number;
}

export interface SegmentStats {
  segment: PatientSegment;
  count: number;
  percentage: number;
}