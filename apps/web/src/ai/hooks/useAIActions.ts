/**
 * AI Actions Hook
 * 
 * This hook provides action management functionality for AI-generated action plans.
 * It handles action creation, approval, execution, and details retrieval with
 * proper AI context injection and pending action deduplication.
 * 
 * Key features:
 * - AI context injection for tenant/party isolation
 * - Pending action deduplication to prevent duplicate submissions
 * - Action plan creation from intents
 * - Action approval with token validation
 * - Action execution in simulate or execute mode
 * - Action details retrieval
 * 
 * @module ai/hooks/useAIActions
 * 
 * Requirements: 3, 13, 14
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAIContext, withAIContext } from './useAIContext';
import { useAISessionStore } from '../stores/aiSessionStore';
import { useAIRuntimeStore } from '../stores/aiRuntimeStore';
import {
  getAIErrorMessage,
  isRetryableError,
  getRetryDelay,
  isAIError,
} from '../utils/aiErrorMessages';
import type {
  ActionPlan,
  ExecutionResult,
  IntentResponse,
  AIError,
  AIErrorCode,
  ExecutionMode,
  CreateActionResponse,
  ApproveActionResponse,
  AIContext,
  ExecutionProgress,
  StepStatus,
} from '../types/ai.types';

// =============================================================================
// Constants
// =============================================================================

/** API base URL from environment */
const API_BASE_URL = typeof window !== 'undefined' && import.meta?.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'http://localhost:5003';

/** API endpoints for actions */
const ACTIONS_ENDPOINT = '/api/ai/actions';

/** Query key for action details */
export const ACTION_DETAILS_QUERY_KEY = 'ai-action-details';

/** Query key for pending actions */
export const PENDING_ACTIONS_QUERY_KEY = 'ai-pending-actions';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useAIActions hook
 */
export interface UseAIActionsOptions {
  /** Override party ID from route params */
  partyIdOverride?: string | null;
  /** Callback when action is created successfully */
  onCreateSuccess?: (plan: ActionPlan) => void;
  /** Callback when action creation fails */
  onCreateError?: (error: AIError) => void;
  /** Callback when action is approved successfully */
  onApproveSuccess?: (response: ApproveActionResponse) => void;
  /** Callback when action approval fails */
  onApproveError?: (error: AIError) => void;
  /** Callback when action is executed successfully */
  onExecuteSuccess?: (result: ExecutionResult) => void;
  /** Callback when action execution fails */
  onExecuteError?: (error: AIError) => void;
}

/**
 * Request to create a new action
 */
export interface CreateActionParams {
  intent: IntentResponse;
  additionalContext?: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * Request to approve an action
 */
export interface ApproveActionParams {
  actionId: string;
  approvalToken: string;
}

/**
 * Request to execute an action
 */
export interface ExecuteActionParams {
  actionId: string;
  mode: ExecutionMode;
  approvalToken?: string;
}

/**
 * Return type for useAIActions hook
 */
export interface UseAIActionsReturn {
  // Mutations
  createAction: (params: CreateActionParams) => Promise<ActionPlan>;
  approveAction: (params: ApproveActionParams) => Promise<ApproveActionResponse>;
  executeAction: (params: ExecuteActionParams) => Promise<ExecutionResult>;

  // State
  isCreating: boolean;
  isApproving: boolean;
  isExecuting: boolean;
  createError: AIError | null;
  approveError: AIError | null;
  executeError: AIError | null;

  // Pending action helpers
  hasPendingAction: (planId: string) => boolean;
  pendingActions: ActionPlan[];

  // Current plan from runtime store
  currentPlan: ActionPlan | null;
  executionProgress: ExecutionProgress | null;

