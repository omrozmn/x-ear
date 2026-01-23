/**
 * AI Capabilities Registry Tests
 * 
 * Tests for capability configuration and availability checks including:
 * - Phase requirements
 * - Role-based access control (RBAC)
 * - Kill switch integration
 * 
 * @module ai/__tests__/capabilities.test
 */

import { describe, it, expect } from 'vitest';
import {
  AI_CAPABILITIES,
  isCapabilityAvailable,
  canUserAccessCapability,
  meetsPhaseRequirement,
  getCapabilityConfig,
  getAvailableCapabilities,
  requiresApproval,
  isRetryableCapability,
} from '../config/capabilities';
import type { AICapability } from '../types/ai.types';

describe('capabilities', () => {
  // ==========================================================================
  // AI_CAPABILITIES Registry Tests
  // ==========================================================================
  describe('AI_CAPABILITIES registry', () => {
    it('should have chat capability configured', () => {
      expect(AI_CAPABILITIES.chat).toBeDefined();
      expect(AI_CAPABILITIES.chat.minPhase).toBe('A');
      expect(AI_CAPABILITIES.chat.requiresApproval).toBe(false);
      expect(AI_CAPABILITIES.chat.retryable).toBe(true);
    });

    it('should have actions capability configured', () => {
      expect(AI_CAPABILITIES.actions).toBeDefined();
      expect(AI_CAPABILITIES.actions.minPhase).toBe('B');
      expect(AI_CAPABILITIES.actions.requiresApproval).toBe(true);
      expect(AI_CAPABILITIES.actions.retryable).toBe(false);
    });

    it('should have ocr capability configured', () => {
      expect(AI_CAPABILITIES.ocr).toBeDefined();
      expect(AI_CAPABILITIES.ocr.minPhase).toBe('A');
      expect(AI_CAPABILITIES.ocr.requiresApproval).toBe(false);
      expect(AI_CAPABILITIES.ocr.retryable).toBe(true);
    });

    it('should exclude PARTY role from all capabilities', () => {
      Object.values(AI_CAPABILITIES).forEach((config) => {
        expect(config.allowedRoles).not.toContain('PARTY');
      });
    });

    it('should include STAFF, ADMIN, SUPER_ADMIN in all capabilities', () => {
      Object.values(AI_CAPABILITIES).forEach((config) => {
        expect(config.allowedRoles).toContain('STAFF');
        expect(config.allowedRoles).toContain('ADMIN');
        expect(config.allowedRoles).toContain('SUPER_ADMIN');
      });
    });
  });

  // ==========================================================================
  // isCapabilityAvailable Tests
  // ==========================================================================
  describe('isCapabilityAvailable', () => {
    describe('phase requirements', () => {
      it('should allow chat in Phase A', () => {
        expect(isCapabilityAvailable('chat', 'A', [], 'STAFF')).toBe(true);
      });

      it('should allow chat in Phase B', () => {
        expect(isCapabilityAvailable('chat', 'B', [], 'STAFF')).toBe(true);
      });

      it('should allow chat in Phase C', () => {
        expect(isCapabilityAvailable('chat', 'C', [], 'STAFF')).toBe(true);
      });

      it('should NOT allow actions in Phase A', () => {
        expect(isCapabilityAvailable('actions', 'A', [], 'STAFF')).toBe(false);
      });

      it('should allow actions in Phase B', () => {
        expect(isCapabilityAvailable('actions', 'B', [], 'STAFF')).toBe(true);
      });

      it('should allow actions in Phase C', () => {
        expect(isCapabilityAvailable('actions', 'C', [], 'STAFF')).toBe(true);
      });

      it('should allow ocr in Phase A', () => {
        expect(isCapabilityAvailable('ocr', 'A', [], 'STAFF')).toBe(true);
      });
    });

    describe('kill switch integration', () => {
      it('should return false when capability is disabled', () => {
        expect(isCapabilityAvailable('chat', 'A', ['chat'], 'STAFF')).toBe(false);
      });

      it('should return true when other capabilities are disabled', () => {
        expect(isCapabilityAvailable('chat', 'A', ['actions', 'ocr'], 'STAFF')).toBe(true);
      });

      it('should return false when all capabilities are disabled', () => {
        const allDisabled = ['chat', 'actions', 'ocr'];
        expect(isCapabilityAvailable('chat', 'A', allDisabled, 'STAFF')).toBe(false);
        expect(isCapabilityAvailable('actions', 'B', allDisabled, 'STAFF')).toBe(false);
        expect(isCapabilityAvailable('ocr', 'A', allDisabled, 'STAFF')).toBe(false);
      });
    });

    describe('role-based access', () => {
      it('should allow STAFF to access chat', () => {
        expect(isCapabilityAvailable('chat', 'A', [], 'STAFF')).toBe(true);
      });

      it('should allow ADMIN to access chat', () => {
        expect(isCapabilityAvailable('chat', 'A', [], 'ADMIN')).toBe(true);
      });

      it('should allow SUPER_ADMIN to access chat', () => {
        expect(isCapabilityAvailable('chat', 'A', [], 'SUPER_ADMIN')).toBe(true);
      });

      it('should NOT allow PARTY to access chat', () => {
        expect(isCapabilityAvailable('chat', 'A', [], 'PARTY')).toBe(false);
      });

      it('should NOT allow PARTY to access actions', () => {
        expect(isCapabilityAvailable('actions', 'B', [], 'PARTY')).toBe(false);
      });

      it('should NOT allow PARTY to access ocr', () => {
        expect(isCapabilityAvailable('ocr', 'A', [], 'PARTY')).toBe(false);
      });
    });

    describe('without role check', () => {
      it('should check only phase and kill switch when role is undefined', () => {
        expect(isCapabilityAvailable('chat', 'A', [])).toBe(true);
        expect(isCapabilityAvailable('actions', 'A', [])).toBe(false);
        expect(isCapabilityAvailable('actions', 'B', [])).toBe(true);
      });
    });

    describe('unknown capability', () => {
      it('should return false for unknown capability', () => {
        expect(isCapabilityAvailable('unknown' as AICapability, 'A', [], 'STAFF')).toBe(false);
      });
    });
  });

  // ==========================================================================
  // canUserAccessCapability Tests
  // ==========================================================================
  describe('canUserAccessCapability', () => {
    it('should return true for allowed roles', () => {
      expect(canUserAccessCapability('chat', 'STAFF')).toBe(true);
      expect(canUserAccessCapability('chat', 'ADMIN')).toBe(true);
      expect(canUserAccessCapability('chat', 'SUPER_ADMIN')).toBe(true);
    });

    it('should return false for PARTY role', () => {
      expect(canUserAccessCapability('chat', 'PARTY')).toBe(false);
      expect(canUserAccessCapability('actions', 'PARTY')).toBe(false);
      expect(canUserAccessCapability('ocr', 'PARTY')).toBe(false);
    });

    it('should return false for unknown capability', () => {
      expect(canUserAccessCapability('unknown' as AICapability, 'STAFF')).toBe(false);
    });
  });

  // ==========================================================================
  // meetsPhaseRequirement Tests
  // ==========================================================================
  describe('meetsPhaseRequirement', () => {
    it('should return true when current phase meets requirement', () => {
      expect(meetsPhaseRequirement('chat', 'A')).toBe(true);
      expect(meetsPhaseRequirement('chat', 'B')).toBe(true);
      expect(meetsPhaseRequirement('chat', 'C')).toBe(true);
    });

    it('should return false when current phase is below requirement', () => {
      expect(meetsPhaseRequirement('actions', 'A')).toBe(false);
    });

    it('should return true when current phase exceeds requirement', () => {
      expect(meetsPhaseRequirement('actions', 'B')).toBe(true);
      expect(meetsPhaseRequirement('actions', 'C')).toBe(true);
    });

    it('should return false for unknown capability', () => {
      expect(meetsPhaseRequirement('unknown' as AICapability, 'C')).toBe(false);
    });
  });

  // ==========================================================================
  // getCapabilityConfig Tests
  // ==========================================================================
  describe('getCapabilityConfig', () => {
    it('should return config for valid capability', () => {
      const config = getCapabilityConfig('chat');
      expect(config).toBeDefined();
      expect(config?.minPhase).toBe('A');
    });

    it('should return undefined for unknown capability', () => {
      expect(getCapabilityConfig('unknown' as AICapability)).toBeUndefined();
    });
  });

  // ==========================================================================
  // getAvailableCapabilities Tests
  // ==========================================================================
  describe('getAvailableCapabilities', () => {
    it('should return all capabilities for STAFF in Phase C', () => {
      const available = getAvailableCapabilities('STAFF', 'C', []);
      expect(available).toContain('chat');
      expect(available).toContain('actions');
      expect(available).toContain('ocr');
    });

    it('should return only Phase A capabilities for STAFF in Phase A', () => {
      const available = getAvailableCapabilities('STAFF', 'A', []);
      expect(available).toContain('chat');
      expect(available).toContain('ocr');
      expect(available).not.toContain('actions');
    });

    it('should exclude disabled capabilities', () => {
      const available = getAvailableCapabilities('STAFF', 'C', ['chat']);
      expect(available).not.toContain('chat');
      expect(available).toContain('actions');
      expect(available).toContain('ocr');
    });

    it('should return empty array for PARTY role', () => {
      const available = getAvailableCapabilities('PARTY', 'C', []);
      expect(available).toHaveLength(0);
    });
  });

  // ==========================================================================
  // requiresApproval Tests
  // ==========================================================================
  describe('requiresApproval', () => {
    it('should return true for actions', () => {
      expect(requiresApproval('actions')).toBe(true);
    });

    it('should return false for chat', () => {
      expect(requiresApproval('chat')).toBe(false);
    });

    it('should return false for ocr', () => {
      expect(requiresApproval('ocr')).toBe(false);
    });

    it('should return false for unknown capability', () => {
      expect(requiresApproval('unknown' as AICapability)).toBe(false);
    });
  });

  // ==========================================================================
  // isRetryableCapability Tests
  // ==========================================================================
  describe('isRetryableCapability', () => {
    it('should return true for chat', () => {
      expect(isRetryableCapability('chat')).toBe(true);
    });

    it('should return true for ocr', () => {
      expect(isRetryableCapability('ocr')).toBe(true);
    });

    it('should return false for actions', () => {
      expect(isRetryableCapability('actions')).toBe(false);
    });

    it('should return false for unknown capability', () => {
      expect(isRetryableCapability('unknown' as AICapability)).toBe(false);
    });
  });
});
