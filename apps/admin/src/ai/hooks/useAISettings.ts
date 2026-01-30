/**
 * AI Settings Hook
 * 
 * This hook provides AI configuration settings from the /ai/admin/settings endpoint.
 * Settings are read-only and reflect the current AI configuration.
 * 
 * @module ai-admin/hooks/useAISettings
 * @requirements Requirement 9: AI Settings Panel (Admin)
 */

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/orval-mutator';

// =============================================================================
// Constants
// =============================================================================

/**
 * Query key for AI settings
 */
export const AI_SETTINGS_QUERY_KEY = ['ai-settings'] as const;

/**
 * Stale time for AI settings (5 minutes - settings don't change often)
 */
export const AI_SETTINGS_STALE_TIME = 5 * 60 * 1000;

// =============================================================================
// Types
// =============================================================================

/**
 * AI Settings Response from the API
 * Matches the backend AISettingsResponse schema
 */
export interface AISettingsData {
  /** Whether AI is enabled */
  enabled: boolean;
  /** Current phase (e.g., "read_only", "proposal", "execution") */
  phase: string;
  /** Model provider (e.g., "openai", "anthropic") */
  model_provider: string;
  /** Model ID (e.g., "gpt-4", "claude-3") */
  model_id: string;
  /** Rate limit per minute */
  rate_limit_per_minute: number;
  /** Default quota per period */
  default_quota: number;
}

/**
 * Options for useAISettings hook
 */
export interface UseAISettingsOptions {
  /** Whether to enable the query */
  enabled?: boolean;
}

/**
 * Return type for useAISettings hook
 */
export interface UseAISettingsReturn {
  /** AI settings data */
  data: AISettingsData | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Whether the query has an error */
  isError: boolean;
  /** Error object if any */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

// =============================================================================
// API Function
// =============================================================================

/**
 * Fetch AI settings from the backend
 */
async function fetchAISettings(): Promise<AISettingsData> {
  const response = await adminApi<AISettingsData>({
    url: '/api/ai/admin/settings',
    method: 'GET',
  });
  return (response as any).data || response;
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * useAISettings Hook
 * 
 * Fetches AI configuration settings (read-only).
 * 
 * @param options - Hook configuration options
 * @returns AI settings data and query state
 * 
 * @example
 * ```tsx
 * const { data: settings, isLoading } = useAISettings();
 * 
 * if (isLoading) return <Loading />;
 * 
 * return <div>Phase: {settings?.phase}</div>;
 * ```
 */
export function useAISettings(options: UseAISettingsOptions = {}): UseAISettingsReturn {
  const { enabled = true } = options;

  const query = useQuery<AISettingsData, Error>({
    queryKey: AI_SETTINGS_QUERY_KEY,
    queryFn: fetchAISettings,
    enabled,
    staleTime: AI_SETTINGS_STALE_TIME,
    retry: 2,
    refetchOnWindowFocus: false, // Settings don't change often
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

export default useAISettings;
