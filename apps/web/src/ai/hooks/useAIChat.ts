/**
 * AI Chat Hook
 * 
 * This hook provides chat functionality with the AI assistant.
 * It handles message sending, typing indicators, message history,
 * and error handling with retry logic for retryable errors.
 * 
 * Key features:
 * - AI context injection for tenant/party isolation
 * - Optimistic updates for immediate UI feedback
 * - Typing indicator via aiRuntimeStore
 * - Message history via aiSessionStore
 * - Retry logic for retryable errors (5xx, 429)
 * 
 * @module ai/hooks/useAIChat
 * 
 * Requirements: 2, 13
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApiAiChatPost } from '@/api/client/ai.client';
import type { ChatRequest as ApiChatRequest } from '@/api/generated/schemas';
import { useAIContext, withAIContext } from './useAIContext';
import { useAISessionStore } from '../stores/aiSessionStore';
import { useAIRuntimeStore } from '../stores/aiRuntimeStore';
import {
  getAIErrorMessage,
  isRetryableError,
  getRetryDelay,
  isAIError,
} from '../utils/aiErrorMessages';
import type {
  ChatMessage,
  ChatResponse,
  AIError,
  AIErrorCode,
  MatchedSlot,
  UseAIChatReturn,
} from '../types/ai.types';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useAIChat hook
 */
export interface UseAIChatOptions {
  /** Override party ID from route params */
  partyIdOverride?: string | null;
  /** Callback when message is sent successfully */
  onSuccess?: (response: ChatResponse) => void;
  /** Callback when message sending fails */
  onError?: (error: AIError) => void;
  /** Callback when retry is attempted */
  onRetry?: (attempt: number, delay: number) => void;
  /** Whether to enable retry logic (default: true) */
  enableRetry?: boolean;
}

/**
 * Internal request type with idempotency key
 */
