/**
 * usePendingActions Hook
 * 
 * This hook manages pending AI actions that require approval.
 * It syncs pending actions from the backend on mount and provides
 * utilities for checking and refreshing pending actions.
 * 
 * Key features:
 * - Sync pending actions from backend on mount
 * - Check for pending actions by action type (intent type)
 * - Refresh mechanism for pending actions
 * - Deduplication by planId
 * - Integration with aiSessionStore
 * 
 * @module ai/hooks/usePendingActions
 * 
 * Requirements: 14
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPendingActions } from '@/api/client/ai.client';
import { useAISessionStore } from '../stores/aiSessionStore';
import { useAIContext } from './useAIContext';
import type { ActionPlan, AIError, AIErrorCode } from '../types/ai.types';

// =============================================================================
// Constants
// =============================================================================

// Removed unused constant API_BASE_URL

/** Query key for pending actions */
export const PENDING_ACTIONS_QUERY_KEY = 'ai-pending-actions';

/** Default refetch interval for pending actions (30 seconds) */
export const PENDING_ACTIONS_REFETCH_INTERVAL = 30000;

/** Stale time for pending actions query (10 seconds) */
export const PENDING_ACTIONS_STALE_TIME = 10000;

// =============================================================================
// Types
// =============================================================================

/**
 * Options for usePendingActions hook
 */
export interface UsePendingActionsOptions {
  /** Whether to enable automatic fetching */
  enabled?: boolean;
  /** Refetch interval in milliseconds (default: 30000) */
  refetchInterval?: number;
  /** Override party ID from route params */
  partyIdOverride?: string | null;
  /** Callback when pending actions are synced */
  onSync?: (actions: ActionPlan[]) => void;
  /** Callback on sync error */
  onError?: (error: AIError) => void;
}

/**
 * Return type for usePendingActions hook
 */
export interface UsePendingActionsReturn {
  /** List of pending actions */
  pendingActions: ActionPlan[];
  /** Number of pending actions */
  pendingCount: number;
  /** Whether there are any pending actions */
  hasPending: boolean;
  /** Check if there's a pending action for a specific plan ID */
  hasPendingAction: (planId: string) => boolean;
  /** Check if there's a pending action for a specific action type (intent type) */
  hasPendingActionByType: (actionType: string) => boolean;
  /** Get pending actions filtered by action type */
  getPendingByType: (actionType: string) => ActionPlan[];
  /** Manually refresh pending actions from backend */
  refresh: () => Promise<void>;
  /** Clear all pending actions from local store */
  clearPending: () => void;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query is fetching (including background refetch) */
  isFetching: boolean;
  /** Error from the query */
  error: AIError | null;
  /** Whether context is valid for fetching */
  isContextValid: boolean;
}

/**
 * Response from pending actions endpoint
 */
