import { useCallback, useEffect, useRef } from 'react';

interface HapticOptions {
    type?: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';
    duration?: number;
}

export const useHaptic = () => {
    const isSupported = useRef(typeof navigator !== 'undefined' && 'vibrate' in navigator);

    const patterns = {
        light: 10,
        medium: 20,
        heavy: 30,
        success: [10, 50, 10],
        error: [30, 50, 30, 50, 30],
        warning: [20, 50, 20]
    };

    const trigger = useCallback((options: HapticOptions = {}) => {
        if (!isSupported.current) return;

        const { type = 'light', duration } = options;
        const pattern = duration || patterns[type];

        try {
            navigator.vibrate(pattern);
        } catch (error) {
            console.warn('Haptic feedback failed:', error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // patterns is a static object defined outside the callback

    const triggerSelection = useCallback(() => trigger({ type: 'light' }), [trigger]);
    const triggerImpact = useCallback(() => trigger({ type: 'medium' }), [trigger]);
    const triggerNotification = useCallback((type: 'success' | 'error' | 'warning' = 'success') => {
        trigger({ type });
    }, [trigger]);

    return {
        trigger,
        triggerSelection,
        triggerImpact,
        triggerNotification,
        isSupported: isSupported.current
    };
};
