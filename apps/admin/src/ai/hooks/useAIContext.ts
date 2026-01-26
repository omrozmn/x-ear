/**
 * AI Context Hook with Versioning
 * 
 * This hook provides AI context injection for all AI API calls.
 * It extracts tenant_id, party_id, role, and profile from the current user session
 * and route parameters, ensuring proper tenant/party isolation.
 * 
 * Key features:
 * - Context versioning for backward compatibility
 * - Automatic tenant_id extraction from auth store / JWT
 * - Party_id extraction from route params
 * - Role and profile derivation from user context
 * - withAIContext wrapper for API calls
 * 
 * @module ai/hooks/useAIContext
 */

import { useMemo, useEffect } from 'react';
import { useParams } from '@tanstack/react-router';
import { CURRENT_TENANT_ID } from '../../constants/storage-keys';
import { useAuthStore } from '../../stores/authStore';
import { useAISessionStore } from '../stores/aiSessionStore';
import type { AIContext, AIRole, AIProfile, AICapability } from '../types/ai.types';

// =============================================================================
// Constants
// =============================================================================

/**
 * AI Context Version
 * 
 * Used for backward compatibility when context structure changes.
 * Backend can parse context based on this version.
 * 
 * Version history:
 * - v1: Initial version with tenant_id, party_id, role, profile, capability
 */
export const AI_CONTEXT_VERSION = 'v1';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Options for useAIContext hook
 */
export interface UseAIContextOptions {
  /** The AI capability being used (chat, actions, ocr) */
  capability?: AICapability;
  /** Override party_id from route params */
  partyIdOverride?: string | null;
  /** Override profile from default */
  profileOverride?: AIProfile;
}

/**
 * Return type for useAIContext hook
 */
