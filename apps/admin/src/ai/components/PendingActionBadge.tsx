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
  DEFAULT_PENDING_ACTION_LABEL,
  PENDING_BADGE_SIZE_CLASSES,
  PENDING_BADGE_VARIANT_CLASSES,
  PENDING_BADGE_POSITION_CLASSES,
} from './constants';
import { PendingIcon } from './helpers';

// =============================================================================
// Helper Functions (exports)
// =============================================================================

export function getPendingActionByType(
  actionType: string,
  pendingActions: ActionPlan[]
): ActionPlan | undefined {
  const normalized = actionType.trim().toLowerCase();
  if (!normalized) return undefined;

  return pendingActions.find((action) =>
    action.steps.some((step) =>
      step.toolName === actionType ||
      step.toolName.toLowerCase() === normalized ||
      step.description.toLowerCase().includes(normalized)
    )
  );
}

export function shouldBlockActionSubmission(
  actionType: string,
  pendingActions: ActionPlan[]
): boolean {
  return !!getPendingActionByType(actionType, pendingActions);
}

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
  label = DEFAULT_PENDING_ACTION_LABEL,
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
    ${PENDING_BADGE_SIZE_CLASSES[size]}
    ${PENDING_BADGE_VARIANT_CLASSES[variant]}
    ${animate ? 'animate-pulse' : ''}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Badge content
  const badgeContent = (
    <>
      <PendingIcon />
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
        <span className={PENDING_BADGE_POSITION_CLASSES[position]}>
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
