/**
 * Activity Logs API Client Adapter
 * 
 * This adapter provides a single point of import for all activity-logs-related API operations.
 * Instead of importing directly from @/api/generated/activity-logs/activity-logs, use this adapter.
 * 
 * Usage:
 *   import { useListActivityLogs } from '@/api/client/activity-logs.client';
 */

export {
  useListActivityLogs,
  getListActivityLogsQueryKey,
  useListActivityLogStats,
  getListActivityLogStatsQueryKey,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
