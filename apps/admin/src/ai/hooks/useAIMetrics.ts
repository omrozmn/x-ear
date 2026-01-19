/**
 * useAIMetrics Hook
 * 
 * Admin hook for fetching AI SLA metrics with configurable time windows.
 * Provides latency, error rates, approval metrics, and quota metrics.
 * 
 * @module ai-admin/hooks/useAIMetrics
 * @requirements Requirement 6: Admin AI Metrics Dashboard
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/orval-mutator';
import type {
  AIMetricsResponse,
  AIAlertsResponse,
  AIAlert,
  UseAIMetricsReturn,
  UseAIAlertsReturn,
} from '../types/ai-admin.types';

// =============================================================================
// Query Keys
// =============================================================================

const AI_METRICS_QUERY_KEY = ['ai-metrics'] as const;
const AI_ALERTS_QUERY_KEY = ['ai-alerts'] as const;

// =============================================================================
// Default Configuration
// =============================================================================

/** Default metrics polling interval (60 seconds) */
const DEFAULT_METRICS_REFETCH_INTERVAL = 60000;

/** Default alerts polling interval (30 seconds) */
const DEFAULT_ALERTS_REFETCH_INTERVAL = 30000;

/** Default time window for metrics aggregation (15 minutes) */
const DEFAULT_WINDOW_MINUTES = 15;

// =============================================================================
// Hook Options
// =============================================================================

/**
 * Options for useAIMetrics hook
 */
export interface UseAIMetricsOptions {
  /** Time window for metrics aggregation in minutes (default: 15) */
  windowMinutes?: number;
  /** Enable/disable the query */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 60000) */
  refetchInterval?: number;
}

/**
 * Options for useAIAlerts hook
 */
export interface UseAIAlertsOptions {
  /** Filter by severity level */
  severity?: 'info' | 'warning' | 'error' | 'critical';
  /** Filter by acknowledgment status */
  acknowledged?: boolean;
  /** Maximum alerts to return (default: 100) */
  limit?: number;
  /** Enable/disable the query */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 30000) */
  refetchInterval?: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetches SLA metrics from the backend
 */
async function fetchMetrics(windowMinutes: number): Promise<AIMetricsResponse> {
  const response = await adminApi<{
    timestamp: string;
    window_minutes: number;
    inference_latency: {
      count: number;
      min_ms: number;
      max_ms: number;
      mean_ms: number;
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
    };
    intent_latency: {
      count: number;
      min_ms: number;
      max_ms: number;
      mean_ms: number;
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
    };
    planning_latency: {
      count: number;
      min_ms: number;
      max_ms: number;
      mean_ms: number;
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
    };
    execution_latency: {
      count: number;
      min_ms: number;
      max_ms: number;
      mean_ms: number;
      p50_ms: number;
      p95_ms: number;
      p99_ms: number;
    };
    rates: {
      total_count: number;
      success_count: number;
      error_count: number;
      timeout_count: number;
      error_rate: number;
      timeout_rate: number;
      success_rate: number;
    };
    approvals: {
      total_approvals_requested: number;
      approvals_granted: number;
      approvals_rejected: number;
      auto_approved: number;
      human_approval_rate: number;
      human_rejection_rate: number;
      auto_approval_rate: number;
      avg_approval_latency_ms: number;
      p50_approval_latency_ms: number;
      p95_approval_latency_ms: number;
    };
    quota: {
      total_requests: number;
      quota_rejections: number;
      rate_limited: number;
      quota_rejection_rate: number;
      rate_limit_rate: number;
    };
  }>({
    url: `/ai/metrics`,
    method: 'GET',
    params: { window_minutes: windowMinutes },
  });

  // Transform backend response to frontend types
  return {
    window_minutes: response.window_minutes,
    timestamp: response.timestamp,
    latency: {
      p50: response.inference_latency.p50_ms,
      p95: response.inference_latency.p95_ms,
      p99: response.inference_latency.p99_ms,
      avg: response.inference_latency.mean_ms,
      max: response.inference_latency.max_ms,
      sample_count: response.inference_latency.count,
    },
    errors: {
      total_requests: response.rates.total_count,
      error_count: response.rates.error_count,
      error_rate: response.rates.error_rate,
      timeout_count: response.rates.timeout_count,
      timeout_rate: response.rates.timeout_rate,
      errors_by_code: {}, // Not provided by backend in this endpoint
    },
    approvals: {
      pending_count: 0, // Would need separate endpoint
      approved_count: response.approvals.approvals_granted,
      rejected_count: response.approvals.approvals_rejected,
      expired_count: 0, // Not provided
      avg_approval_time_ms: response.approvals.avg_approval_latency_ms,
      rejection_rate: response.approvals.human_rejection_rate,
    },
    quotas: {
      quota_rejections: response.quota.quota_rejections,
      quota_rejection_rate: response.quota.quota_rejection_rate,
      tenants_at_limit: 0, // Not provided
      by_capability: {}, // Not provided in this format
    },
    usage: {
      total_requests: response.rates.total_count,
      unique_users: 0, // Not provided
      unique_tenants: 0, // Not provided
      by_capability: {}, // Not provided
      by_intent_type: {}, // Not provided
    },
  };
}

/**
 * Fetches alerts from the backend
 */
