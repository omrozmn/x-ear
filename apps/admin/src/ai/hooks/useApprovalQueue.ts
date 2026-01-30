/**
 * useApprovalQueue Hook
 * 
 * Admin hook for managing the AI approval queue.
 * Provides queue listing with tenant filtering, approve/reject mutations,
 * and real-time polling for updates.
 * 
 * @module ai-admin/hooks/useApprovalQueue
 * @requirements Requirement 5: Admin Approval Queue
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/orval-mutator';
import type {
  PendingApprovalItem,
  ApprovalQueueResponse,
  UseApprovalQueueReturn,
} from '../types/ai-admin.types';

// Query key for approval queue
const APPROVAL_QUEUE_QUERY_KEY = ['ai-approval-queue'] as const;

// Default polling interval (15 seconds for real-time updates)
const DEFAULT_REFETCH_INTERVAL = 15000;

/**
 * Hook options for useApprovalQueue
 */
export interface UseApprovalQueueOptions {
  /** Filter by tenant ID */
  tenantId?: string;
  /** Enable/disable the query */
  enabled?: boolean;
  /** Polling interval in milliseconds (default: 15000) */
  refetchInterval?: number;
}

/**
 * Response from approve/reject mutations
 */
interface ApprovalActionResponse {
  success: boolean;
  action_id: string;
  status: string;
  message?: string;
}

/**
 * Fetches pending approvals from the backend
 */
async function fetchApprovalQueue(tenantId?: string): Promise<ApprovalQueueResponse> {
  const params = tenantId ? { tenant_id: tenantId } : undefined;

  const response = await adminApi<{
    items: Array<{
      id: string;
      action_id: string;
      risk_level: string;
      risk_reasoning?: string;
      tenant_id: string;
      user_id: string;
      created_at: string;
      expires_at: string;
      status: string;
    }>;
    total: number;
  }>({
    url: '/ai/admin/pending-approvals',
    method: 'GET',
    params,
  });

  const actualData = (response as any).data || response;
  const rawItems = actualData.items || (Array.isArray(actualData) ? actualData : []);

  // Transform backend response to frontend types
  const items: PendingApprovalItem[] = rawItems.map((item: any) => ({
    action_id: item.action_id,
    plan_id: item.id, // Using queue item id as plan_id
    tenant_id: item.tenant_id,
    user_id: item.user_id,
    risk_level: item.risk_level as 'low' | 'medium' | 'high' | 'critical',
    steps_count: 0, // Not provided by backend, will be fetched in detail view
    steps_summary: [], // Not provided by backend, will be fetched in detail view
    created_at: item.created_at,
    expires_at: item.expires_at,
    approval_token: '', // Token is managed separately
    plan_hash: '', // Hash is managed separately
  }));

  return {
    items,
    total: actualData.total || items.length,
    page: 1,
    page_size: items.length,
  };
}

/**
 * Approves an action via the backend
 */
async function approveAction(params: {
  actionId: string;
  approvalToken: string;
  comment?: string;
}): Promise<ApprovalActionResponse> {
  return adminApi<ApprovalActionResponse>({
    url: `/ai/actions/${params.actionId}/approve`,
    method: 'POST',
    data: {
      approval_token: params.approvalToken,
      approver_comment: params.comment,
    },
  });
}

/**
 * Rejects an action via the backend
 */
async function rejectAction(params: {
  actionId: string;
  reason: string;
}): Promise<ApprovalActionResponse> {
  return adminApi<ApprovalActionResponse>({
    url: `/ai/actions/${params.actionId}/reject`,
    method: 'POST',
    data: {
      reason: params.reason,
    },
  });
}

/**
 * useApprovalQueue - Admin hook for AI approval queue management
 * 
 * Provides:
 * - Real-time polling for pending approvals
 * - Tenant-based filtering
 * - Approve and reject mutations
 * 
 * @example
 * ```tsx
 * const { 
 *   items, 
 *   total,
 *   isLoading, 
 *   approve, 
 *   reject,
 *   isApproving,
 *   isRejecting
 * } = useApprovalQueue({ tenantId: 'tenant-123' });
 * 
 * // Approve an action
 * await approve({ actionId: 'action-123', approvalToken: 'token...' });
 * 
 * // Reject an action
 * await reject({ actionId: 'action-123', reason: 'Risk too high' });
 * ```
 */
export function useApprovalQueue(
  options: UseApprovalQueueOptions = {}
): UseApprovalQueueReturn {
  const {
    tenantId,
    enabled = true,
    refetchInterval = DEFAULT_REFETCH_INTERVAL,
  } = options;

  const queryClient = useQueryClient();

  // Build query key with tenant filter
  const queryKey = tenantId
    ? [...APPROVAL_QUEUE_QUERY_KEY, { tenantId }]
    : APPROVAL_QUEUE_QUERY_KEY;

  // Queue query with polling
  const queueQuery = useQuery<ApprovalQueueResponse>({
    queryKey,
    queryFn: () => fetchApprovalQueue(tenantId),
    enabled,
    refetchInterval,
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: 2,
  });

  // Approve mutation
  const approveMutation = useMutation<
    ApprovalActionResponse,
    Error,
    { actionId: string; approvalToken: string; comment?: string }
  >({
    mutationFn: approveAction,
    onSuccess: () => {
      // Invalidate and refetch approval queue
      queryClient.invalidateQueries({ queryKey: APPROVAL_QUEUE_QUERY_KEY });
      // Also invalidate AI status as approvals affect pending count
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation<
    ApprovalActionResponse,
    Error,
    { actionId: string; reason: string }
  >({
    mutationFn: rejectAction,
    onSuccess: () => {
      // Invalidate and refetch approval queue
      queryClient.invalidateQueries({ queryKey: APPROVAL_QUEUE_QUERY_KEY });
      // Also invalidate AI status as rejections affect pending count
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });
    },
  });

  // Combined loading state
  const isLoading =
    queueQuery.isLoading ||
    approveMutation.isPending ||
    rejectMutation.isPending;

  // Approve helper
  const approve = async (params: {
    actionId: string;
    approvalToken: string;
    comment?: string;
  }): Promise<void> => {
    if (!params.actionId.trim()) {
      throw new Error('Action ID is required');
    }
    if (!params.approvalToken.trim()) {
      throw new Error('Approval token is required');
    }
    await approveMutation.mutateAsync(params);
  };

  // Reject helper
  const reject = async (params: {
    actionId: string;
    reason: string;
  }): Promise<void> => {
    if (!params.actionId.trim()) {
      throw new Error('Action ID is required');
    }
    if (!params.reason.trim()) {
      throw new Error('Rejection reason is required');
    }
    await rejectMutation.mutateAsync(params);
  };

  return {
    items: queueQuery.data?.items ?? [],
    total: queueQuery.data?.total ?? 0,
    isLoading,
    approve,
    reject,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}

export default useApprovalQueue;
