/**
 * AI Availability Utility
 * 
 * Shared logic for checking AI availability and determining reasons.
 */

import { isCapabilityAvailable, canUserAccessCapability, AI_CAPABILITIES } from '../config/capabilities';
import type { AICapability, AIRole, AIStatus } from '../types/ai.types';

/**
 * Reason why AI feature is unavailable
 */
export type AIUnavailableReason =
    | 'loading'
    | 'disabled'
    | 'kill_switch'
    | 'quota_exceeded'
    | 'phase_blocked'
    | 'role_blocked'
    | 'capability_disabled'
    | 'not_authenticated'
    | 'error'
    | 'unknown';

/**
 * Result of AI availability check
 */
export interface AIAvailabilityResult {
    available: boolean;
    reason: AIUnavailableReason;
    message: string;
}

/**
 * Turkish messages for unavailability reasons
 */
export const UNAVAILABLE_MESSAGES: Record<AIUnavailableReason, string> = {
    loading: 'AI durumu kontrol ediliyor...',
    disabled: 'AI şu anda devre dışı.',
    kill_switch: 'AI geçici olarak durduruldu.',
    quota_exceeded: 'Günlük AI limitinize ulaştınız.',
    phase_blocked: 'Bu özellik mevcut AI fazında desteklenmiyor.',
    role_blocked: 'Bu özelliğe erişim yetkiniz yok.',
    capability_disabled: 'Bu AI özelliği şu anda kullanılamıyor.',
    not_authenticated: 'Bu özelliği kullanmak için giriş yapmalısınız.',
    error: 'AI durumu kontrol edilirken bir hata oluştu.',
    unknown: 'AI şu anda kullanılamıyor.',
};

/**
 * Check AI availability and determine the reason if unavailable
 */
export function checkAIAvailability(
    status: AIStatus | undefined,
    isLoading: boolean,
    isError: boolean,
    capability?: AICapability,
    userRole?: AIRole | null,
    isAuthenticated?: boolean,
    hasPartyContext?: boolean,
    requirePartyContext?: boolean
): AIAvailabilityResult {
    // Check loading state
    if (isLoading) {
        return {
            available: false,
            reason: 'loading',
            message: UNAVAILABLE_MESSAGES.loading,
        };
    }

    // Check error state
    if (isError) {
        return {
            available: false,
            reason: 'error',
            message: UNAVAILABLE_MESSAGES.error,
        };
    }

    // Check authentication
    if (isAuthenticated === false) {
        return {
            available: false,
            reason: 'not_authenticated',
            message: UNAVAILABLE_MESSAGES.not_authenticated,
        };
    }

    // Check if status is available
    if (!status) {
        return {
            available: false,
            reason: 'unknown',
            message: UNAVAILABLE_MESSAGES.unknown,
        };
    }

    // Check if AI is enabled
    if (!status?.enabled) {
        return {
            available: false,
            reason: 'disabled',
            message: UNAVAILABLE_MESSAGES.disabled,
        };
    }

    // Check kill switch
    if (status.killSwitch?.globalActive || status.killSwitch?.tenantActive) {
        return {
            available: false,
            reason: 'kill_switch',
            message: status.killSwitch?.reason || UNAVAILABLE_MESSAGES.kill_switch,
        };
    }

    // Check quota
    if (status.usage?.anyQuotaExceeded) {
        return {
            available: false,
            reason: 'quota_exceeded',
            message: UNAVAILABLE_MESSAGES.quota_exceeded,
        };
    }

    // If capability is specified, perform capability-specific checks
    if (capability) {
        // Check if capability is disabled by kill switch
        if (status.killSwitch?.capabilitiesDisabled?.includes(capability)) {
            return {
                available: false,
                reason: 'capability_disabled',
                message: UNAVAILABLE_MESSAGES.capability_disabled,
            };
        }

        // Check role-based access (frontend hint)
        if (userRole && !canUserAccessCapability(capability, userRole)) {
            return {
                available: false,
                reason: 'role_blocked',
                message: UNAVAILABLE_MESSAGES.role_blocked,
            };
        }

        // Check phase requirement
        const currentPhase = status.phase?.currentPhase || 'A';
        const capabilityConfig = AI_CAPABILITIES[capability];

        if (capabilityConfig) {
            const phaseOrder = { A: 1, B: 2, C: 3 };
            if (phaseOrder[currentPhase as 'A' | 'B' | 'C'] < phaseOrder[capabilityConfig.minPhase as 'A' | 'B' | 'C']) {
                return {
                    available: false,
                    reason: 'phase_blocked',
                    message: UNAVAILABLE_MESSAGES.phase_blocked,
                };
            }
        }

        // Full capability check
        if (!isCapabilityAvailable(
            capability,
            currentPhase,
            status.killSwitch?.capabilitiesDisabled || [],
            userRole || undefined
        )) {
            return {
                available: false,
                reason: 'capability_disabled',
                message: UNAVAILABLE_MESSAGES.capability_disabled,
            };
        }
    }

    // Check party context if required
    if (requirePartyContext && !hasPartyContext) {
        return {
            available: false,
            reason: 'not_authenticated',
            message: 'Bu özellik için hasta/müşteri seçimi gereklidir.',
        };
    }

    // Check general availability
    if (!status?.available) {
        return {
            available: false,
            reason: 'unknown',
            message: UNAVAILABLE_MESSAGES.unknown,
        };
    }

    // All checks passed
    return {
        available: true,
        reason: 'unknown', // Not used when available
        message: '',
    };
}

/**
 * Get the unavailability message for a given reason
 */
export function getUnavailableMessage(reason: AIUnavailableReason): string {
    return UNAVAILABLE_MESSAGES[reason] || UNAVAILABLE_MESSAGES.unknown;
}
