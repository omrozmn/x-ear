/**
 * AI Chat Widget Component
 * 
 * Floating chat widget for AI assistance
 * - Minimizable/expandable
 * - Session-based conversation
 * - Error handling with Turkish messages
 */

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Minimize2, AlertCircle } from 'lucide-react';
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        className="fixed bottom-6 right-6 p-4 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-110 z-50"
        aria-label="AI Asistan"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 transition-all ${
        isMinimized ? 'w-80 h-14' : 'w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <h3 className="font-semibold">AI Asistan</h3>
          <span className="text-xs bg-primary-700 px-2 py-0.5 rounded-full">Beta</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-primary-700 rounded transition-colors"
            aria-label={isMinimized ? 'Genişlet' : 'Küçült'}
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-primary-700 rounded transition-colors"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(600px-140px)]">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Merhaba! Size nasıl yardımcı olabilirim?</p>
                <p className="text-xs mt-2 text-gray-400">
                  Hasta bilgileri, randevular, satışlar hakkında sorular sorabilirsiniz.
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.intent && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs opacity-75">
                      <span>Intent: {message.intent.intentType}</span>
                      <span className="ml-2">({Math.round(message.intent.confidence * 100)}%)</span>
                    </div>
                  )}
                  <p className="text-xs mt-1 opacity-75">
                    {message.timestamp.toLocaleTimeString('tr-TR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-end space-x-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mesajınızı yazın..."
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ maxHeight: '100px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Gönder"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              AI yanıtları doğrulanmalıdır
            </p>
          </div>
        </>
      )}
    </div>
  );
};
