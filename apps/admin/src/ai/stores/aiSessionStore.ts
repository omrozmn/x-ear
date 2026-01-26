/**
 * AI Session Store - Persisted State Management
 * 
 * This store manages session state that SHOULD be persisted across page refreshes.
 * It handles chat history, pending actions, and context tracking.
 * 
 * Key characteristics:
 * - Persisted to localStorage
 * - Scoped by party_id and tenant_id
 * - Automatic cleanup on context change
 * - Retention policy: max 100 messages, 24h max age
 * 
 * @module ai/stores/aiSessionStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AIStatus, ChatMessage, ActionPlan } from '../types/ai.types';

// =============================================================================
// Retention Policy Constants
// =============================================================================

/**
 * Maximum number of chat messages to retain
 * Older messages are automatically removed when this limit is exceeded
 */
export const MAX_CHAT_MESSAGES = 100;

/**
 * Maximum age of chat messages in milliseconds (24 hours)
 * Messages older than this are cleaned up on store rehydration
 */
export const MAX_MESSAGE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// Store Interfaces
// =============================================================================

/**
 * AI Session Store State Interface
 */
interface AISessionState {
  // Persisted state
  chatHistory: ChatMessage[];
  sessionId: string | null;
  lastAIStatus: AIStatus | null;
  pendingActions: ActionPlan[];
  currentPartyId: string | null;
  currentTenantId: string | null;
}

/**
 * AI Session Store Actions Interface
 */
interface AISessionActions {
  // Message management
  addMessage: (message: ChatMessage) => void;
  clearHistory: () => void;

  // Session management
  setSessionId: (sessionId: string) => void;
  setLastAIStatus: (status: AIStatus) => void;

  // Pending actions management (with deduplication)
  addPendingAction: (plan: ActionPlan) => void;
  removePendingAction: (planId: string) => void;
  syncPendingActions: (actions: ActionPlan[]) => void;
  hasPendingAction: (planId: string) => boolean;

  // Context management (triggers reset on change)
  setContext: (tenantId: string, partyId: string | null) => void;

  // Cleanup
  clearAll: () => void;
  cleanupOldMessages: () => void;
}

/**
 * Combined AI Session Store Type
 */
type AISessionStore = AISessionState & AISessionActions;

/**
 * Initial state for the session store
 */
const initialState: AISessionState = {
  chatHistory: [],
  sessionId: null,
  lastAIStatus: null,
  pendingActions: [],
  currentPartyId: null,
  currentTenantId: null,
};

// =============================================================================
// Store Implementation
// =============================================================================

/**
 * AI Session Store
 * 
 * Persisted store for AI session state that survives page refreshes.
 * Automatically handles:
 * - Context change detection (tenant_id, party_id)
 * - Automatic store reset on context change
 * - Pending actions deduplication by planId
 * - Retention policy enforcement
 * - Old message cleanup on rehydration
 * 
 * @example
 * ```tsx
 * const { chatHistory, addMessage, setContext } = useAISessionStore();
 * 
 * // Set context (will reset if changed)
 * setContext('tenant-123', 'party-456');
 * 
 * // Add a message (auto-enforces max 100 limit)
 * addMessage({ id: '1', role: 'user', content: 'Hello', timestamp: new Date() });
 * 
 * // Clear on logout
 * clearAISessionOnLogout();
 * ```
 */
