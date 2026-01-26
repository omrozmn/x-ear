/**
 * AI Components Constants
 * 
 * Shared constants for AI components including styling classes and default messages.
 * 
 * @module ai/components/constants
 */

// =============================================================================
// Status Indicator Constants
// =============================================================================

/**
 * Size classes for status indicator dots
 */
export const STATUS_INDICATOR_SIZE_CLASSES = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
} as const;

/**
 * Size classes for status indicator labels
 */
export const STATUS_INDICATOR_LABEL_SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const;

/**
 * Color classes for status indicator based on status type
 */
export const STATUS_INDICATOR_COLORS = {
  available: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unavailable: 'bg-red-500',
  unknown: 'bg-gray-400',
} as const;

// =============================================================================
// Phase A Banner Constants
// =============================================================================

/**
 * Default message for Phase A banner
 */
export const DEFAULT_PHASE_A_MESSAGE =
  'AI şu anda sadece öneri modunda. İşlemler otomatik olarak gerçekleştirilmeyecek.';

/**
 * Storage key for Phase A banner dismissal state
 */
export const PHASE_A_BANNER_STORAGE_KEY = 'ai-phase-a-banner-dismissed';

// =============================================================================
// Pending Action Badge Constants
// =============================================================================

/**
 * Default label for pending action badge
 */
export const DEFAULT_PENDING_ACTION_LABEL = 'Onay Bekliyor';

/**
 * Size classes for pending action badge
 */
export const PENDING_BADGE_SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
} as const;

/**
 * Variant classes for pending action badge
 */
export const PENDING_BADGE_VARIANT_CLASSES = {
  default: 'bg-gray-100 text-gray-700 border-gray-300',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  info: 'bg-blue-100 text-blue-700 border-blue-300',
} as const;

/**
 * Position classes for pending action badge when used as overlay
 */
export const PENDING_BADGE_POSITION_CLASSES = {
  'top-right': 'absolute -top-2 -right-2',
  'top-left': 'absolute -top-2 -left-2',
  'bottom-right': 'absolute -bottom-2 -right-2',
  'bottom-left': 'absolute -bottom-2 -left-2',
  inline: 'relative',
} as const;