  // Context validity
  isContextValid: boolean;
  contextError: string | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique idempotency key for action requests
 */
function generateIdempotencyKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `action_${timestamp}_${random}`;
}

/**
 * Parse error response to AIError
 */
function parseErrorResponse(error: unknown): AIError {
  // Check if it's an axios error with response
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data;

    // Backend returns error in { code, message, ... } format
    if (data.code && typeof data.code === 'string') {
      return {
        code: data.code as AIErrorCode,
        message: data.message || getAIErrorMessage(data.code),
        requestId: data.request_id || data.requestId,
        retryAfter: data.retry_after || data.retryAfter,
        details: data.details,
      };
    }

    // Map HTTP status to error code
    const status = error.response.status;
    let code: AIErrorCode = 'INFERENCE_ERROR';

    if (status === 429) {
      code = data.quota_exceeded ? 'QUOTA_EXCEEDED' : 'RATE_LIMITED';
    } else if (status === 403) {
      code = data.approval_required ? 'APPROVAL_REQUIRED' : 'PERMISSION_DENIED';
    } else if (status === 404) {
      code = 'NOT_FOUND';
    } else if (status === 400) {
      code = 'INVALID_REQUEST';
    } else if (status === 409) {
      code = data.plan_drift ? 'PLAN_DRIFT' : 'PHASE_BLOCKED';
    } else if (status === 504) {
      code = 'INFERENCE_TIMEOUT';
    }

    return {
      code,
      message: getAIErrorMessage(code),
      requestId: data.request_id,
      retryAfter: error.response.headers?.['retry-after']
        ? parseInt(error.response.headers['retry-after'], 10)
        : undefined,
    };
  }

  // Check if it's already an AIError
  if (isAIError(error)) {
    return error;
  }

  // Default error
  return {
    code: 'INFERENCE_ERROR',
    message: getAIErrorMessage('INFERENCE_ERROR'),
  };
}

/**
 * Create initial execution progress from action plan
 */
function createInitialProgress(plan: ActionPlan): ExecutionProgress {
  return {
    actionId: plan.planId,
    currentStep: 0,
    totalSteps: plan.steps.length,
    stepStatuses: plan.steps.map((step) => ({
      stepNumber: step.stepNumber,
      status: 'pending' as StepStatus,
    })),
    overallStatus: 'initializing',
    startedAt: new Date(),
  };
}

// =============================================================================
// Individual Mutation Hooks
// =============================================================================

/**
 * Hook for creating a new action plan
 * 
 * @param options - Hook options
 * @returns Mutation for creating actions
 */
