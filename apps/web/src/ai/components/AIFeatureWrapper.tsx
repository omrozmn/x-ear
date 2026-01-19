/**
 * AI Feature Wrapper Component
 * 
 * A wrapper component that provides graceful degradation for AI-dependent features.
 * It checks AI availability, capability access, and phase requirements before
 * rendering children. When AI is unavailable, it renders a fallback UI.
 * 
 * Key features:
 * - Graceful degradation when AI is unavailable
 * - Capability-specific checks using AI_CAPABILITIES registry
 * - Role-based access control (frontend hint, backend enforces)
 * - Phase requirement validation
 * - Customizable fallback UI
 * - Loading state handling
 * 
 * @module ai/components/AIFeatureWrapper
 * 
 * Requirements: 8 (Graceful Degradation UI), 11 (AI Feature Flags Integration), 18 (AI Capability Registry with RBAC)
 */

import React, { useMemo } from 'react';
import { useAIStatus } from '../hooks/useAIStatus';
import { useAIContext } from '../hooks/useAIContext';
import { isCapabilityAvailable, canUserAccessCapability, AI_CAPABILITIES } from '../config/capabilities';
import type { AICapability, AIRole, AIStatus } from '../types/ai.types';

// =============================================================================
// Types
// =============================================================================

/**
 * Reason why AI feature is unavailable
 */
export type AIUnavailableReason =
  | 'loading'
  | 'disabled'
  | 'kill_switch'
  | 'quota_exceeded'
  | 'phase_blocked'
  | 'role_blocked'
  | 'capability_disabled'
  | 'not_authenticated'
  | 'error'
  | 'unknown';

/**
 * Props for AIFeatureWrapper component
 */
export interface AIFeatureWrapperProps {
  /**
   * Children to render when AI feature is available
   */
  children: React.ReactNode;

  /**
   * The AI capability required for this feature
   * If not specified, only checks general AI availability
   */
  capability?: AICapability;

  /**
   * Custom fallback UI to render when AI is unavailable
   * If not provided, uses default fallback based on reason
   */
  fallback?: React.ReactNode | ((reason: AIUnavailableReason, message: string) => React.ReactNode);

  /**
   * Whether to show loading state while checking AI status
   * @default true
   */
  showLoading?: boolean;

  /**
   * Custom loading UI
   */
  loadingFallback?: React.ReactNode;

  /**
   * Whether to hide the feature completely when unavailable (no fallback shown)
   * @default false
   */
  hideWhenUnavailable?: boolean;

  /**
   * Additional CSS classes for the wrapper
   */
  className?: string;

  /**
   * Callback when AI becomes unavailable
   */
  onUnavailable?: (reason: AIUnavailableReason, message: string) => void;

  /**
   * Whether to require party_id in context
   * Some features may work without party context
   * @default false
   */
  requirePartyContext?: boolean;
}

/**
 * Result of AI availability check
 */
