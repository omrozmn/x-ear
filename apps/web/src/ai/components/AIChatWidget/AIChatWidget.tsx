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

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAIChat } from '../../hooks/useAIChat';
import { useComposerStore } from '../../../stores/composerStore';
import { useAIStatus } from '../../hooks/useAIStatus';
import { AIStatusIndicator } from '../AIStatusIndicator';
import { PhaseABanner } from '../PhaseABanner';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Search, Zap, User, Box, Calendar, Edit3, Hash, Loader2, Clock, Trash2 } from 'lucide-react';
import { useAutocompleteApiAiComposerAutocompleteGet } from '../../../api/generated';
import { EntityItem, Capability } from '../../../api/generated/schemas';
import type { ActionPlan, MatchedCapability } from '../../types/ai.types';
import { useChatStore } from '../../stores/chatStore';
import { useMobile } from '../../../hooks/useMobile';
import { useAIRuntimeStore } from '../../stores/aiRuntimeStore';
import { QuickActions } from './QuickActions';
import { ActionProgress } from './ActionProgress';
import { ActionResultCard } from './ActionResultCard';
import { useAIActions } from '../../hooks/useAIActions';
import { customInstance } from '../../../api/orval-mutator';
import { Button, Input } from '@x-ear/ui-web';

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
function TypingIndicator({ message }: { message?: string }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1 px-4 py-3 animate-in fade-in transition-all">
      <div className="flex items-center gap-3 text-muted-foreground text-xs font-medium italic">
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {message || t('ai.preparingAction', 'İşleminiz hazırlanıyor...')}
        </span>
      </div>
    </div>
  );
}

/**
 * Empty state when no messages
 */
function EmptyState({ onAction }: { onAction: (msg: string) => void }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-6 px-4">
      <div className="mb-4 text-center">
        <RobotIcon />
        <h3 className="mt-2 text-sm font-medium text-foreground">{t('ai.assistant', 'AI Asistan')}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-[200px] mx-auto">
          {t('ai.welcomeMessage', 'Merhaba. Hasta, satış, cihaz, randevu ve fatura işlemlerini buradan yapabilirsin.')}
        </p>
      </div>

      <QuickActions onAction={onAction} />
    </div>
  );
}

/**
 * Unavailable state when AI is not available
 */
