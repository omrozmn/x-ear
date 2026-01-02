import { useEffect, useState } from 'react';

/**
 * Operations that require active internet connection and should not be queued offline
 */
export enum OfflineForbiddenOperation {
    REFUND = 'REFUND',
    DELETE_ACCOUNT = 'DELETE_ACCOUNT',
    DELETE_PATIENT = 'DELETE_PATIENT',
    CRITICAL_SETTINGS = 'CRITICAL_SETTINGS',
    FINANCIAL_TRANSACTION = 'FINANCIAL_TRANSACTION',
}

/**
 * User-friendly messages for each forbidden operation type
 */
const OPERATION_MESSAGES: Record<OfflineForbiddenOperation, string> = {
    [OfflineForbiddenOperation.REFUND]: 'Refunds require an active internet connection',
    [OfflineForbiddenOperation.DELETE_ACCOUNT]: 'Account deletion requires an active internet connection',
    [OfflineForbiddenOperation.DELETE_PATIENT]: 'Patient deletion requires an active internet connection',
    [OfflineForbiddenOperation.CRITICAL_SETTINGS]: 'This setting change requires an active internet connection',
    [OfflineForbiddenOperation.FINANCIAL_TRANSACTION]: 'Financial transactions require an active internet connection',
};

/**
 * Check if an operation type is allowed when offline
 */
export function isOperationAllowedOffline(operationType: OfflineForbiddenOperation): boolean {
    // All operations in the enum are forbidden offline
    return false;
}

/**
 * Get user-friendly message for why an operation is blocked
 */
export function getOfflineBlockMessage(operationType: OfflineForbiddenOperation): string {
    return OPERATION_MESSAGES[operationType] || 'This action requires an active internet connection';
}

/**
 * React hook to guard offline-forbidden operations
 * Returns whether the operation is allowed and a user-friendly message
 */
export function useOfflineGuard(operationType: OfflineForbiddenOperation | null) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!operationType) {
        return { isAllowed: true, isOnline, message: '' };
    }

    const isAllowed = isOnline; // Forbidden operations require online status
    const message = !isOnline ? getOfflineBlockMessage(operationType) : '';

    return { isAllowed, isOnline, message };
}
