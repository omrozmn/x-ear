/**
 * useAIFeatureAvailability Hook
 * 
 * Provides programmatic access to AI feature availability checks.
 * Useful when you need to check availability without rendering a wrapper.
 * 
 * @module ai/hooks/useAIFeatureAvailability
 */

import { useMemo } from 'react';
import { useAIStatus } from './useAIStatus';
import { useAIContext } from './useAIContext';
import type { AICapability } from '../types/ai.types';
import {
  checkAIAvailability,
  type AIAvailabilityResult,
} from '../utils/aiAvailability';

/**
 * useAIFeatureAvailability Hook
 * 
 * Provides programmatic access to AI feature availability checks.
 * Useful when you need to check availability without rendering a wrapper.
 * 
 * @param capability - Optional capability to check
 * @param requirePartyContext - Whether party context is required
 * @returns AIAvailabilityResult
 * 
 * @example
 * ```tsx
 * const { available, reason, message } = useAIFeatureAvailability('chat');
 * 
 * if (!available) {
 *   console.log(`AI unavailable: ${message}`);
 * }
 * ```
 */
export function useAIFeatureAvailability(
  capability?: AICapability,
  requirePartyContext: boolean = false
): AIAvailabilityResult {
  const { data: status, isLoading, isError } = useAIStatus();
  const { isValid: isContextValid, role, partyId } = useAIContext({ capability });

  return useMemo(() => {
    return checkAIAvailability(
      status,
      isLoading,
      isError,
      capability,
      role,
      isContextValid,
      !!partyId,
      requirePartyContext
    );
  }, [status, isLoading, isError, capability, role, isContextValid, partyId, requirePartyContext]);
}
