import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { customInstance } from '@/api/orval-mutator';

interface Envelope<T> {
  data?: T;
}

export interface PersonnelOverviewKpi {
  key: string;
  label: string;
  value: string;
}

export interface PersonnelOverview {
  employees: PersonnelOverviewKpi[];
  leave: PersonnelOverviewKpi[];
  documents: PersonnelOverviewKpi[];
  compensation: PersonnelOverviewKpi[];
}

export interface PersonnelEmployee {
  id: string;
  fullName: string;
  linkedUserId?: string | null;
  linkedUser?: string | null;
  email?: string | null;
  role?: string | null;
  branchNames: string[];
  status: 'active' | 'passive';
  hiredAt?: string | null;
  lastLogin?: string | null;
  premiumProfile: string;
}

export interface PersonnelLeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  status: string;
  approver?: string | null;
}

export interface PersonnelDocumentRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  documentType: string;
  status: string;
  validUntil?: string | null;
  branchName?: string | null;
}

export interface PersonnelCompensationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  linkedUserId?: string | null;
  linkedUser?: string | null;
  periodLabel: string;
  calculationDate: string;
  modelType: string;
  collectionRule: string;
  targetAmount?: number | null;
  rateSummary: string;
  salesTotal: number;
  accruedPremium: number;
  payrollStatus: string;
}

export interface PersonnelTierRule {
  threshold: number;
  rate: number;
}

export interface PersonnelCompensationSettings {
  periodMode: string;
  calculationOffsetDays: number;
  modelType: string;
  baseRate?: number | null;
  targetEnabled: boolean;
  targetAmount?: number | null;
  collectionRule: string;
  tiers: PersonnelTierRule[];
}

export interface PersonnelLeavePolicy {
  annualEntitlementDays: number;
  carryOverEnabled: boolean;
  leaveTypes: string[];
}

export interface PersonnelDocumentPolicy {
  requiredDocumentTypes: string[];
  expiringDocumentTypes: string[];
  reminderDaysBeforeExpiry: number;
}

export interface PersonnelSettings {
  linkedUserRequired: boolean;
  compensation: PersonnelCompensationSettings;
  leavePolicy: PersonnelLeavePolicy;
  documentPolicy: PersonnelDocumentPolicy;
}

export interface PersonnelSettingsUpdate {
  linkedUserRequired?: boolean;
  compensation?: Partial<PersonnelCompensationSettings>;
  leavePolicy?: Partial<PersonnelLeavePolicy>;
  documentPolicy?: Partial<PersonnelDocumentPolicy>;
}

export const PERSONNEL_OVERVIEW_QUERY_KEY = ['personnel', 'overview'] as const;
export const PERSONNEL_EMPLOYEES_QUERY_KEY = ['personnel', 'employees'] as const;
export const PERSONNEL_LEAVE_QUERY_KEY = ['personnel', 'leave'] as const;
export const PERSONNEL_DOCUMENTS_QUERY_KEY = ['personnel', 'documents'] as const;
export const PERSONNEL_COMPENSATION_QUERY_KEY = ['personnel', 'compensation'] as const;
export const PERSONNEL_SETTINGS_QUERY_KEY = ['personnel', 'settings'] as const;

export function usePersonnelOverview() {
  return useQuery({
    queryKey: PERSONNEL_OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const response = await customInstance<Envelope<PersonnelOverview>>({
        url: '/api/personnel/overview',
        method: 'GET',
      });
      return response.data ?? { employees: [], leave: [], documents: [], compensation: [] };
    },
  });
}

export function usePersonnelEmployees() {
  return useQuery({
    queryKey: PERSONNEL_EMPLOYEES_QUERY_KEY,
    queryFn: async () => {
      const response = await customInstance<Envelope<PersonnelEmployee[]>>({
        url: '/api/personnel/employees',
        method: 'GET',
      });
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function usePersonnelLeave() {
  return useQuery({
    queryKey: PERSONNEL_LEAVE_QUERY_KEY,
    queryFn: async () => {
      const response = await customInstance<Envelope<PersonnelLeaveRecord[]>>({
        url: '/api/personnel/leave',
        method: 'GET',
      });
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function usePersonnelDocuments() {
  return useQuery({
    queryKey: PERSONNEL_DOCUMENTS_QUERY_KEY,
    queryFn: async () => {
      const response = await customInstance<Envelope<PersonnelDocumentRecord[]>>({
        url: '/api/personnel/documents',
        method: 'GET',
      });
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function usePersonnelCompensation() {
  return useQuery({
    queryKey: PERSONNEL_COMPENSATION_QUERY_KEY,
    queryFn: async () => {
      const response = await customInstance<Envelope<PersonnelCompensationRecord[]>>({
        url: '/api/personnel/compensation',
        method: 'GET',
      });
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function usePersonnelSettings() {
  return useQuery({
    queryKey: PERSONNEL_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await customInstance<Envelope<PersonnelSettings>>({
        url: '/api/personnel/settings',
        method: 'GET',
      });
      return response.data ?? null;
    },
  });
}

export function useUpdatePersonnelSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PersonnelSettingsUpdate) => {
      const response = await customInstance<Envelope<PersonnelSettings>>({
        url: '/api/personnel/settings',
        method: 'PUT',
        data,
      });
      return response.data ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONNEL_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PERSONNEL_COMPENSATION_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PERSONNEL_OVERVIEW_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PERSONNEL_EMPLOYEES_QUERY_KEY });
    },
  });
}