export const useAISessionStore = create<AISessionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // =======================================================================
      // Message Management Actions
      // =======================================================================

      /**
       * Add a message to chat history
       * Automatically enforces max message limit (retention policy)
       */
      addMessage: (message) =>
        set((state) => ({
          chatHistory: [...state.chatHistory, message].slice(-MAX_CHAT_MESSAGES),
        })),

      /**
       * Clear chat history and session ID
       */
      clearHistory: () => set({ chatHistory: [], sessionId: null }),

      // =======================================================================
      // Session Management Actions
      // =======================================================================

      /**
       * Set the current session ID
       */
      setSessionId: (sessionId) => set({ sessionId }),

      /**
       * Update the last known AI status
       */
      setLastAIStatus: (status) => set({ lastAIStatus: status }),

      // =======================================================================
      // Pending Actions Management (with Deduplication)
      // =======================================================================

      /**
       * Add a pending action with deduplication by planId
       * If an action with the same planId exists, it will NOT be added again
       */
      addPendingAction: (plan) =>
        set((state) => {
          // Deduplicate by planId - prevent duplicate submissions
          const exists = state.pendingActions.some((p) => p.planId === plan.planId);
          if (exists) {
            console.warn(`[aiSessionStore] Duplicate action prevented: ${plan.planId}`);
            return state;
          }
          return { pendingActions: [...state.pendingActions, plan] };
        }),

      /**
       * Remove a pending action by planId
       */
      removePendingAction: (planId) =>
        set((state) => ({
          pendingActions: state.pendingActions.filter((p) => p.planId !== planId),
        })),

      /**
       * Sync pending actions from backend
       * Replaces all pending actions with the provided list
       */
      syncPendingActions: (actions) => set({ pendingActions: actions }),

      /**
       * Check if a pending action exists by planId
       */
      hasPendingAction: (planId) => {
        const state = get();
        return state.pendingActions.some((p) => p.planId === planId);
      },

      // =======================================================================
      // Context Management (with Automatic Reset)
      // =======================================================================

      /**
       * Set the current context (tenant_id, party_id)
       * IMPORTANT: Automatically resets store if context changes
       * This prevents data leakage between tenants/parties
       */
      setContext: (tenantId, partyId) => {
        const state = get();

        // Check if context has changed
        const tenantChanged = state.currentTenantId !== tenantId;
        const partyChanged = state.currentPartyId !== partyId;

        if (tenantChanged || partyChanged) {
          console.log('[aiSessionStore] Context changed, resetting store:', {
            previousTenant: state.currentTenantId,
            newTenant: tenantId,
            previousParty: state.currentPartyId,
            newParty: partyId,
          });

          // Reset all session data on context change
          set({
            currentTenantId: tenantId,
            currentPartyId: partyId,
            chatHistory: [],
            sessionId: null,
            pendingActions: [],
            // Keep lastAIStatus as it's tenant-wide
          });
        }
      },

      // =======================================================================
      // Cleanup Actions
      // =======================================================================

      /**
       * Clear all session state
       * Call this on logout
       */
      clearAll: () => set(initialState),

      /**
       * Cleanup messages older than MAX_MESSAGE_AGE_MS (24 hours)
       * Called automatically on store rehydration
       */
      cleanupOldMessages: () =>
        set((state) => {
          const cutoffTime = Date.now() - MAX_MESSAGE_AGE_MS;
          const originalCount = state.chatHistory.length;

          const filteredHistory = state.chatHistory.filter((msg) => {
            const msgTime = new Date(msg.timestamp).getTime();
            return msgTime > cutoffTime;
          });

          const removedCount = originalCount - filteredHistory.length;
          if (removedCount > 0) {
            console.log(`[aiSessionStore] Cleaned up ${removedCount} old messages`);
          }

          return { chatHistory: filteredHistory };
        }),
    }),
    {
      name: 'ai-session-storage',
      storage: createJSONStorage(() => localStorage),

      /**
       * Only persist specific fields
       * lastAIStatus is excluded as it should be fetched fresh
       */
      partialize: (state) => ({
        chatHistory: state.chatHistory,
        sessionId: state.sessionId,
        pendingActions: state.pendingActions,
        currentPartyId: state.currentPartyId,
        currentTenantId: state.currentTenantId,
      }),

      /**
       * Run cleanup on store rehydration (page load)
       * This ensures old messages are removed when the app starts
       */
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('[aiSessionStore] Rehydrating, running cleanup...');
          state.cleanupOldMessages();
        }
      },
    }
  )
);

// =============================================================================
// Helper Functions for External Integration
// =============================================================================

/**
 * Clear AI session on logout
 * Call this from auth store logout action
 * 
 * @example
 * ```ts
 * // In authStore logout action:
 * import { clearAISessionOnLogout } from '@/ai/stores/aiSessionStore';
 * 
 * logout: () => {
 *   clearAISessionOnLogout();
 *   // ... rest of logout logic
 * }
 * ```
 */
export function clearAISessionOnLogout(): void {
  console.log('[aiSessionStore] Clearing session on logout');
  useAISessionStore.getState().clearAll();
}

/**
 * Check if there's a pending action for a specific plan
 * Useful for preventing duplicate action submissions
 * 
 * @param planId - The plan ID to check
 * @returns true if a pending action exists
 */
export function hasPendingActionById(planId: string): boolean {
  return useAISessionStore.getState().hasPendingAction(planId);
}

/**
 * Get current context from the store
 * Useful for API calls that need context
 */
export function getCurrentAIContext(): { tenantId: string | null; partyId: string | null } {
  const state = useAISessionStore.getState();
  return {
    tenantId: state.currentTenantId,
    partyId: state.currentPartyId,
  };
}

// =============================================================================
// Selector Hooks for Optimized Re-renders
// =============================================================================

export const useChatHistory = () => useAISessionStore((state) => state.chatHistory);
export const useSessionId = () => useAISessionStore((state) => state.sessionId);
export const useLastAIStatus = () => useAISessionStore((state) => state.lastAIStatus);
export const useStorePendingActions = () => useAISessionStore((state) => state.pendingActions);
export const useCurrentContext = () => useAISessionStore((state) => ({
  tenantId: state.currentTenantId,
  partyId: state.currentPartyId,
}));
