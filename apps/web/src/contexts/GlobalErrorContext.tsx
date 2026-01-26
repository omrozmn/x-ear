import React, { createContext, useCallback, useState } from 'react';
import { getErrorMessage, isNetworkError, isUnauthorizedError } from '../hooks/useErrorHandler';
import { Toast } from '../components/ErrorMessage'; // Adjust path if needed

// Context Types
export interface GlobalErrorContextType {
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

export const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);

// Provider IS a component, so it can be exported from here, but since hooks are also exported, 
// strictly speaking it's mixed. But separating Provider + Context + Hook in one file is common pattern.
// If HMR complains, we might need to separate Provider to component file.
// But context definition usually goes with hook.
// Let's try putting both here first. If "Fast Refresh only works when a file only exports components", 
// then `useGlobalError` export will trigger warning.
// Strategy: Export useGlobalError from a separate hooks file if possible, or 
// keep Context+Hook in `contexts/GlobalErrorContext.tsx` and Provider in `components/GlobalErrorProvider.tsx`.

// Let's create JUST the Context and Hook here for now, but Provider needs state.
// If Provider has state, it's a component.
// So `contexts/GlobalErrorContext.tsx` will have `GlobalErrorProvider` (Component).
// And `useGlobalError` (Hook).
// This WILL trigger the warning if the file is treated as a component file.
// BUT, usually `use*` exports are allowed alongside components.
// The warnings in GlobalErrorHandler.tsx were likely because of `withErrorHandling` (HOC) or incorrect detection.
// Let's try to put Context + Provider + Hook here.

export const GlobalErrorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

    const generateId = () => `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const clearError = useCallback((id: string) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

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
            duration: 5000,
            ...options
        };

        setNotifications(prev => [...prev, notification]);

        if (notification.duration && notification.duration > 0 && !notification.persistent) {
            setTimeout(() => {
                clearError(id);
            }, notification.duration);
        }

        return id;
    }, [clearError]);

    const showError = useCallback((error: unknown, options: ErrorOptions = {}) => {
        let message = getErrorMessage(error);
        let title = options.title;

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
            duration: options.duration || 3000
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
