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
  getStatusType,
  getDetailedStatusLabel,
  type AIStatusIndicatorProps,
  type AIStatusIndicatorSize,
  type AIStatusType,
} from './AIStatusIndicator';

// Phase A Banner
export {
  PhaseABanner,
  resetPhaseABannerDismissed,
  shouldShowPhaseABanner,
  type PhaseABannerProps,
} from './PhaseABanner';

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
  shouldBlockActionSubmission,
  getPendingActionByType,
  type PendingActionBadgeProps,
  type PendingActionBadgeSize,
  type PendingActionBadgeVariant,
} from './PendingActionBadge';

// AI Feature Wrapper
export {
  AIFeatureWrapper,
  useAIFeatureAvailability,
  checkAIAvailability,
  getUnavailableMessage,
  type AIFeatureWrapperProps,
  type AIUnavailableReason,
  type AIAvailabilityResult,
} from './AIFeatureWrapper';

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

// Admin Components
export { AIMetricsDashboard } from './AIMetricsDashboard/AIMetricsDashboard';
export { AISettingsPanel } from './AISettingsPanel/AISettingsPanel';
export { KillSwitchPanel } from './KillSwitchPanel/KillSwitchPanel';
export { ApprovalQueue } from './ApprovalQueue/ApprovalQueue';
export { KillSwitchRecommendation } from './KillSwitchRecommendation';
export { AIAuditViewer } from './AIAuditViewer/AIAuditViewer';
