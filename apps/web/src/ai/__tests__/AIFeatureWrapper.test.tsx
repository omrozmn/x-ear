/**
 * AI Feature Wrapper Component Tests
 * 
 * Tests for the AIFeatureWrapper component including:
 * - Availability checking logic
 * - Loading states
 * - Error states
 * - Fallback rendering
 * - Capability checks
 * 
 * @module ai/__tests__/AIFeatureWrapper.test
 */

import { describe, it, expect, vi } from 'vitest';
import {
  checkAIAvailability,
  getUnavailableMessage,
} from '../components/AIFeatureWrapper';
import type { AIStatus, AIRole } from '../types/ai.types';

// Helper to create mock AIStatus
function createMockStatus(overrides: Partial<AIStatus> = {}): AIStatus {
  return {
    enabled: true,
    available: true,
    phase: {
      currentPhase: 'B',
      phaseName: 'proposal',
      executionAllowed: true,
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
    ...overrides,
  };
}

describe('AIFeatureWrapper', () => {
  // ==========================================================================
  // checkAIAvailability Tests
  // ==========================================================================
  describe('checkAIAvailability', () => {
    describe('loading state', () => {
      it('should return loading reason when isLoading is true', () => {
        const result = checkAIAvailability(undefined, true, false);

        expect(result.available).toBe(false);
        expect(result.reason).toBe('loading');
      });
    });

    describe('error state', () => {
      it('should return error reason when isError is true', () => {
        const result = checkAIAvailability(undefined, false, true);

        expect(result.available).toBe(false);
        expect(result.reason).toBe('error');
      });
    });

    describe('authentication', () => {
      it('should return not_authenticated when user is not authenticated', () => {
        const status = createMockStatus();
        const result = checkAIAvailability(
          status, false, false, undefined, undefined, false
        );

        expect(result.available).toBe(false);
        expect(result.reason).toBe('not_authenticated');
      });
    });

    describe('AI disabled', () => {
      it('should return disabled when AI is not enabled', () => {
        const status = createMockStatus({ enabled: false });
        const result = checkAIAvailability(status, false, false);

        expect(result.available).toBe(false);
        expect(result.reason).toBe('disabled');
      });
    });

    describe('kill switch', () => {
      it('should return kill_switch when global kill switch is active', () => {
        const status = createMockStatus({
          killSwitch: {
            globalActive: true,
            tenantActive: false,
            capabilitiesDisabled: [],
            reason: 'Emergency shutdown',
          },
        });
        const result = checkAIAvailability(status, false, false);

        expect(result.available).toBe(false);
        expect(result.reason).toBe('kill_switch');
        expect(result.message).toBe('Emergency shutdown');
      });

      it('should return kill_switch when tenant kill switch is active', () => {
        const status = createMockStatus({
          killSwitch: {
            globalActive: false,
            tenantActive: true,
            capabilitiesDisabled: [],
          },
        });
        const result = checkAIAvailability(status, false, false);

        expect(result.available).toBe(false);
        expect(result.reason).toBe('kill_switch');
      });
    });

    describe('quota exceeded', () => {
      it('should return quota_exceeded when quota is exceeded', () => {
        const status = createMockStatus({
          usage: {
            totalRequestsToday: 100,
            quotas: [],
            anyQuotaExceeded: true,
          },
        });
        const result = checkAIAvailability(status, false, false);

        expect(result.available).toBe(false);
        expect(result.reason).toBe('quota_exceeded');
      });
    });

    describe('capability checks', () => {
      it('should return capability_disabled when capability is in disabled list', () => {
        const status = createMockStatus({
          killSwitch: {
            globalActive: false,
            tenantActive: false,
            capabilitiesDisabled: ['chat'],
          },
        });
        const result = checkAIAvailability(
          status, false, false, 'chat', 'STAFF', true
        );

        expect(result.available).toBe(false);
        expect(result.reason).toBe('capability_disabled');
      });

      it('should return role_blocked when user role cannot access capability', () => {
        const status = createMockStatus();
        const result = checkAIAvailability(
          status, false, false, 'chat', 'PARTY' as AIRole, true
        );

        expect(result.available).toBe(false);
        expect(result.reason).toBe('role_blocked');
      });

      it('should return phase_blocked when phase requirement not met', () => {
        const status = createMockStatus({
          phase: {
            currentPhase: 'A',
            phaseName: 'read_only',
            executionAllowed: false,
            proposalAllowed: true,
          },
        });
        const result = checkAIAvailability(
          status, false, false, 'actions', 'STAFF', true
        );

        expect(result.available).toBe(false);
        expect(result.reason).toBe('phase_blocked');
      });

      it('should return available for valid capability access', () => {
        const status = createMockStatus();
        const result = checkAIAvailability(
          status, false, false, 'chat', 'STAFF', true
        );

        expect(result.available).toBe(true);
      });
    });

    describe('party context', () => {
      it('should return not_authenticated when party context required but missing', () => {
        const status = createMockStatus();
        const result = checkAIAvailability(
          status, false, false, 'chat', 'STAFF', true, false, true
        );

        expect(result.available).toBe(false);
        expect(result.reason).toBe('not_authenticated');
      });

      it('should return available when party context is provided', () => {
        const status = createMockStatus();
        const result = checkAIAvailability(
          status, false, false, 'chat', 'STAFF', true, true, true
        );

        expect(result.available).toBe(true);
      });
    });

    describe('general availability', () => {
      it('should return unknown when status.available is false', () => {
        const status = createMockStatus({ available: false });
        const result = checkAIAvailability(status, false, false);

        expect(result.available).toBe(false);
        expect(result.reason).toBe('unknown');
      });

      it('should return available when all checks pass', () => {
        const status = createMockStatus();
        const result = checkAIAvailability(status, false, false);

        expect(result.available).toBe(true);
      });
    });

    describe('null/undefined status', () => {
      it('should return unknown when status is undefined', () => {
        const result = checkAIAvailability(undefined, false, false);

        expect(result.available).toBe(false);
        expect(result.reason).toBe('unknown');
      });
    });
  });

  // ==========================================================================
  // getUnavailableMessage Tests
  // ==========================================================================
  describe('getUnavailableMessage', () => {
    it('should return Turkish message for loading', () => {
      expect(getUnavailableMessage('loading')).toBe('AI durumu kontrol ediliyor...');
    });

    it('should return Turkish message for disabled', () => {
      expect(getUnavailableMessage('disabled')).toBe('AI şu anda devre dışı.');
    });

    it('should return Turkish message for kill_switch', () => {
      expect(getUnavailableMessage('kill_switch')).toBe('AI geçici olarak durduruldu.');
    });

    it('should return Turkish message for quota_exceeded', () => {
      expect(getUnavailableMessage('quota_exceeded')).toBe('Günlük AI limitinize ulaştınız.');
    });

    it('should return Turkish message for phase_blocked', () => {
      expect(getUnavailableMessage('phase_blocked')).toBe('Bu özellik mevcut AI fazında desteklenmiyor.');
    });

    it('should return Turkish message for role_blocked', () => {
      expect(getUnavailableMessage('role_blocked')).toBe('Bu özelliğe erişim yetkiniz yok.');
    });

    it('should return Turkish message for capability_disabled', () => {
      expect(getUnavailableMessage('capability_disabled')).toBe('Bu AI özelliği şu anda kullanılamıyor.');
    });

    it('should return Turkish message for not_authenticated', () => {
      expect(getUnavailableMessage('not_authenticated')).toBe('Bu özelliği kullanmak için giriş yapmalısınız.');
    });

    it('should return Turkish message for error', () => {
      expect(getUnavailableMessage('error')).toBe('AI durumu kontrol edilirken bir hata oluştu.');
    });

    it('should return Turkish message for unknown', () => {
      expect(getUnavailableMessage('unknown')).toBe('AI şu anda kullanılamıyor.');
    });
  });
});
