/**
 * AIMetricsDashboard Component
 * 
 * Admin dashboard for visualizing AI SLA metrics including latency percentiles,
 * error/timeout rates, approval metrics, and alerts with acknowledgment.
 * 
 * @module ai-admin/components/AIMetricsDashboard
 * @requirements Requirement 6: Admin AI Metrics Dashboard, Requirement 16: Alert-to-Kill-Switch Recommendation
 */

import React, { useState, useCallback } from 'react';
import { useAIMetrics, useAIAlerts } from '../../hooks/useAIMetrics';
import { KillSwitchRecommendation } from '../KillSwitchRecommendation';
import type {
  AIMetricsDashboardProps,
  AIAlert,
  AlertSeverity,
  LatencyMetrics,
  ErrorMetrics,
  ApprovalMetrics,
} from '../../types/ai-admin.types';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Gauge,
  Percent,
  Users,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

// =============================================================================
// Constants
// =============================================================================

/** Available time window options in minutes */
const TIME_WINDOW_OPTIONS = [
  { value: 15, label: '15 dakika' },
  { value: 60, label: '1 saat' },
  { value: 1440, label: '24 saat' },
] as const;

/** Severity display configuration */
const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bgColor: string; borderColor: string }> = {
  info: { label: 'Bilgi', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  warning: { label: 'Uyarı', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  error: { label: 'Hata', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  critical: { label: 'Kritik', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
};

/** Latency thresholds for color coding (in ms) */
const LATENCY_THRESHOLDS = {
  good: 500,
  warning: 1000,
  critical: 2000,
};

/** Rate thresholds for color coding (0-1) */
const RATE_THRESHOLDS = {
  good: 0.01,
  warning: 0.05,
  critical: 0.1,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets color class based on latency value
 */
function getLatencyColor(value: number): string {
  if (value <= LATENCY_THRESHOLDS.good) return 'text-green-600';
  if (value <= LATENCY_THRESHOLDS.warning) return 'text-yellow-600';
  if (value <= LATENCY_THRESHOLDS.critical) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Gets color class based on rate value (0-1)
 */
function getRateColor(value: number, inverted = false): string {
  if (inverted) {
    // For success rate, higher is better
    if (value >= 0.99) return 'text-green-600';
    if (value >= 0.95) return 'text-yellow-600';
    if (value >= 0.9) return 'text-orange-600';
    return 'text-red-600';
  }
  // For error/timeout rate, lower is better
  if (value <= RATE_THRESHOLDS.good) return 'text-green-600';
  if (value <= RATE_THRESHOLDS.warning) return 'text-yellow-600';
  if (value <= RATE_THRESHOLDS.critical) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Formats milliseconds to human-readable string
 */
function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Formats rate (0-1) to percentage string
 */
function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

/**
 * Formats large numbers with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Time Window Selector Component
 */
interface TimeWindowSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function TimeWindowSelector({ value, onChange, disabled }: TimeWindowSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <Clock size={16} className="text-gray-500" />
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {TIME_WINDOW_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Metric Card Component - Displays a single metric with icon and value
 */
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  colorClass?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

function MetricCard({ title, value, subtitle, icon, colorClass = 'text-gray-900', trend, trendValue }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          {icon}
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-2 flex items-center text-xs">
          {trend === 'up' && <TrendingUp size={12} className="text-red-500 mr-1" />}
          {trend === 'down' && <TrendingDown size={12} className="text-green-500 mr-1" />}
          <span className={trend === 'up' ? 'text-red-600' : trend === 'down' ? 'text-green-600' : 'text-gray-500'}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Latency Metrics Section Component
 */
interface LatencyMetricsSectionProps {
  latency: LatencyMetrics | undefined;
  isLoading: boolean;
}

function LatencyMetricsSection({ latency, isLoading }: LatencyMetricsSectionProps) {
  if (isLoading || !latency) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Gauge className="h-5 w-5 mr-2 text-gray-500" />
          Latency Metrikleri
        </h3>
        <div className="animate-pulse grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Gauge className="h-5 w-5 mr-2 text-gray-500" />
          Latency Metrikleri
        </h3>
        <span className="text-xs text-gray-400">
          {latency.sample_count} örnek
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">P50</p>
          <p className={`text-2xl font-bold mt-1 ${getLatencyColor(latency.p50)}`}>
            {formatMs(latency.p50)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Medyan</p>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">P95</p>
          <p className={`text-2xl font-bold mt-1 ${getLatencyColor(latency.p95)}`}>
            {formatMs(latency.p95)}
          </p>
          <p className="text-xs text-gray-400 mt-1">95. yüzdelik</p>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">P99</p>
          <p className={`text-2xl font-bold mt-1 ${getLatencyColor(latency.p99)}`}>
            {formatMs(latency.p99)}
          </p>
          <p className="text-xs text-gray-400 mt-1">99. yüzdelik</p>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Ortalama:</span>
          <span className={`font-medium ${getLatencyColor(latency.avg)}`}>{formatMs(latency.avg)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Maksimum:</span>
          <span className={`font-medium ${getLatencyColor(latency.max)}`}>{formatMs(latency.max)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Error Rates Section Component
 */
interface ErrorRatesSectionProps {
  errors: ErrorMetrics | undefined;
  isLoading: boolean;
}

function ErrorRatesSection({ errors, isLoading }: ErrorRatesSectionProps) {
  if (isLoading || !errors) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-gray-500" />
          Hata Oranları
        </h3>
        <div className="animate-pulse grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const successRate = 1 - errors.error_rate - errors.timeout_rate;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-gray-500" />
          Hata Oranları
        </h3>
        <span className="text-xs text-gray-400">
          {formatNumber(errors.total_requests)} toplam istek
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Başarı Oranı</span>
            <CheckCircle size={16} className="text-green-500" />
          </div>
          <p className={`text-xl font-bold mt-1 ${getRateColor(successRate, true)}`}>
            {formatRate(successRate)}
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Hata Oranı</span>
            <XCircle size={16} className="text-red-500" />
          </div>
          <p className={`text-xl font-bold mt-1 ${getRateColor(errors.error_rate)}`}>
            {formatRate(errors.error_rate)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{errors.error_count} hata</p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Timeout Oranı</span>
            <Timer size={16} className="text-orange-500" />
          </div>
          <p className={`text-xl font-bold mt-1 ${getRateColor(errors.timeout_rate)}`}>
            {formatRate(errors.timeout_rate)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{errors.timeout_count} timeout</p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Toplam İstek</span>
            <Activity size={16} className="text-blue-500" />
          </div>
          <p className="text-xl font-bold mt-1 text-gray-900">
            {formatNumber(errors.total_requests)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Approval Metrics Section Component
 */
interface ApprovalMetricsSectionProps {
  approvals: ApprovalMetrics | undefined;
  isLoading: boolean;
}

function ApprovalMetricsSection({ approvals, isLoading }: ApprovalMetricsSectionProps) {
  if (isLoading || !approvals) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileCheck className="h-5 w-5 mr-2 text-gray-500" />
          Onay Metrikleri
        </h3>
        <div className="animate-pulse grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalProcessed = approvals.approved_count + approvals.rejected_count + approvals.expired_count;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileCheck className="h-5 w-5 mr-2 text-gray-500" />
          Onay Metrikleri
        </h3>
        {approvals.pending_count > 0 && (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            {approvals.pending_count} bekliyor
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-700">Onaylanan</span>
            <CheckCircle size={16} className="text-green-500" />
          </div>
          <p className="text-xl font-bold mt-1 text-green-700">
            {approvals.approved_count}
          </p>
        </div>
        
        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-700">Reddedilen</span>
            <XCircle size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-bold mt-1 text-red-700">
            {approvals.rejected_count}
          </p>
          <p className="text-xs text-red-500 mt-1">
            Red oranı: {formatRate(approvals.rejection_rate)}
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Süresi Dolan</span>
            <Timer size={16} className="text-gray-400" />
          </div>
          <p className="text-xl font-bold mt-1 text-gray-700">
            {approvals.expired_count}
          </p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">Ort. Onay Süresi</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="text-xl font-bold mt-1 text-blue-700">
            {formatMs(approvals.avg_approval_time_ms)}
          </p>
        </div>
      </div>
      
      {totalProcessed > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Toplam İşlenen:</span>
            <span className="font-medium text-gray-900">{totalProcessed}</span>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Alert Item Component - Displays a single alert with acknowledge action
 */
interface AlertItemProps {
  alert: AIAlert;
  onAcknowledge: (alertId: string, notes?: string) => Promise<void>;
  isAcknowledging: boolean;
}

function AlertItem({ alert, onAcknowledge, isAcknowledging }: AlertItemProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const config = SEVERITY_CONFIG[alert.severity];

  const handleAcknowledge = async () => {
    try {
      await onAcknowledge(alert.alert_id, notes || undefined);
      toast.success('Alert onaylandı');
      setShowNotes(false);
      setNotes('');
    } catch {
      toast.error('Alert onaylanamadı');
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(alert.created_at).toLocaleString('tr-TR')}
            </span>
          </div>
          <p className={`mt-1 text-sm font-medium ${config.color}`}>{alert.message}</p>
          
          {alert.details && Object.keys(alert.details).length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              {alert.details.metric_value !== undefined && (
                <span className="mr-3">
                  Değer: <strong>{String(alert.details.metric_value)}</strong>
                </span>
              )}
              {alert.details.threshold_value !== undefined && (
                <span>
                  Eşik: <strong>{String(alert.details.threshold_value)}</strong>
                </span>
              )}
            </div>
          )}
          
          {alert.acknowledged && (
            <div className="mt-2 text-xs text-gray-400 flex items-center">
              <CheckCircle size={12} className="mr-1" />
              {alert.acknowledged_by && <span className="mr-2">Onaylayan: {alert.acknowledged_by}</span>}
              {alert.acknowledged_at && <span>{new Date(alert.acknowledged_at).toLocaleString('tr-TR')}</span>}
            </div>
          )}
        </div>
        
        {!alert.acknowledged && (
          <div className="ml-4 flex-shrink-0">
            {showNotes ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Not (opsiyonel)"
                  className="text-xs px-2 py-1 border border-gray-300 rounded w-32"
                />
                <div className="flex space-x-1">
                  <button
                    onClick={handleAcknowledge}
                    disabled={isAcknowledging}
                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => setShowNotes(false)}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNotes(true)}
                disabled={isAcknowledging}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 
                  bg-white border border-gray-300 rounded-md hover:bg-gray-50 
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BellOff size={12} className="mr-1" />
                Onayla
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Alert List Section Component
 */
interface AlertListSectionProps {
  alerts: AIAlert[];
  activeCount: number;
  isLoading: boolean;
  onAcknowledge: (alertId: string, notes?: string) => Promise<void>;
  isAcknowledging: boolean;
}

function AlertListSection({ alerts, activeCount, isLoading, onAcknowledge, isAcknowledging }: AlertListSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const filteredAlerts = showAcknowledged 
    ? alerts 
    : alerts.filter(a => !a.acknowledged);

  // Sort by severity (critical first) then by date (newest first)
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, error: 1, warning: 2, info: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-gray-500" />
          Alertler
        </h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div 
        className="px-6 py-4 border-b border-gray-200 bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Alertler</h3>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                {activeCount} aktif
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center text-sm text-gray-500">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => {
                  e.stopPropagation();
                  setShowAcknowledged(e.target.checked);
                }}
                className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Onaylananları göster
            </label>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="p-6">
          {sortedAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Aktif alert bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sortedAlerts.map((alert) => (
                <AlertItem
                  key={alert.alert_id}
                  alert={alert}
                  onAcknowledge={onAcknowledge}
                  isAcknowledging={isAcknowledging}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AIMetricsDashboard - Main Component
 * 
 * Comprehensive dashboard for monitoring AI SLA metrics.
 * Displays latency percentiles, error/timeout rates, approval metrics,
 * and alerts with acknowledgment functionality.
 * 
 * Includes KillSwitchRecommendation banner for high-severity alerts.
 * 
 * @example
 * ```tsx
 * <AIMetricsDashboard defaultWindowMinutes={60} className="mt-4" />
 * ```
 */
export function AIMetricsDashboard({ 
  defaultWindowMinutes = 15, 
  className = '' 
}: AIMetricsDashboardProps) {
  // State
  const [windowMinutes, setWindowMinutes] = useState(defaultWindowMinutes);
  
  // Hooks
  const { data: metrics, isLoading: isMetricsLoading, isError, refetch } = useAIMetrics({
    windowMinutes,
    enabled: true,
  });
  
  const { 
    alerts, 
    activeCount, 
    isLoading: isAlertsLoading, 
    acknowledge, 
    isAcknowledging 
  } = useAIAlerts();

  // Handlers
  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Metrikler yenilendi');
  }, [refetch]);

  const handleWindowChange = useCallback((value: number) => {
    setWindowMinutes(value);
  }, []);

  // Error state
  if (isError) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Metrikler Yüklenemedi</h3>
          <p className="text-sm text-gray-500 mb-4">AI metriklerini yüklerken bir hata oluştu.</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white 
              bg-primary-600 rounded-md hover:bg-primary-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Kill Switch Recommendation Banner */}
      <KillSwitchRecommendation />
      
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Activity className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Metrik Dashboard</h2>
              <p className="text-sm text-gray-500">SLA metrikleri ve performans izleme</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <TimeWindowSelector
              value={windowMinutes}
              onChange={handleWindowChange}
              disabled={isMetricsLoading}
            />
            
            <button
              onClick={handleRefresh}
              disabled={isMetricsLoading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 
                bg-white border border-gray-300 rounded-md hover:bg-gray-50 
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={`mr-2 ${isMetricsLoading ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          </div>
        </div>
        
        {metrics?.timestamp && (
          <p className="mt-2 text-xs text-gray-400">
            Son güncelleme: {new Date(metrics.timestamp).toLocaleString('tr-TR')}
          </p>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Toplam İstek"
          value={metrics?.errors?.total_requests ? formatNumber(metrics.errors.total_requests) : '-'}
          subtitle={`Son ${windowMinutes} dakika`}
          icon={<Activity className="h-5 w-5 text-blue-500" />}
        />
        <MetricCard
          title="Başarı Oranı"
          value={metrics?.errors ? formatRate(1 - metrics.errors.error_rate - metrics.errors.timeout_rate) : '-'}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          colorClass={metrics?.errors ? getRateColor(1 - metrics.errors.error_rate - metrics.errors.timeout_rate, true) : 'text-gray-900'}
        />
        <MetricCard
          title="P95 Latency"
          value={metrics?.latency ? formatMs(metrics.latency.p95) : '-'}
          icon={<Gauge className="h-5 w-5 text-purple-500" />}
          colorClass={metrics?.latency ? getLatencyColor(metrics.latency.p95) : 'text-gray-900'}
        />
        <MetricCard
          title="Aktif Alertler"
          value={activeCount}
          icon={<Bell className="h-5 w-5 text-red-500" />}
          colorClass={activeCount > 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Metrics */}
        <LatencyMetricsSection 
          latency={metrics?.latency} 
          isLoading={isMetricsLoading} 
        />
        
        {/* Error Rates */}
        <ErrorRatesSection 
          errors={metrics?.errors} 
          isLoading={isMetricsLoading} 
        />
      </div>

      {/* Approval Metrics */}
      <ApprovalMetricsSection 
        approvals={metrics?.approvals} 
        isLoading={isMetricsLoading} 
      />

      {/* Alert List */}
      <AlertListSection
        alerts={alerts}
        activeCount={activeCount}
        isLoading={isAlertsLoading}
        onAcknowledge={acknowledge}
        isAcknowledging={isAcknowledging}
      />
    </div>
  );
}

export default AIMetricsDashboard;
