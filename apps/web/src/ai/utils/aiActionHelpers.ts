/**
 * AI Action Helper Utilities
 * 
 * Logic for checking and filtering pending actions.
 */

import type { ActionPlan } from '../types/ai.types';

/**
 * Check if an action submission should be blocked due to pending action
 */
export function shouldBlockActionSubmission(
    actionType: string,
    pendingActions: ActionPlan[]
): boolean {
    return pendingActions.some((action) =>
        action.steps.some(
            (step) =>
                step.toolName === actionType ||
                step.description.toLowerCase().includes(actionType.toLowerCase())
        )
    );
}

/**
 * Get the first pending action matching an action type
 */
export function getPendingActionByType(
    actionType: string,
    pendingActions: ActionPlan[]
): ActionPlan | undefined {
    return pendingActions.find((action) =>
        action.steps.some(
            (step) =>
                step.toolName === actionType ||
                step.description.toLowerCase().includes(actionType.toLowerCase())
        )
    );
}
