/**
 * AI Admin Hooks
 * 
 * Central export point for all AI-related hooks in the admin panel.
 * 
 * @module ai-admin/hooks
 */

export { useKillSwitch } from './useKillSwitch';
export type { UseKillSwitchOptions } from './useKillSwitch';

export { useApprovalQueue } from './useApprovalQueue';
export type { UseApprovalQueueOptions } from './useApprovalQueue';

export { useAIMetrics, useAIAlerts } from './useAIMetrics';
export type { UseAIMetricsOptions, UseAIAlertsOptions } from './useAIMetrics';

export { useAIAudit } from './useAIAudit';
export type { UseAIAuditOptions } from './useAIAudit';

export { useAISettings } from './useAISettings';
export type { UseAISettingsOptions, UseAISettingsReturn, AISettingsData } from './useAISettings';