/**
 * AIAuditViewer Component
 * 
 * Admin component for viewing and filtering AI audit logs.
 * Provides filterable table, detail modal, pagination/infinite scroll,
 * and export functionality (CSV/JSON).
 * 
 * @module ai-admin/components/AIAuditViewer
 * @requirements Requirement 7: Admin Audit Log Viewer
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAIAudit } from '../../hooks/useAIAudit';
import type {
  AIAuditViewerProps,
  AuditLogEntry,
  AuditLogFilters,
  AuditEventType,
} from '../../types/ai-admin.types';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  User,
  Building,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Eye,
  Clock,
  Activity,
  FileJson,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// =============================================================================
// Constants
// =============================================================================

/** Event type display configuration */
const EVENT_TYPE_CONFIG: Record<AuditEventType, { label: string; color: string; bgColor: string }> = {
  chat_request: { label: 'Chat İsteği', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  chat_response: { label: 'Chat Yanıtı', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  action_created: { label: 'Aksiyon Oluşturuldu', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  action_approved: { label: 'Aksiyon Onaylandı', color: 'text-green-700', bgColor: 'bg-green-50' },
  action_rejected: { label: 'Aksiyon Reddedildi', color: 'text-red-700', bgColor: 'bg-red-50' },
  action_executed: { label: 'Aksiyon Çalıştırıldı', color: 'text-indigo-700', bgColor: 'bg-indigo-50' },
  action_failed: { label: 'Aksiyon Başarısız', color: 'text-red-700', bgColor: 'bg-red-50' },
  kill_switch_activated: { label: 'Kill Switch Aktif', color: 'text-red-700', bgColor: 'bg-red-50' },
  kill_switch_deactivated: { label: 'Kill Switch Deaktif', color: 'text-green-700', bgColor: 'bg-green-50' },
  quota_exceeded: { label: 'Kota Aşıldı', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  rate_limited: { label: 'Rate Limited', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  guardrail_violation: { label: 'Guardrail İhlali', color: 'text-red-700', bgColor: 'bg-red-50' },
  context_violation: { label: 'Context İhlali', color: 'text-red-700', bgColor: 'bg-red-50' },
};

/** Outcome display configuration */
const OUTCOME_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  success: { label: 'Başarılı', icon: <CheckCircle size={14} />, color: 'text-green-600' },
  failure: { label: 'Başarısız', icon: <XCircle size={14} />, color: 'text-red-600' },
  blocked: { label: 'Engellendi', icon: <Shield size={14} />, color: 'text-orange-600' },
};

/** Risk level display configuration */
const RISK_LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Düşük', color: 'text-green-700', bgColor: 'bg-green-50' },
  medium: { label: 'Orta', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  high: { label: 'Yüksek', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  critical: { label: 'Kritik', color: 'text-red-700', bgColor: 'bg-red-50' },
};

/** All event types for filter dropdown */
const ALL_EVENT_TYPES: AuditEventType[] = [
  'chat_request',
  'chat_response',
  'action_created',
  'action_approved',
  'action_rejected',
  'action_executed',
  'action_failed',
  'kill_switch_activated',
  'kill_switch_deactivated',
  'quota_exceeded',
  'rate_limited',
  'guardrail_violation',
  'context_violation',
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Formats date to locale string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formats date for input field (YYYY-MM-DD)
 */
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Converts audit entries to CSV format
 */
function convertToCSV(entries: AuditLogEntry[]): string {
  const headers = [
    'Log ID',
    'Timestamp',
    'Event Type',
    'Tenant ID',
    'User ID',
    'Party ID',
    'Request ID',
    'Action ID',
    'Risk Level',
    'Outcome',
    'IP Address',
  ];

  const rows = entries.map((entry) => [
    entry.log_id,
    entry.timestamp,
    entry.event_type,
    entry.tenant_id,
    entry.user_id,
    entry.party_id || '',
    entry.request_id || '',
    entry.action_id || '',
    entry.risk_level || '',
    entry.outcome,
    entry.ip_address || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Downloads content as a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Sub-Components
// =============================================================================


/**
 * Filter Panel Component
 */
interface FilterPanelProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  onReset: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

function FilterPanel({ filters, onFiltersChange, onReset, isExpanded, onToggle }: FilterPanelProps) {
  const handleChange = (key: keyof AuditLogFilters, value: string | undefined) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-gray-500" />
          <span className="font-medium text-gray-700">Filtreler</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {activeFilterCount} aktif
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tenant ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building size={14} className="inline mr-1" />
                Tenant ID
              </label>
              <input
                type="text"
                value={filters.tenant_id || ''}
                onChange={(e) => handleChange('tenant_id', e.target.value)}
                placeholder="Tenant ID..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* User ID Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={14} className="inline mr-1" />
                User ID
              </label>
              <input
                type="text"
                value={filters.user_id || ''}
                onChange={(e) => handleChange('user_id', e.target.value)}
                placeholder="User ID..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Activity size={14} className="inline mr-1" />
                Event Tipi
              </label>
              <select
                value={filters.event_type || ''}
                onChange={(e) => handleChange('event_type', e.target.value as AuditEventType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tümü</option>
                {ALL_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EVENT_TYPE_CONFIG[type].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Outcome Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CheckCircle size={14} className="inline mr-1" />
                Sonuç
              </label>
              <select
                value={filters.outcome || ''}
                onChange={(e) => handleChange('outcome', e.target.value as 'success' | 'failure' | 'blocked')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tümü</option>
                <option value="success">Başarılı</option>
                <option value="failure">Başarısız</option>
                <option value="blocked">Engellendi</option>
              </select>
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <AlertTriangle size={14} className="inline mr-1" />
                Risk Seviyesi
              </label>
              <select
                value={filters.risk_level || ''}
                onChange={(e) => handleChange('risk_level', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Tümü</option>
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="critical">Kritik</option>
              </select>
            </div>

            {/* From Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={filters.from_date || ''}
                onChange={(e) => handleChange('from_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* To Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" />
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={filters.to_date || ''}
                onChange={(e) => handleChange('to_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Reset Button */}
          {activeFilterCount > 0 && (
            <div className="flex justify-end">
              <button
                onClick={onReset}
                className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                <X size={14} className="mr-1" />
                Filtreleri Temizle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Audit Log Table Row Component
 */
interface AuditLogRowProps {
  entry: AuditLogEntry;
  onViewDetails: (entry: AuditLogEntry) => void;
}

function AuditLogRow({ entry, onViewDetails }: AuditLogRowProps) {
  const eventConfig = EVENT_TYPE_CONFIG[entry.event_type] || {
    label: entry.event_type,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
  };
  const outcomeConfig = OUTCOME_CONFIG[entry.outcome] || OUTCOME_CONFIG.success;
  const riskConfig = entry.risk_level ? RISK_LEVEL_CONFIG[entry.risk_level] : null;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
        <div className="flex items-center">
          <Clock size={12} className="mr-1 text-gray-400" />
          {formatDate(entry.timestamp)}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${eventConfig.bgColor} ${eventConfig.color}`}>
          {eventConfig.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        <div className="truncate max-w-[120px]" title={entry.tenant_id}>
          {entry.tenant_id}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        <div className="truncate max-w-[120px]" title={entry.user_id}>
          {entry.user_id}
        </div>
        {entry.user_email && (
          <div className="text-xs text-gray-400 truncate max-w-[120px]" title={entry.user_email}>
            {entry.user_email}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {riskConfig ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}>
            {riskConfig.label}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center text-xs font-medium ${outcomeConfig.color}`}>
          {outcomeConfig.icon}
          <span className="ml-1">{outcomeConfig.label}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onViewDetails(entry)}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded"
        >
          <Eye size={14} className="mr-1" />
          Detay
        </button>
      </td>
    </tr>
  );
}


/**
 * Detail Modal Component
 */
interface DetailModalProps {
  entry: AuditLogEntry | null;
  onClose: () => void;
}

function DetailModal({ entry, onClose }: DetailModalProps) {
  if (!entry) return null;

  const eventConfig = EVENT_TYPE_CONFIG[entry.event_type] || {
    label: entry.event_type,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
  };
  const outcomeConfig = OUTCOME_CONFIG[entry.outcome] || OUTCOME_CONFIG.success;
  const riskConfig = entry.risk_level ? RISK_LEVEL_CONFIG[entry.risk_level] : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Audit Log Detayı</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Log ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{entry.log_id}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Timestamp</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(entry.timestamp)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Tipi</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${eventConfig.bgColor} ${eventConfig.color}`}>
                    {eventConfig.label}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sonuç</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center text-sm font-medium ${outcomeConfig.color}`}>
                    {outcomeConfig.icon}
                    <span className="ml-1">{outcomeConfig.label}</span>
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tenant ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{entry.tenant_id}</p>
                {entry.tenant_name && (
                  <p className="text-xs text-gray-500">{entry.tenant_name}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{entry.user_id}</p>
                {entry.user_email && (
                  <p className="text-xs text-gray-500">{entry.user_email}</p>
                )}
              </div>
              {entry.party_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Party ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{entry.party_id}</p>
                </div>
              )}
              {entry.request_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Request ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{entry.request_id}</p>
                </div>
              )}
              {entry.action_id && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Action ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{entry.action_id}</p>
                </div>
              )}
              {riskConfig && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk Seviyesi</label>
                  <p className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}>
                      {riskConfig.label}
                    </span>
                  </p>
                </div>
              )}
              {entry.ip_address && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">IP Adresi</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{entry.ip_address}</p>
                </div>
              )}
            </div>

            {/* User Agent */}
            {entry.user_agent && (
              <div className="mb-6">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Agent</label>
                <p className="mt-1 text-sm text-gray-600 break-all">{entry.user_agent}</p>
              </div>
            )}

            {/* Event Data */}
            {entry.event_data && Object.keys(entry.event_data).length > 0 && (
              <div className="mb-6">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Event Data</label>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(entry.event_data, null, 2)}
                </pre>
              </div>
            )}

            {/* Diff Snapshot */}
            {entry.diff_snapshot && Object.keys(entry.diff_snapshot).length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Diff Snapshot</label>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(entry.diff_snapshot, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Export Menu Component
 */
interface ExportMenuProps {
  entries: AuditLogEntry[];
  total: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function ExportMenu({ entries, total, isOpen, onToggle, onClose }: ExportMenuProps) {
  const handleExportCSV = () => {
    if (entries.length === 0) {
      toast.error('Dışa aktarılacak veri yok');
      return;
    }
    const csv = convertToCSV(entries);
    const filename = `ai-audit-logs-${formatDateForInput(new Date())}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    toast.success(`${entries.length} kayıt CSV olarak indirildi`);
    onClose();
  };

  const handleExportJSON = () => {
    if (entries.length === 0) {
      toast.error('Dışa aktarılacak veri yok');
      return;
    }
    const json = JSON.stringify(entries, null, 2);
    const filename = `ai-audit-logs-${formatDateForInput(new Date())}.json`;
    downloadFile(json, filename, 'application/json');
    toast.success(`${entries.length} kayıt JSON olarak indirildi`);
    onClose();
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <Download size={16} className="mr-2" />
        Dışa Aktar
        <ChevronDown size={14} className="ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <button
                onClick={handleExportCSV}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <FileSpreadsheet size={16} className="mr-2 text-green-600" />
                CSV olarak indir
              </button>
              <button
                onClick={handleExportJSON}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <FileJson size={16} className="mr-2 text-blue-600" />
                JSON olarak indir
              </button>
            </div>
            <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
              {entries.length} / {total} kayıt yüklendi
            </div>
          </div>
        </>
      )}
    </div>
  );
}


// =============================================================================
// Main Component
// =============================================================================

/**
 * AIAuditViewer - Main Component
 * 
 * Comprehensive audit log viewer for AI operations.
 * Provides filterable table, detail modal, infinite scroll pagination,
 * and export functionality (CSV/JSON).
 * 
 * @example
 * ```tsx
 * <AIAuditViewer 
 *   initialFilters={{ tenant_id: 'tenant-123' }} 
 *   className="mt-4" 
 * />
 * ```
 */
export function AIAuditViewer({ initialFilters = {}, className = '' }: AIAuditViewerProps) {
  // State
  const [filters, setFilters] = useState<AuditLogFilters>(initialFilters);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  // Refs for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Hooks
  const {
    entries,
    total,
    hasMore,
    isLoading,
    loadMore,
    isLoadingMore,
    refetch,
    isError,
  } = useAIAudit({ filters, pageSize: 25 });

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // Handlers
  const handleFiltersChange = useCallback((newFilters: AuditLogFilters) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Audit logları yenilendi');
  }, [refetch]);

  const handleViewDetails = useCallback((entry: AuditLogEntry) => {
    setSelectedEntry(entry);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  // Error state
  if (isError) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Audit Logları Yüklenemedi</h3>
          <p className="text-sm text-gray-500 mb-4">Audit loglarını yüklerken bir hata oluştu.</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Audit Logları</h2>
              <p className="text-sm text-gray-500">
                {total > 0 ? `${total} kayıt bulundu` : 'Kayıt bulunamadı'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ExportMenu
              entries={entries}
              total={total}
              isOpen={isExportMenuOpen}
              onToggle={() => setIsExportMenuOpen(!isExportMenuOpen)}
              onClose={() => setIsExportMenuOpen(false)}
            />
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
        isExpanded={isFilterExpanded}
        onToggle={() => setIsFilterExpanded(!isFilterExpanded)}
      />

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading && entries.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-3 text-primary-500 animate-spin" />
            <p className="text-sm text-gray-500">Audit logları yükleniyor...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Kayıt Bulunamadı</h3>
            <p className="text-sm text-gray-500">
              Seçili filtrelere uygun audit log kaydı bulunamadı.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Tipi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sonuç
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <AuditLogRow
                      key={entry.log_id}
                      entry={entry}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More / Infinite Scroll Trigger */}
            <div ref={loadMoreRef} className="p-4 text-center border-t border-gray-100">
              {isLoadingMore ? (
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Daha fazla yükleniyor...
                </div>
              ) : hasMore ? (
                <button
                  onClick={loadMore}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Daha fazla yükle
                </button>
              ) : entries.length > 0 ? (
                <p className="text-sm text-gray-400">
                  Tüm kayıtlar yüklendi ({entries.length} / {total})
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <DetailModal entry={selectedEntry} onClose={handleCloseDetails} />
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default AIAuditViewer;
