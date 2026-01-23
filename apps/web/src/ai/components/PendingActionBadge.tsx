/**
 * Pending Action Badge Component
 * 
 * Displays a badge indicating that an AI action is pending approval.
 * Used to prevent duplicate action submissions and inform users about
 * existing pending actions.
 * 
 * Features:
 * - Shows "Onay Bekliyor" badge when action is pending
 * - Filter by action type if provided
 * - Prevents duplicate action submission
 * - Multiple size variants
 * - Optional click handler to view pending action
 * 
 * @module ai/components/PendingActionBadge
 * 
 * Requirements: 14 (Approval Idempotency & Duplicate Prevention)
 */

import React, { useMemo, useCallback } from 'react';
import { usePendingActions, usePendingActionsCount } from '../hooks/usePendingActions';
import type { ActionPlan } from '../types/ai.types';
import {
  shouldBlockActionSubmission,
  getPendingActionByType,
} from '../utils/aiActionHelpers';

// Re-export helper functions for convenience
export { shouldBlockActionSubmission, getPendingActionByType };

// =============================================================================
// Types
// =============================================================================

/**
 * Size variants for the badge
 */
export type PendingActionBadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge variant styles
 */
export type PendingActionBadgeVariant = 'default' | 'warning' | 'info';

/**
 * Props for PendingActionBadge component
 */
export interface PendingActionBadgeProps {
  /**
   * Filter by specific action type (tool name or intent type)
   * If not provided, shows badge for any pending action
   */
  actionType?: string;

  /**
   * Size variant of the badge
   * @default 'md'
   */
  size?: PendingActionBadgeSize;

  /**
   * Visual variant of the badge
   * @default 'warning'
   */
  variant?: PendingActionBadgeVariant;

  /**
   * Custom label text (overrides default "Onay Bekliyor")
   */
  label?: string;

  /**
   * Whether to show the pending count
   * @default false
   */
  showCount?: boolean;

  /**
   * Callback when badge is clicked
   * Receives the first matching pending action
   */
  onClick?: (action: ActionPlan) => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether the badge should pulse/animate
   * @default true
   */
  animate?: boolean;

  /**
   * Render as inline element (span) instead of block (div)
   * @default true
   */
  inline?: boolean;

  /**
   * Children to render alongside the badge (e.g., button content)
   * Badge will be positioned relative to children
   */
  children?: React.ReactNode;

