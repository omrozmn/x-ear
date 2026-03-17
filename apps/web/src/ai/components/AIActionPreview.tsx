/**
 * AI Action Preview Component
 * 
 * Displays an AI-generated action plan with:
 * - Action plan steps with risk levels
 * - Simulate/Execute mode selector
 * - Real-time execution progress from aiRuntimeStore
 * - Phase restrictions (hide execute in Phase A)
 * 
 * @module ai/components/AIActionPreview
 * 
 * Requirements: 3 (AI Actions Integration)
 */

import React, { useState, useCallback } from 'react';
import { useAIPhase } from '../hooks/useAIStatus';
import { useAIRuntimeStore } from '../stores/aiRuntimeStore';
import type {
  ActionPlan,
  ActionStep,
  RiskLevel,
  ExecutionMode,
  ExecutionProgress,
  StepStatus,
} from '../types/ai.types';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AIActionPreview component
 */
export interface AIActionPreviewProps {
  /**
   * The action plan to display
   */
  plan: ActionPlan;

  /**
   * Callback when user clicks simulate
   */
  onSimulate?: (planId: string) => void;

  /**
   * Callback when user clicks execute
   */
  onExecute?: (planId: string, approvalToken?: string) => void;

  /**
   * Callback when user clicks approve
   */
  onApprove?: (planId: string, approvalToken: string) => void;

  /**
   * Whether the component is in loading state
   */
  isLoading?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to show the mode selector
   * @default true
   */
  showModeSelector?: boolean;

  /**
   * Whether to show action buttons
   * @default true
   */
  showActions?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Risk level colors (Tailwind CSS classes)
 */
const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; badge: string }> = {
  low: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-green-200',
    badge: 'bg-success/10 text-success',
  },
  medium: {
    bg: 'bg-warning/10',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    badge: 'bg-warning/10 text-yellow-800',
  },
  high: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
  },
  critical: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-red-200',
    badge: 'bg-destructive/10 text-red-800',
  },
};

/**
 * Risk level labels in Turkish
 */
const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Düşük Risk',
  medium: 'Orta Risk',
  high: 'Yüksek Risk',
  critical: 'Kritik Risk',
};

/**
 * Step status colors and icons
 */
const STEP_STATUS_CONFIG: Record<StepStatus, { color: string; icon: string; label: string }> = {
  pending: { color: 'text-muted-foreground', icon: '○', label: 'Bekliyor' },
  running: { color: 'text-primary', icon: '◐', label: 'Çalışıyor' },
  success: { color: 'text-success', icon: '●', label: 'Tamamlandı' },
  failed: { color: 'text-destructive', icon: '✕', label: 'Başarısız' },
  skipped: { color: 'text-muted-foreground', icon: '○', label: 'Atlandı' },
};

/**
 * Mode selector options
 */
const MODE_OPTIONS: { value: ExecutionMode; label: string; description: string }[] = [
  {
    value: 'simulate',
    label: 'Simülasyon',
    description: 'Değişiklik yapmadan önizleme',
  },
  {
    value: 'execute',
    label: 'Uygula',
    description: 'Değişiklikleri gerçekleştir',
  },
];

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Risk Level Badge Component
 */
interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

