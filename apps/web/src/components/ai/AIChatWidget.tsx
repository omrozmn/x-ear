/**
 * AI Chat Widget Component - Modern & Mobile Responsive
 * 
 * Floating chat widget for AI assistance
 * - Modern design with right-side panel
 * - Mobile responsive (full screen on mobile)
 * - Session-based conversation
 * - Error handling with Turkish messages
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, AlertCircle } from 'lucide-react';
import { sendChatMessage, type ChatResponse } from '@/api/client/ai.client';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: ChatResponse['intent'];
}

export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        prompt: userMessage.content,
        sessionId,
        context: {
          conversationHistory: messages.slice(-5).map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      const assistantMessage: Message = {
        id: response.requestId,
        role: 'assistant',
        content: response.response || response.clarificationQuestion || 'Anlayamadım, lütfen tekrar deneyin.',
        timestamp: new Date(),
        intent: response.intent,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show warnings if PII/PHI detected
      if (response.piiDetected || response.phiDetected) {
        toast('Hassas bilgiler tespit edildi ve maskelendi', { icon: '🔒' });
      }
    } catch (error: any) {
      console.error('AI chat error:', error);
      
      const errorMessage = error.response?.data?.error?.message || 
                          error.message || 
                          'AI ile iletişim kurulamadı';
      
      toast.error(errorMessage);
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Üzgünüm, bir hata oluştu: ${errorMessage}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-5 bg-primary-600 text-white rounded-full shadow-2xl hover:bg-primary-700 transition-all hover:scale-110 z-50 group"
        aria-label="AI Asistan"
      >
        <MessageCircle className="h-8 w-8" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
        </span>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Chat Panel */}
      <div 
        className={`
          fixed z-50 bg-white shadow-2xl
          md:right-0 md:top-0 md:bottom-0 md:w-[420px] md:rounded-none
          inset-0 md:inset-auto
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <MessageCircle className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI Asistan</h3>
              <p className="text-xs text-primary-100">Size nasıl yardımcı olabilirim?</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-primary-800 rounded-lg transition-colors"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="bg-white rounded-2xl p-8 shadow-sm max-w-sm">
                <div className="bg-primary-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-primary-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Merhaba! 👋</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Size nasıl yardımcı olabilirim?
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Hasta bilgileri</p>
                  <p>• Randevu yönetimi</p>
                  <p>• Satış raporları</p>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-sm'
                }`}
              >
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user' ? 'text-white' : 'text-gray-900'
                }`}>
                  {message.content}
                </p>
                {message.intent && (
                  <div className={`mt-2 pt-2 border-t ${
                    message.role === 'user' ? 'border-primary-500' : 'border-gray-200'
                  } text-xs flex items-center gap-2`}>
                    <span className="opacity-75">Intent: {message.intent.intentType}</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      message.role === 'user' ? 'bg-primary-700' : 'bg-gray-100'
                    }`}>
                      {Math.round(message.intent.confidence * 100)}%
                    </span>
                  </div>
                )}
                <p className={`text-xs mt-1.5 ${
                  message.role === 'user' ? 'text-primary-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('tr-TR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                  <span className="text-sm text-gray-600">Düşünüyorum...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mesajınızı yazın..."
                disabled={isLoading}
                rows={1}
                className="w-full resize-none border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ maxHeight: '120px', minHeight: '48px' }}
              />
              <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                {input.length > 0 && `${input.length}/500`}
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg disabled:shadow-none"
              aria-label="Gönder"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            AI yanıtları doğrulanmalıdır
          </p>
        </div>
      </div>
    </>
  );
};
