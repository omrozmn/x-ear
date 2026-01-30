/**
 * AI Feature Example Component
 * 
 * This is an example component demonstrating how to use AIFeatureWrapper
 * to wrap AI-dependent features with graceful degradation.
 * 
 * Use this as a reference when integrating AI features into other parts
 * of the application.
 * 
 * @module ai/components/AIFeatureExample
 * 
 * Requirements: 8 (Graceful Degradation UI), 11 (AI Feature Flags Integration)
 */

import React from 'react';
import { AIFeatureWrapper } from './AIFeatureWrapper';
import { useAIFeatureAvailability } from '../hooks/useAIFeatureAvailability';
import { AIChatWidget } from './AIChatWidget';
import { PendingActionBadge } from './PendingActionBadge';

// =============================================================================
// Example 1: Basic AI Feature Wrapper Usage
// =============================================================================

/**
 * Example: Wrapping a chat feature with graceful degradation
 * 
 * When AI is unavailable, shows a fallback message instead of the chat widget.
 */
export function AIChatFeatureExample(): React.ReactElement {
  return (
    <AIFeatureWrapper
      capability="chat"
      fallback={
        <div className="p-4 bg-gray-100 rounded-lg text-gray-600">
          AI Chat şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.
        </div>
      }
    >
      <AIChatWidget />
    </AIFeatureWrapper>
  );
}

// =============================================================================
// Example 2: Hide When Unavailable
// =============================================================================

/**
 * Example: Completely hiding a feature when AI is unavailable
 * 
 * Use hideWhenUnavailable when you want the feature to simply not appear
 * rather than showing a fallback message.
 */
export function AIHiddenFeatureExample(): React.ReactElement | null {
  return (
    <AIFeatureWrapper
      capability="actions"
      hideWhenUnavailable
    >
      <button data-allow-raw="true" className="px-4 py-2 bg-blue-500 text-white rounded">
        AI ile İşlem Yap
      </button>
    </AIFeatureWrapper>
  );
}

// =============================================================================
// Example 3: Using the Hook for Programmatic Access
// =============================================================================

/**
 * Example: Using useAIFeatureAvailability hook for conditional rendering
 * 
 * Use this approach when you need more control over the rendering logic
 * or need to access availability information in your component logic.
 */
export function AIConditionalFeatureExample(): React.ReactElement {
  const { available, reason, message } = useAIFeatureAvailability('chat');

  if (!available) {
    return (
      <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
        <p className="text-yellow-800">
          AI özelliği kullanılamıyor: {message}
        </p>
        <p className="text-sm text-yellow-600 mt-1">
          Sebep: {reason}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-green-300 bg-green-50 rounded-lg">
      <p className="text-green-800">AI özelliği kullanılabilir!</p>
      {/* Your AI-dependent content here */}
    </div>
  );
}

// =============================================================================
// Example 4: With Pending Action Badge
// =============================================================================

/**
 * Example: Button with pending action badge
 * 
 * Shows how to prevent duplicate action submissions by displaying
 * a badge when an action is already pending.
 */
export function AIActionButtonExample(): React.ReactElement {
  return (
    <AIFeatureWrapper capability="actions" hideWhenUnavailable>
      <PendingActionBadge actionType="create_party" position="top-right">
        <button data-allow-raw="true" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Hasta Ekle (AI)
        </button>
      </PendingActionBadge>
    </AIFeatureWrapper>
  );
}

// =============================================================================
// Example 5: Custom Fallback Function
// =============================================================================

/**
 * Example: Using a function fallback for dynamic content
 * 
 * The fallback function receives the reason and message, allowing
 * you to customize the fallback based on why AI is unavailable.
 */
export function AIDynamicFallbackExample(): React.ReactElement {
  return (
    <AIFeatureWrapper
      capability="ocr"
      fallback={(reason, message) => (
        <div className={`p-4 rounded-lg ${reason === 'quota_exceeded'
          ? 'bg-yellow-50 border-yellow-300'
          : 'bg-red-50 border-red-300'
          } border`}>
          <h3 className="font-semibold">
            {reason === 'quota_exceeded'
              ? 'Günlük Limit Aşıldı'
              : 'OCR Kullanılamıyor'}
          </h3>
          <p className="text-sm mt-1">{message}</p>
        </div>
      )}
    >
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="font-semibold">Belge Tarama (OCR)</h3>
        <p className="text-gray-600">Belgenizi yükleyin, AI otomatik olarak tanıyacak.</p>
      </div>
    </AIFeatureWrapper>
  );
}

// =============================================================================
// Example 6: Party Context Requirement
// =============================================================================

/**
 * Example: Feature that requires party context
 * 
 * Some AI features require a party (patient/customer) to be selected.
 * Use requirePartyContext to enforce this.
 */
export function AIPartyContextExample(): React.ReactElement {
  return (
    <AIFeatureWrapper
      capability="actions"
      requirePartyContext
      fallback={
        <div className="p-4 bg-gray-100 rounded-lg text-gray-600">
          Bu özelliği kullanmak için önce bir hasta seçin.
        </div>
      }
    >
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="font-semibold">Hasta AI Asistanı</h3>
        <p className="text-gray-600">Seçili hasta için AI önerileri</p>
      </div>
    </AIFeatureWrapper>
  );
}