interface InternalChatRequest {
  prompt: string;
  additionalContext?: Record<string, unknown>;
  idempotencyKey: string;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function asObject(value: unknown): JsonObject | null {
  return isObject(value) ? value : null;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function getRecord(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined;
}

function normalizeUiType(value: unknown): MatchedSlot['uiType'] {
  switch (value) {
    case 'entity_search':
    case 'enum':
    case 'date':
    case 'number':
    case 'text':
    case 'file':
    case 'boolean':
    case 'time':
      return value;
    default:
      return 'text';
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique idempotency key for chat requests
 */
function generateIdempotencyKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `chat_${timestamp}_${random}`;
}

/**
 * Create a user message object
 */
function createUserMessage(content: string): ChatMessage {
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role: 'user',
    content,
    timestamp: new Date(),
  };
}

/**
 * Create an assistant message from API response
 */
function createAssistantMessage(response: ChatResponse): ChatMessage {
  return {
    id: response.requestId,
    role: 'assistant',
    content: response.response || response.clarificationQuestion || '',
    timestamp: new Date(),
    intent: response.intent,
    piiDetected: response.piiDetected,
    phiDetected: response.phiDetected,
  };
}

/**
 * Create a system error message
 */
function createErrorMessage(errorCode: AIErrorCode): ChatMessage {
  return {
    id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    role: 'system',
    content: getAIErrorMessage(errorCode),
    timestamp: new Date(),
  };
}

/**
 * Parse error response to AIError
 */
function parseErrorResponse(error: unknown): AIError {
  const axiosError = asObject(error);
  const response = asObject(axiosError?.response);
  const data = asObject(response?.data);
  const headers = asObject(response?.headers);

  // Check if it's an axios error with response
  // Check if it's an axios error (Orval uses axios under the hood)
  if (data || getBoolean(axiosError?.isAxiosError)) {
    // Backend returns error in { code, message, ... } format
    const code = getString(data?.code);
    if (code) {
      return {
        code: code as AIErrorCode,
        message: getString(data?.message) || getAIErrorMessage(code as AIErrorCode),
        requestId: getString(data?.request_id) || getString(data?.requestId),
        retryAfter: getNumber(data?.retry_after) || getNumber(data?.retryAfter),
        details: getRecord(data?.details),
      };
    }

    // Map HTTP status to error code
    const status = getNumber(response?.status);
    let errorCode: AIErrorCode = 'INFERENCE_ERROR';

    if (status === 429) {
      errorCode = getBoolean(data?.quota_exceeded) ? 'QUOTA_EXCEEDED' : 'RATE_LIMITED';
    } else if (status === 403) {
      errorCode = 'PERMISSION_DENIED';
    } else if (status === 404) {
      errorCode = 'NOT_FOUND';
    } else if (status === 400) {
      errorCode = 'INVALID_REQUEST';
    } else if (status === 504) {
      errorCode = 'INFERENCE_TIMEOUT';
    }

    return {
      code: errorCode,
      message: getAIErrorMessage(errorCode),
      requestId: getString(data?.request_id),
      retryAfter: getString(headers?.['retry-after'])
        ? parseInt(getString(headers?.['retry-after']) ?? '', 10)
        : undefined,
    };
  }

  // Check if it's already an AIError
  if (isAIError(error)) {
    return error;
  }

  // Default error
  return {
    code: 'INFERENCE_ERROR',
    message: getAIErrorMessage('INFERENCE_ERROR'),
  };
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * useAIChat Hook
 * 
 * Provides chat functionality with the AI assistant including:
 * - Message sending with AI context injection
 * - Optimistic updates for immediate UI feedback
 * - Typing indicator management
 * - Message history persistence
 * - Error handling with retry logic
 * 
 * @param options - Hook options
 * @returns Chat state and actions
 * 
 * @example
 * ```tsx
 * const { messages, sendMessage, isTyping, isLoading, error, clearHistory } = useAIChat();
 * 
 * // Send a message
 * await sendMessage('Merhaba, yardım eder misiniz?');
 * 
 * // With additional context
 * await sendMessage('Hasta bilgilerini göster', { partyId: '123' });
 * ```
 */
export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const {
    partyIdOverride,
    onSuccess,
    onError,
    onRetry,
    enableRetry = true,
  } = options;

  // Get AI context with chat capability
  const { context, isValid: isContextValid, error: contextError } = useAIContext({
    capability: 'chat',
    partyIdOverride,
  });

  // Session store for persisted message history
  const chatHistory = useAISessionStore((state) => state.chatHistory);
  const addMessage = useAISessionStore((state) => state.addMessage);
  const clearHistory = useAISessionStore((state) => state.clearHistory);
  const sessionId = useAISessionStore((state) => state.sessionId);
  const setSessionId = useAISessionStore((state) => state.setSessionId);

  // Runtime store for typing indicator
  const isTyping = useAIRuntimeStore((state) => state.isTyping);
  const setIsTyping = useAIRuntimeStore((state) => state.setIsTyping);

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  /**
   * Send chat message to API with retry logic
   */
  const sendChatRequest = useCallback(
    async (request: InternalChatRequest): Promise<ChatResponse> => {
      if (!context) {
        throw {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        } as AIError;
      }

      // Build request payload with context
      // Map to API type (snake_case)
      const payload: ApiChatRequest = {
        prompt: request.prompt,
        idempotency_key: request.idempotencyKey,
        session_id: sessionId || undefined,
        context: withAIContext(context, request.additionalContext || {}) as ApiChatRequest['context'],
      };

      let lastError: AIError | null = null;
      let attempt = 0;
      const maxRetries = enableRetry ? 3 : 0;

      while (attempt <= maxRetries) {
        try {
          // Make API request (returns ApiChatResponse)
          const apiResponse = await chatApiAiChatPost(payload);

          // Map back to local type
          // NOTE: orval-mutator's response interceptor already converts ALL keys 
          // from snake_case to camelCase via humps.camelizeKeys(). So apiResponse
          // already has camelCase keys (requestId, matchedCapability, etc.)
          const api = asObject(apiResponse);
          const intent = asObject(api?.intent);
          const actionPlan = asObject(api?.actionPlan);
          const matchedCapability = asObject(api?.matchedCapability);
          const response: ChatResponse = {
            requestId: getString(api?.requestId) ?? '',
            status: getString(api?.status) ?? 'unknown',
            intent: intent ? {
              intentType: getString(intent.intentType) ?? '',
              confidence: getNumber(intent.confidence) ?? 0,
              entities: getRecord(intent.entities) ?? {},
              clarificationNeeded: getBoolean(intent.clarificationNeeded) ?? false,
              clarificationQuestion: getString(intent.clarificationQuestion),
            } : undefined,
            response: getString(api?.response) ?? JSON.stringify(api?.response),
            needsClarification: getBoolean(api?.needsClarification) ?? false,
            clarificationQuestion: getString(api?.clarificationQuestion),
            processingTimeMs: getNumber(api?.processingTimeMs) ?? 0,
            piiDetected: getBoolean(api?.piiDetected) ?? false,
            phiDetected: getBoolean(api?.phiDetected) ?? false,
            actionPlan: actionPlan ? {
              planId: getString(actionPlan.planId) ?? '',
              status: 'pending',
              steps: (Array.isArray(actionPlan.steps) ? actionPlan.steps : []).map((step) => {
                const s = asObject(step) ?? {};
                return {
                stepNumber: getNumber(s.stepNumber) ?? 0,
                toolName: getString(s.toolName) ?? '',
                toolSchemaVersion: '',
                parameters: getRecord(s.parameters) ?? {},
                description: getString(s.description) ?? '',
                riskLevel: ((getString(s.riskLevel) ?? 'low').toLowerCase()) as 'low' | 'medium' | 'high' | 'critical',
                requiresApproval: getBoolean(s.requiresApproval) ?? false,
              };
              }),
              overallRiskLevel: ((getString(actionPlan.overallRiskLevel) ?? 'low').toLowerCase()) as 'low' | 'medium' | 'high' | 'critical',
              requiresApproval: getBoolean(actionPlan.requiresApproval) ?? false,
              planHash: '',
              createdAt: new Date().toISOString()
            } : undefined,
            matchedCapability: matchedCapability ? {
              name: getString(matchedCapability.name) ?? '',
              displayName: getString(matchedCapability.displayName) ?? getString(matchedCapability.name),
              description: getString(matchedCapability.description) ?? '',
              category: getString(matchedCapability.category) ?? '',
              slots: (Array.isArray(matchedCapability.slots) ? matchedCapability.slots : []).map((slot) => {
                const s = asObject(slot) ?? {};
                return {
                name: getString(s.name) ?? '',
                prompt: getString(s.prompt) ?? '',
                uiType: normalizeUiType(s.uiType),
                sourceEndpoint: getString(s.sourceEndpoint),
                enumOptions: getStringArray(s.enumOptions),
                validationRules: getRecord(s.validationRules),
              };
              }),
            } : undefined,
          };

          return response;
        } catch (error) {
          lastError = parseErrorResponse(error);

          // Check if we should retry
          const shouldRetry =
            enableRetry &&
            attempt < maxRetries &&
            isRetryableError(lastError.code);

          if (!shouldRetry) {
            throw lastError;
          }

          // Calculate delay with exponential backoff
          let delay = getRetryDelay(lastError.code, attempt);

          // Respect retry-after header if present
          if (lastError.retryAfter) {
            delay = Math.max(delay, lastError.retryAfter * 1000);
          }

          // Notify about retry
          onRetry?.(attempt + 1, delay);
          console.log(`[useAIChat] Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);

          // Wait before retrying
          await sleep(delay);
          attempt++;
        }
      }

      // Should not reach here, but TypeScript needs it
      throw lastError || { code: 'INFERENCE_ERROR', message: 'Unknown error' };
    },
    [context, contextError, sessionId, enableRetry, onRetry]
  );

  /**
   * Mutation for sending messages
   */
  const sendMessageMutation = useMutation<ChatResponse, AIError, InternalChatRequest>({
    mutationFn: sendChatRequest,

    // Optimistic update: Add user message immediately
    onMutate: async (request) => {
      // Add user message to history
      const userMessage = createUserMessage(request.prompt);
      addMessage(userMessage);

      // Set typing indicator
      setIsTyping(true);

      return { userMessage };
    },

    // On success: Add assistant response
    onSuccess: (response) => {
      // ACTION intents produce status messages ("hazırlık yapıyorum", "devam ediyorum")
      // that should only flash in the typing indicator, NOT stay as permanent bubbles.
      // Chat bubbles are only for: questions, completed results, greetings, unknowns.
      const intentType = response.intent?.intentType?.toLowerCase();
      const isAction = intentType === 'action' || response.status === 'executing';
      const isAskingQuestion = response.needsClarification || !!response.clarificationQuestion || intentType === 'clarification_needed';
      const hasPlan = !!response.actionPlan;
      const hasMatchedCapability = !!response.matchedCapability;
      // Show the message if:
      // 1. It's NOT an action AND NOT a plan AND NOT a matched capability (normal responses)
      // 2. OR it's explicitly asking a question (and NOT entering slot-filling mode)
      // When matchedCapability has slots, the message should NOT appear as a permanent
      // chat bubble — the slot-filling interactive UI takes over entirely.
      const shouldShowMessage = (!isAction && !hasPlan && !hasMatchedCapability) || (isAskingQuestion && !hasMatchedCapability);

      if (shouldShowMessage && response.response) {
        const assistantMessage = createAssistantMessage(response);
        addMessage(assistantMessage);
      }

      // Update session ID if returned
      if (response.requestId && !sessionId) {
        setSessionId(response.requestId);
      }

      // Clear typing indicator
      setIsTyping(false);

      // Invalidate AI status to refresh quota info
      queryClient.invalidateQueries({ queryKey: ['ai-status'] });

      // Call success callback
      onSuccess?.(response);
    },

    // On error: Add error message
    onError: (error) => {
      // Add error message to history
      const errorMessage = createErrorMessage(error.code);
      addMessage(errorMessage);

      // Clear typing indicator
      setIsTyping(false);

      // Log error for debugging
      console.error('[useAIChat] Error:', error);

      // Call error callback
      onError?.(error);
    },
  });

  /**
   * Send a message to the AI
   * 
   * @param prompt - The message to send
   * @param additionalContext - Optional additional context
   * @returns Promise resolving to the chat response
   */
  const sendMessage = useCallback(
    async (prompt: string, additionalContext?: Record<string, unknown>): Promise<ChatResponse> => {
      // Validate prompt
      if (!prompt.trim()) {
        const error: AIError = {
          code: 'INVALID_REQUEST',
          message: 'Mesaj boş olamaz.',
        };
        throw error;
      }

      // Check context validity
      if (!isContextValid) {
        const error: AIError = {
          code: 'INVALID_REQUEST',
          message: contextError || 'AI context not available',
        };
        throw error;
      }

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey();

      // Send message
      return sendMessageMutation.mutateAsync({
        prompt: prompt.trim(),
        additionalContext,
        idempotencyKey,
      });
    },
    [sendMessageMutation, isContextValid, contextError]
  );

  /**
   * Current error from the last mutation
   */
  const error = useMemo(() => {
    return sendMessageMutation.error || null;
  }, [sendMessageMutation.error]);

  return {
    messages: chatHistory,
    sendMessage,
    isTyping,
    isLoading: sendMessageMutation.isPending,
    error,
    clearHistory,
  };
}

// =============================================================================
// Selector Hooks
// =============================================================================

/**
 * Hook to get only the typing state
 * Use this for optimized re-renders when you only need typing status
 */
export function useAIChatTyping(): boolean {
  return useAIRuntimeStore((state) => state.isTyping);
}

/**
 * Hook to get only the message count
 * Use this for badges or indicators
 */
export function useAIChatMessageCount(): number {
  return useAISessionStore((state) => state.chatHistory.length);
}

/**
 * Hook to get the last message
 * Use this for previews or notifications
 */
export function useAIChatLastMessage(): ChatMessage | null {
  return useAISessionStore((state) => {
    const history = state.chatHistory;
    return history.length > 0 ? history[history.length - 1] : null;
  });
}

// =============================================================================
// Default Export
// =============================================================================

export default useAIChat;
