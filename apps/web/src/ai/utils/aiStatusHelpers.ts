/**
 * AI Status Helper Utilities
 * 
 * Logic for deriving status levels and labels from AIStatus data.
 */

import type { AIStatus } from '../types/ai.types';

/**
 * Status type derived from AIStatus
 */
export type AIStatusType = 'available' | 'degraded' | 'unavailable' | 'unknown';

/**
 * Status labels in Turkish
 */
export const STATUS_LABELS: Record<AIStatusType, string> = {
    available: 'Aktif',
    degraded: 'Kısıtlı',
    unavailable: 'Devre Dışı',
    unknown: 'Bilinmiyor',
};

/**
 * Determine the status type from AIStatus data
 */
export function getStatusType(status: AIStatus | null | undefined): AIStatusType {
    // No status data
    if (!status) {
        return 'unknown';
    }

    // AI is disabled by configuration
    if (!status.enabled) {
        return 'unavailable';
    }

    // Kill switch is active
    if (status.killSwitch?.globalActive || status.killSwitch?.tenantActive) {
        return 'unavailable';
    }

    // AI is fully available
    if (status.available) {
        return 'available';
    }

    // Check for degraded conditions
    const hasDegradedConditions =
        status.usage?.anyQuotaExceeded ||
        (status.killSwitch?.capabilitiesDisabled?.length || 0) > 0 ||
        !status.model?.available;

    if (hasDegradedConditions) {
        return 'degraded';
    }

    // Default to unavailable if not available
    return 'unavailable';
}

/**
 * Get detailed status label based on specific conditions
 */
export function getDetailedStatusLabel(status: AIStatus | null | undefined): string {
    if (!status) {
        return STATUS_LABELS.unknown;
    }

    if (!status.enabled) {
        return 'Devre Dışı';
    }

    if (status.killSwitch?.globalActive) {
        return 'Durduruldu';
    }

    if (status.killSwitch?.tenantActive) {
        return 'Tenant Durduruldu';
    }

    if (status.available) {
        return 'Aktif';
    }

    if (status.usage?.anyQuotaExceeded) {
        return 'Limit Aşıldı';
    }

    if ((status.killSwitch?.capabilitiesDisabled?.length || 0) > 0) {
        return 'Kısıtlı';
    }

    if (!status.model?.available) {
        return 'Model Kullanılamıyor';
    }

    return 'Kullanılamıyor';
}
