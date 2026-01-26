/**
 * AI Types - Web App
 * 
 * Central export point for all AI-related types in the web application.
 * 
 * @module ai/types
 */

export * from './ai.types';

// Admin-specific types (selective export to avoid duplication with ai.types)
export type {
    KillSwitchScope,
    GlobalKillSwitchStatus,
    TenantKillSwitch,
    CapabilityKillSwitch,
    KillSwitchStatusResponse,
    KillSwitchActionRequest,
    KillSwitchActionResponse,
    PendingApprovalItem,
    ApprovalQueueResponse,
    ApprovalDetailResponse,
    ApprovalStepDetail,
    AIMetricsResponse,
    LatencyMetrics,
    ErrorMetrics,
    ApprovalMetrics,
    QuotaMetrics,
    UsageMetrics,
    AlertSeverity,
    AlertType,
    AIAlert,
    AIAlertsResponse,
    AcknowledgeAlertRequest,
    AuditEventType,
    AuditLogEntry,
    AuditLogResponse,
    AuditLogFilters,
    AISettingsResponse,
    UseKillSwitchReturn,
    UseApprovalQueueReturn,
    UseAIMetricsReturn,
    UseAIAlertsReturn,
    UseAIAuditReturn,
    KillSwitchPanelProps,
    ApprovalQueueProps,
    AIMetricsDashboardProps,
    AIAuditViewerProps,
    AISettingsPanelProps,
    KillSwitchRecommendationProps,
} from './ai-admin.types';
