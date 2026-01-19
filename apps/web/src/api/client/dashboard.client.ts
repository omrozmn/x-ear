/**
 * Dashboard API Client Adapter
 * 
 * This adapter provides a single point of import for all dashboard-related API operations.
 * Instead of importing directly from @/api/generated/dashboard/dashboard, use this adapter.
 * 
 * Usage:
 *   import { useListDashboard } from '@/api/client/dashboard.client';
 */

export {
  useListDashboard,
  getListDashboardQueryKey,
  listDashboardChartPatientDistribution,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
