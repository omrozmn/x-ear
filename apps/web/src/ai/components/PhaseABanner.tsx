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
// Constants
// =============================================================================

/**
 * Default storage key for session-based dismissal
 */
const DEFAULT_STORAGE_KEY = 'ai-phase-a-banner-dismissed';

/**
 * Default banner message in Turkish
 */
const DEFAULT_MESSAGE = 'AI şu anda yalnızca öneri modunda çalışmaktadır. Aksiyonlar uygulanmaz.';

/**
 * Banner icon (info icon)
 */
const INFO_ICON = (
  <svg 
    className="w-5 h-5 flex-shrink-0" 
    fill="currentColor" 
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path 
      fillRule="evenodd" 
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
      clipRule="evenodd" 
    />
  </svg>
);

/**
 * Close icon for dismiss button
 */
const CLOSE_ICON = (
  <svg 
    className="w-4 h-4" 
    fill="currentColor" 
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path 
      fillRule="evenodd" 
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
      clipRule="evenodd" 
    />
  </svg>
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if banner was dismissed in current session
 * 
 * @param storageKey - Session storage key
 * @returns boolean indicating if banner was dismissed
 */
function isDismissedInSession(storageKey: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return sessionStorage.getItem(storageKey) === 'true';
  } catch {
    // sessionStorage might not be available (e.g., private browsing)
    return false;
  }
}

/**
 * Set banner dismissed state in session storage
 * 
 * @param storageKey - Session storage key
 * @param dismissed - Whether banner is dismissed
 */
function setDismissedInSession(storageKey: string, dismissed: boolean): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (dismissed) {
      sessionStorage.setItem(storageKey, 'true');
    } else {
      sessionStorage.removeItem(storageKey);
    }
  } catch {
    // sessionStorage might not be available
  }
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
  message = DEFAULT_MESSAGE,
  dismissable = true,
  onDismiss,
  storageKey = DEFAULT_STORAGE_KEY,
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
        {INFO_ICON}
        <p className="text-sm font-medium">
          {message}
        </p>
      </div>

      {/* Dismiss Button */}
      {dismissable && (
        <button
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
          {CLOSE_ICON}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Reset the banner dismissed state
 * 
 * Call this to make the banner visible again in the current session.
 * Useful for testing or when user wants to see the banner again.
 * 
 * @param storageKey - Session storage key (default: 'ai-phase-a-banner-dismissed')
 * 
 * @example
 * ```tsx
 * // Reset banner visibility
 * resetPhaseABannerDismissed();
 * 
 * // Reset with custom key
 * resetPhaseABannerDismissed('custom-banner-key');
 * ```
 */
export function resetPhaseABannerDismissed(
  storageKey: string = DEFAULT_STORAGE_KEY
): void {
  setDismissedInSession(storageKey, false);
}

/**
 * Check if Phase A banner should be visible
 * 
 * Utility function to check banner visibility without rendering.
 * Useful for conditional logic outside the component.
 * 
 * @param phase - Current AI phase ('A', 'B', or 'C')
 * @param storageKey - Session storage key
 * @returns boolean indicating if banner should be visible
 */
export function shouldShowPhaseABanner(
  phase: string | null | undefined,
  storageKey: string = DEFAULT_STORAGE_KEY
): boolean {
  if (!phase || phase !== 'A') return false;
  return !isDismissedInSession(storageKey);
}

// =============================================================================
// Default Export
// =============================================================================

export default PhaseABanner;
