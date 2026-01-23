import React, { useMemo } from 'react';
import { useAIStatus } from '../hooks/useAIStatus';
import { useAIContext } from '../hooks/useAIContext';
import type { AICapability } from '../types/ai.types';
import {
  checkAIAvailability,
  getUnavailableMessage,
} from '../utils/aiAvailability';
import type {
  AIUnavailableReason,
  AIAvailabilityResult,
} from '../utils/aiAvailability';

// Re-export helper functions and types for convenience
export { checkAIAvailability, getUnavailableMessage };
export type { AIUnavailableReason, AIAvailabilityResult };



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