function UnavailableState({ reason }: { reason?: string }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-muted-foreground"
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
      <h3 className="text-sm font-medium text-foreground">{t('ai.unavailable', 'AI Kullanılamıyor')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {reason || t('ai.unavailableGeneric', 'AI şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.')}
      </p>
    </div>
  );
}

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
 * onOpen={() => console.log('Chat opened')}
 * onClose={() => console.log('Chat closed')}
 * />
 * ```
 */
export function AIChatWidget({
  // defaultOpen parameter removed - not used
  position = 'bottom-right',
  className = '',
  onOpen,
  onClose,
}: AIChatWidgetProps): React.ReactElement | null {
  const { t, i18n } = useTranslation();
  // State
  const {
    isVisible: isOpen,
    setVisible: setIsOpen,
    pendingPrompt,
    pendingContext,
    setPendingPrompt
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Hooks
  const { data: status, isLoading: isStatusLoading } = useAIStatus();
  const { executeAction, isExecuting: isExecutingRealAction, createAction } = useAIActions();

  const {
    mode, selectedAction: currentAction, currentSlot, slots,
    updateSlot, nextSlot, reset, executionResult, executionStatus,
    setContext, context, setPlan, selectAction
  } = useComposerStore();
  const isExecuting = useAIRuntimeStore((state) => state.isExecuting);
  const executionProgress = useAIRuntimeStore((state) => state.executionProgress);


  const {
    messages,
    sendMessage,
    isTyping,
    isLoading: isSending,
    clearHistory,
  } = useAIChat({
    onSuccess: (response) => {
      // If there's an action plan, set it in the composer
      if (response.actionPlan) {
        setPlan(response.actionPlan as ActionPlan);
        useAIRuntimeStore.getState().setCurrentPlan(response.actionPlan as ActionPlan);

        if (!response.actionPlan.requiresApproval) {
          executeAction({
            actionId: response.actionPlan.planId,
            mode: 'execute'
          }).catch(console.error);
        }
      }
      // If matchedCapability is returned, auto-trigger slot-filling/execution UI
      if (response.matchedCapability) {
        const cap = response.matchedCapability as MatchedCapability;
        selectAction({
          name: cap.name,
          displayNameTr: cap.displayName || cap.name,
          displayNameEn: cap.displayName || cap.name,
          description: cap.description,
          category: cap.category || 'AI Operation',
          examplePhrases: [],
          requiredPermissions: [],
          toolOperations: [],
          limitations: [],
          slots: (cap.slots || []).map(s => ({
            name: s.name,
            prompt: s.prompt,
            uiType: s.uiType,
            sourceEndpoint: s.sourceEndpoint || null,
            enumOptions: s.enumOptions || null,
            validationRules: s.validationRules || null,
          })),
        } as Capability);
      }
    }
  });

  // Derived state
  const isAvailable = status?.available ?? false;
  const isPhaseA = status?.phase?.currentPhase === 'A';
  const positionClasses = POSITION_CLASSES[position];

  // Get unavailable reason
  const getUnavailableReason = useCallback((): string | undefined => {
    if (!status) return undefined;
    if (!status.enabled) return t('ai.errors.disabled', 'AI devre dışı bırakılmış.');
    if (status.killSwitch?.globalActive) return t('ai.errors.globalKillSwitch', 'AI geçici olarak durduruldu.');
    if (status.killSwitch?.tenantActive) return t('ai.errors.tenantKillSwitch', 'AI bu hesap için durduruldu.');
    if (status.usage?.anyQuotaExceeded) return t('ai.errors.quotaExceeded', 'Günlük AI limitinize ulaştınız.');
    if (status.model && !status.model.available) return t('ai.errors.modelUnavailable', 'AI modeli şu anda kullanılamıyor.');
    return undefined;
  }, [status, t]);

  // Mobile Detection
  const isMobile = useMobile();

  // Auto-Open on Mobile (on mount)
  useEffect(() => {
    if (isMobile && !isOpen) {
      // Small timeout to allow hydration/transition
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]); // Intentionally omitting isOpen and setIsOpen to prevent toggle loop


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



  const confirmReset = useCallback(() => {
    clearHistory();
    reset(); // Also reset composer store
    setShowResetConfirm(false);
  }, [clearHistory, reset]);

  /**
   * Close chat window
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]); // setIsOpen is stable and doesn't need to be in deps

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
   * Handle File Upload for AI OCR processing
   */
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;

    // We process the first file for now
    const file = files[0];

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await customInstance<{ data: { result: { text?: string; ocr_text?: string; patient_info?: unknown } } }>({
        url: '/ocr/upload',
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const extractedText = response?.data?.result?.text || response?.data?.result?.ocr_text;

      if (extractedText) {
        // Feed the extracted text to the AI as a system instruction
        const prompt = `[SİSTEM: Kullanıcı sisteme "${file.name}" adlı bir belge yükledi.]\n\nOkunan Belge İçeriği:\n${extractedText}\n\nLütfen bu belge içeriğine göre yapılabilecek uygun bir işlem (Örn: Hasta Kaydı Oluştur, Bilgi Güncelle, Fatura Kes vb.) varsa doğrudan işlemi başlatıp onayımı isteyin.`;

        await handleSend(prompt);
      } else {
        console.error("No text extracted from document");
        // Optionally show toast error here
      }
    } catch (error) {
      console.error("File upload failed", error);
    } finally {
      setIsUploading(false);
    }
  }, [handleSend]);

  // Handle Handoff from Spotlight (startWithCommand)
  useEffect(() => {
    if (isOpen && pendingPrompt && pendingPrompt.trim().length > 0) {
      // Capture local copies and CLEAR IMMEDIATELY to prevent re-entry/infinite loop
      const promptToHandle = pendingPrompt;
      const contextToHandle = pendingContext;
      setPendingPrompt(null, null);

      // Set context first if provided
      if (contextToHandle && contextToHandle.length > 0) {
        setContext(contextToHandle);
      }

      // Small timeout to ensure chat is fully ready
      const timer = setTimeout(() => {
        handleSend(promptToHandle);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, pendingPrompt, pendingContext, handleSend, setContext, setPendingPrompt]);

  /**
   * Handle keyboard events for accessibility
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      handleClose();
    }
  }, [isOpen, handleClose]);

  // Entity search state for slots
  const [slotSearchQuery, setSlotSearchQuery] = useState('');
  const slotEntityType = currentSlot?.sourceEndpoint?.includes('inventory') ? 'device' : 'patient';
  const { data: slotEntityData, isLoading: isSlotSearchLoading } = useAutocompleteApiAiComposerAutocompleteGet(
    { q: slotSearchQuery, context_entity_type: slotEntityType },
    { query: { enabled: slotSearchQuery.length > 1 && mode === 'slot_filling' && currentSlot?.uiType === 'entity_search' && isOpen } }
  );

  const handleSlotEntitySelect = (entity: EntityItem) => {
    updateSlot(currentSlot!.name, entity.id);
    updateSlot(`_${currentSlot!.name}_label`, entity.label);
    setSlotSearchQuery('');
    nextSlot();
  };

  // No longer returning null here to ensure the widget can respond to visibility changes
  // Internal sub-components handle the disabled state UI

  // Mobile-specific classes override default positioning
  const containerClasses = isMobile
    ? 'fixed inset-0 z-[2000] flex flex-col bg-card'
    : `fixed ${positionClasses.window} w-96 h-[500px] max-h-[80vh] bg-card rounded-3xl shadow-2xl flex flex-col border border-border`;

  const getDynamicTypingMessage = () => {
    const lang = i18n.language || 'tr';

    // Priority 1: Real-time execution progress if available
    if (isExecuting && executionProgress) {
      if (executionProgress.overallStatus === 'running' && executionProgress.currentStep > 0) {
        // If we have step statuses, find the current running one
        const currentStepStatus = executionProgress.stepStatuses.find(
          s => s.stepNumber === executionProgress.currentStep
        );
        if (currentStepStatus?.message) return currentStepStatus.message;
        return lang === 'en'
          ? `Executing action (Step ${executionProgress.currentStep}/${executionProgress.totalSteps})...`
          : `İşlem yürütülüyor (Adım ${executionProgress.currentStep}/${executionProgress.totalSteps})...`;
      }
      if (executionProgress.overallStatus === 'initializing') return lang === 'en' ? 'Preparing operation...' : 'İşlem hazırlanıyor...';
    }

    // Priority 2: State-aware messages (most accurate when already in a workflow)
    if (mode === 'slot_filling' && currentAction) {
      const actionName = (currentAction.displayName as string) || (currentAction.name as string);
      return lang === 'en' ? `Processing info for ${actionName}...` : `${actionName} için bilgiler işleniyor...`;
    }
    if (mode === 'confirmation' && currentAction) {
      const actionName = (currentAction.displayName as string) || (currentAction.name as string);
      return lang === 'en' ? `Confirming ${actionName}...` : `${actionName} onaylanıyor...`;
    }

    if (messages.length === 0) return lang === 'en' ? 'Connecting to system...' : 'Sistemle bağlantı kuruluyor...';

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content.toLowerCase() || '';

    // Priority 3: Keyword based for initial request or context-less turns
    if (lang === 'en') {
      if (lastUserMessage.includes('patient') || lastUserMessage.includes('record')) return 'Preparing patient record...';
      if (lastUserMessage.includes('device') || lastUserMessage.includes('assign') || lastUserMessage.includes('deliver')) return 'Planning device operation...';
      if (lastUserMessage.includes('invoice') || lastUserMessage.includes('e-prescription') || lastUserMessage.includes('sgk')) return 'Checking financial info and SGK status...';
      if (lastUserMessage.includes('appointment')) return 'Checking appointment calendar...';
      if (lastUserMessage.includes('sale')) return 'Preparing sales operation...';
      if (lastUserMessage.includes('collection') || lastUserMessage.includes('payment') || lastUserMessage.includes('cash')) return 'Checking cash and payment info...';
      if (lastUserMessage.includes('stock') || lastUserMessage.includes('inventory')) return 'Checking stock information...';
      if (lastUserMessage.includes('report') || lastUserMessage.includes('stat')) return 'Preparing report data...';
      if (lastUserMessage.includes('file') || lastUserMessage.includes('upload') || lastUserMessage.includes('document')) return 'Preparing document operation...';
      if (lastUserMessage.includes('bulk') || lastUserMessage.includes('excel') || lastUserMessage.includes('template')) return 'Preparing bulk operation wizard...';
      if (lastUserMessage.includes('setting') || lastUserMessage.includes('package') || lastUserMessage.includes('subscription') || lastUserMessage.includes('notification')) return 'Checking system settings...';
    } else {
      if (lastUserMessage.includes('hasta') || lastUserMessage.includes('kayıt')) return 'Hasta kaydı hazırlanıyor...';
      if (lastUserMessage.includes('cihaz') || lastUserMessage.includes('ata') || lastUserMessage.includes('teslim')) return 'Cihaz işlemi planlanıyor...';
      if (lastUserMessage.includes('fatura') || lastUserMessage.includes('e-reçete') || lastUserMessage.includes('sgk')) return 'Finansal bilgiler ve SGK sorgusu yapılıyor...';
      if (lastUserMessage.includes('randevu')) return 'Randevu takvimi kontrol ediliyor...';
      if (lastUserMessage.includes('satış')) return 'Satış işlemi hazırlanıyor...';
      if (lastUserMessage.includes('tahsilat') || lastUserMessage.includes('ödeme') || lastUserMessage.includes('kasa')) return 'Kasa ve ödeme bilgileri kontrol ediliyor...';
      if (lastUserMessage.includes('stok') || lastUserMessage.includes('envanter')) return 'Stok bilgisi kontrol ediliyor...';
      if (lastUserMessage.includes('rapor') || lastUserMessage.includes('istatistik')) return 'Rapor verileri hazırlanıyor...';
      if (lastUserMessage.includes('dosya') || lastUserMessage.includes('yükle') || lastUserMessage.includes('belge')) return 'Belge işlemi hazırlanıyor...';
      if (lastUserMessage.includes('toplu') || lastUserMessage.includes('excel') || lastUserMessage.includes('şablon')) return 'Toplu işlem sihirbazı hazırlanıyor...';
      if (lastUserMessage.includes('ayar') || lastUserMessage.includes('paket') || lastUserMessage.includes('abonelik') || lastUserMessage.includes('bildirim')) return 'Sistem ayarları kontrol ediliyor...';
    }

    // Priority 4: Fallback for short follow-ups (ee, et, devam)
    if (['ee', 'et', 'devam', 'yap', 'onay', 'onayla', 'continue', 'yes', 'do it'].includes(lastUserMessage.trim())) {
      return lang === 'en' ? 'Continuing operation...' : 'İşleme devam ediliyor...';
    }

    return lang === 'en' ? 'Analyzing your message...' : 'Mesajınız inceleniyor...';
  };

  return (
    <div
      className={`fixed z-[3000] ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Floating Button (Hidden on Mobile when open) */}
      <Button
        onClick={handleToggle}
        className={`
          fixed ${positionClasses.button}
          w-14 h-14 rounded-full
          bg-blue-600 text-white
          shadow-lg hover:bg-blue-700 hover:shadow-xl
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          flex items-center justify-center
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
          ${isMobile && isOpen ? 'hidden' : ''}
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
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`
            ${containerClasses}
            transform transition-all duration-200
            animate-in slide-in-from-bottom-4 fade-in
          `}
          role="dialog"
          aria-label="AI Asistan Chat"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted rounded-t-3xl">
            <div className="flex items-center gap-2">
              <RobotIcon />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground leading-none">AI Asistan</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <AIStatusIndicator status={status} size="sm" />
                  <span className="text-[10px] text-muted-foreground">Beta</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                showResetConfirm ? (
                  <Button
                    onClick={() => { confirmReset(); setShowResetConfirm(false); }}
                    onBlur={() => setShowResetConfirm(false)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Silmeyi Onayla"
                    autoFocus
                  >
                    Emin misiniz?
                  </Button>
                ) : (
                  <Button
                    onClick={() => setShowResetConfirm(true)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all focus:outline-none focus:ring-1 focus:ring-red-200"
                    title="Sohbeti Temizle"
                  >
                    <Trash2 size={16} />
                  </Button>
                )
              )}
              <Button
                onClick={handleClose}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Chat'i kapat"
              >
                <CloseIcon />
              </Button>
            </div>
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
              <EmptyState onAction={handleSend} />
            )}

            {/* Messages */}
            {isAvailable && messages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
              />
            ))}

            {/* Thinking Indicator */}
            {isTyping && (
              <TypingIndicator message={getDynamicTypingMessage()} />
            )}

            {/* Conversational Slot Filling */}
            {isOpen && mode === 'slot_filling' && currentAction && currentSlot && (
              <div className="bg-card border-2 border-blue-100 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-left-2 mx-2 my-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 px-2 bg-primary/10 text-primary text-[10px] font-bold rounded border border-blue-100 uppercase tracking-wider">
                    DEĞER GEREKLİ
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground mb-3">{currentSlot.prompt}</p>

                {/* PREMIUM SLOT UI */}
                <div className="space-y-3">
                  {currentSlot.uiType === 'entity_search' && (
                    <div className="space-y-2">
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <Input
                          className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all"
                          placeholder="Aramak için yazın..."
                          value={slotSearchQuery}
                          onChange={(e) => setSlotSearchQuery(e.target.value)}
                          autoFocus
                        />
                      </div>

                      {isSlotSearchLoading && (
                        <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-muted-foreground italic">
                          <Loader2 className="w-3 h-3 animate-spin" /> Arıyor...
                        </div>
                      )}

                      {slotEntityData?.entities && slotEntityData.entities.length > 0 && (
                        <div className="bg-card border rounded-2xl shadow-sm max-h-40 overflow-y-auto divide-y divide-gray-50 border-blue-50">
                          {slotEntityData.entities.map((e: EntityItem) => (
                            <Button
                              key={e.id}
                              onClick={() => handleSlotEntitySelect(e)}
                              className="w-full flex items-center gap-2 p-2 hover:bg-primary/10 transition-colors text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                {e.type === 'patient' ? <User size={14} /> : <Box size={14} />}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">{e.label}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{e.subLabel}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {currentSlot.uiType === 'enum' && (
                    <div className="grid grid-cols-2 gap-2">
                      {currentSlot.enumOptions?.map((opt: string) => (
                        <Button
                          key={opt}
                          onClick={() => {
                            updateSlot(currentSlot.name, opt);
                            nextSlot();
                          }}
                          className="flex items-center justify-center px-3 py-2 bg-card border border-border rounded-2xl text-xs font-semibold text-foreground hover:border-blue-400 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                  )}

                  {currentSlot.uiType === 'date' && (
                    <div className="relative group">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <Input
                        type="date"
                        className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all"
                        onChange={(e) => {
                          updateSlot(currentSlot.name, e.target.value);
                          nextSlot();
                        }}
                      />
                    </div>
                  )}

                  {currentSlot.uiType === 'text' && (
                    <div className="relative group">
                      <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <Input
                        className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all"
                        placeholder="Yazmaya başlayın..."
                        autoFocus
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') {
                            updateSlot(currentSlot.name, e.currentTarget.value);
                            nextSlot();
                          }
                        }}
                      />
                    </div>
                  )}

                  {currentSlot.uiType === 'number' && (
                    <div className="relative group">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <input data-allow-raw="true"
                        type="number"
                        className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all"
                        placeholder="Sayı girin..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateSlot(currentSlot.name, Number(e.currentTarget.value));
                            nextSlot();
                          }
                        }}
                      />
                    </div>
                  )}

                  {(currentSlot.uiType as string) === 'boolean' && (
                    <div className="flex gap-2">
                      <button
                        data-allow-raw="true"
                        onClick={() => {
                          updateSlot(currentSlot.name, true);
                          nextSlot();
                        }}
                        className="flex-1 px-3 py-2 bg-card border border-green-200 text-success text-xs font-bold rounded-2xl hover:bg-success/10 transition-all shadow-sm"
                      >
                        {t('common.yes', 'Evet')}
                      </button>
                      <button
                        data-allow-raw="true"
                        onClick={() => {
                          updateSlot(currentSlot.name, false);
                          nextSlot();
                        }}
                        className="flex-1 px-3 py-2 bg-card border border-red-200 text-destructive text-xs font-bold rounded-2xl hover:bg-destructive/10 transition-all shadow-sm"
                      >
                        {t('common.no', 'Hayır')}
                      </button>
                    </div>
                  )}

                  {(currentSlot.uiType as string) === 'time' && (
                    <div className="relative group">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <input data-allow-raw="true"
                        type="time"
                        className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all shadow-sm"
                        onChange={(e) => {
                          updateSlot(currentSlot.name, e.target.value);
                          nextSlot();
                        }}
                      />
                    </div>
                  )}
                </div>

                <p className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1">
                  <Zap size={10} /> {t('ai.inputValueHint', "Değeri girip Enter'layın veya seçim yapın")}
                </p>
              </div>
            )}

            {/* Confirmation in Chat */}
            {isOpen && mode === 'confirmation' && currentAction && (
              <div className="bg-card border-2 border-purple-100 rounded-xl p-4 shadow-md animate-in fade-in slide-in-from-bottom-2 mx-2 my-2 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-2xl">
                      <Zap size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-tight">Onay Bekliyor</h4>
                      <p className="text-[10px] text-muted-foreground">Lütfen ayrıntıları gözden geçirin</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="p-3 bg-muted rounded-2xl border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">İşlem Modeli</div>
                    <div className="text-sm font-semibold text-foreground">{currentAction.displayName || currentAction.name}</div>
                  </div>

                  <div className="p-3 bg-muted rounded-2xl border border-border">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Hedef Kayıtlar</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {context?.map(c => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded border border-blue-100">
                          {c.type === 'patient' ? <User size={8} /> : <Box size={8} />}
                          {c.label}
                        </span>
                      ))}
                      {(!context || context?.length === 0) && (
                        <span className="text-xs text-muted-foreground italic">Genel İşlem</span>
                      )}
                    </div>
                  </div>

                  {Object.entries(slots).filter(([k]) => !k.startsWith('_')).length > 0 && (
                    <div className="p-3 bg-muted rounded-2xl border border-border">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Parametreler</div>
                      <div className="space-y-1.5 mt-1">
                        {Object.entries(slots)
                          .filter(([k]) => !k.startsWith('_'))
                          .map(([k, v]) => {
                            const label = slots[`_${k}_label`];
                            const displayValue = typeof label === 'string'
                              ? label
                              : (v !== null && v !== undefined ? String(v) : '-');
                            return (
                              <div key={k} className="flex justify-between items-center text-[10px]">
                                <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                                <span className="font-bold text-foreground">{displayValue}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    data-allow-raw="true"
                    onClick={async () => {
                      let planId = useAIRuntimeStore.getState().currentPlan?.planId;

                      // If no real plan exists yet (UX-driven slot filling), create it now
                      if (!planId && currentAction) {
                        try {
                          const plan = await createAction({
                            intent: {
                              intentType: 'ACTION',
                              confidence: 1.0,
                              entities: slots,
                              clarificationNeeded: false,
                            },
                            additionalContext: {
                              capability_name: currentAction.name,
                            },
                          });
                          planId = plan.planId;
                        } catch (err) {
                          console.error('[AIChatWidget] Action plan creation failed:', err);
                          return;
                        }
                      }

                      if (planId) {
                        executeAction({
                          actionId: planId,
                          mode: 'execute',
                        }).catch(console.error);
                      }
                    }}
                    className="flex-1 bg-purple-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-sm"
                    disabled={isExecutingRealAction}
                  >
                    {isExecutingRealAction ? 'Uygulanıyor...' : 'Şimdi Uygula'}
                  </button>
                  <button
                    data-allow-raw="true"
                    onClick={reset}
                    className="px-4 py-2.5 bg-muted text-muted-foreground rounded-2xl text-xs font-bold hover:bg-accent transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}

            {/* NEW: Action Execution Progress (Replaces the old result view for the new flow) */}
            {isOpen && executionStatus !== 'idle' && (
              <div className="my-2">
                <ActionProgress />
              </div>
            )}

            {/* Action Result Card or Legacy Event Card */}
            {isOpen && executionResult && executionStatus === 'idle' && (
              <>
                {executionResult.status === 'success' ? (
                  <ActionResultCard onClose={reset} />
                ) : (
                  <div className={`mt-2 p-3 rounded-2xl border animate-in slide-in-from-bottom-2 ${executionResult.status === 'dry_run' ? 'bg-primary/10 border-blue-100 text-blue-900' :
                    'bg-destructive/10 border-red-100 text-red-900'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold capitalize">
                        {executionResult.status === 'dry_run' ? '🔍 Simülasyon Özeti' : '❌ Hata'}
                      </span>
                    </div>
                    <p className="text-xs mb-3">
                      {executionResult.status === 'dry_run' ? 'Bu işlem yapıldığında yukarıdaki parametreler sisteme işlenecektir.' : executionResult.error}
                    </p>
                    {executionResult.status === 'dry_run' && (
                      <button data-allow-raw="true"
                        onClick={() => { reset(); }}
                        className="w-full bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        Şimdi Onayla ve Tamamla
                      </button>
                    )}
                  </div>
                )}
              </>
            )}


            {/* Auto-scroll anchor (12.5) */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <ChatInput
            onSend={handleSend}
            disabled={!isAvailable}
            isLoading={isSending}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
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
