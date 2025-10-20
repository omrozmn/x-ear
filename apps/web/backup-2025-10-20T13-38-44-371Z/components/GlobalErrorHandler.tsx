import React, { createContext, useContext, useCallback, useState } from 'react';
import { Toast } from './ErrorMessage';
import { getErrorMessage, isNetworkError, isUnauthorizedError } from '../hooks/useErrorHandler';

interface GlobalErrorContextType {
  showError: (error: unknown, options?: ErrorOptions) => void;
  showSuccess: (message: string, options?: Omit<ErrorOptions, 'type'>) => void;
  showWarning: (message: string, options?: Omit<ErrorOptions, 'type'>) => void;
  showInfo: (message: string, options?: Omit<ErrorOptions, 'type'>) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
}

interface ErrorOptions {
  title?: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  duration?: number; // Auto-dismiss after duration (ms), 0 = no auto-dismiss
  persistent?: boolean; // Don't auto-dismiss
  onRetry?: () => void;
  retryText?: string;
}

interface ErrorNotification extends ErrorOptions {
  id: string;
  message: string;
  timestamp: Date;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

export const useGlobalError = () => {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
};

export const GlobalErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  const generateId = () => `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addNotification = useCallback((
    message: string,
    options: ErrorOptions = {}
  ) => {
    const id = generateId();
    const notification: ErrorNotification = {
      id,
      message,
      timestamp: new Date(),
      type: 'error',
      duration: 5000, // Default 5 seconds
      ...options
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss if duration is set and not persistent
    if (notification.duration && notification.duration > 0 && !notification.persistent) {
      setTimeout(() => {
        clearError(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const showError = useCallback((error: unknown, options: ErrorOptions = {}) => {
    let message = getErrorMessage(error);
    let title = options.title;

    // Customize based on error type
    if (isNetworkError(error)) {
      title = title || 'Bağlantı Hatası';
      message = 'Sunucuya bağlanırken bir hata oluştu. İnternet bağlantınızı kontrol edin.';
    } else if (isUnauthorizedError(error)) {
      title = title || 'Yetkilendirme Hatası';
      message = 'Bu işlem için yetkiniz bulunmuyor. Lütfen tekrar giriş yapın.';
    }

    addNotification(message, {
      ...options,
      type: 'error',
      title
    });
  }, [addNotification]);

  const showSuccess = useCallback((message: string, options: Omit<ErrorOptions, 'type'> = {}) => {
    addNotification(message, {
      ...options,
      type: 'success',
      duration: options.duration || 3000 // Shorter duration for success
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string, options: Omit<ErrorOptions, 'type'> = {}) => {
    addNotification(message, {
      ...options,
      type: 'warning'
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string, options: Omit<ErrorOptions, 'type'> = {}) => {
    addNotification(message, {
      ...options,
      type: 'info'
    });
  }, [addNotification]);

  const clearError = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setNotifications([]);
  }, []);

  const contextValue: GlobalErrorContextType = {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    clearError,
    clearAllErrors
  };

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      {children}
      
      {/* Render notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            title={notification.title}
            message={notification.message}
            type={notification.type}
            dismissible={true}
            onDismiss={() => clearError(notification.id)}
            onRetry={notification.onRetry}
            retryText={notification.retryText}
            position="top-right"
            className="animate-in slide-in-from-right-full duration-300"
          />
        ))}
      </div>
    </GlobalErrorContext.Provider>
  );
};

// HOC for wrapping components with error handling
export const withErrorHandling = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => {
    const { showError } = useGlobalError();

    // Add error boundary-like behavior
    React.useEffect(() => {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        showError(event.reason, {
          title: 'Beklenmeyen Hata',
          persistent: true
        });
      };

      const handleError = (event: ErrorEvent) => {
        showError(event.error, {
          title: 'JavaScript Hatası',
          persistent: true
        });
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleError);

      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleError);
      };
    }, [showError]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withErrorHandling(${Component.displayName || Component.name})`;
  return WrappedComponent;
};