/**
 * Reports API Client Adapter
 * 
 * This adapter provides a single point of import for all reports-related API operations.
 * Instead of importing directly from @/api/generated/reports/reports, use this adapter.
 * 
 * Usage:
 *   import { useListReportFinancial } from '@/api/client/reports.client';
 */

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
