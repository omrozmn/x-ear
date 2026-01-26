/**
 * AIChatWidget Component
 * 
 * A floating chat widget for interacting with the AI assistant.
 * Features:
 * - Floating button in bottom-right corner
 * - Expandable chat window
 * - Message history with auto-scroll
 * - PII/PHI detection warnings
 * - Graceful handling of unavailable state
 * - Phase A banner integration
 * 
 * @module ai/components/AIChatWidget/AIChatWidget
 * 
 * Requirements: 2 (AI Chat Widget), 8 (Graceful Degradation), 17 (Phase A Banner)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAIChat } from './hooks/useAIChat';
import { useComposerStore } from '../stores/composerStore';
import { useAIStatus } from './hooks/useAIStatus';
import { AIStatusIndicator } from './components/AIStatusIndicator';
import { PhaseABanner } from './components/PhaseABanner';
import { ChatMessage as ChatMessageComponent } from './components/AIChatWidget/ChatMessage';
import { ChatInput } from './components/AIChatWidget/ChatInput';
import { useChatStore } from './stores/chatStore';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AIChatWidget component
 */
export interface AIChatWidgetProps {
  /**
   * Initial open state of the chat window
   * @default false
   */
  defaultOpen?: boolean;

  /**
   * Position of the floating button
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left';

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * Callback when chat is opened
   */
  onOpen?: () => void;

  /**
   * Callback when chat is closed
   */
  onClose?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Position classes for the floating button and chat window
 */
const POSITION_CLASSES = {
  'bottom-right': {
    button: 'bottom-4 right-4',
    window: 'bottom-20 right-4',
  },
  'bottom-left': {
    button: 'bottom-4 left-4',
    window: 'bottom-20 left-4',
  },
};

/**
 * Chat icon SVG
 */
const ChatIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

/**
 * Close icon SVG
 */
const CloseIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

/**
 * AI Robot icon for header
 */
const RobotIcon = () => (
  <span className="text-xl" aria-hidden="true">🤖</span>
);

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Typing indicator component
 */
function TypingIndicator(): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-gray-500 text-sm">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>AI yazıyor...</span>
    </div>
  );
}

/**
 * Empty state when no messages
 */
function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <RobotIcon />
      <h3 className="mt-2 text-sm font-medium text-gray-900">AI Asistan</h3>
      <p className="mt-1 text-sm text-gray-500">
        Merhaba! Size nasıl yardımcı olabilirim?
      </p>
    </div>
  );
}

/**
 * Unavailable state when AI is not available
 */
