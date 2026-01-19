/**
 * useKillSwitch Hook
 * 
 * Admin hook for managing AI kill switches at global, tenant, and capability scopes.
 * Provides status polling and activate/deactivate mutations.
 * 
 * @module ai-admin/hooks/useKillSwitch
 * @requirements Requirement 4: Admin Kill Switch Panel
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/orval-mutator';
import type {
  KillSwitchStatusResponse,
  KillSwitchActionRequest,
  KillSwitchActionResponse,
  KillSwitchScope,
  UseKillSwitchReturn,
} from '../types/ai-admin.types';

// Query key for kill switch status
const KILL_SWITCH_QUERY_KEY = ['ai-kill-switch-status'] as const;

// Default polling interval (10 seconds)
const DEFAULT_REFETCH_INTERVAL = 10000;

/**
 * Hook options for useKillSwitch
 */
export interface UseKillSwitchOptions {
  /** Enable/disable the query */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 10000) */
  refetchInterval?: number;
}

/**
 * Fetches kill switch status from the backend
 */
async function fetchKillSwitchStatus(): Promise<KillSwitchStatusResponse> {
  return adminApi<KillSwitchStatusResponse>({
    url: '/ai/admin/kill-switch',
    method: 'GET',
  });
}

/**
 * Sends kill switch action (activate/deactivate) to the backend
 */
async function sendKillSwitchAction(
  request: KillSwitchActionRequest
): Promise<KillSwitchActionResponse> {
  return adminApi<KillSwitchActionResponse>({
    url: '/ai/admin/kill-switch',
    method: 'POST',
    data: request,
  });
}

/**
 * useKillSwitch - Admin hook for AI kill switch management
 * 
 * Provides:
 * - Real-time status polling for kill switch states
 * - Mutations for activating/deactivating kill switches
 * - Support for global, tenant, and capability scopes
 * 
 * @example
 * ```tsx
 * const { 
 *   status, 
 *   isLoading, 
 *   activateGlobal, 
 *   deactivateGlobal,
 *   activateTenant,
 *   deactivateTenant,
 *   activateCapability,
 *   deactivateCapability
 * } = useKillSwitch();
 * 
 * // Activate global kill switch
 * await activateGlobal('Emergency maintenance');
 * 
 * // Deactivate tenant-specific kill switch
 * await deactivateTenant('tenant-123');
 * ```
 */
export function useKillSwitch(options: UseKillSwitchOptions = {}): UseKillSwitchReturn {
  const { enabled = true, refetchInterval = DEFAULT_REFETCH_INTERVAL } = options;
  const queryClient = useQueryClient();

  // Status query with polling
  const statusQuery = useQuery<KillSwitchStatusResponse>({
    queryKey: KILL_SWITCH_QUERY_KEY,
    queryFn: fetchKillSwitchStatus,
    enabled,
    refetchInterval,
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 2,
  });

  // Activate mutation
  const activateMutation = useMutation<
    KillSwitchActionResponse,
    Error,
    { scope: KillSwitchScope; targetId?: string; reason: string }
  >({
    mutationFn: async ({ scope, targetId, reason }) => {
      const request: KillSwitchActionRequest = {
        action: 'activate',
        scope,
        target_id: targetId,
        reason,
      };
      return sendKillSwitchAction(request);
    },
    onSuccess: () => {
      // Invalidate and refetch kill switch status
      queryClient.invalidateQueries({ queryKey: KILL_SWITCH_QUERY_KEY });
      // Also invalidate AI status as kill switch affects availability
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation<
    KillSwitchActionResponse,
    Error,
    { scope: KillSwitchScope; targetId?: string }
  >({
    mutationFn: async ({ scope, targetId }) => {
      const request: KillSwitchActionRequest = {
        action: 'deactivate',
        scope,
        target_id: targetId,
      };
      return sendKillSwitchAction(request);
    },
    onSuccess: () => {
      // Invalidate and refetch kill switch status
      queryClient.invalidateQueries({ queryKey: KILL_SWITCH_QUERY_KEY });
      // Also invalidate AI status as kill switch affects availability
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });
    },
  });

  // Combined loading state
  const isLoading =
    statusQuery.isLoading ||
    activateMutation.isPending ||
    deactivateMutation.isPending;

  // Global scope helpers
  const activateGlobal = async (reason: string): Promise<KillSwitchActionResponse> => {
    if (!reason.trim()) {
      throw new Error('Reason is required for activating kill switch');
    }
    return activateMutation.mutateAsync({ scope: 'global', reason });
  };

  const deactivateGlobal = async (): Promise<KillSwitchActionResponse> => {
    return deactivateMutation.mutateAsync({ scope: 'global' });
  };

  // Tenant scope helpers
  const activateTenant = async (
    tenantId: string,
    reason: string
  ): Promise<KillSwitchActionResponse> => {
    if (!tenantId.trim()) {
      throw new Error('Tenant ID is required');
    }
    if (!reason.trim()) {
      throw new Error('Reason is required for activating kill switch');
    }
    return activateMutation.mutateAsync({
      scope: 'tenant',
      targetId: tenantId,
      reason,
    });
  };

  const deactivateTenant = async (tenantId: string): Promise<KillSwitchActionResponse> => {
    if (!tenantId.trim()) {
      throw new Error('Tenant ID is required');
    }
    return deactivateMutation.mutateAsync({
      scope: 'tenant',
      targetId: tenantId,
    });
  };

  // Capability scope helpers
  const activateCapability = async (
    capability: string,
    reason: string
  ): Promise<KillSwitchActionResponse> => {
    if (!capability.trim()) {
      throw new Error('Capability name is required');
    }
    if (!reason.trim()) {
      throw new Error('Reason is required for activating kill switch');
    }
    return activateMutation.mutateAsync({
      scope: 'capability',
      targetId: capability,
      reason,
    });
  };

  const deactivateCapability = async (
    capability: string
  ): Promise<KillSwitchActionResponse> => {
    if (!capability.trim()) {
      throw new Error('Capability name is required');
    }
    return deactivateMutation.mutateAsync({
      scope: 'capability',
      targetId: capability,
    });
  };

  return {
    status: statusQuery.data,
    isLoading,
    activateGlobal,
    deactivateGlobal,
    activateTenant,
    deactivateTenant,
    activateCapability,
    deactivateCapability,
  };
}

export default useKillSwitch;
