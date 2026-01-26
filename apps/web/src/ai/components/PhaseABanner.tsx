/**
 * Phase A Banner Component
 * 
 * Displays an informational banner when AI is in Phase A (read-only mode).
 * The banner informs users that AI is only providing suggestions and
 * actions will not be executed.
 * 
 * Features:
 * - Only visible when AI phase = 'A' (read_only)
 * - Dismissable (session-based, reappears on new session)
 * - Info (blue) styling
 * 
 * @module ai/components/PhaseABanner
 * 
 * Requirements: 17 (Phase A Read-Only Mode Banner)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAIPhase } from '../hooks/useAIStatus';
import {
  isDismissedInSession,
  setDismissedInSession,
  resetPhaseABannerDismissed,
  shouldShowPhaseABanner,
} from '../utils/aiPhaseHelpers';
import {
  DEFAULT_PHASE_A_MESSAGE,
  PHASE_A_BANNER_STORAGE_KEY,
} from './constants';
import { InfoIcon, CloseIcon } from './icons';

// Re-export utilities for backward compatibility
// Note: This triggers react-refresh warning but is intentional for backward compatibility
// These utilities are also available from '../utils/aiPhaseHelpers'
export { resetPhaseABannerDismissed, shouldShowPhaseABanner };

// =============================================================================
// Types
// =============================================================================

/**
 * Props for PhaseABanner component
 */
export interface PhaseABannerProps {
  /**
   * Additional CSS classes to apply to the banner container
   */
  className?: string;

  /**
   * Custom message to display (overrides default)
   */
  message?: string;

  /**
   * Whether to show the dismiss button
   * @default true
   */
  dismissable?: boolean;

  /**
   * Callback when banner is dismissed
   */
  onDismiss?: () => void;

  /**
   * Storage key for session-based dismissal state
   * @default 'ai-phase-a-banner-dismissed'
   */
  storageKey?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * PhaseABanner Component
 * 
 * Displays an info banner when AI is in Phase A (read-only mode).
 * The banner is dismissable and the dismissal state is stored in sessionStorage.
 * 
 * @example
 * ```tsx
 * // Basic usage - automatically shows when phase = 'A'
 * <PhaseABanner />
 * 
 * // With custom message
 * <PhaseABanner message="AI sadece öneri modunda." />
 * 
 * // Non-dismissable
 * <PhaseABanner dismissable={false} />
 * 
 * // With dismiss callback
 * <PhaseABanner onDismiss={() => console.log('Banner dismissed')} />
 * 
 * // With custom className
 * <PhaseABanner className="mb-4" />
 * ```
 */
export function PhaseABanner({
  className = '',
  message = DEFAULT_PHASE_A_MESSAGE,
  dismissable = true,
  onDismiss,
  storageKey = PHASE_A_BANNER_STORAGE_KEY,
}: PhaseABannerProps): React.ReactElement | null {
  // Get current AI phase
  const phase = useAIPhase();

  // Track dismissed state (session-based)
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    isDismissedInSession(storageKey)
  );

  // Sync dismissed state with sessionStorage on mount
  useEffect(() => {
    setIsDismissed(isDismissedInSession(storageKey));
  }, [storageKey]);

  // Handle dismiss action
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    setDismissedInSession(storageKey, true);
    onDismiss?.();
  }, [storageKey, onDismiss]);

  // Don't render if:
  // 1. Phase is not 'A' (read_only)
  // 2. Banner has been dismissed in this session
  // 3. Phase data is not yet loaded
  if (!phase || phase.currentPhase !== 'A' || isDismissed) {
    return null;
  }

  return (
    <div
      className={`
        flex items-center justify-between gap-3 
        px-4 py-3 
        bg-blue-50 border border-blue-200 
        rounded-lg
        ${className}
      `.trim()}
      role="alert"
      aria-live="polite"
    >
      {/* Icon and Message */}
      <div className="flex items-center gap-3 text-blue-700">
        <InfoIcon />
        <p className="text-sm font-medium">
          {message}
        </p>
      </div>

      {/* Dismiss Button */}
      {dismissable && (
        <button data-allow-raw="true"
          type="button"
          onClick={handleDismiss}
          className="
            flex-shrink-0 
            p-1 
            text-blue-500 hover:text-blue-700 
            hover:bg-blue-100 
            rounded 
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          "
          aria-label="Bildirimi kapat"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}



// =============================================================================
// Default Export
// =============================================================================

export default PhaseABanner;
