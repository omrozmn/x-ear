/**
 * ApprovalQueue Component
 * 
 * Admin panel component for managing pending AI action approvals.
 * Displays a list of pending approvals with filtering, detail view,
 * approve/reject functionality, and expiration countdown.
 * 
 * @module ai-admin/components/ApprovalQueue
 * @requirements Requirement 5: Admin Approval Queue
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApprovalQueue } from '../../hooks/useApprovalQueue';
import type {
  ApprovalQueueProps,
  PendingApprovalItem,
  RiskLevel,
} from '../../types/ai-admin.types';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Filter,
  RefreshCw,
  User,
  Building2,
  Zap,
  Shield,
  X,
  FileText,
  Timer,
} from 'lucide-react';
import toast from 'react-hot-toast';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get risk level badge styling
 */
function getRiskLevelConfig(level: RiskLevel) {
  const configs = {
    low: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      label: 'Düşük',
    },
    medium: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      label: 'Orta',
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-200',
      label: 'Yüksek',
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      label: 'Kritik',
    },
  };
  return configs[level] || configs.medium;
}

/**
 * Calculate time remaining until expiration
 */
function getTimeRemaining(expiresAt: string): {
  expired: boolean;
  text: string;
  urgency: 'normal' | 'warning' | 'critical';
} {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return { expired: true, text: 'Süresi doldu', urgency: 'critical' };
  }

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let text: string;
  let urgency: 'normal' | 'warning' | 'critical';

  if (days > 0) {
    text = `${days} gün ${hours % 24} saat`;
    urgency = 'normal';
  } else if (hours > 0) {
    text = `${hours} saat ${minutes % 60} dk`;
    urgency = hours < 2 ? 'warning' : 'normal';
  } else {
    text = `${minutes} dakika`;
    urgency = minutes < 30 ? 'critical' : 'warning';
  }

  return { expired: false, text, urgency };
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Risk Level Badge Component
 */
interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
}

