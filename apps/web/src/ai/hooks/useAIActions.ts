import { useCallback } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
// eslint-disable-next-line no-restricted-imports
import axios from 'axios';
import type {
  CreateActionRequest,
  ApproveActionRequest,
  ExecuteActionRequest,
  AiActionPlanResponse as ApiActionPlanResponse,
  AiActionStepResponse as ApiActionStepResponse,
} from '@/api/generated/schemas';
import { useAIContext, withAIContext } from './useAIContext';
import { useAISessionStore } from '../stores/aiSessionStore';
import { useAIRuntimeStore } from '../stores/aiRuntimeStore';
import {
  getAIErrorMessage,
  isAIError,
} from '../utils/aiErrorMessages';
import {
  createActionApiAiActionsPost,
  approveActionApiAiActionsActionIdApprovePost,
  executeActionApiAiActionsActionIdExecutePost,
  getActionApiAiActionsActionIdGet
} from '@/api/client/ai.client';
import type {
  ActionPlan,
  ExecutionResult,
  IntentResponse,
  AIErrorCode,
  AIError,
  ApproveActionResponse,
  ExecutionProgress,
  StepStatus,
  ActionPlanStatus,
  RiskLevel,
  ExecutionMode,
} from '../types/ai.types';

// =============================================================================
// Constants
// =============================================================================

// Removed unused constants

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

interface AIBackendError {
  code?: string;
  message?: string;
  request_id?: string;
  requestId?: string;
  retry_after?: number;
  retryAfter?: number;
  details?: Record<string, unknown>;
  quota_exceeded?: boolean;
  approval_required?: boolean;
  plan_drift?: boolean;
}

/**
 * Parse error response to AIError
 */