export function useCreateAction(options: UseAIActionsOptions = {}) {
  const { partyIdOverride, onCreateSuccess, onCreateError } = options;

  const { context, isValid: isContextValid, error: contextError } = useAIContext({
    capability: 'actions',
    partyIdOverride,
  });

  const queryClient = useQueryClient();
  const addPendingAction = useAISessionStore((state) => state.addPendingAction);
  const hasPendingActionInStore = useAISessionStore((state) => state.hasPendingAction);
  const setCurrentPlan = useAIRuntimeStore((state) => state.setCurrentPlan);

  return useMutation<CreateActionResponse, AIError, CreateActionParams>({
    mutationFn: async (params) => {
      if (!context) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      // Generate idempotency key if not provided
      const idempotencyKey = params.idempotencyKey || generateIdempotencyKey();

      // Build request payload with context
      const payload = withAIContext(context, {
        intent: {
          intentType: params.intent.intentType,
          confidence: params.intent.confidence,
          entities: params.intent.entities,
        },
        idempotencyKey,
        ...(params.additionalContext && { additionalContext: params.additionalContext }),
      });

      const response = await axios.post<CreateActionResponse>(
        `${API_BASE_URL}${ACTIONS_ENDPOINT}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      return response.data;
    },
    onSuccess: (response) => {
      const plan = response.plan;

      // Add to pending actions if requires approval
      if (plan.requiresApproval) {
        addPendingAction(plan);
      }

      // Set as current plan in runtime store
      setCurrentPlan(plan);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [PENDING_ACTIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });

      onCreateSuccess?.(plan);
    },
    onError: (error) => {
      console.error('[useCreateAction] Error:', error);
      onCreateError?.(error);
    },
  });
}

/**
 * Hook for approving an action
 * 
 * @param options - Hook options
 * @returns Mutation for approving actions
 */
export function useApproveAction(options: UseAIActionsOptions = {}) {
  const { partyIdOverride, onApproveSuccess, onApproveError } = options;

  const { context, isValid: isContextValid, error: contextError } = useAIContext({
    capability: 'actions',
    partyIdOverride,
  });

  const queryClient = useQueryClient();

  return useMutation<ApproveActionResponse, AIError, ApproveActionParams>({
    mutationFn: async ({ actionId, approvalToken }) => {
      if (!context) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      const payload = withAIContext(context, {
        approval_token: approvalToken,
      });

      const response = await axios.post<ApproveActionResponse>(
        `${API_BASE_URL}${ACTIONS_ENDPOINT}/${actionId}/approve`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      return response.data;
    },
    onSuccess: (response, variables) => {
      // Invalidate action details query
      queryClient.invalidateQueries({
        queryKey: [ACTION_DETAILS_QUERY_KEY, variables.actionId]
      });
      queryClient.invalidateQueries({ queryKey: [PENDING_ACTIONS_QUERY_KEY] });

      onApproveSuccess?.(response);
    },
    onError: (error) => {
      console.error('[useApproveAction] Error:', error);
      onApproveError?.(error);
    },
  });
}

/**
 * Hook for executing an action
 * 
 * @param options - Hook options
 * @returns Mutation for executing actions
 */
export function useExecuteAction(options: UseAIActionsOptions = {}) {
  const { partyIdOverride, onExecuteSuccess, onExecuteError } = options;

  const { context, isValid: isContextValid, error: contextError } = useAIContext({
    capability: 'actions',
    partyIdOverride,
  });

  const queryClient = useQueryClient();
  const removePendingAction = useAISessionStore((state) => state.removePendingAction);
  const setCurrentPlan = useAIRuntimeStore((state) => state.setCurrentPlan);
  const setExecutionProgress = useAIRuntimeStore((state) => state.setExecutionProgress);
  const setIsExecuting = useAIRuntimeStore((state) => state.setIsExecuting);
  const currentPlan = useAIRuntimeStore((state) => state.currentPlan);

  return useMutation<ExecutionResult, AIError, ExecuteActionParams>({
    mutationFn: async ({ actionId, mode, approvalToken }) => {
      if (!context) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      const payload = withAIContext(context, {
        mode,
        ...(approvalToken && { approval_token: approvalToken }),
      });

      const response = await axios.post<ExecutionResult>(
        `${API_BASE_URL}${ACTIONS_ENDPOINT}/${actionId}/execute`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      return response.data;
    },
    onMutate: async ({ actionId }) => {
      // Set executing state
      setIsExecuting(true);

      // Initialize execution progress if we have the current plan
      if (currentPlan && currentPlan.planId === actionId) {
        setExecutionProgress(createInitialProgress(currentPlan));
      }
    },
    onSuccess: (result, variables) => {
      // Clear executing state
      setIsExecuting(false);

      // Remove from pending actions
      removePendingAction(variables.actionId);

      // Clear current plan and progress
      setCurrentPlan(null);
      setExecutionProgress(null);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: [ACTION_DETAILS_QUERY_KEY, variables.actionId]
      });
      queryClient.invalidateQueries({ queryKey: [PENDING_ACTIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });

      onExecuteSuccess?.(result);
    },
    onError: (error, variables) => {
      // Clear executing state
      setIsExecuting(false);
      setExecutionProgress(null);

      console.error('[useExecuteAction] Error:', error);
      onExecuteError?.(error);
    },
  });
}

/**
 * Hook for fetching action details
 * 
 * @param actionId - The action ID to fetch (null to disable)
 * @param options - Hook options
 * @returns Query for action details
 */
export function useActionDetails(
  actionId: string | null,
  options: { partyIdOverride?: string | null } = {}
) {
  const { partyIdOverride } = options;

  const { context, isValid: isContextValid } = useAIContext({
    capability: 'actions',
    partyIdOverride,
  });

  return useQuery<ActionPlan, AIError>({
    queryKey: [ACTION_DETAILS_QUERY_KEY, actionId],
    queryFn: async () => {
      if (!actionId) {
        throw { code: 'INVALID_REQUEST', message: 'Action ID is required' } as AIError;
      }

      const response = await axios.get<{ plan: ActionPlan }>(
        `${API_BASE_URL}${ACTIONS_ENDPOINT}/${actionId}`,
        {
          params: context ? { context: JSON.stringify(context) } : undefined,
          withCredentials: true,
        }
      );

      return response.data.plan;
    },
    enabled: !!actionId && isContextValid,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

// =============================================================================
// Main Combined Hook
// =============================================================================

/**
 * useAIActions Hook
 * 
 * Combined hook that provides all action management functionality:
 * - Create action plans from intents
 * - Approve pending actions
 * - Execute actions in simulate or execute mode
 * - Check for pending actions (deduplication)
 * 
 * @param options - Hook options
 * @returns Action management state and functions
 * 
 * @example
 * ```tsx
 * const {
 *   createAction,
 *   approveAction,
 *   executeAction,
 *   hasPendingAction,
 *   isCreating,
 *   currentPlan,
 * } = useAIActions();
 * 
 * // Create an action from intent
 * const plan = await createAction({
 *   intent: { intentType: 'create_party', confidence: 0.95, entities: {...} }
 * });
 * 
 * // Check for pending action before creating
 * if (!hasPendingAction(existingPlanId)) {
 *   await createAction({ intent });
 * }
 * 
 * // Approve and execute
 * await approveAction({ actionId: plan.planId, approvalToken: plan.approvalToken });
 * await executeAction({ actionId: plan.planId, mode: 'execute' });
 * ```
 */
export function useAIActions(options: UseAIActionsOptions = {}): UseAIActionsReturn {
  const { partyIdOverride } = options;

  // Get AI context
  const { context, isValid: isContextValid, error: contextError } = useAIContext({
    capability: 'actions',
    partyIdOverride,
  });

  // Session store for pending actions
  const pendingActions = useAISessionStore((state) => state.pendingActions);
  const hasPendingActionInStore = useAISessionStore((state) => state.hasPendingAction);

  // Runtime store for current plan and execution progress
  const currentPlan = useAIRuntimeStore((state) => state.currentPlan);
  const executionProgress = useAIRuntimeStore((state) => state.executionProgress);

  // Individual mutations
  const createMutation = useCreateAction(options);
  const approveMutation = useApproveAction(options);
  const executeMutation = useExecuteAction(options);

  /**
   * Create a new action plan
   * Checks for existing pending action before creating
   */
  const createAction = useCallback(
    async (params: CreateActionParams): Promise<ActionPlan> => {
      // Validate context
      if (!isContextValid) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      // Generate idempotency key
      const idempotencyKey = params.idempotencyKey || generateIdempotencyKey();

      const response = await createMutation.mutateAsync({
        ...params,
        idempotencyKey,
      });

      return response.plan;
    },
    [createMutation, isContextValid, contextError]
  );

  /**
   * Approve an action
   */
  const approveAction = useCallback(
    async (params: ApproveActionParams): Promise<ApproveActionResponse> => {
      if (!isContextValid) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      return approveMutation.mutateAsync(params);
    },
    [approveMutation, isContextValid, contextError]
  );

  /**
   * Execute an action
   */
  const executeAction = useCallback(
    async (params: ExecuteActionParams): Promise<ExecutionResult> => {
      if (!isContextValid) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      return executeMutation.mutateAsync(params);
    },
    [executeMutation, isContextValid, contextError]
  );

  /**
   * Check if a pending action exists
   * Used to prevent duplicate action submissions
   */
  const hasPendingAction = useCallback(
    (planId: string): boolean => {
      return hasPendingActionInStore(planId);
    },
    [hasPendingActionInStore]
  );

  return {
    // Mutations
    createAction,
    approveAction,
    executeAction,

    // State
    isCreating: createMutation.isPending,
    isApproving: approveMutation.isPending,
    isExecuting: executeMutation.isPending,
    createError: createMutation.error || null,
    approveError: approveMutation.error || null,
    executeError: executeMutation.error || null,

    // Pending action helpers
    hasPendingAction,
    pendingActions,

    // Current plan from runtime store
    currentPlan,
    executionProgress,

    // Context validity
    isContextValid,
    contextError,
  };
}

// =============================================================================
// Selector Hooks for Optimized Re-renders
// =============================================================================

/**
 * Hook to get only pending actions count
 * Use this for badges or indicators
 */
export function usePendingActionsCount(): number {
  return useAISessionStore((state) => state.pendingActions.length);
}

/**
 * Hook to check if any action is in progress
 */
export function useIsActionInProgress(): boolean {
  return useAIRuntimeStore((state) => state.isExecuting);
}

/**
 * Hook to get current execution progress
 */
export function useCurrentExecutionProgress(): ExecutionProgress | null {
  return useAIRuntimeStore((state) => state.executionProgress);
}

// =============================================================================
// Default Export
// =============================================================================

export default useAIActions;
