/**
 * AI Runtime Store Tests
 * 
 * Tests for the ephemeral runtime store including:
 * - Current plan management
 * - Execution progress tracking
 * - Typing indicator state
 * - Executing state
 * - Clear runtime functionality
 * 
 * @module ai/__tests__/aiRuntimeStore.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  useAIRuntimeStore,
  clearAIRuntimeState,
} from '../stores/aiRuntimeStore';
import type { ActionPlan, ExecutionProgress } from '../types/ai.types';

// Helper to create a mock action plan
function createMockActionPlan(overrides: Partial<ActionPlan> = {}): ActionPlan {
  return {
    planId: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    status: 'pending',
    steps: [
      {
        stepNumber: 1,
        toolName: 'test_tool',
        toolSchemaVersion: '1.0.0',
        parameters: {},
        description: 'Test step',
        riskLevel: 'low',
        requiresApproval: false,
      },
    ],
    overallRiskLevel: 'low',
    requiresApproval: true,
    planHash: 'hash123',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create mock execution progress
function createMockExecutionProgress(overrides: Partial<ExecutionProgress> = {}): ExecutionProgress {
  return {
    actionId: 'plan-123',
    currentStep: 0,
    totalSteps: 3,
    stepStatuses: [],
    overallStatus: 'running',
    startedAt: new Date(),
    ...overrides,
  };
}

describe('aiRuntimeStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useAIRuntimeStore.getState().clearRuntime();
    });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================
  describe('initial state', () => {
    it('should have null currentPlan', () => {
      expect(useAIRuntimeStore.getState().currentPlan).toBeNull();
    });

    it('should have null executionProgress', () => {
      expect(useAIRuntimeStore.getState().executionProgress).toBeNull();
    });

    it('should have isTyping as false', () => {
      expect(useAIRuntimeStore.getState().isTyping).toBe(false);
    });

    it('should have isExecuting as false', () => {
      expect(useAIRuntimeStore.getState().isExecuting).toBe(false);
    });
  });

  // ==========================================================================
  // Current Plan Management Tests
  // ==========================================================================
  describe('setCurrentPlan', () => {
    it('should set current plan', () => {
      const plan = createMockActionPlan();

      act(() => {
        useAIRuntimeStore.getState().setCurrentPlan(plan);
      });

      expect(useAIRuntimeStore.getState().currentPlan).toEqual(plan);
    });

    it('should clear current plan when set to null', () => {
      const plan = createMockActionPlan();

      act(() => {
        useAIRuntimeStore.getState().setCurrentPlan(plan);
        useAIRuntimeStore.getState().setCurrentPlan(null);
      });

      expect(useAIRuntimeStore.getState().currentPlan).toBeNull();
    });

    it('should replace existing plan', () => {
      const plan1 = createMockActionPlan({ planId: 'plan-1' });
      const plan2 = createMockActionPlan({ planId: 'plan-2' });

      act(() => {
        useAIRuntimeStore.getState().setCurrentPlan(plan1);
        useAIRuntimeStore.getState().setCurrentPlan(plan2);
      });

      expect(useAIRuntimeStore.getState().currentPlan?.planId).toBe('plan-2');
    });
  });

  // ==========================================================================
  // Execution Progress Tests
  // ==========================================================================
  describe('setExecutionProgress', () => {
    it('should set execution progress', () => {
      const progress = createMockExecutionProgress();

      act(() => {
        useAIRuntimeStore.getState().setExecutionProgress(progress);
      });

      expect(useAIRuntimeStore.getState().executionProgress).toEqual(progress);
    });

    it('should clear execution progress when set to null', () => {
      const progress = createMockExecutionProgress();

      act(() => {
        useAIRuntimeStore.getState().setExecutionProgress(progress);
        useAIRuntimeStore.getState().setExecutionProgress(null);
      });

      expect(useAIRuntimeStore.getState().executionProgress).toBeNull();
    });

    it('should update progress during execution', () => {
      act(() => {
        useAIRuntimeStore.getState().setExecutionProgress(
          createMockExecutionProgress({ currentStep: 0, overallStatus: 'running' })
        );
      });

      expect(useAIRuntimeStore.getState().executionProgress?.currentStep).toBe(0);

      act(() => {
        useAIRuntimeStore.getState().setExecutionProgress(
          createMockExecutionProgress({ currentStep: 1, overallStatus: 'running' })
        );
      });

      expect(useAIRuntimeStore.getState().executionProgress?.currentStep).toBe(1);

      act(() => {
        useAIRuntimeStore.getState().setExecutionProgress(
          createMockExecutionProgress({ currentStep: 2, overallStatus: 'completed' })
        );
      });

      expect(useAIRuntimeStore.getState().executionProgress?.overallStatus).toBe('completed');
    });
  });

  // ==========================================================================
  // Typing Indicator Tests
  // ==========================================================================
  describe('setIsTyping', () => {
    it('should set typing to true', () => {
      act(() => {
        useAIRuntimeStore.getState().setIsTyping(true);
      });

      expect(useAIRuntimeStore.getState().isTyping).toBe(true);
    });

    it('should set typing to false', () => {
      act(() => {
        useAIRuntimeStore.getState().setIsTyping(true);
        useAIRuntimeStore.getState().setIsTyping(false);
      });

      expect(useAIRuntimeStore.getState().isTyping).toBe(false);
    });
  });

  // ==========================================================================
  // Executing State Tests
  // ==========================================================================
  describe('setIsExecuting', () => {
    it('should set executing to true', () => {
      act(() => {
        useAIRuntimeStore.getState().setIsExecuting(true);
      });

      expect(useAIRuntimeStore.getState().isExecuting).toBe(true);
    });

    it('should set executing to false', () => {
      act(() => {
        useAIRuntimeStore.getState().setIsExecuting(true);
        useAIRuntimeStore.getState().setIsExecuting(false);
      });

      expect(useAIRuntimeStore.getState().isExecuting).toBe(false);
    });
  });

  // ==========================================================================
  // Clear Runtime Tests
  // ==========================================================================
  describe('clearRuntime', () => {
    it('should clear all runtime state', () => {
      const plan = createMockActionPlan();
      const progress = createMockExecutionProgress();

      act(() => {
        useAIRuntimeStore.getState().setCurrentPlan(plan);
        useAIRuntimeStore.getState().setExecutionProgress(progress);
        useAIRuntimeStore.getState().setIsTyping(true);
        useAIRuntimeStore.getState().setIsExecuting(true);
        useAIRuntimeStore.getState().clearRuntime();
      });

      const state = useAIRuntimeStore.getState();
      expect(state.currentPlan).toBeNull();
      expect(state.executionProgress).toBeNull();
      expect(state.isTyping).toBe(false);
      expect(state.isExecuting).toBe(false);
    });
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================
  describe('clearAIRuntimeState helper', () => {
    it('should clear all runtime state', () => {
      const plan = createMockActionPlan();

      act(() => {
        useAIRuntimeStore.getState().setCurrentPlan(plan);
        useAIRuntimeStore.getState().setIsTyping(true);
        clearAIRuntimeState();
      });

      const state = useAIRuntimeStore.getState();
      expect(state.currentPlan).toBeNull();
      expect(state.isTyping).toBe(false);
    });
  });
});