async function fetchAlerts(options: {
  severity?: string;
  acknowledged?: boolean;
  limit?: number;
}): Promise<AIAlertsResponse> {
  const params: Record<string, string | number | boolean> = {};
  
  if (options.severity) {
    params.severity = options.severity;
  }
  if (options.acknowledged !== undefined) {
    params.acknowledged = options.acknowledged;
  }
  if (options.limit) {
    params.limit = options.limit;
  }

  const response = await adminApi<{
    alerts: Array<{
      alert_id: string;
      alert_type: string;
      severity: string;
      message: string;
      timestamp: string;
      metric_value: number;
      threshold_value: number;
      tenant_id?: string;
      acknowledged: boolean;
      acknowledged_by?: string;
      acknowledged_at?: string;
    }>;
    total_count: number;
    active_count: number;
  }>({
    url: '/ai/alerts',
    method: 'GET',
    params,
  });

  // Transform backend response to frontend types
  const alerts: AIAlert[] = response.alerts.map((alert) => ({
    alert_id: alert.alert_id,
    type: alert.alert_type as AIAlert['type'],
    severity: alert.severity as AIAlert['severity'],
    message: alert.message,
    details: {
      metric_value: alert.metric_value,
      threshold_value: alert.threshold_value,
    },
    created_at: alert.timestamp,
    acknowledged: alert.acknowledged,
    acknowledged_by: alert.acknowledged_by,
    acknowledged_at: alert.acknowledged_at,
    auto_resolved: false, // Not provided by backend
    resolved_at: undefined,
  }));

  return {
    alerts,
    active_count: response.active_count,
    total_count: response.total_count,
  };
}

/**
 * Acknowledges an alert
 */
async function acknowledgeAlert(alertId: string, notes?: string): Promise<void> {
  await adminApi<{ success: boolean }>({
    url: `/ai/alerts/${alertId}/acknowledge`,
    method: 'POST',
    data: notes ? { notes } : undefined,
  });
}

// =============================================================================
// useAIMetrics Hook
// =============================================================================

/**
 * useAIMetrics - Admin hook for AI SLA metrics
 * 
 * Provides:
 * - Real-time polling for SLA metrics
 * - Configurable time window (15m, 1h, 24h)
 * - Latency percentiles (p50, p95, p99)
 * - Error and timeout rates
 * - Approval metrics
 * - Quota metrics
 * 
 * @example
 * ```tsx
 * const { data, isLoading, isError, refetch } = useAIMetrics({ windowMinutes: 60 });
 * 
 * // Access latency metrics
 * console.log(data?.latency.p95);
 * 
 * // Access error rates
 * console.log(data?.errors.error_rate);
 * ```
 */
export function useAIMetrics(options: UseAIMetricsOptions = {}): UseAIMetricsReturn {
  const {
    windowMinutes = DEFAULT_WINDOW_MINUTES,
    enabled = true,
    refetchInterval = DEFAULT_METRICS_REFETCH_INTERVAL,
  } = options;

  const query = useQuery<AIMetricsResponse>({
    queryKey: [...AI_METRICS_QUERY_KEY, { windowMinutes }],
    queryFn: () => fetchMetrics(windowMinutes),
    enabled,
    refetchInterval,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 2,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// =============================================================================
// useAIAlerts Hook
// =============================================================================

/**
 * useAIAlerts - Admin hook for AI alerts
 * 
 * Provides:
 * - Real-time polling for alerts
 * - Severity and acknowledgment filtering
 * - Acknowledge mutation
 * 
 * @example
 * ```tsx
 * const { alerts, activeCount, isLoading, acknowledge } = useAIAlerts();
 * 
 * // Acknowledge an alert
 * await acknowledge('alert-123', 'Investigated and resolved');
 * ```
 */
export function useAIAlerts(options: UseAIAlertsOptions = {}): UseAIAlertsReturn {
  const {
    severity,
    acknowledged,
    limit = 100,
    enabled = true,
    refetchInterval = DEFAULT_ALERTS_REFETCH_INTERVAL,
  } = options;

  const queryClient = useQueryClient();

  // Build query key with filters
  const queryKey = [
    ...AI_ALERTS_QUERY_KEY,
    { severity, acknowledged, limit },
  ];

  // Alerts query with polling
  const alertsQuery = useQuery<AIAlertsResponse>({
    queryKey,
    queryFn: () => fetchAlerts({ severity, acknowledged, limit }),
    enabled,
    refetchInterval,
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: 2,
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation<void, Error, { alertId: string; notes?: string }>({
    mutationFn: ({ alertId, notes }) => acknowledgeAlert(alertId, notes),
    onSuccess: () => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ queryKey: AI_ALERTS_QUERY_KEY });
    },
  });

  // Acknowledge helper
  const acknowledge = async (alertId: string, notes?: string): Promise<void> => {
    if (!alertId.trim()) {
      throw new Error('Alert ID is required');
    }
    await acknowledgeMutation.mutateAsync({ alertId, notes });
  };

  return {
    alerts: alertsQuery.data?.alerts ?? [],
    activeCount: alertsQuery.data?.active_count ?? 0,
    isLoading: alertsQuery.isLoading,
    acknowledge,
    isAcknowledging: acknowledgeMutation.isPending,
  };
}

// =============================================================================
// Exports
// =============================================================================

export default useAIMetrics;
