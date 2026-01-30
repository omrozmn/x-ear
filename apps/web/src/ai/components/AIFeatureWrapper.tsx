import React, { useMemo } from 'react';
import { useAIStatus } from '../hooks/useAIStatus';
import { useAIContext } from '../hooks/useAIContext';
import type { AICapability } from '../types/ai.types';
import {
  checkAIAvailability,
  type AIUnavailableReason,
} from '../utils/aiAvailability';
import { getStatusIcon, getStatusColors } from './helpers';

// Note: Utilities removed for Fast Refresh compatibility. Imports are now handled directly from source.

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

  const { bgColor, borderColor, textColor, iconColor } = getStatusColors(isError, isWarning);

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
        {getStatusIcon(isError, isWarning)}
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

// Note: Hook removed for Fast Refresh compatibility. Imports are now handled directly from source.

// =============================================================================
// Default Export
// =============================================================================

export default AIFeatureWrapper;
