/**
 * AI Components - Web App
 * 
 * Central export point for all AI-related UI components.
 * 
 * @module ai/components
 */

// Status Indicator
export {
  AIStatusIndicator,
  type AIStatusIndicatorProps,
  type AIStatusIndicatorSize,
} from './AIStatusIndicator';

export {
  getStatusType,
  getDetailedStatusLabel,
  type AIStatusType,
} from '../utils/aiStatusHelpers';

// Phase A Banner
export {
  PhaseABanner,
  type PhaseABannerProps,
} from './PhaseABanner';

export {
  resetPhaseABannerDismissed,
  shouldShowPhaseABanner,
} from '../utils/aiPhaseHelpers';

// AI Chat Widget
export {
  AIChatWidget,
  ChatInput,
  type AIChatWidgetProps,
  type ChatMessageProps,
  type ChatInputProps,
} from './AIChatWidget';

// AI Action Preview
export {
  AIActionPreview,
  type AIActionPreviewProps,
} from './AIActionPreview';

// Pending Action Badge
export {
  PendingActionBadge,
  PendingActionCountBadge,
  type PendingActionBadgeProps,
  type PendingActionBadgeSize,
  type PendingActionBadgeVariant,
} from './PendingActionBadge';

export {
  shouldBlockActionSubmission,
  getPendingActionByType,
} from '../utils/pendingActionHelpers';

// AI Feature Wrapper
export {
  AIFeatureWrapper,
  type AIFeatureWrapperProps,
} from './AIFeatureWrapper';

export { useAIFeatureAvailability } from '../hooks/useAIFeatureAvailability';
export {
  checkAIAvailability,
  getUnavailableMessage,
  type AIUnavailableReason,
  type AIAvailabilityResult,
} from '../utils/aiAvailability';

// AI Feature Examples (for reference)
export {
  AIChatFeatureExample,
  AIHiddenFeatureExample,
  AIConditionalFeatureExample,
  AIActionButtonExample,
  AIDynamicFallbackExample,
  AIPartyContextExample,
} from './AIFeatureExample';

export { withAIFeature } from './hocs';

// AI Action Buttons (pre-built components with pending action prevention)
export {
  AIActionButton,
  AIQuickAction,
  AICreatePartyButton,
  AIUpdatePartyButton,
  AICreateAppointmentButton,
  type AIActionButtonProps,
} from './AIActionButtons';
