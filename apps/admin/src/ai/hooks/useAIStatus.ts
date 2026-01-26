/**
 * AI Status Hook
 * 
 * This hook provides AI system status information from the /ai/status endpoint.
 * It uses TanStack Query for data fetching with automatic polling.
 * 
 * Key features:
 * - Automatic polling (30s default)
 * - Loading and error state management
 * - Helper hooks for common status checks
 * - Automatic sync with aiSessionStore.lastAIStatus
 * 
 * @module ai/hooks/useAIStatus
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { adminApi } from '../../api/orval-mutator';
import { useAISessionStore } from '../stores/aiSessionStore';
import type {
  AIStatus,
  AIPhaseStatus,
  UseAIStatusOptions,
  UseAIStatusReturn
} from '../types/ai.types';

// =============================================================================
// Constants
// =============================================================================

/**
 * Query key for AI status
 * Used for cache invalidation and query identification
 */
export const AI_STATUS_QUERY_KEY = ['ai-status'] as const;

/**
 * Default polling interval in milliseconds (30 seconds)
 */
export const DEFAULT_REFETCH_INTERVAL = 30000;

/**
 * Stale time for AI status data (10 seconds)
 * Data is considered fresh for this duration
 */
export const AI_STATUS_STALE_TIME = 10000;

// =============================================================================
// API Function
// =============================================================================

/**
 * Fetch AI status from the backend
 * 
 * @returns Promise resolving to AIStatus
 */
async function fetchAIStatus(): Promise<AIStatus> {
  const response = await adminApi<AIStatus>({
    url: '/api/ai/status',
    method: 'GET',
  });
  return response;
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * useAIStatus Hook
 * 
 * Fetches and manages AI system status with automatic polling.
 * Updates aiSessionStore.lastAIStatus on successful fetch.
 * 
 * @param options - Hook configuration options
 * @returns AI status data and query state
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { data: status, isLoading, isError } = useAIStatus();
 * 
 * // With custom polling interval
 * const { data: status } = useAIStatus({ refetchInterval: 60000 });
 * 
 * // Disable polling
 * const { data: status } = useAIStatus({ refetchInterval: false });
 * 
 * // Conditionally enable
 * const { data: status } = useAIStatus({ enabled: isAuthenticated });
 * ```
 */
export function useAIStatus(options: UseAIStatusOptions = {}): UseAIStatusReturn {
  const {
    enabled = true,
    refetchInterval = DEFAULT_REFETCH_INTERVAL
  } = options;

  // Get setLastAIStatus from session store
  const setLastAIStatus = useAISessionStore((state) => state.setLastAIStatus);

  // TanStack Query for fetching AI status
  const query = useQuery<AIStatus, Error>({
    queryKey: AI_STATUS_QUERY_KEY,
    queryFn: fetchAIStatus,
    enabled,
    refetchInterval: enabled ? refetchInterval : false,
    staleTime: AI_STATUS_STALE_TIME,
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when network reconnects
  });

  // Sync status to session store on successful fetch
  useEffect(() => {
    if (query.data) {
      setLastAIStatus(query.data);
    }
  }, [query.data, setLastAIStatus]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// Helper Hooks
// =============================================================================

/**
 * useAIAvailable Hook
 * 
 * Simple hook to check if AI is available.
 * Returns false while loading or on error.
 * 
 * @returns boolean indicating if AI is available
 * 
 * @example
 * ```tsx
 * const isAIAvailable = useAIAvailable();
 * 
 * if (!isAIAvailable) {
 *   return <FallbackUI />;
 * }
 * ```
 */
export function useAIAvailable(): boolean {
  const { data } = useAIStatus();
  return data?.available ?? false;
}

/**
 * useAIPhase Hook
 * 
 * Returns the current AI phase status.
 * Returns null while loading or on error.
 * 
 * @returns AIPhaseStatus or null
 * 
 * @example
 * ```tsx
 * const phase = useAIPhase();
 * 
 * if (phase?.currentPhase === 'A') {
 *   return <ReadOnlyBanner />;
 * }
 * ```
 */
export function useAIPhase(): AIPhaseStatus | null {
  const { data } = useAIStatus();
  return data?.phase ?? null;
}

/**
 * useAIEnabled Hook
 * 
 * Simple hook to check if AI is enabled (not disabled by config).
 * 
 * @returns boolean indicating if AI is enabled
 */
export function useAIEnabled(): boolean {
  const { data } = useAIStatus();
  return data?.enabled ?? false;
}

/**
 * useAIKillSwitchActive Hook
 * 
 * Check if any kill switch is active (global or tenant).
 * 
 * @returns boolean indicating if kill switch is active
 */
export function useAIKillSwitchActive(): boolean {
  const { data } = useAIStatus();
  if (!data) return false;
  return data.killSwitch.globalActive || data.killSwitch.tenantActive;
}

/**
 * useAIQuotaExceeded Hook
 * 
 * Check if any AI quota has been exceeded.
 * 
 * @returns boolean indicating if quota is exceeded
 */
export function useAIQuotaExceeded(): boolean {
  const { data } = useAIStatus();
  return data?.usage.anyQuotaExceeded ?? false;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Invalidate AI status cache
 * 
 * Call this to force a refetch of AI status.
 * Useful after actions that might change AI availability.
 * 
 * @param queryClient - TanStack Query client instance
 * 
 * @example
 * ```tsx
 * const queryClient = useQueryClient();
 * 
 * // After an action that might affect AI status
 * invalidateAIStatus(queryClient);
 * ```
 */
export function invalidateAIStatus(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: AI_STATUS_QUERY_KEY });
}

/**
 * Prefetch AI status
 * 
 * Prefetch AI status data before it's needed.
 * Useful for preloading on app initialization.
 * 
 * @param queryClient - TanStack Query client instance
 * 
 * @example
 * ```tsx
 * // In app initialization
 * const queryClient = useQueryClient();
 * await prefetchAIStatus(queryClient);
 * ```
 */
export async function prefetchAIStatus(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: AI_STATUS_QUERY_KEY,
    queryFn: fetchAIStatus,
    staleTime: AI_STATUS_STALE_TIME,
  });
}

// =============================================================================
// Default Export
// =============================================================================

export default useAIStatus;