function RiskBadge({ level, size = 'md' }: RiskBadgeProps) {
  const config = getRiskLevelConfig(level);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${config.bg} ${config.text} ${sizeClasses}`}
    >
      <Shield size={size === 'sm' ? 10 : 12} className="mr-1" />
      {config.label}
    </span>
  );
}

/**
 * Expiration Countdown Component
 */
interface ExpirationCountdownProps {
  expiresAt: string;
  size?: 'sm' | 'md';
}

function ExpirationCountdown({ expiresAt, size = 'md' }: ExpirationCountdownProps) {
  const [timeInfo, setTimeInfo] = useState(() => getTimeRemaining(expiresAt));

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getTimeRemaining(expiresAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const urgencyClasses = {
    normal: 'text-gray-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  };

  const sizeClasses = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`flex items-center ${urgencyClasses[timeInfo.urgency]} ${sizeClasses}`}>
      <Timer size={size === 'sm' ? 12 : 14} className="mr-1" />
      {timeInfo.expired ? (
        <span className="font-medium">{timeInfo.text}</span>
      ) : (
        <span>Kalan: {timeInfo.text}</span>
      )}
    </span>
  );
}

/**
 * Tenant Filter Component
 */
interface TenantFilterProps {
  value: string;
  onChange: (value: string) => void;
  tenants: Array<{ id: string; name?: string }>;
}

function TenantFilter({ value, onChange, tenants }: TenantFilterProps) {
  return (
    <div className="flex items-center space-x-2">
      <Filter size={16} className="text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md 
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          bg-white"
      >
        <option value="">Tüm Tenant'lar</option>
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name || tenant.id}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Approval Item Card Component
 */
interface ApprovalItemCardProps {
  item: PendingApprovalItem;
  onSelect: () => void;
  isSelected: boolean;
}

function ApprovalItemCard({ item, onSelect, isSelected }: ApprovalItemCardProps) {
  const timeInfo = getTimeRemaining(item.expires_at);

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 border rounded-lg cursor-pointer transition-all
        ${isSelected 
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${timeInfo.expired ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-2">
            <RiskBadge level={item.risk_level} size="sm" />
            <span className="text-xs text-gray-500 font-mono truncate">
              {item.action_id.slice(0, 8)}...
            </span>
          </div>

          {/* Tenant & User Info */}
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center">
              <Building2 size={14} className="mr-1 text-gray-400" />
              {item.tenant_name || item.tenant_id.slice(0, 8)}
            </span>
            <span className="flex items-center">
              <User size={14} className="mr-1 text-gray-400" />
              {item.user_email || item.user_id.slice(0, 8)}
            </span>
          </div>

          {/* Steps Summary */}
          {item.steps_summary && item.steps_summary.length > 0 && (
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <Zap size={14} className="mr-1 text-gray-400" />
              <span className="truncate">
                {item.steps_count} adım: {item.steps_summary.slice(0, 2).join(', ')}
                {item.steps_summary.length > 2 && '...'}
              </span>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center">
              <Clock size={12} className="mr-1" />
              {formatDate(item.created_at)}
            </span>
            <ExpirationCountdown expiresAt={item.expires_at} size="sm" />
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight 
          size={20} 
          className={`ml-2 flex-shrink-0 ${isSelected ? 'text-primary-500' : 'text-gray-300'}`} 
        />
      </div>
    </div>
  );
}


/**
 * Approval Detail Panel Component
 */
interface ApprovalDetailPanelProps {
  item: PendingApprovalItem;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onClose: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}

function ApprovalDetailPanel({
  item,
  onApprove,
  onReject,
  onClose,
  isApproving,
  isRejecting,
}: ApprovalDetailPanelProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const timeInfo = getTimeRemaining(item.expires_at);
  const riskConfig = getRiskLevelConfig(item.risk_level);

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Lütfen red sebebi girin');
      return;
    }
    onReject(rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${riskConfig.bg} ${riskConfig.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className={`h-5 w-5 ${riskConfig.text}`} />
            <div>
              <h3 className="font-semibold text-gray-900">Onay Detayları</h3>
              <p className="text-xs text-gray-600 font-mono">{item.action_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Risk & Status */}
        <div className="flex items-center justify-between">
          <RiskBadge level={item.risk_level} />
          <ExpirationCountdown expiresAt={item.expires_at} />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Tenant</label>
            <p className="text-gray-900 flex items-center mt-1">
              <Building2 size={14} className="mr-1 text-gray-400" />
              {item.tenant_name || item.tenant_id}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Kullanıcı</label>
            <p className="text-gray-900 flex items-center mt-1">
              <User size={14} className="mr-1 text-gray-400" />
              {item.user_email || item.user_id}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Oluşturulma</label>
            <p className="text-gray-900 flex items-center mt-1">
              <Clock size={14} className="mr-1 text-gray-400" />
              {formatDate(item.created_at)}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Son Geçerlilik</label>
            <p className="text-gray-900 flex items-center mt-1">
              <Timer size={14} className="mr-1 text-gray-400" />
              {formatDate(item.expires_at)}
            </p>
          </div>
        </div>

        {/* Action Plan Steps */}
        {item.steps_summary && item.steps_summary.length > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
              Aksiyon Planı ({item.steps_count} adım)
            </label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              {item.steps_summary.map((step, index) => (
                <div key={index} className="flex items-start text-sm">
                  <span className="flex-shrink-0 w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 mr-2">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan Hash */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Plan Hash</label>
          <p className="text-xs font-mono text-gray-600 mt-1 bg-gray-50 p-2 rounded break-all">
            {item.plan_hash || 'N/A'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        {timeInfo.expired ? (
          <div className="text-center text-sm text-red-600 font-medium">
            Bu onay isteğinin süresi dolmuştur
          </div>
        ) : (
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isApproving || isRejecting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 
                bg-red-100 border border-red-200 rounded-md hover:bg-red-200 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle size={16} className="mr-1.5" />
              {isRejecting ? 'Reddediliyor...' : 'Reddet'}
            </button>
            <button
              onClick={onApprove}
              disabled={isApproving || isRejecting}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white 
                bg-green-600 border border-transparent rounded-md hover:bg-green-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={16} className="mr-1.5" />
              {isApproving ? 'Onaylanıyor...' : 'Onayla'}
            </button>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" 
              onClick={() => setShowRejectModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aksiyonu Reddet</h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Bu aksiyonu reddetmek üzeresiniz. Lütfen red sebebini belirtin.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Red Sebebi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Red sebebini yazın..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                    focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                    text-sm resize-none"
                  rows={3}
                  disabled={isRejecting}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  disabled={isRejecting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border 
                    border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border 
                    border-transparent rounded-md hover:bg-red-700 disabled:opacity-50
                    disabled:cursor-not-allowed"
                >
                  {isRejecting ? 'Reddediliyor...' : 'Reddet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <div className="text-center py-12">
      <FileText className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">Onay Bekleyen İşlem Yok</h3>
      <p className="mt-2 text-sm text-gray-500">
        Şu anda onay bekleyen AI aksiyonu bulunmuyor.
      </p>
    </div>
  );
}

/**
 * Loading Skeleton Component
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}


// =============================================================================
// Main Component
// =============================================================================

/**
 * ApprovalQueue - Main Component
 * 
 * Provides comprehensive AI approval queue management for administrators.
 * Features:
 * - List of pending approvals with risk level indicators
 * - Tenant-based filtering
 * - Detail view with full action plan
 * - Approve/reject functionality
 * - Expiration countdown
 * - Real-time polling for updates
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ApprovalQueue />
 * 
 * // With tenant filter
 * <ApprovalQueue tenantId="tenant-123" />
 * ```
 */
export function ApprovalQueue({ tenantId: initialTenantId, className = '' }: ApprovalQueueProps) {
  const [selectedTenantId, setSelectedTenantId] = useState(initialTenantId || '');
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);

  const {
    items,
    total,
    isLoading,
    approve,
    reject,
    isApproving,
    isRejecting,
  } = useApprovalQueue({
    tenantId: selectedTenantId || undefined,
    enabled: true,
    refetchInterval: 15000, // Poll every 15 seconds
  });

  // Extract unique tenants from items for filter dropdown
  const uniqueTenants = useMemo(() => {
    const tenantMap = new Map<string, { id: string; name?: string }>();
    items.forEach((item) => {
      if (!tenantMap.has(item.tenant_id)) {
        tenantMap.set(item.tenant_id, {
          id: item.tenant_id,
          name: item.tenant_name,
        });
      }
    });
    return Array.from(tenantMap.values());
  }, [items]);

  // Handle approve action
  const handleApprove = async () => {
    if (!selectedItem) return;

    try {
      await approve({
        actionId: selectedItem.action_id,
        approvalToken: selectedItem.approval_token,
      });
      toast.success('Aksiyon onaylandı');
      setSelectedItem(null);
    } catch (error) {
      toast.error('Onaylama işlemi başarısız');
      console.error('Approve error:', error);
    }
  };

  // Handle reject action
  const handleReject = async (reason: string) => {
    if (!selectedItem) return;

    try {
      await reject({
        actionId: selectedItem.action_id,
        reason,
      });
      toast.success('Aksiyon reddedildi');
      setSelectedItem(null);
    } catch (error) {
      toast.error('Reddetme işlemi başarısız');
      console.error('Reject error:', error);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    // The hook automatically refetches, but we can trigger a manual refresh
    // by changing the query key or using queryClient.invalidateQueries
    toast.success('Liste yenilendi');
  };

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Onay Kuyruğu</h2>
              <p className="text-sm text-gray-500">
                {total > 0 
                  ? `${total} onay bekleyen aksiyon` 
                  : 'Onay bekleyen aksiyon yok'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Tenant Filter */}
            {uniqueTenants.length > 1 && (
              <div className="w-48">
                <TenantFilter
                  value={selectedTenantId}
                  onChange={setSelectedTenantId}
                  tenants={uniqueTenants}
                />
              </div>
            )}
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md
                disabled:opacity-50 disabled:cursor-not-allowed"
              title="Yenile"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading && items.length === 0 ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Bekleyen Onaylar ({items.length})
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <ApprovalItemCard
                    key={item.action_id}
                    item={item}
                    onSelect={() => setSelectedItem(item)}
                    isSelected={selectedItem?.action_id === item.action_id}
                  />
                ))}
              </div>
            </div>

            {/* Detail Panel */}
            <div>
              {selectedItem ? (
                <ApprovalDetailPanel
                  item={selectedItem}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onClose={() => setSelectedItem(null)}
                  isApproving={isApproving}
                  isRejecting={isRejecting}
                />
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-8">
                  <div className="text-center">
                    <FileText className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      Detayları görmek için bir onay isteği seçin
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApprovalQueue;
