/**
 * AI Frontend Integration - Type Definitions
 * 
 * This file contains all AI-related TypeScript types for the web application.
 * These types are used by hooks, components, and stores for AI feature integration.
 * 
 * @module ai/types
 */

// =============================================================================
// AI Status Types
// =============================================================================

/**
 * Overall AI system status returned from /ai/status endpoint
 */
export interface AIStatus {
  enabled: boolean;
  available: boolean;
  phase: AIPhaseStatus;
  killSwitch: KillSwitchStatus;
  usage: UsageStatus;
  model: ModelStatus;
  timestamp: string;
}

/**
 * AI deployment phase status
 * - Phase A: Read-only (sadece öneriler)
 * - Phase B: Proposal (onay ile aksiyon)
 * - Phase C: Execution (onaylı aksiyonlar çalışır)
 */
export interface AIPhaseStatus {
  currentPhase: AIPhase;
  phaseName: AIPhaseName;
  executionAllowed: boolean;
  proposalAllowed: boolean;
}

export type AIPhase = 'A' | 'B' | 'C';
export type AIPhaseName = 'read_only' | 'proposal' | 'execution';

/**
 * Kill switch status for AI features
 */
export interface KillSwitchStatus {
  globalActive: boolean;
  tenantActive: boolean;
  capabilitiesDisabled: string[];
  reason?: string;
}

/**
 * AI usage and quota status
 */
export interface UsageStatus {
  totalRequestsToday: number;
  quotas: QuotaStatus[];
  anyQuotaExceeded: boolean;
}

/**
 * Individual quota status for each AI capability
 */
export interface QuotaStatus {
  usageType: AICapability;
  currentUsage: number;
  quotaLimit: number | null;
  remaining: number | null;
  exceeded: boolean;
}

/**
 * AI model provider status
 */
export interface ModelStatus {
  provider: string;
  modelId: string;
  available: boolean;
}

// =============================================================================
// Chat Types
// =============================================================================

/**
 * Chat message in the conversation history
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  intent?: IntentResponse;
  piiDetected?: boolean;
  phiDetected?: boolean;
}

export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Intent classification response from AI
 */
export interface IntentResponse {
  intentType: string;
  confidence: number;
  entities: Record<string, unknown>;
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
}

/**
 * Request payload for /ai/chat endpoint
 */
export interface ChatRequest {
  prompt: string;
  context?: AIContext;
  idempotencyKey?: string;
  sessionId?: string;
}

/**
 * Response from /ai/chat endpoint
 */
export interface ChatResponse {
  requestId: string;
  status: string;
  intent?: IntentResponse;
  response?: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  processingTimeMs: number;
  piiDetected: boolean;
  phiDetected: boolean;
}

// =============================================================================
// Action Types
// =============================================================================

/**
 * AI-generated action plan
 */
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

export type ActionPlanStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'expired';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Individual step in an action plan
 */
export interface ActionStep {
  stepNumber: number;
  toolName: string;
  toolSchemaVersion: string;
  parameters: Record<string, unknown>;
  description: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
}

/**
 * Result of action execution
 */
export interface ExecutionResult {
  actionId: string;
  requestId: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  stepResults: StepExecutionResult[];
  totalExecutionTimeMs: number;
  errorMessage?: string;
}

export type ExecutionStatus = 'success' | 'partial' | 'failed' | 'cancelled';
export type ExecutionMode = 'simulate' | 'execute';

/**
 * Result of individual step execution
 */
export interface StepExecutionResult {
  stepNumber: number;
  toolName: string;
  status: StepStatus;
  result?: Record<string, unknown>;
  errorMessage?: string;
  executionTimeMs: number;
}

export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

/**
 * Real-time execution progress for UI updates
 * Used by aiRuntimeStore for transient execution state
 */
export interface ExecutionProgress {
  actionId: string;
  currentStep: number;
  totalSteps: number;
  stepStatuses: StepProgressStatus[];
  overallStatus: ExecutionProgressStatus;
  startedAt: Date;
  estimatedCompletionMs?: number;
}

export interface StepProgressStatus {
  stepNumber: number;
  status: StepStatus;
  progress?: number; // 0-100 percentage
  message?: string;
}

export type ExecutionProgressStatus = 
  | 'initializing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

// =============================================================================
// Context Types
// =============================================================================

/**
 * AI context injected into every AI request
 * Required for proper tenant/party isolation
 */
export interface AIContext {
  context_version: string;
  tenant_id: string;
  party_id: string | null;
  role: AIRole;
  profile: AIProfile;
  capability?: AICapability;
}

export type AIRole = 'PARTY' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
export type AIProfile = 'HEARING' | 'OPTICAL' | 'GENERAL';
export type AICapability = 'chat' | 'actions' | 'ocr';

// =============================================================================
// Error Types
// =============================================================================

/**
 * AI error codes returned from backend
 */
export type AIErrorCode =
  // 4xx - Client Errors (NOT retryable)
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
  // 429 - Rate Limiting
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  // 5xx - Server Errors (retryable)
  | 'INFERENCE_ERROR'
  | 'INFERENCE_TIMEOUT';

/**
 * Structured AI error response
 */
export interface AIError {
  code: AIErrorCode;
  message: string;
  requestId?: string;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

// =============================================================================
// Request/Response Types for Actions API
// =============================================================================

/**
 * Request to create a new action plan
 */
export interface CreateActionRequest {
  intent: {
    intentType: string;
    confidence: number;
    entities: Record<string, unknown>;
  };
  context: AIContext;
  idempotencyKey?: string;
}

/**
 * Response from action creation
 */
export interface CreateActionResponse {
  plan: ActionPlan;
  requestId: string;
}

/**
 * Request to approve an action
 */
export interface ApproveActionRequest {
  approval_token: string;
}

/**
 * Response from action approval
 */
export interface ApproveActionResponse {
  status: string;
  actionId: string;
}

/**
 * Request to execute an action
 */
export interface ExecuteActionRequest {
  mode: ExecutionMode;
  approval_token?: string;
}

// =============================================================================
// Capability Configuration Types
// =============================================================================

/**
 * Configuration for an AI capability
 */
export interface CapabilityConfig {
  requiresApproval: boolean;
  minPhase: AIPhase;
  description: string;
  retryable: boolean;
  allowedRoles: AIRole[];
}

/**
 * Registry of all AI capabilities
 */
export type AICapabilityRegistry = Record<AICapability, CapabilityConfig>;

// =============================================================================
// Store Types
// =============================================================================

/**
 * State shape for aiRuntimeStore (ephemeral, no persistence)
 */
export interface AIRuntimeState {
  currentPlan: ActionPlan | null;
  executionProgress: ExecutionProgress | null;
  isTyping: boolean;
  isExecuting: boolean;
}

/**
 * State shape for aiSessionStore (persisted, party_id scoped)
 */
export interface AISessionState {
  chatHistory: ChatMessage[];
  sessionId: string | null;
  lastAIStatus: AIStatus | null;
  pendingActions: ActionPlan[];
  currentPartyId: string | null;
  currentTenantId: string | null;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useAIStatus hook
 */
export interface UseAIStatusReturn {
  data: AIStatus | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Return type for useAIChat hook
 */
export interface UseAIChatReturn {
  messages: ChatMessage[];
  sendMessage: (prompt: string, context?: Record<string, unknown>) => Promise<ChatResponse>;
  isTyping: boolean;
  isLoading: boolean;
  error: AIError | null;
  clearHistory: () => void;
}

/**
 * Options for useAIStatus hook
 */
export interface UseAIStatusOptions {
  enabled?: boolean;
  refetchInterval?: number;
}
