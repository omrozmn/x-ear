import { renderHook, act } from '@testing-library/react';
import { useOfflineGuard, OfflineForbiddenOperation, isOperationAllowedOffline, getOfflineBlockMessage } from '../offlineGuard';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('offlineGuard', () => {
    describe('isOperationAllowedOffline', () => {
        it('should return false for all forbidden operations', () => {
            Object.values(OfflineForbiddenOperation).forEach(operation => {
                expect(isOperationAllowedOffline(operation)).toBe(false);
            });
        });
    });

    describe('getOfflineBlockMessage', () => {
        it('should return appropriate message for REFUND operation', () => {
            const message = getOfflineBlockMessage(OfflineForbiddenOperation.REFUND);
            expect(message).toContain('Refunds require an active internet connection');
        });

        it('should return appropriate message for DELETE_ACCOUNT operation', () => {
            const message = getOfflineBlockMessage(OfflineForbiddenOperation.DELETE_ACCOUNT);
            expect(message).toContain('Account deletion requires an active internet connection');
        });

        it('should return appropriate message for DELETE_PARTY operation', () => {
            const message = getOfflineBlockMessage(OfflineForbiddenOperation.DELETE_PARTY);
            expect(message).toContain('Party deletion requires an active internet connection');
        });
    });

    describe('useOfflineGuard hook', () => {
        let onlineListeners: EventListener[] = [];
        let offlineListeners: EventListener[] = [];

        beforeEach(() => {
            onlineListeners = [];
            offlineListeners = [];

            // Mock navigator.onLine
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            // Mock window.addEventListener
            global.window.addEventListener = vi.fn((event: string, callback: EventListenerOrEventListenerObject) => {
                const handler = typeof callback === 'function' ? callback : callback.handleEvent.bind(callback);
                if (event === 'online') onlineListeners.push(handler);
                if (event === 'offline') offlineListeners.push(handler);
            }) as typeof window.addEventListener;

            global.window.removeEventListener = vi.fn((event: string, callback: EventListenerOrEventListenerObject) => {
                const handler = typeof callback === 'function' ? callback : callback.handleEvent.bind(callback);
                if (event === 'online') {
                    onlineListeners = onlineListeners.filter(cb => cb !== handler);
                }
                if (event === 'offline') {
                    offlineListeners = offlineListeners.filter(cb => cb !== handler);
                }
            }) as typeof window.removeEventListener;
        });

        it('should return isAllowed=true when online and no operation specified', () => {
            const { result } = renderHook(() => useOfflineGuard(null));
            expect(result.current.isAllowed).toBe(true);
            expect(result.current.isOnline).toBe(true);
            expect(result.current.message).toBe('');
        });

        it('should return isAllowed=true when online with forbidden operation', () => {
            const { result } = renderHook(() => useOfflineGuard(OfflineForbiddenOperation.REFUND));
            expect(result.current.isAllowed).toBe(true);
            expect(result.current.isOnline).toBe(true);
            expect(result.current.message).toBe('');
        });

        it('should return isAllowed=false when offline with forbidden operation', () => {
            // Set offline
            Object.defineProperty(navigator, 'onLine', { writable: true, value: false });

            const { result } = renderHook(() => useOfflineGuard(OfflineForbiddenOperation.REFUND));
            expect(result.current.isAllowed).toBe(false);
            expect(result.current.isOnline).toBe(false);
            expect(result.current.message).toContain('Refunds require an active internet connection');
        });

        it('should update when connection status changes from online to offline', () => {
            const { result } = renderHook(() => useOfflineGuard(OfflineForbiddenOperation.DELETE_PARTY));

            // Initially online
            expect(result.current.isAllowed).toBe(true);
            expect(result.current.isOnline).toBe(true);

            // Simulate offline event
            act(() => {
                Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
                offlineListeners.forEach(listener => listener(new Event('offline')));
            });

            expect(result.current.isAllowed).toBe(false);
            expect(result.current.isOnline).toBe(false);
            expect(result.current.message).toContain('Party deletion requires an active internet connection');
        });

        it('should update when connection status changes from offline to online', () => {
            // Start offline
            Object.defineProperty(navigator, 'onLine', { writable: true, value: false });

            const { result } = renderHook(() => useOfflineGuard(OfflineForbiddenOperation.FINANCIAL_TRANSACTION));

            // Initially offline
            expect(result.current.isAllowed).toBe(false);

            // Simulate online event
            act(() => {
                Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
                onlineListeners.forEach(listener => listener(new Event('online')));
            });

            expect(result.current.isAllowed).toBe(true);
            expect(result.current.isOnline).toBe(true);
            expect(result.current.message).toBe('');
        });

        it('should cleanup event listeners on unmount', () => {
            const { unmount } = renderHook(() => useOfflineGuard(OfflineForbiddenOperation.REFUND));

            const listenerCountBefore = onlineListeners.length + offlineListeners.length;
            expect(listenerCountBefore).toBeGreaterThan(0);

            unmount();

            expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
            expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
        });
    });
});
