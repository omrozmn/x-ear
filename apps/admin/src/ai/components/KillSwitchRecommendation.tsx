/**
 * KillSwitchRecommendation Component
 * 
 * Displays a recommendation banner when high-severity alerts are detected.
 * Provides one-click kill switch activation and auto-acknowledges related alerts.
 * 
 * @module ai-admin/components/KillSwitchRecommendation
 * @requirements Requirement 16: Alert-to-Kill-Switch Recommendation
 */

import React, { useState, useCallback } from 'react';
import { useAIAlerts } from '../hooks/useAIMetrics';
import { useKillSwitch } from '../hooks/useKillSwitch';
import type {
  KillSwitchRecommendationProps,
  AIAlert,
  AlertSeverity,
} from '../types/ai-admin.types';
import {
  AlertTriangle,
  ShieldAlert,
  Power,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// =============================================================================
// Constants
// =============================================================================

/** Severity levels that trigger the recommendation banner */
const HIGH_SEVERITY_LEVELS: AlertSeverity[] = ['error', 'critical'];

/** Maximum number of alerts to display in the summary */
const MAX_DISPLAYED_ALERTS = 3;

/** Severity display configuration */
const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bgColor: string }> = {
  info: { label: 'Bilgi', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  warning: { label: 'Uyarı', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  error: { label: 'Hata', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  critical: { label: 'Kritik', color: 'text-red-700', bgColor: 'bg-red-100' },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if an alert severity is considered high (error or critical)
 */
function isHighSeverity(severity: AlertSeverity): boolean {
  return HIGH_SEVERITY_LEVELS.includes(severity);
}

/**
 * Filters alerts to only include high-severity unacknowledged alerts
 */
function getHighSeverityAlerts(alerts: AIAlert[]): AIAlert[] {
  return alerts.filter(
    (alert) => !alert.acknowledged && isHighSeverity(alert.severity)
  );
}

/**
 * Generates a kill switch reason from the critical alerts
 */
function generateKillSwitchReason(alerts: AIAlert[]): string {
  const alertSummaries = alerts
    .slice(0, MAX_DISPLAYED_ALERTS)
    .map((a) => a.message)
    .join('; ');
  
  const suffix = alerts.length > MAX_DISPLAYED_ALERTS 
    ? ` (+${alerts.length - MAX_DISPLAYED_ALERTS} more alerts)` 
    : '';
  
  return `Auto-suggested due to ${alerts.length} high-severity alert(s): ${alertSummaries}${suffix}`;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Alert Item Component - Displays a single alert in the summary
 */
interface AlertItemProps {
  alert: AIAlert;
}

function AlertItem({ alert }: AlertItemProps) {
  const config = SEVERITY_CONFIG[alert.severity];
  
  return (
    <li className="flex items-start space-x-2 py-1">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
        {config.label}
      </span>
      <span className="text-sm text-gray-700 flex-1">{alert.message}</span>
      <span className="text-xs text-gray-400 flex items-center">
        <Clock size={10} className="mr-1" />
        {new Date(alert.created_at).toLocaleTimeString('tr-TR')}
      </span>
    </li>
  );
}

/**
 * Alert Summary Component - Displays the list of critical alerts
 */
interface AlertSummaryProps {
  alerts: AIAlert[];
  expanded: boolean;
  onToggle: () => void;
}

function AlertSummary({ alerts, expanded, onToggle }: AlertSummaryProps) {
  const displayedAlerts = expanded ? alerts : alerts.slice(0, MAX_DISPLAYED_ALERTS);
  const hasMore = alerts.length > MAX_DISPLAYED_ALERTS;
  
  return (
    <div className="mt-3">
      <ul className="space-y-1">
        {displayedAlerts.map((alert) => (
          <AlertItem key={alert.alert_id} alert={alert} />
        ))}
      </ul>
      
      {hasMore && (
        <button
          onClick={onToggle}
          className="mt-2 text-sm text-red-600 hover:text-red-800 flex items-center"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} className="mr-1" />
              Daha az göster
            </>
          ) : (
            <>
              <ChevronDown size={14} className="mr-1" />
              {alerts.length - MAX_DISPLAYED_ALERTS} alert daha göster
            </>
          )}
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * KillSwitchRecommendation - Alert-based kill switch recommendation banner
 * 
 * Displays when high-severity (error/critical) alerts are detected.
 * Provides:
 * - Summary of critical alerts
 * - One-click kill switch activation
 * - Auto-acknowledgment of related alerts on activation
 * 
 * @example
 * ```tsx
 * // In AIMetricsDashboard or admin dashboard
 * <KillSwitchRecommendation onActivate={() => console.log('Kill switch activated')} />
 * ```
 */
export function KillSwitchRecommendation({
  className = '',
  onActivate,
}: KillSwitchRecommendationProps) {
  // State
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  
  // Hooks
  const { alerts, acknowledge, isAcknowledging } = useAIAlerts();
  const { activateGlobal, status, isLoading: isKillSwitchLoading } = useKillSwitch();
  
  // Filter to high-severity unacknowledged alerts
  const criticalAlerts = getHighSeverityAlerts(alerts);
  
  // Don't render if:
  // - No critical alerts
  // - Banner is dismissed
  // - Global kill switch is already active
  if (
    criticalAlerts.length === 0 ||
    isDismissed ||
    status?.global_switch.active
  ) {
    return null;
  }
  
  // Count by severity
  const criticalCount = criticalAlerts.filter((a) => a.severity === 'critical').length;
  const errorCount = criticalAlerts.filter((a) => a.severity === 'error').length;
  
  /**
   * Handles kill switch activation with auto-acknowledgment
   */
  const handleActivateKillSwitch = useCallback(async () => {
    setIsActivating(true);
    
    try {
      // Generate reason from alerts
      const reason = generateKillSwitchReason(criticalAlerts);
      
      // Activate global kill switch
      await activateGlobal(reason);
      
      // Auto-acknowledge all related alerts
      const acknowledgePromises = criticalAlerts.map((alert) =>
        acknowledge(alert.alert_id, 'Auto-acknowledged on kill switch activation')
          .catch((err) => {
            console.error(`Failed to acknowledge alert ${alert.alert_id}:`, err);
          })
      );
      
      await Promise.allSettled(acknowledgePromises);
      
      toast.success('Global kill switch aktive edildi ve ilgili alertler onaylandı');
      
      // Call optional callback
      onActivate?.();
      
      // Dismiss the banner
      setIsDismissed(true);
    } catch (error) {
      console.error('Failed to activate kill switch:', error);
      toast.error('Kill switch aktivasyonu başarısız oldu');
    } finally {
      setIsActivating(false);
    }
  }, [criticalAlerts, activateGlobal, acknowledge, onActivate]);
  
  /**
   * Handles banner dismissal
   */
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);
  
  /**
   * Toggles alert list expansion
   */
  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);
  
  const isLoading = isActivating || isKillSwitchLoading || isAcknowledging;
  
  return (
    <div
      className={`
        bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 shadow-sm
        ${className}
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 p-2 bg-red-100 rounded-lg">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Kill Switch Önerisi
            </h3>
            <p className="mt-1 text-sm text-red-700">
              {criticalAlerts.length} yüksek öncelikli alert tespit edildi
              {criticalCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-200 text-red-800">
                  {criticalCount} kritik
                </span>
              )}
              {errorCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-200 text-orange-800">
                  {errorCount} hata
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          aria-label="Kapat"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Alert Summary */}
      <AlertSummary
        alerts={criticalAlerts}
        expanded={isExpanded}
        onToggle={handleToggleExpand}
      />
      
      {/* Action Buttons */}
      <div className="mt-4 flex items-center space-x-3">
        <button
          onClick={handleActivateKillSwitch}
          disabled={isLoading}
          className={`
            inline-flex items-center px-4 py-2 text-sm font-medium text-white
            bg-red-600 border border-transparent rounded-md shadow-sm
            hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2
            focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              İşleniyor...
            </>
          ) : (
            <>
              <Power size={16} className="mr-2" />
              Global Kill Switch Aktive Et
            </>
          )}
        </button>
        
        <span className="text-xs text-red-600 flex items-center">
          <AlertCircle size={12} className="mr-1" />
          Bu işlem tüm AI özelliklerini devre dışı bırakacaktır
        </span>
      </div>
      
      {/* Info Note */}
      <p className="mt-3 text-xs text-red-500">
        Not: Kill switch aktive edildiğinde, ilgili alertler otomatik olarak onaylanacaktır.
      </p>
    </div>
  );
}

export default KillSwitchRecommendation;