  /**
   * Position of badge when used with children
   * @default 'top-right'
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default badge label in Turkish
 */
const DEFAULT_LABEL = 'Onay Bekliyor';

/**
 * Size classes for the badge
 */
const SIZE_CLASSES: Record<PendingActionBadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

/**
 * Variant color classes
 */
const VARIANT_CLASSES: Record<PendingActionBadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800 border-gray-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

/**
 * Position classes for badge when used with children
 */
const POSITION_CLASSES: Record<NonNullable<PendingActionBadgeProps['position']>, string> = {
  'top-right': 'absolute -top-1 -right-1',
  'top-left': 'absolute -top-1 -left-1',
  'bottom-right': 'absolute -bottom-1 -right-1',
  'bottom-left': 'absolute -bottom-1 -left-1',
  'inline': 'ml-2',
};

/**
 * Clock/pending icon SVG
 */
const PENDING_ICON = (
  <svg
    className="w-3 h-3 flex-shrink-0"
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
      clipRule="evenodd"
    />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

/**
 * PendingActionBadge Component
 * 
 * Displays a badge when there are pending AI actions awaiting approval.
 * Can be filtered by action type and used to prevent duplicate submissions.
 * 
 * @example
 * ```tsx
 * // Basic usage - shows badge if any action is pending
 * <PendingActionBadge />
 * 
 * // Filter by action type
 * <PendingActionBadge actionType="create_party" />
 * 
 * // With click handler
 * <PendingActionBadge 
 *   actionType="update_record"
 *   onClick={(action) => openActionDetails(action.planId)}
 * />
 * 
 * // As overlay on a button
 * <PendingActionBadge actionType="create_party" position="top-right">
 *   <Button>Hasta Ekle</Button>
 * </PendingActionBadge>
 * 
 * // With count
 * <PendingActionBadge showCount />
 * 
 * // Custom styling
 * <PendingActionBadge 
 *   variant="info" 
 *   size="lg" 
 *   label="İşlem Bekliyor"
 * />
 * ```
 */
export function PendingActionBadge({
  actionType,
  size = 'md',
  variant = 'warning',
  label = DEFAULT_LABEL,
  showCount = false,
  onClick,
  className = '',
  animate = true,
  inline = true,
  children,
  position = 'top-right',
}: PendingActionBadgeProps): React.ReactElement | null {
  // Get pending actions data
  const {
    pendingActions,
    hasPendingActionByType,
    getPendingByType,
    hasPending,
  } = usePendingActions();

  // Determine if we should show the badge
  const shouldShow = useMemo(() => {
    if (actionType) {
      return hasPendingActionByType(actionType);
    }
    return hasPending;
  }, [actionType, hasPendingActionByType, hasPending]);

  // Get filtered pending actions for count and click handler
  const filteredActions = useMemo(() => {
    if (actionType) {
      return getPendingByType(actionType);
    }
    return pendingActions;
  }, [actionType, getPendingByType, pendingActions]);

  // Handle badge click
  const handleClick = useCallback(() => {
    if (onClick && filteredActions.length > 0) {
      onClick(filteredActions[0]);
    }
  }, [onClick, filteredActions]);

  // Don't render if no pending actions match
  if (!shouldShow) {
    return children ? <>{children}</> : null;
  }

  // Build badge classes
  const badgeClasses = `
    inline-flex items-center gap-1 
    font-medium rounded-full border
    ${SIZE_CLASSES[size]}
    ${VARIANT_CLASSES[variant]}
    ${animate ? 'animate-pulse' : ''}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Badge content
  const badgeContent = (
    <>
      {PENDING_ICON}
      <span>{label}</span>
      {showCount && filteredActions.length > 1 && (
        <span className="font-bold">({filteredActions.length})</span>
      )}
    </>
  );

  // Render badge element
  const badgeElement = onClick ? (
    <button data-allow-raw="true"
      type="button"
      onClick={handleClick}
      className={badgeClasses}
      aria-label={`${label} - ${filteredActions.length} bekleyen işlem`}
    >
      {badgeContent}
    </button>
  ) : (
    <span
      className={badgeClasses}
      role="status"
      aria-label={`${label} - ${filteredActions.length} bekleyen işlem`}
    >
      {badgeContent}
    </span>
  );

  // If children provided, render as overlay
  if (children) {
    return (
      <div className="relative inline-flex">
        {children}
        <span className={POSITION_CLASSES[position]}>
          {badgeElement}
        </span>
      </div>
    );
  }

  // Render standalone badge
  const Wrapper = inline ? 'span' : 'div';
  return <Wrapper className="inline-flex">{badgeElement}</Wrapper>;
}

// =============================================================================
// Utility Components
// =============================================================================

/**
 * Simple pending action count badge
 * 
 * A minimal badge that only shows the count of pending actions.
 * Useful for navigation items or compact UI elements.
 * 
 * @example
 * ```tsx
 * <PendingActionCountBadge />
 * // Renders: (3) if 3 actions pending, nothing if 0
 * ```
 */
export function PendingActionCountBadge({
  className = '',
}: {
  className?: string;
}): React.ReactElement | null {
  const count = usePendingActionsCount();

  if (count === 0) {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[1.25rem] h-5 px-1.5
        text-xs font-bold
        bg-yellow-500 text-white
        rounded-full
        ${className}
      `.trim()}
      role="status"
      aria-label={`${count} bekleyen işlem`}
    >
      {count}
    </span>
  );
}



// =============================================================================
// Default Export
// =============================================================================

export default PendingActionBadge;
