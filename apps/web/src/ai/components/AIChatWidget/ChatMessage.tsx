/**
 * ChatMessage Component
 * 
 * Renders individual chat messages in the AI Chat Widget.
 * Supports user, assistant, and system message types with appropriate styling.
 * Shows PII/PHI detection warnings when applicable.
 * 
 * @module ai/components/AIChatWidget/ChatMessage
 * 
 * Requirements: 2 (AI Chat Widget)
 */

import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/ai.types';
import { AIActionPreview } from '../AIActionPreview';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ChatMessage component
 */
export interface ChatMessageProps {
  /**
   * The chat message to render
   */
  message: ChatMessageType;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Role-based styling classes
 */
const ROLE_STYLES = {
  user: {
    container: 'justify-end',
    bubble: 'bg-primary text-primary-foreground rounded-br-sm',
    label: 'text-right text-muted-foreground',
  },
  assistant: {
    container: 'justify-start',
    bubble: 'bg-muted text-foreground rounded-bl-sm',
    label: 'text-left text-muted-foreground',
  },
  system: {
    container: 'justify-center',
    bubble: 'bg-warning/10 text-warning-foreground border border-warning/20 text-center',
    label: 'text-center text-muted-foreground',
  },
};

/**
 * Warning icon SVG
 */
const WarningIcon = () => (
  <svg
    className="w-4 h-4 flex-shrink-0"
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

/**
 * AI Assistant icon
 */
const AssistantIcon = () => (
  <span className="text-lg" aria-hidden="true">🤖</span>
);

/**
 * User icon
 */
const UserIcon = () => (
  <span className="text-lg" aria-hidden="true">👤</span>
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: Date): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get role label in Turkish
 */
function getRoleLabel(role: ChatMessageType['role']): string {
  switch (role) {
    case 'user':
      return 'Siz';
    case 'assistant':
      return 'AI Asistan';
    case 'system':
      return 'Sistem';
    default:
      return '';
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * PII/PHI Warning Badge
 */
interface PrivacyWarningProps {
  piiDetected?: boolean;
  phiDetected?: boolean;
}

function PrivacyWarning({ piiDetected, phiDetected }: PrivacyWarningProps): React.ReactElement | null {
  if (!piiDetected && !phiDetected) {
    return null;
  }

  const warnings: string[] = [];
  if (piiDetected) warnings.push('Kişisel Bilgi');
  if (phiDetected) warnings.push('Sağlık Bilgisi');

  return (
    <div
      className="flex items-center gap-1 mt-1 text-xs text-amber-600"
      role="alert"
      aria-label={`Uyarı: ${warnings.join(' ve ')} tespit edildi`}
    >
      <WarningIcon />
      <span>{warnings.join(' ve ')} tespit edildi - gizlilik koruması uygulandı</span>
    </div>
  );
}

/**
 * Intent confidence indicator
 */
interface IntentIndicatorProps {
  intentType: string;
  confidence: number;
}

function IntentIndicator({ intentType, confidence }: IntentIndicatorProps): React.ReactElement {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor = confidence >= 0.8
    ? 'text-success'
    : confidence >= 0.5
      ? 'text-yellow-600'
      : 'text-destructive';

  return (
    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
      <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
        {intentType}
      </span>
      <span className={confidenceColor}>
        {confidencePercent}% güven
      </span>
    </div>
  );
}

// =============================================================================
// Markdown Rendering
// =============================================================================

function renderMarkdownContent(content: string): React.ReactNode {
  // Split into lines for list detection
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const processInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Process bold, italic, code inline, and links
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|(https?:\/\/[^\s]+))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={match.index}>{match[3]}</em>);
      } else if (match[4]) {
        parts.push(<code key={match.index} className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[0.85em] font-mono">{match[4]}</code>);
      } else if (match[5]) {
        parts.push(<a key={match.index} href={match[5]} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">{match[5]}</a>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type === 'ul' ? 'ul' : 'ol';
      elements.push(
        <ListTag key={`list-${elements.length}`} className={`${currentList.type === 'ul' ? 'list-disc' : 'list-decimal'} pl-4 my-1 space-y-0.5`}>
          {currentList.items.map((item, i) => (
            <li key={i} className="text-sm">{processInline(item)}</li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    const olMatch = line.match(/^\d+\.\s+(.+)/);

    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[1]);
    } else if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(olMatch[1]);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<br key={`br-${i}`} />);
      } else {
        elements.push(<p key={`p-${i}`} className="text-sm">{processInline(line)}</p>);
      }
    }
  }
  flushList();

  return <div className="space-y-1">{elements}</div>;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ChatMessage Component
 * 
 * Renders a single chat message with appropriate styling based on role.
 * Shows privacy warnings for PII/PHI detection and intent confidence for assistant messages.
 * 
 * @example
 * ```tsx
 * <ChatMessage 
 * message={{
 * id: '1',
 * role: 'user',
 * content: 'Merhaba',
 * timestamp: new Date(),
 * }} 
 * />
 * ```
 */
export function ChatMessage({ message, className = '' }: ChatMessageProps): React.ReactElement {
  const { role, content, timestamp, intent, piiDetected, phiDetected } = message;
  const styles = ROLE_STYLES[role];

  return (
    <div
      className={`flex ${styles.container} ${className}`}
      role="listitem"
    >
      <div className="max-w-[85%] flex flex-col">
        {/* Message header with icon and label */}
        <div className={`flex items-center gap-1 mb-1 text-xs ${styles.label}`}>
          {role === 'assistant' && <AssistantIcon />}
          {role === 'user' && <UserIcon />}
          <span>{getRoleLabel(role)}</span>
          <span className="text-muted-foreground">•</span>
          <time dateTime={new Date(timestamp).toISOString()}>
            {formatTimestamp(timestamp)}
          </time>
        </div>

        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${styles.bubble}`}
        >
          {/* Message content */}
          {renderMarkdownContent(content)}

          {/* Action Preview */}
          {message.actionPlan && (
            <div className="mt-2 mb-1 bg-card rounded-2xl overflow-hidden border border-border">
              <AIActionPreview
                plan={message.actionPlan}
                className="text-left border-0 shadow-none"
                showModeSelector={false}
              />
            </div>
          )}

          {/* Intent indicator for assistant messages */}
          {role === 'assistant' && intent && (
            <IntentIndicator
              intentType={intent.intentType}
              confidence={intent.confidence}
            />
          )}
        </div>

        {/* Privacy warnings */}
        {role === 'assistant' && (
          <PrivacyWarning piiDetected={piiDetected} phiDetected={phiDetected} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default ChatMessage;
