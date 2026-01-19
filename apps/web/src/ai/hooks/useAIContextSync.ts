/**
 * AI Context Sync Hook
 * 
 * This hook monitors tenant and party context changes and automatically
 * syncs them with the AI session store. When context changes, the AI
 * session data is cleared to prevent data leakage between tenants/parties.
 * 
 * Key features:
 * - Monitors tenant_id changes from auth store
 * - Monitors party_id changes from route params
 * - Automatically clears AI session on context change
 * - Clears AI runtime store on context change
 * 
 * @module ai/hooks/useAIContextSync
 * 
 * Requirements: 12 (AI State Management), 20 (Chat History Retention Policy)
 */

import { useEffect, useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { useAuthStore } from '../../stores/authStore';
import { useAISessionStore } from '../stores/aiSessionStore';
import { useAIRuntimeStore } from '../stores/aiRuntimeStore';

// =============================================================================
// Types
// =============================================================================

/**
 * Context sync state for tracking changes
 */
interface ContextState {
  tenantId: string | null;
  partyId: string | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract tenant_id from user object
 */
function extractTenantId(user: { effectiveTenantId?: string } | null): string | null {
  if (user?.effectiveTenantId) {
    return user.effectiveTenantId;
  }

  try {
    const storedTenantId = localStorage.getItem('current_tenant_id');
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
 */
function extractPartyId(params: Record<string, unknown>): string | null {
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
 * useAIContextSync Hook
 * 
 * Monitors tenant and party context changes and syncs them with AI stores.
 * Should be called once at the app root level (e.g., in MainLayout).
 * 
 * When context changes:
 * 1. Clears AI session store (chat history, pending actions)
 * 2. Clears AI runtime store (current plan, execution progress)
 * 3. Updates context in session store for future reference
 * 
 * @example
 * ```tsx
 * // In MainLayout or App component
 * function MainLayout({ children }) {
 *   useAIContextSync();
 *   return <>{children}</>;
 * }
 * ```
 */
export function useAIContextSync(): void {
  // Get user from auth store
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Get route params
  const params = useParams({ strict: false }) as Record<string, unknown>;

  // Get store actions
  const setContext = useAISessionStore((state) => state.setContext);
  const clearRuntime = useAIRuntimeStore((state) => state.clearRuntime);

  // Track previous context to detect changes
  const prevContextRef = useRef<ContextState>({
    tenantId: null,
    partyId: null,
  });

  useEffect(() => {
    // Skip if not authenticated
    if (!isAuthenticated || !user) {
      return;
    }

    // Extract current context
    const currentTenantId = extractTenantId(user);
    const currentPartyId = extractPartyId(params);

    // Get previous context
    const prevContext = prevContextRef.current;

    // Check if context has changed
    const tenantChanged = prevContext.tenantId !== null &&
      prevContext.tenantId !== currentTenantId;
    const partyChanged = prevContext.partyId !== null &&
      prevContext.partyId !== currentPartyId;

    // If context changed, clear runtime store
    if (tenantChanged || partyChanged) {
      console.log('[useAIContextSync] Context changed, clearing runtime store:', {
        previousTenant: prevContext.tenantId,
        newTenant: currentTenantId,
        previousParty: prevContext.partyId,
        newParty: currentPartyId,
      });

      // Clear runtime store (ephemeral state)
      clearRuntime();
    }

    // Update session store context (handles its own clearing logic)
    if (currentTenantId) {
      setContext(currentTenantId, currentPartyId);
    }

    // Update ref for next comparison
    prevContextRef.current = {
      tenantId: currentTenantId,
      partyId: currentPartyId,
    };
  }, [user, isAuthenticated, params, setContext, clearRuntime]);
}

// =============================================================================
// Default Export
// =============================================================================

export default useAIContextSync;