interface PendingActionsResponse {
  actions: ActionPlan[];
  total: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse error response to AIError
 */
/**
 * Parse error response to AIError
 */
function parseErrorResponse(error: unknown): AIError {
  // Type guard for axios-like error structure
  const err = error as {
    response?: {
      status?: number;
      data?: {
        code?: string;
        message?: string;
        request_id?: string;
        requestId?: string;
        retry_after?: number;
        retryAfter?: number;
        details?: unknown;
      };
    };
  };

  if (err?.response?.data) {
    const data = err.response.data;

    if (data.code && typeof data.code === 'string') {
      return {
        code: data.code as AIErrorCode,
        message: data.message || 'An error occurred',
        requestId: data.request_id || data.requestId,
        retryAfter: data.retry_after || data.retryAfter,
        details: data.details,
      };
    }

    // Map HTTP status to error code
    const status = err.response.status;
    let code: AIErrorCode = 'INFERENCE_ERROR';

    if (status === 429) {
      code = 'RATE_LIMITED';
    } else if (status === 403) {
      code = 'PERMISSION_DENIED';
    } else if (status === 404) {
      code = 'NOT_FOUND';
    } else if (status === 400) {
      code = 'INVALID_REQUEST';
    }

    return {
      code,
      message: data.message || 'An error occurred',
    };
  }

  return {
    code: 'INFERENCE_ERROR',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
  };
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * usePendingActions Hook
 * 
 * Manages pending AI actions that require approval.
 * Syncs with backend on mount and provides utilities for checking pending actions.
 * 
 * @param options - Hook options
 * @returns Pending actions state and utilities
 * 
 * @example
 * ```tsx
 * const {
 *   pendingActions,
 *   hasPendingAction,
 *   hasPendingActionByType,
 *   refresh,
 * } = usePendingActions();
 * 
 * // Check if a specific action is pending
 * if (hasPendingAction('plan-123')) {
 *   console.log('Action is already pending');
 * }
 * 
 * // Check if any action of a type is pending
 * if (hasPendingActionByType('create_party')) {
 *   console.log('A create_party action is pending');
 * }
 * 
 * // Manually refresh
 * await refresh();
 * ```
 */
export function usePendingActions(
  options: UsePendingActionsOptions = {}
): UsePendingActionsReturn {
  const {
    enabled = true,
    refetchInterval = PENDING_ACTIONS_REFETCH_INTERVAL,
    partyIdOverride,
    onSync,
    onError,
  } = options;

  const queryClient = useQueryClient();

  // Get AI context
  const { context, isValid: isContextValid } = useAIContext({
    capability: 'actions',
    partyIdOverride,
  });

  // Session store for pending actions
  const pendingActionsFromStore = useAISessionStore((state) => state.pendingActions);
  const syncPendingActions = useAISessionStore((state) => state.syncPendingActions);
  const hasPendingActionInStore = useAISessionStore((state) => state.hasPendingAction);
  // const clearAllPending = useAISessionStore((state) => state.clearAll); // Unused

  // Query for fetching pending actions from backend
  const query = useQuery<PendingActionsResponse, AIError>({
    queryKey: [PENDING_ACTIONS_QUERY_KEY, context?.tenant_id, context?.party_id],
    queryFn: async () => {
      if (!context) {
        throw {
          code: 'INVALID_REQUEST',
          message: 'AI context not available',
        } as AIError;
      }

      try {
        const response = await getPendingActions({
          status: 'pending_approval',
          tenant_id: context.tenant_id,
          party_id: context.party_id,
        });

        return {
          actions: (response.actions || []).map((apiPlan) => ({
            planId: apiPlan.plan_id,
            status: apiPlan.status as import('../types/ai.types').ActionPlanStatus,
            overallRiskLevel: apiPlan.overall_risk_level as import('../types/ai.types').RiskLevel,
            requiresApproval: apiPlan.requires_approval,
            planHash: apiPlan.plan_hash,
            approvalToken: apiPlan.approval_token || undefined,
            createdAt: apiPlan.created_at,
            steps: (apiPlan.steps || []).map((s: {
              step_number: number;
              tool_name: string;
              tool_schema_version: string;
              parameters?: Record<string, unknown>;
              description: string;
              risk_level: string;
              requires_approval: boolean;
            }) => ({
              stepNumber: s.step_number,
              toolName: s.tool_name,
              toolSchemaVersion: s.tool_schema_version,
              parameters: s.parameters || {},
              description: s.description,
              riskLevel: s.risk_level as import('../types/ai.types').RiskLevel,
              requiresApproval: s.requires_approval,
            })),
          })),
          total: response.total || 0
        };
      } catch (error) {
        // If the endpoint doesn't exist or returns 404, return empty array
        // (axios error checking logic might differ slightly with orval/client wrapper but client throws axios error)
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 404) {
          return { actions: [], total: 0 };
        }
        throw parseErrorResponse(error);
      }
    },
    enabled: enabled && isContextValid,
    refetchInterval,
    staleTime: PENDING_ACTIONS_STALE_TIME,
    retry: 1,
    throwOnError: false,
  });

  // Sync pending actions to store when data changes
  useEffect(() => {
    if (query.data?.actions) {
      syncPendingActions(query.data.actions);
      onSync?.(query.data.actions);
    }
  }, [query.data, syncPendingActions, onSync]);

  // Handle errors
  useEffect(() => {
    if (query.error) {
      console.error('[usePendingActions] Error fetching pending actions:', query.error);
      onError?.(query.error);
    }
  }, [query.error, onError]);

  // ==========================================================================
  // Memoized Values
  // ==========================================================================

  /**
   * Get pending actions - prefer store data as it's more up-to-date
   */
  const pendingActions = useMemo(() => {
    return pendingActionsFromStore;
  }, [pendingActionsFromStore]);

  /**
   * Count of pending actions
   */
  const pendingCount = useMemo(() => {
    return pendingActions.length;
  }, [pendingActions]);

  /**
   * Whether there are any pending actions
   */
  const hasPending = useMemo(() => {
    return pendingCount > 0;
  }, [pendingCount]);

  // ==========================================================================
  // Callbacks
  // ==========================================================================

  /**
   * Check if there's a pending action for a specific plan ID
   */
  const hasPendingAction = useCallback(
    (planId: string): boolean => {
      return hasPendingActionInStore(planId);
    },
    [hasPendingActionInStore]
  );

  /**
   * Check if there's a pending action for a specific action type (intent type)
   * This is useful for preventing duplicate submissions of the same action type
   */
  const hasPendingActionByType = useCallback(
    (actionType: string): boolean => {
      return pendingActions.some((action) => {
        // Check if any step in the action plan matches the action type
        // The action type is typically stored in the first step's tool name
        // or can be derived from the plan metadata
        return action.steps.some((step) =>
          step.toolName === actionType ||
          step.description.toLowerCase().includes(actionType.toLowerCase())
        );
      });
    },
    [pendingActions]
  );

  /**
   * Get pending actions filtered by action type
   */
  const getPendingByType = useCallback(
    (actionType: string): ActionPlan[] => {
      return pendingActions.filter((action) => {
        return action.steps.some((step) =>
          step.toolName === actionType ||
          step.description.toLowerCase().includes(actionType.toLowerCase())
        );
      });
    },
    [pendingActions]
  );

  /**
   * Manually refresh pending actions from backend
   */
  const refresh = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: [PENDING_ACTIONS_QUERY_KEY],
    });
    await query.refetch();
  }, [queryClient, query]);

  /**
   * Clear all pending actions from local store
   * Note: This only clears local state, not backend
   */
  const clearPending = useCallback((): void => {
    syncPendingActions([]);
  }, [syncPendingActions]);

  return {
    pendingActions,
    pendingCount,
    hasPending,
    hasPendingAction,
    hasPendingActionByType,
    getPendingByType,
    refresh,
    clearPending,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error || null,
    isContextValid,
  };
}