function UnavailableState({ reason }: { reason?: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-gray-900">AI Kullanılamıyor</h3>
      <p className="mt-1 text-sm text-gray-500">
        {reason || 'AI şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.'}
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AIChatWidget Component
 * 
 * A floating chat widget that provides AI assistant functionality.
 * Handles all states: loading, available, unavailable, and error.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AIChatWidget />
 * 
 * // With custom position
 * <AIChatWidget position="bottom-left" />
 * 
 * // With callbacks
 * <AIChatWidget 
 *   onOpen={() => console.log('Chat opened')}
 *   onClose={() => console.log('Chat closed')}
 * />
 * ```
 */
export function AIChatWidget({
  defaultOpen = false,
  position = 'bottom-right',
  className = '',
  onOpen,
  onClose,
}: AIChatWidgetProps): React.ReactElement | null {
  // State
  const { isVisible: isOpen, setVisible: setIsOpen } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { data: status, isLoading: isStatusLoading } = useAIStatus();
  const {
    messages,
    sendMessage,
    isTyping,
    isLoading: isSending,
  } = useAIChat();

  const {
    mode, selectedAction: currentAction, currentSlot, slots,
    updateSlot, nextSlot, reset, executionResult, isDryRun
  } = useComposerStore();

  // Derived state
  const isAvailable = status?.available ?? false;
  const isEnabled = status?.enabled ?? false;
  const isPhaseA = status?.phase?.currentPhase === 'A';
  const positionClasses = POSITION_CLASSES[position];

  // Get unavailable reason
  const getUnavailableReason = useCallback((): string | undefined => {
    if (!status) return undefined;
    if (!status.enabled) return 'AI devre dışı bırakılmış.';
    if (status.killSwitch.globalActive) return 'AI geçici olarak durduruldu.';
    if (status.killSwitch.tenantActive) return 'AI bu hesap için durduruldu.';
    if (status.usage.anyQuotaExceeded) return 'Günlük AI limitinize ulaştınız.';
    if (!status.model.available) return 'AI modeli şu anda kullanılamıyor.';
    return undefined;
  }, [status]);

  // ==========================================================================
  // Auto-scroll to bottom on new messages (12.5)
  // ==========================================================================
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Toggle chat window open/closed
   */
  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [isOpen, onOpen, onClose, setIsOpen]);

  /**
   * Close chat window
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(async (message: string) => {
    try {
      await sendMessage(message);
    } catch (error) {
      // Error is handled by useAIChat hook and displayed in chat
      console.error('[AIChatWidget] Send error:', error);
    }
  }, [sendMessage]);

  /**
   * Handle keyboard events for accessibility
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  }, [isOpen, handleClose]);

  // ==========================================================================
  // Don't render if AI is disabled entirely
  // ==========================================================================
  if (!isStatusLoading && !isEnabled) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Floating Button */}
      <button data-allow-raw="true"
        onClick={handleToggle}
        className={`
          fixed ${positionClasses.button}
          w-14 h-14 rounded-full
          bg-blue-600 text-white
          shadow-lg hover:bg-blue-700 hover:shadow-xl
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          flex items-center justify-center
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
        `}
        aria-label={isOpen ? 'Chat\'i kapat' : 'AI Asistan\'ı aç'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <ChatIcon />

        {/* Unread indicator (optional - can be enhanced later) */}
        {messages.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`
            fixed ${positionClasses.window}
            w-96 h-[500px] max-h-[80vh]
            bg-white rounded-lg shadow-2xl
            flex flex-col
            border border-gray-200
            transform transition-all duration-200
            animate-in slide-in-from-bottom-4 fade-in
          `}
          role="dialog"
          aria-label="AI Asistan Chat"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <RobotIcon />
              <span className="font-semibold text-gray-900">AI Asistan</span>
              <AIStatusIndicator status={status} size="sm" />
            </div>
            <button data-allow-raw="true"
              onClick={handleClose}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Chat'i kapat"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Phase A Banner (12.8) */}
          {isPhaseA && (
            <div className="px-3 pt-3">
              <PhaseABanner
                storageKey="ai-chat-widget-phase-a-dismissed"
                className="text-xs"
              />
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            role="log"
            aria-live="polite"
            aria-label="Mesaj geçmişi"
          >
            {/* Unavailable State (12.7) */}
            {!isAvailable && !isStatusLoading && (
              <UnavailableState reason={getUnavailableReason()} />
            )}

            {/* Empty State */}
            {isAvailable && messages.length === 0 && !isTyping && (
              <EmptyState />
            )}

            {/* Messages */}
            {isAvailable && messages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
              />
            ))}

            {/* Conversational Slot Filling */}
            {isOpen && mode === 'slot_filling' && currentAction && currentSlot && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 animate-in fade-in slide-in-from-left-2">
                <p className="text-sm font-medium text-blue-900 mb-2">{currentSlot.prompt}</p>

                {/* Simplified Slot UI for Chat - reusing logic from Overlay */}
                {currentSlot.uiType === 'enum' && (
                  <div className="flex gap-2 flex-wrap">
                    {currentSlot.enumOptions?.map((opt: string) => (
                      <button data-allow-raw="true"
                        key={opt}
                        onClick={() => {
                          updateSlot(currentSlot.name, opt);
                          nextSlot();
                        }}
                        className="px-3 py-1.5 bg-white border border-blue-200 rounded text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {currentSlot.uiType === 'date' && (
                  <input data-allow-raw="true"
                    type="date"
                    className="w-full border rounded p-1.5 text-sm"
                    onChange={(e) => {
                      updateSlot(currentSlot.name, e.target.value);
                      nextSlot();
                    }}
                  />
                )}

                {/* Generic input for others for now */}
                {(['text', 'number'].includes(currentSlot.uiType)) && (
                  <input data-allow-raw="true"
                    className="w-full border rounded p-1.5 text-sm"
                    placeholder="Değer yazın..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = currentSlot.uiType === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value;
                        updateSlot(currentSlot.name, val);
                        nextSlot();
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* Confirmation in Chat */}
            {isOpen && mode === 'confirmation' && currentAction && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 animate-in fade-in slide-in-from-left-2">
                <p className="text-sm font-bold text-purple-900 mb-1">İşlemi Onaylıyor musunuz?</p>
                <p className="text-xs text-purple-700 mb-2">{currentAction.name} - {Object.keys(slots).length} parametre hazır.</p>
                <div className="flex gap-2">
                  <button data-allow-raw="true"
                    onClick={() => {
                      // Execute handoff or direct execution
                      console.log('Confirmed in Chat');
                      // For now just reset or execute if possible
                      reset();
                    }}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-700"
                  >
                    Onayla
                  </button>
                  <button data-allow-raw="true"
                    onClick={reset}
                    className="bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded text-xs font-bold"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}

            {/* Execution/Dry-run Result in Chat */}
            {isOpen && executionResult && (
              <div className={`mt-2 p-3 rounded-lg border animate-in slide-in-from-bottom-2 ${executionResult.status === 'success' ? 'bg-green-50 border-green-100 text-green-900' :
                executionResult.status === 'dry_run' ? 'bg-blue-50 border-blue-100 text-blue-900' :
                  'bg-red-50 border-red-100 text-red-900'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold capitalize">
                    {executionResult.status === 'success' ? '✅ Başarılı!' :
                      executionResult.status === 'dry_run' ? '🔍 Simülasyon Özeti' :
                        '❌ Hata'}
                  </span>
                </div>
                <p className="text-xs mb-3">
                  {executionResult.status === 'success' ? 'İşlem başarıyla tamamlandı.' :
                    executionResult.status === 'dry_run' ? 'Bu işlem yapıldığında yukarıdaki parametreler sisteme işlenecektir.' :
                      executionResult.error}
                </p>
                {executionResult.status === 'dry_run' && (
                  <button data-allow-raw="true"
                    onClick={() => {
                      // Direct confirmation from simulation
                      // Note: In a real app we'd call the handleConfirm analog
                      reset();
                    }}
                    className="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700 transition-colors"
                  >
                    Şimdi Onayla ve Tamamla
                  </button>
                )}
                {executionResult.status === 'success' && (
                  <button data-allow-raw="true"
                    onClick={reset}
                    className="w-full bg-gray-900 text-white py-2 rounded text-xs font-bold hover:bg-black transition-colors"
                  >
                    Kapat
                  </button>
                )}
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && <TypingIndicator />}

            {/* Auto-scroll anchor (12.5) */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <ChatInput
            onSend={handleSend}
            disabled={!isAvailable}
            isLoading={isSending}
            placeholder={isAvailable ? 'Mesajınızı yazın...' : 'AI kullanılamıyor'}
            autoFocus={isOpen}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default AIChatWidget;
