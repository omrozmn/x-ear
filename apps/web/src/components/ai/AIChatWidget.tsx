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
  isExpanded?: boolean;
}

const MessageContent: React.FC<{ message: Message; onToggleExpand: () => void }> = ({ message, onToggleExpand }) => {
  const isLong = message.content.length > 500;
  const shouldTruncate = isLong && !message.isExpanded;
  const displayContent = shouldTruncate ? message.content.slice(0, 500) + '...' : message.content;

  return (
    <>
      <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
        message.role === 'user' ? 'text-white font-medium' : 'text-gray-900'
      }`}>
        {displayContent}
      </p>
      {isLong && (
        <button
          onClick={onToggleExpand}
          className={`text-xs mt-2 underline ${
            message.role === 'user' ? 'text-primary-100' : 'text-primary-600'
          } hover:no-underline`}
        >
          {message.isExpanded ? 'Daha az göster' : 'Devamını oku'}
        </button>
      )}
    </>
  );
};

export const AIChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]); // Also scroll when loading state changes

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('İnternet bağlantısı yeniden kuruldu', { duration: 2000 });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('İnternet bağlantısı kesildi', { duration: 4000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleExpand = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isExpanded: !msg.isExpanded } : msg
    ));
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    
    // Check network status
    if (!isOnline) {
      toast.error('İnternet bağlantınızı kontrol edin', {
        duration: 3000,
      });
      return;
    }
    
    // Validation (removed isLoading check - allow sending while thinking)
    if (!trimmedInput) return;
    
    if (trimmedInput.length > 2000) {
      toast.error('Mesajınız çok uzun. Lütfen 2000 karakterden kısa bir mesaj gönderin.', {
        duration: 4000,
      });
      return;
    }
    
    if (trimmedInput.length < 2) {
      toast.error('Lütfen en az 2 karakter girin.', {
        duration: 3000,
      });
      return;
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmedInput,
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

      // Handle empty or invalid response
      if (!response || (!response.response && !response.clarificationQuestion)) {
        throw new Error('Boş yanıt alındı');
      }

      const assistantMessage: Message = {
        id: response.requestId || `msg_${Date.now()}`,
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
      
      let errorMessage = 'AI ile iletişim kurulamadı';
      let userFriendlyMessage = 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen birkaç saniye sonra tekrar deneyin.';
      
      // Handle specific error cases
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'İstek zaman aşımına uğradı';
        userFriendlyMessage = 'Yanıt vermem biraz uzun sürdü. Lütfen tekrar deneyin, bu sefer daha hızlı olacak.';
      } else if (error.response?.status === 404) {
        errorMessage = 'AI servisi bulunamadı';
        userFriendlyMessage = 'AI servisi şu anda kullanılamıyor. Lütfen sistem yöneticinize bildirin.';
      } else if (error.response?.status === 503) {
        errorMessage = 'AI servisi geçici olarak kullanılamıyor';
        userFriendlyMessage = 'AI servisi şu anda yoğun. Lütfen birkaç saniye sonra tekrar deneyin.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Çok fazla istek gönderildi';
        userFriendlyMessage = 'Çok hızlı mesaj gönderiyorsunuz. Lütfen birkaç saniye bekleyin.';
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
        userFriendlyMessage = `Üzgünüm: ${errorMessage}`;
      }
      
      // Show user-friendly toast
      toast.error(userFriendlyMessage, {
        duration: 5000,
        position: 'top-center',
      });
      
      // Add error message to chat (less technical)
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: userFriendlyMessage,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        aria-hidden="true"
      />
      
      {/* Chat Panel - Smaller size, safe distance from header */}
      <div 
        className="fixed z-50 bg-white shadow-2xl flex flex-col 
                    inset-x-4 bottom-4 top-20 
                    md:inset-auto md:right-6 md:bottom-6 md:top-24 md:w-[400px] md:h-[600px] md:max-h-[calc(100vh-120px)]
                    rounded-2xl overflow-hidden"
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
            className="p-2 hover:bg-primary-800 rounded-lg transition-colors flex-shrink-0"
            aria-label="Kapat"
            type="button"
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
                    ? 'bg-blue-600 text-white rounded-br-sm shadow-md'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-sm'
                }`}
              >
                <MessageContent message={message} onToggleExpand={() => handleToggleExpand(message.id)} />
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
              <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></span>
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }}></span>
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          {!isOnline && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>İnternet bağlantısı yok. Mesaj gönderemezsiniz.</span>
            </div>
          )}
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mesajınızı yazın..."
                disabled={isLoading}
                maxLength={2000}
                rows={1}
                className="w-full resize-none border border-gray-300 rounded-xl px-4 py-3 pr-16 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ maxHeight: '120px', minHeight: '48px' }}
              />
              {input.length > 0 && (
                <div className={`absolute right-3 bottom-3 text-xs ${
                  input.length > 1800 ? 'text-red-500 font-semibold' : 
                  input.length > 1500 ? 'text-orange-500' : 
                  'text-gray-400'
                }`}>
                  {input.length}/2000
                </div>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isOnline}
              className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg disabled:shadow-none"
              aria-label="Gönder"
              title={!isOnline ? 'İnternet bağlantısı yok' : 'Gönder'}
            >
              {isLoading ? (
                <div className="flex space-x-0.5">
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></span>
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }}></span>
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }}></span>
                </div>
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