function parseErrorResponse(error: unknown): AIError {
  // Check if it's an axios error with response
  if (axios.isAxiosError(error)) {
    const data = (error.response?.data as AIBackendError) || {};

    // Backend returns error in { code, message, ... } format
    if (data.code && typeof data.code === 'string') {
      return {
        code: data.code as AIErrorCode,
        message: data.message || getAIErrorMessage(data.code as AIErrorCode),
        requestId: data.request_id || data.requestId,
        retryAfter: data.retry_after || data.retryAfter,
        details: data.details,
      };
    }

    // Map HTTP status to error code
    const status = error.response?.status;
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
      requestId: data.request_id || data.requestId,
      retryAfter: error.response?.headers?.['retry-after']
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

/**
 * Helper to map API ActionPlanResponse to local ActionPlan
 */
function mapActionPlanResponse(apiPlan: ApiActionPlanResponse): ActionPlan {
  return {
    planId: apiPlan.plan_id,
    status: apiPlan.status as ActionPlanStatus,
    overallRiskLevel: apiPlan.overall_risk_level as RiskLevel,
    requiresApproval: apiPlan.requires_approval,
    planHash: apiPlan.plan_hash,
    approvalToken: apiPlan.approval_token || undefined,
    createdAt: apiPlan.created_at,
    // expiresAt: apiPlan.expires_at,
    steps: apiPlan.steps.map((s: ApiActionStepResponse) => ({
      stepNumber: s.step_number,
      toolName: s.tool_name,
      toolSchemaVersion: s.tool_schema_version,
      parameters: s.parameters || {},
      description: s.description,
      riskLevel: s.risk_level as RiskLevel,
      requiresApproval: s.requires_approval,
    })),
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
  const setCurrentPlan = useAIRuntimeStore((state) => state.setCurrentPlan);

  return useMutation<ActionPlan, AIError, CreateActionParams>({
    mutationFn: async (params) => {
      if (!isContextValid) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      // Generate idempotency key if not provided
      const idempotencyKey = params.idempotencyKey || generateIdempotencyKey();

      // Build request payload with context
      // Map to API type (snake_case)
      const apiPayload: CreateActionRequest = {
        intent: {
          intent_type: params.intent.intentType,
          confidence: params.intent.confidence,
          entities: params.intent.entities || {},
        },
        idempotency_key: idempotencyKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context: withAIContext(context, params.additionalContext || {}) as any,
      };

      try {
        const response = await createActionApiAiActionsPost(apiPayload);

        // Map response back to camelCase
        const apiPlan = response.plan;
        if (!apiPlan) {
          throw { code: 'INFERENCE_ERROR', message: 'No plan returned' } as AIError;
        }

        return mapActionPlanResponse(apiPlan);
      } catch (error) {
        throw parseErrorResponse(error);
      }
    },
    onSuccess: (plan) => {
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
      if (!isContextValid) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      // Map to API type (snake_case)
      const apiPayload: ApproveActionRequest = {
        approval_token: approvalToken,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        approver_comment: (withAIContext(context, {}) as any).context?.context_version, // Hack to pass context if needed, but endpoint expects simple body
      };

      // Note: Endpoint seems to mainly need approval_token in body
      // We'll rely on global axios interceptors for context headers if needed, 
      // or if context is required in body, we need to adjust schema.
      // Based on schema `ApproveActionRequest`, it only takes approval_token and comment.

      try {
        const response = await approveActionApiAiActionsActionIdApprovePost(actionId, apiPayload);

        return {
          status: response.status,
          actionId: response.action_id,
        };
      } catch (error) {
        throw parseErrorResponse(error);
      }
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

  const { isValid: isContextValid, error: contextError } = useAIContext({
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
      if (!isContextValid) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      // Map to API type (snake_case)
      const apiPayload: ExecuteActionRequest = {
        mode: mode,
        approval_token: approvalToken,
        idempotency_key: generateIdempotencyKey(),
      };

      try {
        const response = await executeActionApiAiActionsActionIdExecutePost(actionId, apiPayload);

        // Map execution result
        return {
          actionId: response.action_id,
          requestId: response.request_id,
          status: response.status as import('../types/ai.types').ExecutionStatus,
          mode: response.mode as import('../types/ai.types').ExecutionMode,
          stepResults: response.step_results.map(s => ({
            stepNumber: s.step_number,
            toolName: s.tool_name,
            status: s.status as import('../types/ai.types').StepStatus,
            result: s.result || {},
            errorMessage: s.error_message || undefined,
            executionTimeMs: s.execution_time_ms,
          })),
          totalExecutionTimeMs: response.total_execution_time_ms,
          errorMessage: response.error_message || undefined,
        };
      } catch (error) {
        throw parseErrorResponse(error);
      }
    },
    onMutate: async ({ actionId }) => {
      // Set executing state
      setIsExecuting(true);

      // Initialize execution progress if we have the current plan
      if (currentPlan && currentPlan.planId === actionId) {
        setExecutionProgress(createInitialProgress(currentPlan));
      }
    },
    onSuccess: (result, _variables) => {
      // Clear executing state
      setIsExecuting(false);

      // Remove from pending actions
      removePendingAction(_variables.actionId);

      // Clear current plan and progress
      setCurrentPlan(null);
      setExecutionProgress(null);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: [ACTION_DETAILS_QUERY_KEY, _variables.actionId]
      });
      queryClient.invalidateQueries({ queryKey: [PENDING_ACTIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });

      onExecuteSuccess?.(result);
    },
    onError: (error) => {
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

  const { isValid: isContextValid } = useAIContext({
    capability: 'actions',
    partyIdOverride,
  });

  return useQuery<ActionPlan, AIError>({
    queryKey: [ACTION_DETAILS_QUERY_KEY, actionId],
    queryFn: async () => {
      if (!actionId) {
        throw { code: 'INVALID_REQUEST', message: 'Action ID is required' } as AIError;
      }

      const response = await getActionApiAiActionsActionIdGet(actionId);

      if (!response.plan) {
        throw { code: 'NOT_FOUND', message: 'Action plan not found' } as AIError;
      }

      return mapActionPlanResponse(response.plan);
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
  const { isValid: isContextValid, error: contextError } = useAIContext({
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

      return response;
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