export interface AIAvailabilityResult {
  available: boolean;
  reason: AIUnavailableReason;
  message: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Turkish messages for unavailability reasons
 */
const UNAVAILABLE_MESSAGES: Record<AIUnavailableReason, string> = {
  loading: 'AI durumu kontrol ediliyor...',
  disabled: 'AI şu anda devre dışı.',
  kill_switch: 'AI geçici olarak durduruldu.',
  quota_exceeded: 'Günlük AI limitinize ulaştınız.',
  phase_blocked: 'Bu özellik mevcut AI fazında desteklenmiyor.',
  role_blocked: 'Bu özelliğe erişim yetkiniz yok.',
  capability_disabled: 'Bu AI özelliği şu anda kullanılamıyor.',
  not_authenticated: 'Bu özelliği kullanmak için giriş yapmalısınız.',
  error: 'AI durumu kontrol edilirken bir hata oluştu.',
  unknown: 'AI şu anda kullanılamıyor.',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check AI availability and determine the reason if unavailable
 * 
 * @param status - AI status from useAIStatus hook
 * @param isLoading - Whether status is still loading
 * @param isError - Whether there was an error fetching status
 * @param capability - Optional capability to check
 * @param userRole - User's role for RBAC check
 * @param isAuthenticated - Whether user is authenticated
 * @param hasPartyContext - Whether party context is available
 * @param requirePartyContext - Whether party context is required
 * @returns AIAvailabilityResult with availability status and reason
 */
export function checkAIAvailability(
  status: AIStatus | undefined,
  isLoading: boolean,
  isError: boolean,
  capability?: AICapability,
  userRole?: AIRole | null,
  isAuthenticated?: boolean,
  hasPartyContext?: boolean,
  requirePartyContext?: boolean
): AIAvailabilityResult {
  // Check loading state
  if (isLoading) {
    return {
      available: false,
      reason: 'loading',
      message: UNAVAILABLE_MESSAGES.loading,
    };
  }

  // Check error state
  if (isError) {
    return {
      available: false,
      reason: 'error',
      message: UNAVAILABLE_MESSAGES.error,
    };
  }

  // Check authentication
  if (isAuthenticated === false) {
    return {
      available: false,
      reason: 'not_authenticated',
      message: UNAVAILABLE_MESSAGES.not_authenticated,
    };
  }

  // Check if status is available
  if (!status) {
    return {
      available: false,
      reason: 'unknown',
      message: UNAVAILABLE_MESSAGES.unknown,
    };
  }

  // Check if AI is enabled
  if (!status.enabled) {
    return {
      available: false,
      reason: 'disabled',
      message: UNAVAILABLE_MESSAGES.disabled,
    };
  }

  // Check kill switch
  if (status.killSwitch.globalActive || status.killSwitch.tenantActive) {
    return {
      available: false,
      reason: 'kill_switch',
      message: status.killSwitch.reason || UNAVAILABLE_MESSAGES.kill_switch,
    };
  }

  // Check quota
  if (status.usage.anyQuotaExceeded) {
    return {
      available: false,
      reason: 'quota_exceeded',
      message: UNAVAILABLE_MESSAGES.quota_exceeded,
    };
  }

  // If capability is specified, perform capability-specific checks
  if (capability) {
    // Check if capability is disabled by kill switch
    if (status.killSwitch.capabilitiesDisabled.includes(capability)) {
      return {
        available: false,
        reason: 'capability_disabled',
        message: UNAVAILABLE_MESSAGES.capability_disabled,
      };
    }

    // Check role-based access (frontend hint)
    if (userRole && !canUserAccessCapability(capability, userRole)) {
      return {
        available: false,
        reason: 'role_blocked',
        message: UNAVAILABLE_MESSAGES.role_blocked,
      };
    }

    // Check phase requirement
    const currentPhase = status.phase.currentPhase;
    const capabilityConfig = AI_CAPABILITIES[capability];

    if (capabilityConfig) {
      const phaseOrder = { A: 1, B: 2, C: 3 };
      if (phaseOrder[currentPhase] < phaseOrder[capabilityConfig.minPhase]) {
        return {
          available: false,
          reason: 'phase_blocked',
          message: UNAVAILABLE_MESSAGES.phase_blocked,
        };
      }
    }

    // Full capability check
    if (!isCapabilityAvailable(
      capability,
      currentPhase,
      status.killSwitch.capabilitiesDisabled,
      userRole || undefined
    )) {
      return {
        available: false,
        reason: 'capability_disabled',
        message: UNAVAILABLE_MESSAGES.capability_disabled,
      };
    }
  }

  // Check party context if required
  if (requirePartyContext && !hasPartyContext) {
    return {
      available: false,
      reason: 'not_authenticated',
      message: 'Bu özellik için hasta/müşteri seçimi gereklidir.',
    };
  }

  // Check general availability
  if (!status.available) {
    return {
      available: false,
      reason: 'unknown',
      message: UNAVAILABLE_MESSAGES.unknown,
    };
  }

  // All checks passed
  return {
    available: true,
    reason: 'unknown', // Not used when available
    message: '',
  };
}

/**
 * Get the unavailability message for a given reason
 * 
 * @param reason - The unavailability reason
 * @returns Turkish message string
 */
export function getUnavailableMessage(reason: AIUnavailableReason): string {
  return UNAVAILABLE_MESSAGES[reason] || UNAVAILABLE_MESSAGES.unknown;
}

// =============================================================================
// Default Fallback Components
// =============================================================================

/**
 * Default loading fallback UI
 */
function DefaultLoadingFallback(): React.ReactElement {
  return (
    <div
      className="flex items-center justify-center p-4 text-gray-500"
      role="status"
      aria-label="AI durumu kontrol ediliyor"
    >
      <svg
        className="animate-spin h-5 w-5 mr-2"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-sm">AI durumu kontrol ediliyor...</span>
    </div>
  );
}

/**
 * Default unavailable fallback UI
 */
function DefaultUnavailableFallback({
  reason,
  message
}: {
  reason: AIUnavailableReason;
  message: string;
}): React.ReactElement {
  // Determine icon and color based on reason
  const isWarning = reason === 'quota_exceeded' || reason === 'phase_blocked';
  const isError = reason === 'error' || reason === 'kill_switch';

  const bgColor = isError ? 'bg-red-50' : isWarning ? 'bg-yellow-50' : 'bg-gray-50';
  const borderColor = isError ? 'border-red-200' : isWarning ? 'border-yellow-200' : 'border-gray-200';
  const textColor = isError ? 'text-red-700' : isWarning ? 'text-yellow-700' : 'text-gray-600';
  const iconColor = isError ? 'text-red-500' : isWarning ? 'text-yellow-500' : 'text-gray-400';

  return (
    <div
      className={`flex items-center gap-3 p-4 ${bgColor} ${borderColor} border rounded-lg`}
      role="alert"
    >
      {/* Icon */}
      <svg
        className={`w-5 h-5 flex-shrink-0 ${iconColor}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        {isError ? (
          // Error icon (X in circle)
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        ) : isWarning ? (
          // Warning icon (exclamation in triangle)
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        ) : (
          // Info icon
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        )}
      </svg>

      {/* Message */}
      <p className={`text-sm ${textColor}`}>
        {message}
      </p>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * AIFeatureWrapper Component
 * 
 * Wraps AI-dependent features with graceful degradation logic.
 * Checks AI availability, capability access, and phase requirements
 * before rendering children.
 * 
 * @example
 * ```tsx
 * // Basic usage - checks general AI availability
 * <AIFeatureWrapper>
 *   <AIChatWidget />
 * </AIFeatureWrapper>
 * 
 * // With capability check
 * <AIFeatureWrapper capability="chat">
 *   <AIChatWidget />
 * </AIFeatureWrapper>
 * 
 * // With custom fallback
 * <AIFeatureWrapper 
 *   capability="actions"
 *   fallback={<p>AI aksiyonları şu anda kullanılamıyor.</p>}
 * >
 *   <AIActionPanel />
 * </AIFeatureWrapper>
 * 
 * // With function fallback for dynamic content
 * <AIFeatureWrapper 
 *   capability="ocr"
 *   fallback={(reason, message) => (
 *     <CustomFallback reason={reason} message={message} />
 *   )}
 * >
 *   <OCRScanner />
 * </AIFeatureWrapper>
 * 
 * // Hide completely when unavailable
 * <AIFeatureWrapper capability="chat" hideWhenUnavailable>
 *   <AIChatButton />
 * </AIFeatureWrapper>
 * 
 * // With party context requirement
 * <AIFeatureWrapper capability="actions" requirePartyContext>
 *   <PartyAIActions />
 * </AIFeatureWrapper>
 * ```
 */
export function AIFeatureWrapper({
  children,
  capability,
  fallback,
  showLoading = true,
  loadingFallback,
  hideWhenUnavailable = false,
  className = '',
  onUnavailable,
  requirePartyContext = false,
}: AIFeatureWrapperProps): React.ReactElement | null {
  // Get AI status
  const { data: status, isLoading, isError } = useAIStatus();

  // Get AI context for role and party info
  const { isValid: isContextValid, role, partyId } = useAIContext({ capability });

  // Check availability
  const availability = useMemo(() => {
    return checkAIAvailability(
      status,
      isLoading,
      isError,
      capability,
      role,
      isContextValid,
      !!partyId,
      requirePartyContext
    );
  }, [status, isLoading, isError, capability, role, isContextValid, partyId, requirePartyContext]);

  // Call onUnavailable callback when AI becomes unavailable
  React.useEffect(() => {
    if (!availability.available && availability.reason !== 'loading') {
      onUnavailable?.(availability.reason, availability.message);
    }
  }, [availability.available, availability.reason, availability.message, onUnavailable]);

  // Handle loading state
  if (isLoading && showLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }
    return <DefaultLoadingFallback />;
  }

  // Handle unavailable state
  if (!availability.available) {
    // Hide completely if requested
    if (hideWhenUnavailable) {
      return null;
    }

    // Render custom fallback if provided
    if (fallback) {
      if (typeof fallback === 'function') {
        return <>{fallback(availability.reason, availability.message)}</>;
      }
      return <>{fallback}</>;
    }

    // Render default fallback
    return (
      <DefaultUnavailableFallback
        reason={availability.reason}
        message={availability.message}
      />
    );
  }

  // AI is available - render children
  return (
    <div className={className || undefined}>
      {children}
    </div>
  );
}

// =============================================================================
// Hook for programmatic access
// =============================================================================

/**
 * useAIFeatureAvailability Hook
 * 
 * Provides programmatic access to AI feature availability checks.
 * Useful when you need to check availability without rendering a wrapper.
 * 
 * @param capability - Optional capability to check
 * @param requirePartyContext - Whether party context is required
 * @returns AIAvailabilityResult
 * 
 * @example
 * ```tsx
 * const { available, reason, message } = useAIFeatureAvailability('chat');
 * 
 * if (!available) {
 *   console.log(`AI unavailable: ${message}`);
 * }
 * ```
 */
export function useAIFeatureAvailability(
  capability?: AICapability,
  requirePartyContext: boolean = false
): AIAvailabilityResult {
  const { data: status, isLoading, isError } = useAIStatus();
  const { isValid: isContextValid, role, partyId } = useAIContext({ capability });

  return useMemo(() => {
    return checkAIAvailability(
      status,
      isLoading,
      isError,
      capability,
      role,
      isContextValid,
      !!partyId,
      requirePartyContext
    );
  }, [status, isLoading, isError, capability, role, isContextValid, partyId, requirePartyContext]);
}

// =============================================================================
// Default Export
// =============================================================================

export default AIFeatureWrapper;
