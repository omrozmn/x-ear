/**
 * AI Phase Helper Utilities
 * 
 * Shared logic for Phase A banner and state.
 */

/**
 * Default storage key for session-based dismissal
 */
export const PHASE_A_BANNER_STORAGE_KEY = 'ai-phase-a-banner-dismissed';

/**
 * Check if banner was dismissed in current session
 */
export function isDismissedInSession(storageKey: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
        return sessionStorage.getItem(storageKey) === 'true';
    } catch {
        return false;
    }
}

/**
 * Set banner dismissed state in session storage
 */
export function setDismissedInSession(storageKey: string, dismissed: boolean): void {
    if (typeof window === 'undefined') return;

    try {
        if (dismissed) {
            sessionStorage.setItem(storageKey, 'true');
        } else {
            sessionStorage.removeItem(storageKey);
        }
    } catch {
        // sessionStorage might not be available
    }
}

/**
 * Reset the banner dismissed state
 */
export function resetPhaseABannerDismissed(
    storageKey: string = PHASE_A_BANNER_STORAGE_KEY
): void {
    setDismissedInSession(storageKey, false);
}

/**
 * Check if Phase A banner should be visible
 */
export function shouldShowPhaseABanner(
    phase: string | null | undefined,
    storageKey: string = PHASE_A_BANNER_STORAGE_KEY
): boolean {
    if (!phase || phase !== 'A') return false;
    return !isDismissedInSession(storageKey);
}
