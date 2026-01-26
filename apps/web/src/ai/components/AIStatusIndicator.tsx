/**
 * AI Status Indicator Component
 * 
 * A visual indicator that displays the current AI system status.
 * Shows three status colors:
 * - Green (available): AI is fully operational
 * - Yellow (degraded): AI has limited functionality (quota exceeded, some capabilities disabled)
 * - Red (unavailable): AI is disabled or kill switch is active
 * 
 * Supports multiple size variants and optional label display.
 * 
 * @module ai/components/AIStatusIndicator
 * 
 * Requirements: 1 (AI Status Hook & Indicator)
 */

import React from 'react';
import type { AIStatus } from '../types/ai.types';
import { getStatusType, getDetailedStatusLabel, type AIStatusType } from '../utils/aiStatusHelpers';
import {
  STATUS_INDICATOR_SIZE_CLASSES,
  STATUS_INDICATOR_LABEL_SIZE_CLASSES,
  STATUS_INDICATOR_COLORS,
} from './constants';

// Re-export utilities for backward compatibility
// Note: This triggers react-refresh warning but is intentional for backward compatibility
// These utilities are also available from '../utils/aiStatusHelpers'
export { getStatusType, getDetailedStatusLabel, type AIStatusType };

// =============================================================================
// Types
// =============================================================================

/**
 * Size variants for the status indicator
 */
export type AIStatusIndicatorSize = 'sm' | 'md' | 'lg';



/**
 * Props for AIStatusIndicator component
 */
export interface AIStatusIndicatorProps {
  /**
   * AI status data from useAIStatus hook
   * If null/undefined, shows 'unknown' state
   */
  status: AIStatus | null | undefined;

  /**
   * Size variant of the indicator
   * @default 'md'
   */
  size?: AIStatusIndicatorSize;

  /**
   * Whether to show the status label text
   * @default false
   */
  showLabel?: boolean;

  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * AIStatusIndicator Component
 * 
 * Displays a visual indicator of the AI system status with optional label.
 * 
 * @example
 * ```tsx
 * // Basic usage with useAIStatus hook
 * const { data: status } = useAIStatus();
 * <AIStatusIndicator status={status} />
 * 
 * // With label
 * <AIStatusIndicator status={status} showLabel />
 * 
 * // Different sizes
 * <AIStatusIndicator status={status} size="sm" />
 * <AIStatusIndicator status={status} size="lg" showLabel />
 * 
 * // With custom className
 * <AIStatusIndicator status={status} className="ml-2" />
 * ```
 */
export function AIStatusIndicator({
  status,
  size = 'md',
  showLabel = false,
  className = '',
}: AIStatusIndicatorProps): React.ReactElement {
  const statusType = getStatusType(status);
  const colorClass = STATUS_INDICATOR_COLORS[statusType];
  const sizeClass = STATUS_INDICATOR_SIZE_CLASSES[size];
  const labelSizeClass = STATUS_INDICATOR_LABEL_SIZE_CLASSES[size];
  const label = getDetailedStatusLabel(status);

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-label={`AI durumu: ${label}`}
    >
      {/* Status dot with pulse animation */}
      <span
        className={`${sizeClass} rounded-full ${colorClass} ${statusType === 'available' ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />

      {/* Optional label */}
      {showLabel && (
        <span className={`${labelSizeClass} text-gray-600`}>
          {label}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default AIStatusIndicator;
