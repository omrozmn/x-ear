import { createContext } from 'react';

export interface ErrorOptions {
    title?: string;
    type?: 'error' | 'warning' | 'info' | 'success';
    duration?: number;
    persistent?: boolean;
    onRetry?: () => void;
    retryText?: string;
}

export interface ErrorNotification extends ErrorOptions {
    id: string;
    message: string;
    timestamp: Date;
}

export interface GlobalErrorContextType {
    showError: (error: unknown, options?: ErrorOptions) => void;
    showSuccess: (message: string, options?: Omit<ErrorOptions, 'type'>) => void;
    showWarning: (message: string, options?: Omit<ErrorOptions, 'type'>) => void;
    showInfo: (message: string, options?: Omit<ErrorOptions, 'type'>) => void;
    clearError: (id: string) => void;
    clearAllErrors: () => void;
}

export const GlobalErrorContext = createContext<GlobalErrorContextType | undefined>(undefined);
