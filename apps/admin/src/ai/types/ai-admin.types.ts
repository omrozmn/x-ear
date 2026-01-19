/**
 * AI Admin Panel - Type Definitions
 * 
 * This file contains admin-specific AI types for the admin panel.
 * These types are used by admin hooks and components for AI management features.
 * 
 * @module ai-admin/types
 */

// =============================================================================
// Shared Types (duplicated from web app for project isolation)
// =============================================================================

export type AIPhase = 'A' | 'B' | 'C';
export type AIPhaseName = 'read_only' | 'proposal' | 'execution';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AIRole = 'PATIENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
export type AICapability = 'chat' | 'actions' | 'ocr';

export type AIErrorCode =
  | 'AI_DISABLED'
  | 'PHASE_BLOCKED'
  | 'PERMISSION_DENIED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_EXPIRED'
  | 'APPROVAL_INVALID'
  | 'PLAN_DRIFT'
  | 'TENANT_VIOLATION'
  | 'GUARDRAIL_VIOLATION'
  | 'NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INFERENCE_ERROR'
  | 'INFERENCE_TIMEOUT';

export interface AIError {
  code: AIErrorCode;
  message: string;
  requestId?: string;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

export interface AIPhaseStatus {
  currentPhase: AIPhase;
  phaseName: AIPhaseName;
  executionAllowed: boolean;
  proposalAllowed: boolean;
}

export interface KillSwitchStatus {
  globalActive: boolean;
  tenantActive: boolean;
  capabilitiesDisabled: string[];
  reason?: string;
}

export interface QuotaStatus {
  usageType: AICapability;
  currentUsage: number;
  quotaLimit: number | null;
  remaining: number | null;
  exceeded: boolean;
}

export interface UsageStatus {
  totalRequestsToday: number;
  quotas: QuotaStatus[];
  anyQuotaExceeded: boolean;
}

export interface ModelStatus {
  provider: string;
  modelId: string;
  available: boolean;
}

export interface AIStatus {
  enabled: boolean;
  available: boolean;
  phase: AIPhaseStatus;
  killSwitch: KillSwitchStatus;
  usage: UsageStatus;
  model: ModelStatus;
  timestamp: string;
}

export interface ActionStep {
  stepNumber: number;
  toolName: string;
  toolSchemaVersion: string;
  parameters: Record<string, unknown>;
  description: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
}

export type ActionPlanStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'expired';

export interface ActionPlan {
  planId: string;
  status: ActionPlanStatus;
  steps: ActionStep[];
  overallRiskLevel: RiskLevel;
  requiresApproval: boolean;
  planHash: string;
  approvalToken?: string;
  createdAt: string;
  expiresAt?: string;
}

// =============================================================================
// Kill Switch Types
// =============================================================================

/**
 * Kill switch scope types
 */
export type KillSwitchScope = 'global' | 'tenant' | 'capability';

/**
 * Global kill switch status
 */
export interface GlobalKillSwitchStatus {
  active: boolean;
  reason?: string;
  activated_by?: string;
  activated_at?: string;
}

/**
 * Tenant-specific kill switch
 */
export interface TenantKillSwitch {
  tenant_id: string;
  tenant_name?: string;
  active: boolean;
  reason?: string;
  activated_by?: string;
  activated_at?: string;
}

/**
 * Capability-specific kill switch
 */
export interface CapabilityKillSwitch {
  capability: string;
  active: boolean;
  reason?: string;
  activated_by?: string;
  activated_at?: string;
}

/**
 * Complete kill switch status response from /ai/admin/kill-switch
 */
export interface KillSwitchStatusResponse {
  global_switch: GlobalKillSwitchStatus;
  tenant_switches: TenantKillSwitch[];
  capability_switches: CapabilityKillSwitch[];
  timestamp: string;
}

/**
 * Request to activate/deactivate kill switch
 */
export interface KillSwitchActionRequest {
  action: 'activate' | 'deactivate';
  scope: KillSwitchScope;
  target_id?: string; // tenant_id or capability name
  reason?: string; // Required for activation
}

/**
 * Response from kill switch action
 */
export interface KillSwitchActionResponse {
  success: boolean;
  message: string;
  scope: KillSwitchScope;
  target_id?: string;
}

// =============================================================================
// Approval Queue Types
// =============================================================================

/**
 * Pending approval item in the queue
 */
export interface PendingApprovalItem {
  action_id: string;
  plan_id: string;
  tenant_id: string;
  tenant_name?: string;
  user_id: string;
  user_email?: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  steps_count: number;
  steps_summary: string[];
  created_at: string;
  expires_at: string;
  approval_token: string;
  plan_hash: string;
}

/**
 * Response from /ai/admin/pending-approvals
 */
export interface ApprovalQueueResponse {
  items: PendingApprovalItem[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Detailed action plan for approval review
 */
export interface ApprovalDetailResponse {
  action_id: string;
  plan: {
    plan_id: string;
    steps: ApprovalStepDetail[];
    overall_risk_level: string;
    risk_reasoning: string;
    rollback_procedure?: string;
  };
  context: {
    tenant_id: string;
    user_id: string;
    party_id?: string;
    intent_type: string;
    original_prompt?: string;
  };
  created_at: string;
  expires_at: string;
}

/**
 * Step detail for approval review
 */
export interface ApprovalStepDetail {
  step_number: number;
  tool_name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk_level: string;
  risk_factors: string[];
}

// =============================================================================
// Metrics Types
// =============================================================================

/**
 * AI metrics response from /ai/metrics
 */
export interface AIMetricsResponse {
  window_minutes: number;
  timestamp: string;
  latency: LatencyMetrics;
  errors: ErrorMetrics;
  approvals: ApprovalMetrics;
  quotas: QuotaMetrics;
  usage: UsageMetrics;
}

/**
 * Latency metrics (in milliseconds)
 */
export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  max: number;
  sample_count: number;
}

/**
 * Error rate metrics
 */
export interface ErrorMetrics {
  total_requests: number;
  error_count: number;
  error_rate: number; // 0-1
  timeout_count: number;
  timeout_rate: number; // 0-1
  errors_by_code: Record<string, number>;
}

/**
 * Approval workflow metrics
 */
export interface ApprovalMetrics {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  expired_count: number;
  avg_approval_time_ms: number;
  rejection_rate: number; // 0-1
}

/**
 * Quota usage metrics
 */
export interface QuotaMetrics {
  quota_rejections: number;
  quota_rejection_rate: number; // 0-1
  tenants_at_limit: number;
  by_capability: Record<string, {
    current_usage: number;
    limit: number;
    utilization: number; // 0-1
  }>;
}

/**
 * General usage metrics
 */
export interface UsageMetrics {
  total_requests: number;
  unique_users: number;
  unique_tenants: number;
  by_capability: Record<string, number>;
  by_intent_type: Record<string, number>;
}

// =============================================================================
// Alert Types
// =============================================================================

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert type categories
 */
export type AlertType = 
  | 'high_error_rate'
  | 'high_latency'
  | 'quota_threshold'
  | 'model_unavailable'
  | 'circuit_breaker_open'
  | 'approval_backlog'
  | 'security_violation';

/**
 * Individual alert item
 */
export interface AIAlert {
  alert_id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  auto_resolved: boolean;
  resolved_at?: string;
}

/**
 * Response from /ai/alerts
 */
export interface AIAlertsResponse {
  alerts: AIAlert[];
  active_count: number;
  total_count: number;
}

/**
 * Request to acknowledge an alert
 */
export interface AcknowledgeAlertRequest {
  alert_id: string;
  notes?: string;
}

// =============================================================================
// Audit Log Types
// =============================================================================

/**
 * Audit event types
 */
export type AuditEventType =
  | 'chat_request'
  | 'chat_response'
  | 'action_created'
  | 'action_approved'
  | 'action_rejected'
  | 'action_executed'
  | 'action_failed'
  | 'kill_switch_activated'
  | 'kill_switch_deactivated'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'guardrail_violation'
  | 'context_violation';

/**
 * Individual audit log entry
 */
export interface AuditLogEntry {
  log_id: string;
  timestamp: string;
  event_type: AuditEventType;
  tenant_id: string;
  tenant_name?: string;
  user_id: string;
  user_email?: string;
  party_id?: string;
  request_id?: string;
  action_id?: string;
  risk_level?: string;
  outcome: 'success' | 'failure' | 'blocked';
  event_data: Record<string, unknown>;
  diff_snapshot?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Response from /ai/audit
 */
export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/**
 * Filters for audit log query
 */
export interface AuditLogFilters {
  tenant_id?: string;
  user_id?: string;
  event_type?: AuditEventType;
  from_date?: string;
  to_date?: string;
  risk_level?: string;
  outcome?: 'success' | 'failure' | 'blocked';
  limit?: number;
  offset?: number;
}

// =============================================================================
// Settings Types
// =============================================================================

/**
 * AI configuration settings (read-only display)
 */
export interface AISettingsResponse {
  enabled: boolean;
  phase: {
    current: 'A' | 'B' | 'C';
    name: string;
    description: string;
  };
  model: {
    provider: string;
    model_id: string;
    max_tokens: number;
    temperature: number;
  };
  rate_limits: {
    requests_per_minute: number;
    requests_per_hour: number;
  };
  quotas: {
    chat_daily_limit: number | null;
    actions_daily_limit: number | null;
    ocr_daily_limit: number | null;
  };
  features: {
    chat_enabled: boolean;
    actions_enabled: boolean;
    ocr_enabled: boolean;
  };
  guardrails: {
    pii_redaction_enabled: boolean;
    phi_redaction_enabled: boolean;
    max_prompt_length: number;
  };
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useKillSwitch hook
 */
export interface UseKillSwitchReturn {
  status: KillSwitchStatusResponse | undefined;
  isLoading: boolean;
  activateGlobal: (reason: string) => Promise<KillSwitchActionResponse>;
  deactivateGlobal: () => Promise<KillSwitchActionResponse>;
  activateTenant: (tenantId: string, reason: string) => Promise<KillSwitchActionResponse>;
  deactivateTenant: (tenantId: string) => Promise<KillSwitchActionResponse>;
  activateCapability: (capability: string, reason: string) => Promise<KillSwitchActionResponse>;
  deactivateCapability: (capability: string) => Promise<KillSwitchActionResponse>;
}

/**
 * Return type for useApprovalQueue hook
 */
export interface UseApprovalQueueReturn {
  items: PendingApprovalItem[];
  total: number;
  isLoading: boolean;
  approve: (params: { actionId: string; approvalToken: string }) => Promise<void>;
  reject: (params: { actionId: string; reason: string }) => Promise<void>;
  isApproving: boolean;
  isRejecting: boolean;
}

/**
 * Return type for useAIMetrics hook
 */
export interface UseAIMetricsReturn {
  data: AIMetricsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Return type for useAIAlerts hook
 */
export interface UseAIAlertsReturn {
  alerts: AIAlert[];
  activeCount: number;
  isLoading: boolean;
  acknowledge: (alertId: string, notes?: string) => Promise<void>;
  isAcknowledging: boolean;
}

/**
 * Return type for useAIAudit hook
 */
export interface UseAIAuditReturn {
  entries: AuditLogEntry[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
  refetch: () => void;
  isError: boolean;
  error: Error | null;
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Props for KillSwitchPanel component
 */
export interface KillSwitchPanelProps {
  className?: string;
}

/**
 * Props for ApprovalQueue component
 */
export interface ApprovalQueueProps {
  tenantId?: string;
  className?: string;
}

/**
 * Props for AIMetricsDashboard component
 */
export interface AIMetricsDashboardProps {
  defaultWindowMinutes?: number;
  className?: string;
}

/**
 * Props for AIAuditViewer component
 */
export interface AIAuditViewerProps {
  initialFilters?: AuditLogFilters;
  className?: string;
}

/**
 * Props for AISettingsPanel component
 */
export interface AISettingsPanelProps {
  className?: string;
}

/**
 * Props for KillSwitchRecommendation component
 */
export interface KillSwitchRecommendationProps {
  className?: string;
  onActivate?: () => void;
}
