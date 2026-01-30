/**
 * useAIAudit Hook
 * 
 * Admin hook for fetching AI audit logs with filtering and pagination support.
 * Provides audit log entries with infinite scroll capability.
 * 
 * @module ai-admin/hooks/useAIAudit
 * @requirements Requirement 7: Admin Audit Log Viewer
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/orval-mutator';
import type {
  AuditLogEntry,
  AuditLogResponse,
  AuditLogFilters,
  UseAIAuditReturn,
  AuditEventType,
} from '../types/ai-admin.types';

// =============================================================================
// Query Keys
// =============================================================================

const AI_AUDIT_QUERY_KEY = ['ai-audit'] as const;

// =============================================================================
// Default Configuration
// =============================================================================

/** Default page size for audit log pagination */
const DEFAULT_PAGE_SIZE = 25;

/** Default stale time for audit data (30 seconds) */
const DEFAULT_STALE_TIME = 30000;

// =============================================================================
// Hook Options
// =============================================================================

/**
 * Options for useAIAudit hook
 */
export interface UseAIAuditOptions {
  /** Initial filters for the audit log */
  filters?: AuditLogFilters;
  /** Page size for pagination (default: 25) */
  pageSize?: number;
  /** Enable/disable the query */
  enabled?: boolean;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Backend audit log entry format
 */
interface BackendAuditLogEntry {
  id: string;
  timestamp: string;
  event_type: string;
  tenant_id: string;
  user_id: string;
  party_id?: string;
  request_id?: string;
  action_id?: string;
  risk_level?: string;
  outcome: string;
  event_data: Record<string, unknown>;
  diff_snapshot?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Backend audit log response format
 */
interface BackendAuditLogResponse {
  entries: BackendAuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/**
 * Fetches audit logs from the backend with filters and pagination
 */
async function fetchAuditLogs(
  filters: AuditLogFilters,
  pageSize: number,
  offset: number
): Promise<AuditLogResponse> {
  const params: Record<string, string | number> = {
    limit: pageSize,
    offset,
  };

  if (filters.tenant_id) params.tenant_id = filters.tenant_id;
  if (filters.user_id) params.user_id = filters.user_id;
  if (filters.event_type) params.event_type = filters.event_type;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.risk_level) params.risk_level = filters.risk_level;
  if (filters.outcome) params.outcome = filters.outcome;

  const response = await adminApi<BackendAuditLogResponse>({
    url: '/ai/audit',
    method: 'GET',
    params,
  });

  const actualData = (response as any).data || response;
  const rawEntries = actualData.entries || (Array.isArray(actualData) ? actualData : []);

  // Transform backend response to frontend types
  const entries: AuditLogEntry[] = rawEntries.map((entry: any) => ({
    log_id: entry.id,
    timestamp: entry.timestamp,
    event_type: entry.event_type as AuditEventType,
    tenant_id: entry.tenant_id,
    user_id: entry.user_id,
    party_id: entry.party_id,
    request_id: entry.request_id,
    action_id: entry.action_id,
    risk_level: entry.risk_level,
    outcome: entry.outcome as 'success' | 'failure' | 'blocked',
    event_data: entry.event_data,
    diff_snapshot: entry.diff_snapshot,
    ip_address: entry.ip_address,
    user_agent: entry.user_agent,
  }));

  return {
    entries,
    total: actualData.total || entries.length,
    page: Math.floor(offset / pageSize) + 1,
    page_size: actualData.page_size || pageSize,
    has_more: actualData.has_more ?? false,
  };
}

// =============================================================================
// useAIAudit Hook
// =============================================================================

/**
 * useAIAudit - Admin hook for AI audit logs
 * 
 * Provides:
 * - Filterable audit log entries
 * - Pagination with infinite scroll support
 * - Load more functionality
 * 
 * @example
 * ```tsx
 * const { entries, total, hasMore, isLoading, loadMore, isLoadingMore } = useAIAudit({
 *   filters: { tenant_id: 'tenant-123', event_type: 'chat_request' }
 * });
 * 
 * // Load more entries
 * if (hasMore) {
 *   loadMore();
 * }
 * ```
 */
export function useAIAudit(options: UseAIAuditOptions = {}): UseAIAuditReturn {
  const {
    filters = {},
    pageSize = DEFAULT_PAGE_SIZE,
    enabled = true,
  } = options;

  const queryClient = useQueryClient();

  // Build query key with filters
  const queryKey = [...AI_AUDIT_QUERY_KEY, { filters, pageSize }];

  // Infinite query for pagination
  const infiniteQuery = useInfiniteQuery<AuditLogResponse>({
    queryKey,
    queryFn: ({ pageParam = 0 }) => fetchAuditLogs(filters, pageSize, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.has_more) return undefined;
      return allPages.length * pageSize;
    },
    enabled,
    staleTime: DEFAULT_STALE_TIME,
    retry: 2,
  });

  // Flatten all pages into a single entries array
  const entries = infiniteQuery.data?.pages.flatMap((page) => page.entries) ?? [];

  // Get total from the first page (it's the same across all pages)
  const total = infiniteQuery.data?.pages[0]?.total ?? 0;

  // Check if there are more entries to load
  const hasMore = infiniteQuery.hasNextPage ?? false;

  // Load more function
  const loadMore = () => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage();
    }
  };

  // Refetch function to reset and reload
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: AI_AUDIT_QUERY_KEY });
  };

  return {
    entries,
    total,
    hasMore,
    isLoading: infiniteQuery.isLoading,
    loadMore,
    isLoadingMore: infiniteQuery.isFetchingNextPage,
    refetch,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
  };
}

// =============================================================================
// Exports
// =============================================================================

export default useAIAudit;
