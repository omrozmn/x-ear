/**
 * ChatInput Component
 * 
 * Input field for sending messages in the AI Chat Widget.
 * Supports Enter key submission and disabled state.
 * 
 * @module ai/components/AIChatWidget/ChatInput
 * 
 * Requirements: 2 (AI Chat Widget)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ChatInput component
 */
export interface ChatInputProps {
  /**
   * Callback when user sends a message
   */
  onSend: (message: string) => void;

  /**
   * Whether the input is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Placeholder text for the input
   * @default "Mesajınızı yazın..."
   */
  placeholder?: string;

  /**
   * Whether the AI is currently processing (shows loading state)
   * @default false
   */
  isLoading?: boolean;

  /**
   * Whether a file is currently uploading
   * @default false
   */
  isUploading?: boolean;

  /**
   * Callback when user selects files to upload
   */
  onFileUpload?: (files: FileList) => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Auto-focus the input on mount
   * @default true
   */
  autoFocus?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Send icon SVG
 */
const SendIcon = () => (
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
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
    />
  </svg>
);

/**
 * Paperclip icon SVG for file upload
 */
const PaperclipIcon = () => (
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
      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
    />
  </svg>
);

/**
 * Loading spinner SVG
 */
const LoadingSpinner = () => (
  <svg
    className="w-5 h-5 animate-spin"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// =============================================================================
// Main Component
// =============================================================================

/**
 * ChatInput Component
 * 
 * Provides a text input for sending messages to the AI assistant.
 * Supports keyboard submission (Enter) and button click.
 * 
 * @example
 * ```tsx
 * <ChatInput 
 *   onSend={(message) => console.log('Sending:', message)}
 *   placeholder="Sorunuzu yazın..."
 *   disabled={!isAIAvailable}
 *   isLoading={isSending}
 * />
 * ```
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Mesajınızı yazın...',
  isLoading = false,
  isUploading = false,
  onFileUpload,
  className = '',
  autoFocus = true,
}: ChatInputProps): React.ReactElement {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Restore focus after loading finishes
  useEffect(() => {
    if (!isLoading && !disabled && autoFocus && inputRef.current) {
      // Small timeout to allow the browser to re-enable the input before focusing
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [isLoading, disabled, autoFocus]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedValue = inputValue.trim();
    if (!trimmedValue || disabled || isLoading) {
      return;
    }

    onSend(trimmedValue);
    setInputValue('');

    // Re-focus input after sending
    inputRef.current?.focus();
  }, [inputValue, disabled, isLoading, onSend]);

  /**
   * Handle key press (Enter to send)
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const isDisabled = disabled || isLoading || isUploading;
  const canSend = inputValue.trim().length > 0 && !isDisabled;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onFileUpload) {
      onFileUpload(e.target.files);
    }
    // clear input so same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 p-3 border-t border-gray-200 bg-white ${className}`}
    >
      {/* File Upload Button */}
      {onFileUpload && (
        <>
          <input data-allow-raw="true"
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx"
          />
          <button data-allow-raw="true"
            type="button"
            disabled={isDisabled}
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex items-center justify-center p-2 rounded-full transition-colors
              ${isUploading ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title="Dosya Yükle"
          >
            {isUploading ? <LoadingSpinner /> : <PaperclipIcon />}
          </button>
        </>
      )}

      {/* Text input */}
      <input data-allow-raw="true"
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        className={`
          flex-1 px-4 py-2 
          border border-gray-300 rounded-full
          text-sm text-gray-900 placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          transition-colors
        `}
        aria-label="Mesaj giriş alanı"
        autoComplete="off"
      />

      {/* Send button */}
      <button data-allow-raw="true"
        type="submit"
        disabled={!canSend}
        className={`
          flex items-center justify-center
          w-10 h-10 rounded-full
          transition-colors
          ${canSend
            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
          focus:outline-none
        `}
        aria-label={isLoading ? 'Gönderiliyor...' : 'Mesaj gönder'}
      >
        {isLoading ? <LoadingSpinner /> : <SendIcon />}
      </button>
    </form>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default ChatInput;
