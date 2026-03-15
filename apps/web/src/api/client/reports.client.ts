/**
 * Reports API Client Adapter
 * 
 * This adapter provides a single point of import for all reports-related API operations.
 * Instead of importing directly from @/api/generated/reports/reports, use this adapter.
 * 
 * Usage:
 *   import { useListReportFinancial } from '@/api/client/reports.client';
 */

import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/orval-mutator';

export {
  useListReportOverview,
  getListReportOverviewQueryKey,
  useListReportFinancial,
  getListReportFinancialQueryKey,
  useListReportPatients,
  getListReportPatientsQueryKey,
  useListReportPromissoryNotes,
  useListReportPromissoryNoteByPatient,
  useListReportPromissoryNoteList,
  getListReportPromissoryNoteListQueryKey,
  useListReportRemainingPayments,
  useListReportCashflowSummary,
  useListReportPosMovements,
  useListActivityLogs,
  useListActivityLogFilterOptions,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';

export interface ListReportTrackingParams {
  page?: number;
  per_page?: number;
  branch_id?: string;
  report_status?: string;
  delivery_status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export function getListReportTrackingQueryKey(params?: ListReportTrackingParams) {
  return ['/api/reports/report-tracking', params] as const;
}

export function useListReportTracking(params?: ListReportTrackingParams, enabled = true) {
  return useQuery({
    queryKey: getListReportTrackingQueryKey(params),
    queryFn: () => customInstance({ url: '/api/reports/report-tracking', method: 'GET', params }),
    enabled,
  });
}