function RiskBadge({ level, className = '' }: RiskBadgeProps): React.ReactElement {
  const colors = RISK_COLORS[level];
  const label = RISK_LABELS[level];

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
        ${colors.badge}
        ${className}
      `.trim()}
    >
      {label}
    </span>
  );
}

/**
 * Action Step Component
 */
interface ActionStepItemProps {
  step: ActionStep;
  status?: StepStatus;
  progress?: number;
  isActive?: boolean;
}

function ActionStepItem({
  step,
  status = 'pending',
  progress,
  isActive = false,
}: ActionStepItemProps): React.ReactElement {
  const statusConfig = STEP_STATUS_CONFIG[status];

  return (
    <div
      className={`
        relative flex items-start gap-3 p-3 rounded-2xl border transition-colors
        ${isActive ? 'bg-primary/10 border-blue-200 dark:border-blue-800' : 'bg-card border-border'}
        ${status === 'failed' ? 'bg-destructive/10 border-red-200 dark:border-red-800' : ''}
      `.trim()}
    >
      {/* Step Number & Status Icon */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <span
          className={`
            w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
            ${isActive ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}
            ${status === 'success' ? 'bg-green-500 text-white' : ''}
            ${status === 'failed' ? 'bg-red-500 text-white' : ''}
          `.trim()}
        >
          {status === 'success' ? '✓' : status === 'failed' ? '✕' : step.stepNumber}
        </span>
        {/* Status indicator */}
        <span className={`mt-1 text-xs ${statusConfig.color}`}>
          {statusConfig.icon}
        </span>
      </div>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground text-sm">
            {step.toolName}
          </span>
          <RiskBadge level={step.riskLevel as RiskLevel} />
          {step.requiresApproval && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              Onay Gerekli
            </span>
          )}
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {step.description}
        </p>

        {/* Progress bar for running steps */}
        {status === 'running' && progress !== undefined && (
          <div className="mt-2 w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Parameters preview (collapsed by default) */}
        {Object.keys(step.parameters).length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Parametreler ({Object.keys(step.parameters).length})
            </summary>
            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
              {JSON.stringify(step.parameters, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Mode Selector Component
 */
interface ModeSelectorProps {
  value: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
  hideExecute?: boolean;
}

function ModeSelector({
  value,
  onChange,
  disabled = false,
  hideExecute = false,
}: ModeSelectorProps): React.ReactElement {
  const options = hideExecute
    ? MODE_OPTIONS.filter(opt => opt.value !== 'execute')
    : MODE_OPTIONS;

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button data-allow-raw="true"
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`
            flex-1 px-4 py-2 rounded-2xl border text-sm font-medium transition-colors
            ${value === option.value
              ? 'bg-primary/10 border-blue-500 text-primary'
              : 'bg-card border-border text-foreground hover:bg-accent'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `.trim()}
          title={option.description}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Execution Progress Display Component
 */
interface ExecutionProgressDisplayProps {
  progress: ExecutionProgress;
}

function ExecutionProgressDisplay({ progress }: ExecutionProgressDisplayProps): React.ReactElement {
  const percentage = Math.round((progress.currentStep / progress.totalSteps) * 100);

  return (
    <div className="p-4 bg-primary/10 border border-blue-200 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-primary">
          Çalışıyor: Adım {progress.currentStep} / {progress.totalSteps}
        </span>
        <span className="text-sm text-primary">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-primary">
        Durum: {progress.overallStatus === 'running' ? 'Çalışıyor...' : progress.overallStatus}
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AIActionPreview Component
 * 
 * Displays an AI-generated action plan with steps, risk levels,
 * mode selection, and execution progress.
 * 
 * @example
 * ```tsx
 * const { currentPlan } = useAIActions();
 * 
 * <AIActionPreview
 * plan={currentPlan}
 * onSimulate={(planId) => executeAction({ actionId: planId, mode: 'simulate' })}
 * onExecute={(planId, token) => executeAction({ actionId: planId, mode: 'execute', approvalToken: token })}
 * />
 * ```
 */
export function AIActionPreview({
  plan,
  onSimulate,
  onExecute,
  onApprove,
  isLoading = false,
  className = '',
  showModeSelector = true,
  showActions = true,
}: AIActionPreviewProps): React.ReactElement {
  // Get current AI phase to determine if execute is allowed
  const phase = useAIPhase();

  // Get execution progress from runtime store
  const executionProgress = useAIRuntimeStore((state) => state.executionProgress);
  const isExecuting = useAIRuntimeStore((state) => state.isExecuting);

  // Local state for mode selection
  const [selectedMode, setSelectedMode] = useState<ExecutionMode>('simulate');

  // Determine if we're in Phase A (read-only mode)
  const isPhaseA = phase?.currentPhase === 'A';

  // Check if execution is allowed based on phase
  const canExecute = phase?.executionAllowed ?? false;

  // Check if this plan is currently being executed
  const isCurrentPlanExecuting = isExecuting && executionProgress?.actionId === plan.planId;

  // Get step statuses from execution progress
  const getStepStatus = useCallback((stepNumber: number): StepStatus => {
    if (!executionProgress || executionProgress.actionId !== plan.planId) {
      return 'pending';
    }
    const stepStatus = executionProgress.stepStatuses.find(s => s.stepNumber === stepNumber);
    return stepStatus?.status || 'pending';
  }, [executionProgress, plan.planId]);

  // Get step progress percentage
  const getStepProgress = useCallback((stepNumber: number): number | undefined => {
    if (!executionProgress || executionProgress.actionId !== plan.planId) {
      return undefined;
    }
    const stepStatus = executionProgress.stepStatuses.find(s => s.stepNumber === stepNumber);
    return stepStatus?.progress;
  }, [executionProgress, plan.planId]);

  // Handle simulate click
  const handleSimulate = useCallback(() => {
    onSimulate?.(plan.planId);
  }, [onSimulate, plan.planId]);

  // Handle execute click
  const handleExecute = useCallback(() => {
    onExecute?.(plan.planId, plan.approvalToken);
  }, [onExecute, plan.planId, plan.approvalToken]);

  // Handle approve click
  const handleApprove = useCallback(() => {
    if (plan.approvalToken) {
      onApprove?.(plan.planId, plan.approvalToken);
    }
  }, [onApprove, plan.planId, plan.approvalToken]);

  // Handle action button click based on selected mode
  const handleActionClick = useCallback(() => {
    if (selectedMode === 'simulate') {
      handleSimulate();
    } else {
      handleExecute();
    }
  }, [selectedMode, handleSimulate, handleExecute]);

  // Overall risk colors
  const overallRiskColors = RISK_COLORS[plan.overallRiskLevel];

  // Determine if plan needs approval
  const needsApproval = plan.requiresApproval && plan.status === 'pending';

  // Determine if plan is approved
  const isApproved = plan.status === 'approved';

  return (
    <div
      className={`
        bg-card rounded-2xl border shadow-sm overflow-hidden
        ${overallRiskColors.border}
        ${className}
      `.trim()}
    >
      {/* Header */}
      <div className={`px-4 py-3 ${overallRiskColors.bg} border-b ${overallRiskColors.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground">
              Aksiyon Planı
            </h3>
            <RiskBadge level={plan.overallRiskLevel} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{plan.steps.length} adım</span>
            {plan.status && (
              <span className={`
                px-2 py-0.5 rounded text-xs font-medium
                ${plan.status === 'approved' ? 'bg-success/10 text-success' : ''}
                ${plan.status === 'pending' ? 'bg-warning/10 text-yellow-800' : ''}
                ${plan.status === 'executing' ? 'bg-primary/10 text-blue-800' : ''}
                ${plan.status === 'completed' ? 'bg-success/10 text-success' : ''}
                ${plan.status === 'failed' ? 'bg-destructive/10 text-red-800' : ''}
              `.trim()}>
                {plan.status === 'pending' && 'Onay Bekliyor'}
                {plan.status === 'approved' && 'Onaylandı'}
                {plan.status === 'executing' && 'Çalışıyor'}
                {plan.status === 'completed' && 'Tamamlandı'}
                {plan.status === 'failed' && 'Başarısız'}
                {plan.status === 'expired' && 'Süresi Doldu'}
                {plan.status === 'rejected' && 'Reddedildi'}
              </span>
            )}
          </div>
        </div>

        {/* Phase A Warning */}
        {isPhaseA && (
          <p className="mt-2 text-sm text-primary">
            ℹ️ AI öneri modunda. Aksiyonlar sadece simüle edilebilir.
          </p>
        )}
      </div>

      {/* Execution Progress (if executing) */}
      {isCurrentPlanExecuting && executionProgress && (
        <div className="p-4 border-b border-border">
          <ExecutionProgressDisplay progress={executionProgress} />
        </div>
      )}

      {/* Steps List */}
      <div className="p-4 space-y-3">
        {plan.steps.map((step) => {
          const status = getStepStatus(step.stepNumber);
          const progress = getStepProgress(step.stepNumber);
          const isActive = isCurrentPlanExecuting &&
            executionProgress?.currentStep === step.stepNumber;

          return (
            <ActionStepItem
              key={step.stepNumber}
              step={step}
              status={status}
              progress={progress}
              isActive={isActive}
            />
          );
        })}
      </div>

      {/* Actions Footer */}
      {showActions && (
        <div className="px-4 py-3 bg-muted/50 border-t border-border space-y-3">
          {/* Mode Selector */}
          {showModeSelector && !isCurrentPlanExecuting && (
            <ModeSelector
              value={selectedMode}
              onChange={setSelectedMode}
              disabled={isLoading || isCurrentPlanExecuting}
              hideExecute={isPhaseA || !canExecute}
            />
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Approve Button (if needs approval) */}
            {needsApproval && !isPhaseA && (
              <button data-allow-raw="true"
                type="button"
                onClick={handleApprove}
                disabled={isLoading || isCurrentPlanExecuting}
                className={`
                  flex-1 px-4 py-2 rounded-2xl text-sm font-medium transition-colors
                  bg-purple-500 text-white hover:bg-purple-600
                  ${(isLoading || isCurrentPlanExecuting) ? 'opacity-50 cursor-not-allowed' : ''}
                `.trim()}
              >
                Onayla
              </button>
            )}

            {/* Simulate/Execute Button */}
            {(!needsApproval || isApproved || selectedMode === 'simulate') && (
              <button data-allow-raw="true"
                type="button"
                onClick={handleActionClick}
                disabled={isLoading || isCurrentPlanExecuting || (selectedMode === 'execute' && !canExecute)}
                className={`
                  flex-1 px-4 py-2 rounded-2xl text-sm font-medium transition-colors
                  ${selectedMode === 'simulate'
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-green-500 text-white hover:bg-green-600'
                  }
                  ${(isLoading || isCurrentPlanExecuting) ? 'opacity-50 cursor-not-allowed' : ''}
                `.trim()}
              >
                {isLoading || isCurrentPlanExecuting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    {isCurrentPlanExecuting ? 'Çalışıyor...' : 'Yükleniyor...'}
                  </span>
                ) : (
                  selectedMode === 'simulate' ? 'Simüle Et' : 'Uygula'
                )}
              </button>
            )}
          </div>

          {/* Phase A Info */}
          {isPhaseA && selectedMode === 'execute' && (
            <p className="text-xs text-muted-foreground text-center">
              Uygulama modu Phase A'da kullanılamaz.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default AIActionPreview;
