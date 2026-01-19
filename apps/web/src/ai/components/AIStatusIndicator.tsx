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

// =============================================================================
// Types
// =============================================================================

/**
 * Size variants for the status indicator
 */
export type AIStatusIndicatorSize = 'sm' | 'md' | 'lg';

/**
 * Status type derived from AIStatus
 */
export type AIStatusType = 'available' | 'degraded' | 'unavailable' | 'unknown';

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
// Constants
// =============================================================================

/**
 * Size classes for the indicator dot
 */
const SIZE_CLASSES: Record<AIStatusIndicatorSize, string> = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

/**
 * Label text size classes
 */
const LABEL_SIZE_CLASSES: Record<AIStatusIndicatorSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * Status color classes (Tailwind CSS)
 */
const STATUS_COLORS: Record<AIStatusType, string> = {
  available: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unavailable: 'bg-red-500',
  unknown: 'bg-gray-400',
};

/**
 * Status labels in Turkish
 */
const STATUS_LABELS: Record<AIStatusType, string> = {
  available: 'Aktif',
  degraded: 'Kısıtlı',
  unavailable: 'Devre Dışı',
  unknown: 'Bilinmiyor',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine the status type from AIStatus data
 * 
 * Logic:
 * 1. If no status data -> unknown
 * 2. If not enabled -> unavailable
 * 3. If kill switch active (global or tenant) -> unavailable
 * 4. If available = true -> available
 * 5. If quota exceeded or capabilities disabled -> degraded
 * 6. Otherwise -> unavailable
 * 
 * @param status - AIStatus data or null/undefined
 * @returns AIStatusType
 */
export function getStatusType(status: AIStatus | null | undefined): AIStatusType {
  // No status data
  if (!status) {
    return 'unknown';
  }

  // AI is disabled by configuration
  if (!status.enabled) {
    return 'unavailable';
  }

  // Kill switch is active
  if (status.killSwitch.globalActive || status.killSwitch.tenantActive) {
    return 'unavailable';
  }

  // AI is fully available
  if (status.available) {
    return 'available';
  }

  // Check for degraded conditions
  const hasDegradedConditions = 
    status.usage.anyQuotaExceeded || 
    status.killSwitch.capabilitiesDisabled.length > 0 ||
    !status.model.available;

  if (hasDegradedConditions) {
    return 'degraded';
  }

  // Default to unavailable if not available
  return 'unavailable';
}

/**
 * Get detailed status label based on specific conditions
 * 
 * @param status - AIStatus data or null/undefined
 * @returns Detailed status label string
 */
export function getDetailedStatusLabel(status: AIStatus | null | undefined): string {
  if (!status) {
    return STATUS_LABELS.unknown;
  }

  if (!status.enabled) {
    return 'Devre Dışı';
  }

  if (status.killSwitch.globalActive) {
    return 'Durduruldu';
  }

  if (status.killSwitch.tenantActive) {
    return 'Tenant Durduruldu';
  }

  if (status.available) {
    return 'Aktif';
  }

  if (status.usage.anyQuotaExceeded) {
    return 'Limit Aşıldı';
  }

  if (status.killSwitch.capabilitiesDisabled.length > 0) {
    return 'Kısıtlı';
  }

  if (!status.model.available) {
    return 'Model Kullanılamıyor';
  }

  return 'Kullanılamıyor';
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
  const colorClass = STATUS_COLORS[statusType];
  const sizeClass = SIZE_CLASSES[size];
  const labelSizeClass = LABEL_SIZE_CLASSES[size];
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
