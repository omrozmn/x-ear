/**
 * AI Hooks - Web App
 * 
 * Central export point for all AI-related hooks.
 * 
 * @module ai/hooks
 */

// Context Hook
export {
  useAIContext,
  withAIContext,
  getAIContextSync,
  validateAIContext,
  AI_CONTEXT_VERSION,
  type UseAIContextOptions,
  type UseAIContextReturn,
} from './useAIContext';

// Context Sync Hook (for automatic context change detection)
export { useAIContextSync } from './useAIContextSync';

// Status Hook
export {
  useAIStatus,
  useAIAvailable,
  useAIPhase,
  useAIEnabled,
  useAIKillSwitchActive,
  useAIQuotaExceeded,
  invalidateAIStatus,
  prefetchAIStatus,
  AI_STATUS_QUERY_KEY,
  DEFAULT_REFETCH_INTERVAL,
  AI_STATUS_STALE_TIME,
} from './useAIStatus';

// Chat Hook
export {
  useAIChat,
  useAIChatTyping,
  useAIChatMessageCount,
  useAIChatLastMessage,
  type UseAIChatOptions,
} from './useAIChat';

// Actions Hook
export {
  useAIActions,
  useCreateAction,
  useApproveAction,
  useExecuteAction,
  useActionDetails,
  usePendingActionsCount,
  useIsActionInProgress,
  useCurrentExecutionProgress,
  ACTION_DETAILS_QUERY_KEY,
  PENDING_ACTIONS_QUERY_KEY,
  type UseAIActionsOptions,
  type UseAIActionsReturn,
  type CreateActionParams,
  type ApproveActionParams,
  type ExecuteActionParams,
} from './useAIActions';

// Pending Actions Hook
export {
  usePendingActions,
  usePendingActionsCount as usePendingActionsCountFromHook,
  useHasPendingActions,
  usePendingActionIds,
  invalidatePendingActions,
  prefetchPendingActions,
  PENDING_ACTIONS_QUERY_KEY as PENDING_ACTIONS_KEY,
  PENDING_ACTIONS_REFETCH_INTERVAL,
  PENDING_ACTIONS_STALE_TIME,
  type UsePendingActionsOptions,
  type UsePendingActionsReturn,
} from './usePendingActions';

// Admin Hooks
export * from './useAIMetrics';
export * from './useAIAudit';
export * from './useAISettings';
export * from './useApprovalQueue';
export * from './useKillSwitch';
