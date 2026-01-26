/**
 * AI Action Buttons Component
 * 
 * This component provides pre-built action buttons with AI integration,
 * including pending action badges to prevent duplicate submissions.
 * 
 * Use these components as building blocks for AI-powered features
 * throughout the application.
 * 
 * @module ai/components/AIActionButtons
 * 
 * Requirements: 14 (Approval Idempotency & Duplicate Prevention)
 */

import React, { useCallback } from 'react';
import { AIFeatureWrapper } from './AIFeatureWrapper';
import { PendingActionBadge } from './PendingActionBadge';
import { shouldBlockActionSubmission } from '../utils/pendingActionHelpers';
import { usePendingActions } from '../hooks/usePendingActions';
import { useCreateAction } from '../hooks/useAIActions';
import { useAIContext } from '../hooks/useAIContext';
import type { IntentResponse } from '../types/ai.types';

// =============================================================================
// Types
// =============================================================================

/**
 * Common props for AI action buttons
 */
export interface AIActionButtonProps {
  /**
   * The action type identifier (used for pending action detection)
   */
  actionType: string;

  /**
   * Button label text
   */
  label: string;

  /**
   * Intent to send when button is clicked
   */
  intent: IntentResponse;

  /**
   * Additional context for the action
   */
  context?: Record<string, unknown>;

  /**
   * Callback when action is created successfully
   */
  onSuccess?: (planId: string) => void;

  /**
   * Callback when action creation fails
   */
  onError?: (error: Error) => void;

