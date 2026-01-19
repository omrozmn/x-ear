/**
 * AI Status Indicator Component Tests
 * 
 * Tests for the AIStatusIndicator component including:
 * - Status type determination
 * - Visual rendering
 * - Size variants
 * - Label display
 * 
 * @module ai/__tests__/AIStatusIndicator.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  AIStatusIndicator,
  getStatusType,
  getDetailedStatusLabel,
} from '../components/AIStatusIndicator';
import type { AIStatus } from '../types/ai.types';

// Helper to create mock AIStatus
function createMockStatus(overrides: Partial<AIStatus> = {}): AIStatus {
  return {
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
    ...overrides,
  };
}

describe('AIStatusIndicator', () => {
  // ==========================================================================
  // getStatusType Tests
  // ==========================================================================
  describe('getStatusType', () => {
    it('should return "unknown" when status is null', () => {
      expect(getStatusType(null)).toBe('unknown');
    });

    it('should return "unknown" when status is undefined', () => {
      expect(getStatusType(undefined)).toBe('unknown');
    });

    it('should return "unavailable" when AI is disabled', () => {
      const status = createMockStatus({ enabled: false });
      expect(getStatusType(status)).toBe('unavailable');
    });

    it('should return "unavailable" when global kill switch is active', () => {
      const status = createMockStatus({
        killSwitch: {
          globalActive: true,
          tenantActive: false,
          capabilitiesDisabled: [],
        },
      });
      expect(getStatusType(status)).toBe('unavailable');
    });

    it('should return "unavailable" when tenant kill switch is active', () => {
      const status = createMockStatus({
        killSwitch: {
          globalActive: false,
          tenantActive: true,
          capabilitiesDisabled: [],
        },
      });
      expect(getStatusType(status)).toBe('unavailable');
    });

    it('should return "available" when AI is fully operational', () => {
      const status = createMockStatus();
      expect(getStatusType(status)).toBe('available');
    });

    it('should return "degraded" when quota is exceeded', () => {
      const status = createMockStatus({
        available: false,
        usage: {
          totalRequestsToday: 100,
          quotas: [],
          anyQuotaExceeded: true,
        },
      });
      expect(getStatusType(status)).toBe('degraded');
    });

    it('should return "degraded" when some capabilities are disabled', () => {
      const status = createMockStatus({
        available: false,
        killSwitch: {
          globalActive: false,
          tenantActive: false,
          capabilitiesDisabled: ['chat'],
        },
      });
      expect(getStatusType(status)).toBe('degraded');
    });

    it('should return "degraded" when model is unavailable', () => {
      const status = createMockStatus({
        available: false,
        model: {
          provider: 'openai',
          modelId: 'gpt-4',
          available: false,
        },
      });
      expect(getStatusType(status)).toBe('degraded');
    });
  });

  // ==========================================================================
  // getDetailedStatusLabel Tests
  // ==========================================================================
  describe('getDetailedStatusLabel', () => {
    it('should return "Bilinmiyor" for null status', () => {
      expect(getDetailedStatusLabel(null)).toBe('Bilinmiyor');
    });

    it('should return "Devre Dışı" when AI is disabled', () => {
      const status = createMockStatus({ enabled: false });
      expect(getDetailedStatusLabel(status)).toBe('Devre Dışı');
    });

    it('should return "Durduruldu" when global kill switch is active', () => {
      const status = createMockStatus({
        killSwitch: {
          globalActive: true,
          tenantActive: false,
          capabilitiesDisabled: [],
        },
      });
      expect(getDetailedStatusLabel(status)).toBe('Durduruldu');
    });

    it('should return "Tenant Durduruldu" when tenant kill switch is active', () => {
      const status = createMockStatus({
        killSwitch: {
          globalActive: false,
          tenantActive: true,
          capabilitiesDisabled: [],
        },
      });
      expect(getDetailedStatusLabel(status)).toBe('Tenant Durduruldu');
    });

    it('should return "Aktif" when AI is available', () => {
      const status = createMockStatus();
      expect(getDetailedStatusLabel(status)).toBe('Aktif');
    });

    it('should return "Limit Aşıldı" when quota is exceeded', () => {
      const status = createMockStatus({
        available: false,
        usage: {
          totalRequestsToday: 100,
          quotas: [],
          anyQuotaExceeded: true,
        },
      });
      expect(getDetailedStatusLabel(status)).toBe('Limit Aşıldı');
    });
  });

  // ==========================================================================
  // Component Rendering Tests
  // ==========================================================================
  describe('rendering', () => {
    it('should render with default props', () => {
      const status = createMockStatus();
      render(<AIStatusIndicator status={status} />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('aria-label', 'AI durumu: Aktif');
    });

    it('should render with showLabel', () => {
      const status = createMockStatus();
      render(<AIStatusIndicator status={status} showLabel />);
      
      expect(screen.getByText('Aktif')).toBeInTheDocument();
    });

    it('should render unknown state when status is null', () => {
      render(<AIStatusIndicator status={null} showLabel />);
      
      expect(screen.getByText('Bilinmiyor')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const status = createMockStatus();
      render(<AIStatusIndicator status={status} className="custom-class" />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('custom-class');
    });
  });

  // ==========================================================================
  // Size Variants Tests
  // ==========================================================================
  describe('size variants', () => {
    it('should render small size', () => {
      const status = createMockStatus();
      render(<AIStatusIndicator status={status} size="sm" showLabel />);
      
      const label = screen.getByText('Aktif');
      expect(label).toHaveClass('text-xs');
    });

    it('should render medium size (default)', () => {
      const status = createMockStatus();
      render(<AIStatusIndicator status={status} size="md" showLabel />);
      
      const label = screen.getByText('Aktif');
      expect(label).toHaveClass('text-sm');
    });

    it('should render large size', () => {
      const status = createMockStatus();
      render(<AIStatusIndicator status={status} size="lg" showLabel />);
      
      const label = screen.getByText('Aktif');
      expect(label).toHaveClass('text-base');
    });
  });
});
