/**
 * AI Capability Registry with RBAC
 * 
 * This module defines the AI capabilities configuration and provides
 * helper functions for checking capability availability based on:
 * - Current AI phase (A, B, C)
 * - Kill switch status (disabled capabilities)
 * - User role (RBAC hints - backend enforces)
 * 
 * @module ai/config/capabilities
 */

import type { AIPhase, AIRole, AICapability, CapabilityConfig } from '../types/ai.types';

// =============================================================================
// AI Capabilities Registry
// =============================================================================

/**
 * Central registry of all AI capabilities with their configuration.
 * 
 * Each capability defines:
 * - requiresApproval: Whether actions need admin approval
 * - minPhase: Minimum AI phase required (A=read_only, B=proposal, C=execution)
 * - description: Turkish description for UI display
 * - retryable: Whether failed requests can be retried
 * - allowedRoles: Roles that can access this capability (frontend hint, backend enforces)
 */
export const AI_CAPABILITIES: Record<AICapability, CapabilityConfig> = {
  chat: {
    requiresApproval: false,
    minPhase: 'A',
    description: 'AI ile sohbet',
    retryable: true,
    allowedRoles: ['STAFF', 'ADMIN', 'SUPER_ADMIN'], // PARTY excluded
  },
  actions: {
    requiresApproval: true,
    minPhase: 'B',
    description: 'AI aksiyonları',
    retryable: false,
    allowedRoles: ['STAFF', 'ADMIN', 'SUPER_ADMIN'],
  },
  ocr: {
    requiresApproval: false,
    minPhase: 'A',
    description: 'Belge tanıma',
    retryable: true,
    allowedRoles: ['STAFF', 'ADMIN', 'SUPER_ADMIN'],
  },
};

// =============================================================================
// Phase Order Mapping
// =============================================================================

/**
 * Phase order for comparison operations.
 * Higher number = more permissive phase.
 */
const PHASE_ORDER: Record<AIPhase, number> = {
  A: 1, // read_only
  B: 2, // proposal
  C: 3, // execution
};

// =============================================================================
// Capability Availability Helpers
// =============================================================================

/**
 * Check if a capability is available given the current system state.
 * 
 * This function performs three checks:
 * 1. Kill switch: Is the capability disabled by admin?
 * 2. Phase requirement: Is the current phase sufficient?
 * 3. Role-based access: Does the user's role allow access? (frontend hint)
 * 
 * Note: This is a frontend hint. Backend always enforces the actual permissions.
 * 
 * @param capability - The capability to check (chat, actions, ocr)
 * @param currentPhase - Current AI deployment phase (A, B, or C)
 * @param disabledCapabilities - List of capabilities disabled by kill switch
 * @param userRole - Optional user role for RBAC check
 * @returns true if capability is available, false otherwise
 * 
 * @example
 * ```ts
 * const canUseChat = isCapabilityAvailable('chat', 'A', [], 'STAFF');
 * // Returns true - chat is available in Phase A for STAFF
 * 
 * const canUseActions = isCapabilityAvailable('actions', 'A', [], 'STAFF');
 * // Returns false - actions require Phase B minimum
 * ```
 */
export function isCapabilityAvailable(
  capability: AICapability,
  currentPhase: AIPhase,
  disabledCapabilities: string[],
  userRole?: AIRole
): boolean {
  const config = AI_CAPABILITIES[capability];
  if (!config) return false;

  // Check 1: Is capability disabled by kill switch?
  if (disabledCapabilities.includes(capability)) return false;

  // Check 2: Does current phase meet minimum requirement?
  if (PHASE_ORDER[currentPhase] < PHASE_ORDER[config.minPhase]) return false;

  // Check 3: Role-based access (frontend hint, backend enforces)
  if (userRole && !config.allowedRoles.includes(userRole)) return false;

  return true;
}

/**
 * Check if a user's role can access a specific capability.
 * 
 * This is a simpler check that only validates role-based access,
 * without considering phase or kill switch status.
 * 
 * Note: This is a frontend hint. Backend always enforces the actual permissions.
 * 
 * @param capability - The capability to check
 * @param role - The user's role
 * @returns true if the role can access the capability, false otherwise
 * 
 * @example
 * ```ts
 * canUserAccessCapability('chat', 'STAFF'); // true
 * canUserAccessCapability('chat', 'PARTY'); // false - PARTY cannot use chat
 * ```
 */
export function canUserAccessCapability(capability: AICapability, role: AIRole): boolean {
  const config = AI_CAPABILITIES[capability];
  return config?.allowedRoles.includes(role) ?? false;
}

/**
 * Check if a capability meets the phase requirement.
 * 
 * @param capability - The capability to check
 * @param currentPhase - Current AI deployment phase
 * @returns true if the phase requirement is met, false otherwise
 * 
 * @example
 * ```ts
 * meetsPhaseRequirement('chat', 'A'); // true - chat works in Phase A
 * meetsPhaseRequirement('actions', 'A'); // false - actions need Phase B
 * meetsPhaseRequirement('actions', 'B'); // true - actions work in Phase B
 * ```
 */
export function meetsPhaseRequirement(capability: AICapability, currentPhase: AIPhase): boolean {
  const config = AI_CAPABILITIES[capability];
  if (!config) return false;
  
  return PHASE_ORDER[currentPhase] >= PHASE_ORDER[config.minPhase];
}

/**
 * Get the configuration for a specific capability.
 * 
 * @param capability - The capability to get config for
 * @returns The capability configuration or undefined if not found
 */
export function getCapabilityConfig(capability: AICapability): CapabilityConfig | undefined {
  return AI_CAPABILITIES[capability];
}

/**
 * Get all capabilities available for a given role and phase.
 * 
 * @param role - The user's role
 * @param currentPhase - Current AI deployment phase
 * @param disabledCapabilities - List of capabilities disabled by kill switch
 * @returns Array of available capability names
 * 
 * @example
 * ```ts
 * getAvailableCapabilities('STAFF', 'B', []);
 * // Returns ['chat', 'actions', 'ocr'] - all available in Phase B for STAFF
 * 
 * getAvailableCapabilities('STAFF', 'A', ['chat']);
 * // Returns ['ocr'] - chat disabled, actions need Phase B
 * ```
 */
export function getAvailableCapabilities(
  role: AIRole,
  currentPhase: AIPhase,
  disabledCapabilities: string[] = []
): AICapability[] {
  return (Object.keys(AI_CAPABILITIES) as AICapability[]).filter(
    (capability) => isCapabilityAvailable(capability, currentPhase, disabledCapabilities, role)
  );
}

/**
 * Check if a capability requires approval before execution.
 * 
 * @param capability - The capability to check
 * @returns true if approval is required, false otherwise
 */
export function requiresApproval(capability: AICapability): boolean {
  return AI_CAPABILITIES[capability]?.requiresApproval ?? false;
}

/**
 * Check if a capability supports retry on failure.
 * 
 * @param capability - The capability to check
 * @returns true if retryable, false otherwise
 */
export function isRetryableCapability(capability: AICapability): boolean {
  return AI_CAPABILITIES[capability]?.retryable ?? false;
}
