/**
 * AI Session Store Tests
 * 
 * Tests for the persisted session store including:
 * - Message management with retention policy
 * - Pending actions deduplication
 * - Context change detection and reset
 * - Cleanup functionality
 * 
 * @module ai/__tests__/aiSessionStore.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useAISessionStore,
  clearAISessionOnLogout,
  hasPendingActionById,
  getCurrentAIContext,
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_AGE_MS,
} from '../stores/aiSessionStore';
import type { ChatMessage, ActionPlan, AIStatus } from '../types/ai.types';

// Helper to create a mock chat message
function createMockMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role: 'user',
    content: 'Test message',
    timestamp: new Date(),
    ...overrides,
  };
}

// Helper to create a mock action plan
function createMockActionPlan(overrides: Partial<ActionPlan> = {}): ActionPlan {
  return {
    planId: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    status: 'pending',
    steps: [],
    overallRiskLevel: 'low',
    requiresApproval: true,
    planHash: 'hash123',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('aiSessionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useAISessionStore.getState().clearAll();
    });
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Message Management Tests
  // ==========================================================================
  describe('message management', () => {
    describe('addMessage', () => {
      it('should add a message to chat history', () => {
        const message = createMockMessage();

        act(() => {
          useAISessionStore.getState().addMessage(message);
        });

        const { chatHistory } = useAISessionStore.getState();
        expect(chatHistory).toHaveLength(1);
        expect(chatHistory[0]).toEqual(message);
      });

      it('should add multiple messages in order', () => {
        const message1 = createMockMessage({ content: 'First' });
        const message2 = createMockMessage({ content: 'Second' });

        act(() => {
          useAISessionStore.getState().addMessage(message1);
          useAISessionStore.getState().addMessage(message2);
        });

        const { chatHistory } = useAISessionStore.getState();
        expect(chatHistory).toHaveLength(2);
        expect(chatHistory[0].content).toBe('First');
        expect(chatHistory[1].content).toBe('Second');
      });

      it('should enforce MAX_CHAT_MESSAGES limit', () => {
        // Add more than MAX_CHAT_MESSAGES
        act(() => {
          for (let i = 0; i < MAX_CHAT_MESSAGES + 10; i++) {
            useAISessionStore.getState().addMessage(
              createMockMessage({ content: `Message ${i}` })
            );
          }
        });

        const { chatHistory } = useAISessionStore.getState();
        expect(chatHistory).toHaveLength(MAX_CHAT_MESSAGES);
        // Should keep the most recent messages
        expect(chatHistory[0].content).toBe('Message 10');
        expect(chatHistory[MAX_CHAT_MESSAGES - 1].content).toBe(`Message ${MAX_CHAT_MESSAGES + 9}`);
      });
    });

    describe('clearHistory', () => {
      it('should clear chat history', () => {
        act(() => {
          useAISessionStore.getState().addMessage(createMockMessage());
          useAISessionStore.getState().addMessage(createMockMessage());
          useAISessionStore.getState().clearHistory();
        });

        const { chatHistory } = useAISessionStore.getState();
        expect(chatHistory).toHaveLength(0);
      });

      it('should also clear sessionId', () => {
        act(() => {
          useAISessionStore.getState().setSessionId('session-123');
          useAISessionStore.getState().clearHistory();
        });

        const { sessionId } = useAISessionStore.getState();
        expect(sessionId).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Session Management Tests
  // ==========================================================================
  describe('session management', () => {
    describe('setSessionId', () => {
      it('should set session ID', () => {
        act(() => {
          useAISessionStore.getState().setSessionId('session-123');
        });

        const { sessionId } = useAISessionStore.getState();
        expect(sessionId).toBe('session-123');
      });
    });

    describe('setLastAIStatus', () => {
      it('should set last AI status', () => {
        const status: AIStatus = {
          enabled: true,
          available: true,
          phase: {
            currentPhase: 'A',
            phaseName: 'read_only',
            executionAllowed: false,
            proposalAllowed: true,
          },
          killSwitch: {
            globalActive: false,
            tenantActive: false,
            capabilitiesDisabled: [],
          },
          usage: {
            totalRequestsToday: 10,
            quotas: [],
            anyQuotaExceeded: false,
          },
          model: {
            provider: 'openai',
            modelId: 'gpt-4',
            available: true,
          },
          timestamp: new Date().toISOString(),
        };

        act(() => {
          useAISessionStore.getState().setLastAIStatus(status);
        });

        const { lastAIStatus } = useAISessionStore.getState();
        expect(lastAIStatus).toEqual(status);
      });
    });
  });

  // ==========================================================================
  // Pending Actions Tests (with Deduplication)
  // ==========================================================================
  describe('pending actions management', () => {
    describe('addPendingAction', () => {
      it('should add a pending action', () => {
        const plan = createMockActionPlan();

        act(() => {
          useAISessionStore.getState().addPendingAction(plan);
        });

        const { pendingActions } = useAISessionStore.getState();
        expect(pendingActions).toHaveLength(1);
        expect(pendingActions[0]).toEqual(plan);
      });

      it('should deduplicate by planId', () => {
        const plan = createMockActionPlan({ planId: 'plan-123' });

        act(() => {
          useAISessionStore.getState().addPendingAction(plan);
          useAISessionStore.getState().addPendingAction(plan);
          useAISessionStore.getState().addPendingAction(plan);
        });

        const { pendingActions } = useAISessionStore.getState();
        expect(pendingActions).toHaveLength(1);
      });

      it('should allow different planIds', () => {
        const plan1 = createMockActionPlan({ planId: 'plan-1' });
        const plan2 = createMockActionPlan({ planId: 'plan-2' });

        act(() => {
          useAISessionStore.getState().addPendingAction(plan1);
          useAISessionStore.getState().addPendingAction(plan2);
        });

        const { pendingActions } = useAISessionStore.getState();
        expect(pendingActions).toHaveLength(2);
      });
    });

    describe('removePendingAction', () => {
      it('should remove a pending action by planId', () => {
        const plan1 = createMockActionPlan({ planId: 'plan-1' });
        const plan2 = createMockActionPlan({ planId: 'plan-2' });

        act(() => {
          useAISessionStore.getState().addPendingAction(plan1);
          useAISessionStore.getState().addPendingAction(plan2);
          useAISessionStore.getState().removePendingAction('plan-1');
        });

        const { pendingActions } = useAISessionStore.getState();
        expect(pendingActions).toHaveLength(1);
        expect(pendingActions[0].planId).toBe('plan-2');
      });

      it('should do nothing if planId not found', () => {
        const plan = createMockActionPlan({ planId: 'plan-1' });

        act(() => {
          useAISessionStore.getState().addPendingAction(plan);
          useAISessionStore.getState().removePendingAction('non-existent');
        });

        const { pendingActions } = useAISessionStore.getState();
        expect(pendingActions).toHaveLength(1);
      });
    });

    describe('syncPendingActions', () => {
      it('should replace all pending actions', () => {
        const plan1 = createMockActionPlan({ planId: 'plan-1' });
        const plan2 = createMockActionPlan({ planId: 'plan-2' });
        const plan3 = createMockActionPlan({ planId: 'plan-3' });

        act(() => {
          useAISessionStore.getState().addPendingAction(plan1);
          useAISessionStore.getState().syncPendingActions([plan2, plan3]);
        });

        const { pendingActions } = useAISessionStore.getState();
        expect(pendingActions).toHaveLength(2);
        expect(pendingActions[0].planId).toBe('plan-2');
        expect(pendingActions[1].planId).toBe('plan-3');
      });
    });

    describe('hasPendingAction', () => {
      it('should return true if action exists', () => {
        const plan = createMockActionPlan({ planId: 'plan-123' });

        act(() => {
          useAISessionStore.getState().addPendingAction(plan);
        });

        expect(useAISessionStore.getState().hasPendingAction('plan-123')).toBe(true);
      });

      it('should return false if action does not exist', () => {
        expect(useAISessionStore.getState().hasPendingAction('non-existent')).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Context Management Tests (with Automatic Reset)
  // ==========================================================================
  describe('context management', () => {
    describe('setContext', () => {
      it('should set tenant and party IDs', () => {
        act(() => {
          useAISessionStore.getState().setContext('tenant-123', 'party-456');
        });

        const state = useAISessionStore.getState();
        expect(state.currentTenantId).toBe('tenant-123');
        expect(state.currentPartyId).toBe('party-456');
      });

      it('should reset store when tenant changes', () => {
        // Set initial context and add data
        act(() => {
          useAISessionStore.getState().setContext('tenant-1', 'party-1');
          useAISessionStore.getState().addMessage(createMockMessage());
          useAISessionStore.getState().addPendingAction(createMockActionPlan());
          useAISessionStore.getState().setSessionId('session-123');
        });

        // Verify data exists
        expect(useAISessionStore.getState().chatHistory).toHaveLength(1);
        expect(useAISessionStore.getState().pendingActions).toHaveLength(1);
        expect(useAISessionStore.getState().sessionId).toBe('session-123');

        // Change tenant
        act(() => {
          useAISessionStore.getState().setContext('tenant-2', 'party-1');
        });

        // Verify data is cleared
        const state = useAISessionStore.getState();
        expect(state.chatHistory).toHaveLength(0);
        expect(state.pendingActions).toHaveLength(0);
        expect(state.sessionId).toBeNull();
        expect(state.currentTenantId).toBe('tenant-2');
      });

      it('should reset store when party changes', () => {
        // Set initial context and add data
        act(() => {
          useAISessionStore.getState().setContext('tenant-1', 'party-1');
          useAISessionStore.getState().addMessage(createMockMessage());
        });

        // Change party
        act(() => {
          useAISessionStore.getState().setContext('tenant-1', 'party-2');
        });

        // Verify data is cleared
        const state = useAISessionStore.getState();
        expect(state.chatHistory).toHaveLength(0);
        expect(state.currentPartyId).toBe('party-2');
      });

      it('should NOT reset store when context is the same', () => {
        // Set initial context and add data
        act(() => {
          useAISessionStore.getState().setContext('tenant-1', 'party-1');
          useAISessionStore.getState().addMessage(createMockMessage());
        });

        // Set same context again
        act(() => {
          useAISessionStore.getState().setContext('tenant-1', 'party-1');
        });

        // Verify data is preserved
        expect(useAISessionStore.getState().chatHistory).toHaveLength(1);
      });

      it('should handle null party ID', () => {
        act(() => {
          useAISessionStore.getState().setContext('tenant-1', null);
        });

        const state = useAISessionStore.getState();
        expect(state.currentTenantId).toBe('tenant-1');
        expect(state.currentPartyId).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================
  describe('cleanup', () => {
    describe('clearAll', () => {
      it('should clear all state', () => {
        act(() => {
          useAISessionStore.getState().setContext('tenant-1', 'party-1');
          useAISessionStore.getState().addMessage(createMockMessage());
          useAISessionStore.getState().addPendingAction(createMockActionPlan());
          useAISessionStore.getState().setSessionId('session-123');
          useAISessionStore.getState().clearAll();
        });

        const state = useAISessionStore.getState();
        expect(state.chatHistory).toHaveLength(0);
        expect(state.pendingActions).toHaveLength(0);
        expect(state.sessionId).toBeNull();
        expect(state.currentTenantId).toBeNull();
        expect(state.currentPartyId).toBeNull();
        expect(state.lastAIStatus).toBeNull();
      });
    });

    describe('cleanupOldMessages', () => {
      it('should remove messages older than MAX_MESSAGE_AGE_MS', () => {
        const now = Date.now();
        const oldMessage = createMockMessage({
          timestamp: new Date(now - MAX_MESSAGE_AGE_MS - 1000), // 1 second older than max
        });
        const newMessage = createMockMessage({
          timestamp: new Date(now),
        });

        act(() => {
          // Directly set chat history to include old message
          useAISessionStore.setState({ chatHistory: [oldMessage, newMessage] });
          useAISessionStore.getState().cleanupOldMessages();
        });

        const { chatHistory } = useAISessionStore.getState();
        expect(chatHistory).toHaveLength(1);
        expect(chatHistory[0]).toEqual(newMessage);
      });

      it('should keep messages within MAX_MESSAGE_AGE_MS', () => {
        const now = Date.now();
        const recentMessage = createMockMessage({
          timestamp: new Date(now - MAX_MESSAGE_AGE_MS + 60000), // 1 minute within limit
        });

        act(() => {
          useAISessionStore.setState({ chatHistory: [recentMessage] });
          useAISessionStore.getState().cleanupOldMessages();
        });

        const { chatHistory } = useAISessionStore.getState();
        expect(chatHistory).toHaveLength(1);
      });
    });
  });

  // ==========================================================================
  // Helper Functions Tests
  // ==========================================================================
  describe('helper functions', () => {
    describe('clearAISessionOnLogout', () => {
      it('should clear all session state', () => {
        act(() => {
          useAISessionStore.getState().setContext('tenant-1', 'party-1');
          useAISessionStore.getState().addMessage(createMockMessage());
          clearAISessionOnLogout();
        });

        const state = useAISessionStore.getState();
        expect(state.chatHistory).toHaveLength(0);
        expect(state.currentTenantId).toBeNull();
      });
    });

    describe('hasPendingActionById', () => {
      it('should return true if action exists', () => {
        const plan = createMockActionPlan({ planId: 'plan-123' });

        act(() => {
          useAISessionStore.getState().addPendingAction(plan);
        });

        expect(hasPendingActionById('plan-123')).toBe(true);
      });

      it('should return false if action does not exist', () => {
        expect(hasPendingActionById('non-existent')).toBe(false);
      });
    });

    describe('getCurrentAIContext', () => {
      it('should return current context', () => {
        act(() => {
          useAISessionStore.getState().setContext('tenant-123', 'party-456');
        });

        const context = getCurrentAIContext();
        expect(context.tenantId).toBe('tenant-123');
        expect(context.partyId).toBe('party-456');
      });

      it('should return null values when not set', () => {
        const context = getCurrentAIContext();
        expect(context.tenantId).toBeNull();
        expect(context.partyId).toBeNull();
      });
    });
  });
});
