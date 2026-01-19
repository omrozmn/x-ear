/**
 * AI Chat Client
 * 
 * Wrapper for AI chat endpoints following best practices:
 * - Uses axios instance from orval-mutator
 * - Proper error handling
 * - Turkish error messages
 */

import { apiClient } from '../orval-mutator';

export interface ChatRequest {
  prompt: string;
  context?: Record<string, any>;
  sessionId?: string;
}

export interface ChatResponse {
  requestId: string;
  status: string;
  intent?: {
    intentType: string;
    confidence: number;
    entities: Record<string, any>;
    clarificationNeeded: boolean;
    clarificationQuestion?: string;
  };
  response?: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  processingTimeMs: number;
  piiDetected: boolean;
  phiDetected: boolean;
}

/**
 * Send a chat message to AI
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await apiClient.post<{ data: ChatResponse }>('/ai/chat', request, {
    headers: {
      'Idempotency-Key': `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  });
  return response.data.data;
}

/**
 * Get AI status
 */
export async function getAIStatus(): Promise<{
  enabled: boolean;
  phase: string;
  modelId: string;
}> {
  const response = await apiClient.get<{ data: any }>('/ai/status');
  return response.data.data;
}
