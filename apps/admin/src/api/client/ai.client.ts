/**
 * AI Chat Client (Adapter Layer)
 * 
 * Re-exports Orval-generated functions following Rule 258.
 * Provides a unified interface for AI-related operations.
 * 
 * @module api/client/ai.client
 */

import { apiClient } from '../orval-mutator';
export {
  createActionApiAiActionsPost,
  approveActionApiAiActionsActionIdApprovePost,
  executeActionApiAiActionsActionIdExecutePost,
  getActionApiAiActionsActionIdGet
} from '../generated';

export {
  getStatusApiAiStatusGet as getAIStatus
} from '../generated/ai-status/ai-status';

export {
  getPendingApprovalsApiAiAdminPendingApprovalsGet as getPendingActions
} from '../generated/ai-admin/ai-admin';

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
 * Send a chat message to AI (Manual implementation as it might not be in OpenAPI or needs specific wrapping)
 * NOTE: If orval generates this, it should be replaced by a re-export.
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await apiClient.post<{ data: ChatResponse }>('/api/ai/chat', request, {
    headers: {
      'Idempotency-Key': `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    timeout: 60000 // 60 seconds for AI inference
  });
  return response.data.data;
}

