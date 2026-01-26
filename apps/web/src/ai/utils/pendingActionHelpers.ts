/**
 * Pending Action Helper Functions
 * 
 * Utility functions for working with pending AI actions.
 * 
 * @module ai/utils/pendingActionHelpers
 */

import type { ActionPlan } from '../types/ai.types';

/**
 * Get a pending action by action type
 * 
 * @param actionType - The action type to search for
 * @param pendingActions - Array of pending actions
 * @returns The matching action plan or undefined
 */
export function getPendingActionByType(
  actionType: string,
  pendingActions: ActionPlan[]
): ActionPlan | undefined {
  const normalized = actionType.trim().toLowerCase();
  if (!normalized) return undefined;

  return pendingActions.find((action) =>
    action.steps.some((step) =>
      step.toolName === actionType ||
      step.toolName.toLowerCase() === normalized ||
      step.description.toLowerCase().includes(normalized)
    )
  );
}

/**
 * Check if an action submission should be blocked due to pending action
 * 
 * @param actionType - The action type to check
 * @param pendingActions - Array of pending actions
 * @returns True if action should be blocked
 */
export function shouldBlockActionSubmission(
  actionType: string,
  pendingActions: ActionPlan[]
): boolean {
  return !!getPendingActionByType(actionType, pendingActions);
}