  /**
   * Callback when action is blocked due to pending action
   */
  onBlocked?: () => void;

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'danger';
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Button variant styles
 */
const VARIANT_STYLES: Record<NonNullable<AIActionButtonProps['variant']>, string> = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

// =============================================================================
// Components
// =============================================================================

/**
 * AIActionButton Component
 * 
 * A button that creates an AI action with pending action prevention.
 * Shows a badge when an action of the same type is already pending.
 * 
 * @example
 * ```tsx
 * <AIActionButton
 *   actionType="create_party"
 *   label="Hasta Ekle (AI)"
 *   intent={{
 *     intentType: 'create_party',
 *     confidence: 0.95,
 *     entities: { name: 'John Doe' },
 *     clarificationNeeded: false,
 *   }}
 *   onSuccess={(planId) => console.log('Action created:', planId)}
 * />
 * ```
 */
export function AIActionButton({
  actionType,
  label,
  intent,
  context,
  onSuccess,
  onError,
  onBlocked,
  disabled = false,
  className = '',
  variant = 'primary',
}: AIActionButtonProps): React.ReactElement {
  const { pendingActions } = usePendingActions();
  const createAction = useCreateAction();
  const { context: aiContext } = useAIContext({ capability: 'actions' });

  // Check if action is blocked due to pending action
  const isBlocked = shouldBlockActionSubmission(actionType, pendingActions);

  // Handle button click
  const handleClick = useCallback(async () => {
    // Check for pending action
    if (isBlocked) {
      onBlocked?.();
      return;
    }

    // Check for AI context
    if (!aiContext) {
      onError?.(new Error('AI context not available'));
      return;
    }

    try {
      const result = await createAction.mutateAsync({
        intent,
        additionalContext: {
          ...context,
          ...aiContext,
        },
      });

      onSuccess?.(result.planId);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [isBlocked, aiContext, intent, context, createAction, onSuccess, onError, onBlocked]);

  return (
    <AIFeatureWrapper capability="actions" hideWhenUnavailable>
      <PendingActionBadge actionType={actionType} position="top-right">
        <button data-allow-raw="true"
          type="button"
          onClick={handleClick}
          disabled={disabled || isBlocked || createAction.isPending}
          className={`
            px-4 py-2 rounded-md font-medium
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${VARIANT_STYLES[variant]}
            ${className}
          `.trim()}
        >
          {createAction.isPending ? (
            <span className="flex items-center gap-2">
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
              İşleniyor...
            </span>
          ) : (
            label
          )}
        </button>
      </PendingActionBadge>
    </AIFeatureWrapper>
  );
}

/**
 * AIQuickAction Component
 * 
 * A compact action button for inline use (e.g., in tables or lists).
 * 
 * @example
 * ```tsx
 * <AIQuickAction
 *   actionType="update_party"
 *   icon={<EditIcon />}
 *   tooltip="AI ile Düzenle"
 *   intent={{...}}
 * />
 * ```
 */
export function AIQuickAction({
  actionType,
  icon,
  tooltip,
  intent,
  context,
  onSuccess,
  onError,
  disabled = false,
  className = '',
}: {
  actionType: string;
  icon: React.ReactNode;
  tooltip: string;
  intent: IntentResponse;
  context?: Record<string, unknown>;
  onSuccess?: (planId: string) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}): React.ReactElement {
  const { pendingActions } = usePendingActions();
  const createAction = useCreateAction();
  const { context: aiContext } = useAIContext({ capability: 'actions' });

  const isBlocked = shouldBlockActionSubmission(actionType, pendingActions);

  const handleClick = useCallback(async () => {
    if (isBlocked || !aiContext) return;

    try {
      const result = await createAction.mutateAsync({
        intent,
        additionalContext: { ...context, ...aiContext },
      });
      onSuccess?.(result.planId);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [isBlocked, aiContext, intent, context, createAction, onSuccess, onError]);

  return (
    <AIFeatureWrapper capability="actions" hideWhenUnavailable>
      <PendingActionBadge actionType={actionType} position="top-right" size="sm">
        <button data-allow-raw="true"
          type="button"
          onClick={handleClick}
          disabled={disabled || isBlocked || createAction.isPending}
          title={tooltip}
          className={`
            p-2 rounded-md
            text-gray-600 hover:text-blue-600 hover:bg-blue-50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${className}
          `.trim()}
        >
          {createAction.isPending ? (
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
          ) : (
            icon
          )}
        </button>
      </PendingActionBadge>
    </AIFeatureWrapper>
  );
}

// =============================================================================
// Pre-built Action Buttons
// =============================================================================

/**
 * AI Create Party Button
 * 
 * Pre-configured button for creating a new party (patient/customer) via AI.
 */
export function AICreatePartyButton({
  partyData,
  onSuccess,
  onError,
  className,
}: {
  partyData: Record<string, unknown>;
  onSuccess?: (planId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}): React.ReactElement {
  return (
    <AIActionButton
      actionType="create_party"
      label="Hasta Ekle (AI)"
      intent={{
        intentType: 'create_party',
        confidence: 1.0,
        entities: partyData,
        clarificationNeeded: false,
      }}
      onSuccess={onSuccess}
      onError={onError}
      className={className}
    />
  );
}

/**
 * AI Update Party Button
 * 
 * Pre-configured button for updating a party via AI.
 */
export function AIUpdatePartyButton({
  partyId,
  updates,
  onSuccess,
  onError,
  className,
}: {
  partyId: string;
  updates: Record<string, unknown>;
  onSuccess?: (planId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}): React.ReactElement {
  return (
    <AIActionButton
      actionType="update_party"
      label="Güncelle (AI)"
      intent={{
        intentType: 'update_party',
        confidence: 1.0,
        entities: { party_id: partyId, ...updates },
        clarificationNeeded: false,
      }}
      onSuccess={onSuccess}
      onError={onError}
      variant="secondary"
      className={className}
    />
  );
}

/**
 * AI Create Appointment Button
 * 
 * Pre-configured button for creating an appointment via AI.
 */
export function AICreateAppointmentButton({
  appointmentData,
  onSuccess,
  onError,
  className,
}: {
  appointmentData: Record<string, unknown>;
  onSuccess?: (planId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}): React.ReactElement {
  return (
    <AIActionButton
      actionType="create_appointment"
      label="Randevu Oluştur (AI)"
      intent={{
        intentType: 'create_appointment',
        confidence: 1.0,
        entities: appointmentData,
        clarificationNeeded: false,
      }}
      onSuccess={onSuccess}
      onError={onError}
      className={className}
    />
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  AIActionButton,
  AIQuickAction,
  AICreatePartyButton,
  AIUpdatePartyButton,
  AICreateAppointmentButton,
};
