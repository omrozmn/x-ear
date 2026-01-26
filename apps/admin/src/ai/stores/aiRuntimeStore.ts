/**
 * AI Runtime Store - Ephemeral State Management
 * 
 * This store manages transient UI state that should NOT be persisted.
 * It handles real-time execution progress, typing indicators, and current action plans.
 * 
 * Key characteristics:
 * - NO persistence (state is lost on page refresh)
 * - Transient UI state only
 * - Used for real-time feedback during AI operations
 * 
 * @module ai/stores/aiRuntimeStore
 */

import { create } from 'zustand';
import type { ActionPlan, ExecutionProgress } from '../types/ai.types';

/**
 * AI Runtime Store State Interface
 */
interface AIRuntimeState {
  // Transient execution state
  currentPlan: ActionPlan | null;
  executionProgress: ExecutionProgress | null;
  isTyping: boolean;
  isExecuting: boolean;
}

/**
 * AI Runtime Store Actions Interface
 */
interface AIRuntimeActions {
  setCurrentPlan: (plan: ActionPlan | null) => void;
  setExecutionProgress: (progress: ExecutionProgress | null) => void;
  setIsTyping: (typing: boolean) => void;
  setIsExecuting: (executing: boolean) => void;
  clearRuntime: () => void;
}

/**
 * Combined AI Runtime Store Type
 */
type AIRuntimeStore = AIRuntimeState & AIRuntimeActions;

/**
 * Initial state for the runtime store
 */
const initialState: AIRuntimeState = {
  currentPlan: null,
  executionProgress: null,
  isTyping: false,
  isExecuting: false,
};

/**
 * AI Runtime Store
 * 
 * Ephemeral store for transient UI state during AI operations.
 * This store is NOT persisted - all state is lost on page refresh.
 * 
 * @example
 * ```tsx
 * const { isTyping, setIsTyping } = useAIRuntimeStore();
 * 
 * // Show typing indicator
 * setIsTyping(true);
 * 
 * // Clear all runtime state
 * useAIRuntimeStore.getState().clearRuntime();
 * ```
 */
export const useAIRuntimeStore = create<AIRuntimeStore>((set) => ({
  // Initial state
  ...initialState,

  // Actions
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  
  setExecutionProgress: (progress) => set({ executionProgress: progress }),
  
  setIsTyping: (typing) => set({ isTyping: typing }),
  
  setIsExecuting: (executing) => set({ isExecuting: executing }),
  
  /**
   * Clear all runtime state
   * Call this when:
   * - User navigates away from AI features
   * - Context changes (tenant/party)
   * - User logs out
   */
  clearRuntime: () => set(initialState),
}));

/**
 * Selector hooks for specific state slices
 * Use these for optimized re-renders
 */
export const useCurrentPlan = () => useAIRuntimeStore((state) => state.currentPlan);
export const useExecutionProgress = () => useAIRuntimeStore((state) => state.executionProgress);
export const useIsTyping = () => useAIRuntimeStore((state) => state.isTyping);
export const useIsExecuting = () => useAIRuntimeStore((state) => state.isExecuting);

/**
 * Helper to clear runtime state from outside React components
 * Useful for auth integration
 */
export function clearAIRuntimeState(): void {
  useAIRuntimeStore.getState().clearRuntime();
}