// =============================================================================
// Selector Hooks for Optimized Re-renders
// =============================================================================

/**
 * Hook to get only pending actions count
 * Use this for badges or indicators to minimize re-renders
 */
export function usePendingActionsCount(): number {
  return useAISessionStore((state) => state.pendingActions.length);
}

/**
 * Hook to check if there are any pending actions
 */
export function useHasPendingActions(): boolean {
  return useAISessionStore((state) => state.pendingActions.length > 0);
}

/**
 * Hook to get pending action IDs only
 * Useful for checking membership without full action data
 */
export function usePendingActionIds(): string[] {
  return useAISessionStore((state) =>
    state.pendingActions.map((action) => action.planId)
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Invalidate pending actions query
 * Call this after creating, approving, or executing an action
 */
export function invalidatePendingActions(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: [PENDING_ACTIONS_QUERY_KEY] });
}

/**
 * Prefetch pending actions
 * Useful for preloading data before navigation
 */
export async function prefetchPendingActions(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  partyId?: string | null
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: [PENDING_ACTIONS_QUERY_KEY, tenantId, partyId],
    queryFn: async () => {
      const response = await getPendingActions({
        status: 'pending_approval',
        tenant_id: tenantId,
        party_id: partyId,
      });
      return {
        actions: (response.actions || []).map((apiPlan) => ({
          planId: apiPlan.plan_id,
          // Minimal mapping required for cache consistency
          status: apiPlan.status as import('../types/ai.types').ActionPlanStatus,
          overallRiskLevel: apiPlan.overall_risk_level as import('../types/ai.types').RiskLevel,
          requiresApproval: apiPlan.requires_approval,
          planHash: apiPlan.plan_hash,
          createdAt: apiPlan.created_at,
          steps: [], // Prefetch usually doesn't need deep steps, or map if critical
        }) as unknown as ActionPlan), // assertive cast to match return type
        total: response.total || 0
      };
    },
    staleTime: PENDING_ACTIONS_STALE_TIME,
  });
}

// =============================================================================
// Default Export
// =============================================================================

export default usePendingActions;
