/**
 * AI Stores - Dual Store Architecture
 * 
 * This module exports both AI stores:
 * - aiRuntimeStore: Ephemeral state (no persistence)
 * - aiSessionStore: Persisted state (localStorage)
 * 
 * @module ai/stores
 */

// Runtime Store (ephemeral)
export {
  useAIRuntimeStore,
  useCurrentPlan,
  useExecutionProgress,
  useIsTyping,
  useIsExecuting,
  clearAIRuntimeState,
} from './aiRuntimeStore';

// Session Store (persisted)
export {
  useAISessionStore,
  useChatHistory,
  useSessionId,
  useLastAIStatus,
  useStorePendingActions,
  useCurrentContext,
  clearAISessionOnLogout,
  hasPendingActionById,
  getCurrentAIContext,
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_AGE_MS,
} from './aiSessionStore';

// Re-export types for convenience
export type { AIRuntimeState, AISessionState } from '../types/ai.types';