export interface UseAIContextReturn {
  /** The AI context object, null if not available */
  context: AIContext | null;
  /** Whether the context is valid and ready for use */
  isValid: boolean;
  /** Error message if context is invalid */
  error: string | null;
  /** Current tenant ID */
  tenantId: string | null;
  /** Current party ID */
  partyId: string | null;
  /** Current user role */
  role: AIRole | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapUserRole(userRole: string | undefined): AIRole {
  const role = userRole?.toUpperCase();

  if (role === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (role === 'ADMIN' || role === 'OWNER') return 'ADMIN';
  if (role === 'STAFF') return 'STAFF';

  return 'STAFF'; // Default
}

/**
 * Extract tenant_id from various sources
 * Priority: user.tenant_id > localStorage
 * 
 * @param user - AdminUser object from auth store
 * @returns Tenant ID or null
 */
function extractTenantId(user: any): string | null {
  // 1. Check tenant_id from user
  if (user?.tenant_id) {
    return user.tenant_id;
  }

  // 2. Check localStorage
  try {
    const storedTenantId = localStorage.getItem(CURRENT_TENANT_ID);
    if (storedTenantId) {
      return storedTenantId;
    }
  } catch {
    // Ignore localStorage errors
  }

  return null;
}

/**
 * Extract party_id from route params
 * Supports multiple param names: partyId, customerId
 * 
 * @param params - Route params object
 * @returns Party ID or null
 */
function extractPartyId(params: Record<string, unknown>): string | null {
  // Check common param names for party ID
  const partyIdKeys = ['partyId', 'customerId', 'clientId'];

  for (const key of partyIdKeys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * useAIContext Hook
 * 
 * Provides AI context for API calls with automatic extraction of:
 * - tenant_id from auth store / JWT / localStorage
 * - party_id from route params
 * - role from user context
 * - profile from app context (default: HEARING)
 * 
 * Also syncs context with aiSessionStore for context change detection.
 * 
 * @param options - Hook options
 * @returns AI context and related state
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { context, isValid } = useAIContext({ capability: 'chat' });
 * 
 * // With party ID override
 * const { context } = useAIContext({ 
 *   capability: 'actions',
 *   partyIdOverride: selectedPatientId 
 * });
 * 
 * // Check validity before API call
 * if (!isValid) {
 *   console.error('AI context not available');
 *   return;
 * }
 * ```
 */
export function useAIContext(options: UseAIContextOptions = {}): UseAIContextReturn {
  const { capability, partyIdOverride, profileOverride } = options;

  // Get user from auth store
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Get route params (strict: false allows partial params)
  const params = useParams({ strict: false }) as Record<string, unknown>;

  // Get setContext from session store for syncing
  const setContext = useAISessionStore((state) => state.setContext);

  // Build context
  const contextData = useMemo(() => {
    // Must be authenticated
    if (!isAuthenticated || !user?.id) {
      return {
        context: null,
        isValid: false,
        error: 'User not authenticated',
        tenantId: null,
        partyId: null,
        role: null,
      };
    }

    // Extract tenant_id
    const tenantId = extractTenantId(user);
    if (!tenantId) {
      return {
        context: null,
        isValid: false,
        error: 'Tenant ID not available',
        tenantId: null,
        partyId: null,
        role: mapUserRole(user.role),
      };
    }

    // Extract party_id (optional - can be null for tenant-wide operations)
    const partyId = partyIdOverride !== undefined
      ? partyIdOverride
      : extractPartyId(params);

    // Derive role
    const role = mapUserRole(user.role);

    // Derive profile (default to HEARING, can be overridden)
    const profile: AIProfile = profileOverride || 'HEARING';

    // Build context object
    const context: AIContext = {
      context_version: AI_CONTEXT_VERSION,
      tenant_id: tenantId,
      party_id: partyId,
      role,
      profile,
      ...(capability && { capability }),
    };

    return {
      context,
      isValid: true,
      error: null,
      tenantId,
      partyId,
      role,
    };
  }, [user, isAuthenticated, params, capability, partyIdOverride, profileOverride]);

  // Sync context with session store for context change detection
  useEffect(() => {
    if (contextData.tenantId) {
      setContext(contextData.tenantId, contextData.partyId);
    }
  }, [contextData.tenantId, contextData.partyId, setContext]);

  return contextData;
}

// =============================================================================
// Wrapper Function for API Calls
// =============================================================================

/**
 * Wrap data with AI context for API calls
 * 
 * This function injects the AI context into request data.
 * Throws an error if context is not available.
 * 
 * @param context - AI context from useAIContext hook
 * @param data - Request data to wrap
 * @returns Data with context injected
 * @throws Error if context is null
 * 
 * @example
 * ```tsx
 * const { context } = useAIContext({ capability: 'chat' });
 * 
 * // In mutation
 * const requestData = withAIContext(context, {
 *   prompt: 'Hello AI',
 *   sessionId: 'session-123',
 * });
 * 
 * // requestData = { prompt: 'Hello AI', sessionId: 'session-123', context: {...} }
 * ```
 */
export function withAIContext<T extends Record<string, unknown>>(
  context: AIContext | null,
  data: T
): T & { context: AIContext } {
  if (!context) {
    throw new Error('AI Context is required but not available. Ensure user is authenticated and tenant is set.');
  }

  return {
    ...data,
    context,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get AI context synchronously (non-hook version)
 * 
 * Useful for non-React contexts or when you need context outside of components.
 * Note: This doesn't trigger re-renders on context change.
 * 
 * @param capability - Optional capability to include
 * @returns AI context or null
 * 
 * @example
 * ```ts
 * // In a service or utility function
 * const context = getAIContextSync('chat');
 * if (context) {
 *   await apiClient.post('/ai/chat', { prompt, context });
 * }
 * ```
 */
export function getAIContextSync(capability?: AICapability): AIContext | null {
  const authState = useAuthStore.getState();
  const user = authState.user;

  if (!authState.isAuthenticated || !user?.id) {
    return null;
  }

  const tenantId = extractTenantId(user);
  if (!tenantId) {
    return null;
  }

  // Note: Cannot get route params outside of React context
  // Party ID must be passed explicitly when using sync version
  const sessionState = useAISessionStore.getState();
  const partyId = sessionState.currentPartyId;

  const role = mapUserRole(user.role);
  const profile: AIProfile = 'HEARING'; // Default

  return {
    context_version: AI_CONTEXT_VERSION,
    tenant_id: tenantId,
    party_id: partyId,
    role,
    profile,
    ...(capability && { capability }),
  };
}

/**
 * Validate AI context
 * 
 * Checks if context has all required fields and valid values.
 * 
 * @param context - Context to validate
 * @returns Validation result with error message if invalid
 */
export function validateAIContext(context: AIContext | null): { valid: boolean; error?: string } {
  if (!context) {
    return { valid: false, error: 'Context is null' };
  }

  if (!context.context_version) {
    return { valid: false, error: 'Missing context_version' };
  }

  if (!context.tenant_id) {
    return { valid: false, error: 'Missing tenant_id' };
  }

  if (!context.role) {
    return { valid: false, error: 'Missing role' };
  }

  if (!context.profile) {
    return { valid: false, error: 'Missing profile' };
  }

  return { valid: true };
}

// =============================================================================
// Default Export
// =============================================================================

export default useAIContext;
