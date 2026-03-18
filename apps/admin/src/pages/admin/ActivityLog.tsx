import React, { useState } from 'react';
import { Search, Loader2, AlertTriangle, Eye } from 'lucide-react';
import {
  useListActivityLogs,
  useListActivityLogStats,
  useListActivityLogFilterOptions,
} from '../../lib/api-client';
import type { ActivityLogRead, ActivityLogStats, ListActivityLogsParams } from '../../api/generated/schemas';
import Pagination from '../../components/ui/Pagination';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';
import { ResponsiveTable } from '../../components/responsive/ResponsiveTable';
import { ResponsiveModal } from '../../components/responsive/ResponsiveModal';

interface ActivityLogItem extends ActivityLogRead {
  tenantName?: string;
  branchName?: string;
  branchId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  data?: Record<string, unknown> | null;
}

interface ActivityLogDetailModalProps {
  log: ActivityLogItem;
  onClose: () => void;
}

interface ActivityLogFilters {
  tenant_id: string;
  user_id: string;
  action: string;
  action_type: string;
  critical_only: 'false' | 'true';
  search: string;
}

interface PaginationMeta {
  total?: number;
  totalPages?: number;
}

interface ActivityLogListParams extends ListActivityLogsParams {
  limit?: number;
  action_type?: string;
  critical_only?: boolean;
}

interface ActivityLogListResponse {
  logs?: ActivityLogItem[];
  data?: ActivityLogItem[] | { logs?: ActivityLogItem[]; meta?: PaginationMeta; pagination?: PaginationMeta };
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}

interface ActivityLogFilterOption {
  id: string;
  name: string;
}

interface ActivityLogFilterOptions {
  actions?: string[];
  entityTypes?: string[];
  users?: ActivityLogFilterOption[];
}

interface ActivityLogFilterOptionsResponse {
  options?: ActivityLogFilterOptions;
  data?: ActivityLogFilterOptions;
}

type TopAction = { action?: string };

/** Turkish human-readable mapping for activity log action codes */
const ACTION_LABEL_TR: Record<string, string> = {
  // Auth
  'auth.login': 'Sisteme giris yapildi',
  'auth.logout': 'Sistemden cikis yapildi',
  'auth.failed_login': 'Basarisiz giris denemesi',
  'auth.register': 'Yeni hesap olusturuldu',
  'auth.password_change': 'Sifre degistirildi',
  'auth.password_reset': 'Sifre sifirlandi',
  'auth.otp_verify': 'OTP dogrulandi',
  'auth.otp_send': 'OTP gonderildi',
  'auth.impersonate': 'Kullanici taklit edildi',
  'password_reset': 'Sifre sifirlandi',

  // Party / Customer
  'party.create': 'Musteri/Hasta olusturuldu',
  'party.update': 'Musteri/Hasta guncellendi',
  'party.delete': 'Musteri/Hasta silindi',
  'party.view': 'Musteri/Hasta goruntulendi',

  // Sale
  'sale.create': 'Satis olusturuldu',
  'sale.update': 'Satis guncellendi',
  'sale.delete': 'Satis silindi',
  'sale.view': 'Satis goruntulendi',
  'sale.approve': 'Satis onaylandi',

  // Invoice
  'invoice.create': 'Fatura olusturuldu',
  'invoice.update': 'Fatura guncellendi',
  'invoice.delete': 'Fatura silindi',
  'invoice.send': 'Fatura gonderildi',

  // Inventory / Product
  'inventory.create': 'Urun olusturuldu',
  'inventory.update': 'Urun guncellendi',
  'inventory.delete': 'Urun silindi',
  'product.create': 'Urun olusturuldu',
  'product.update': 'Urun guncellendi',
  'product.delete': 'Urun silindi',
  'stock.update': 'Stok guncellendi',

  // Document
  'document_upload': 'Dokuman yuklendi',
  'document.upload': 'Dokuman yuklendi',
  'document.delete': 'Dokuman silindi',
  'document.view': 'Dokuman goruntulendi',

  // Appointment
  'appointment.create': 'Randevu olusturuldu',
  'appointment.update': 'Randevu guncellendi',
  'appointment.delete': 'Randevu silindi',
  'appointment.cancel': 'Randevu iptal edildi',

  // Settings
  'settings.update': 'Ayarlar guncellendi',
  'tenant.update': 'Isletme bilgileri guncellendi',
  'tenant.create': 'Yeni isletme olusturuldu',

  // User
  'user.create': 'Kullanici olusturuldu',
  'user.update': 'Kullanici guncellendi',
  'user.delete': 'Kullanici silindi',
  'user.invite': 'Kullanici davet edildi',

  // Role
  'role.create': 'Rol olusturuldu',
  'role.update': 'Rol guncellendi',
  'role.delete': 'Rol silindi',
  'role.assign': 'Rol atandi',

  // SMS / Campaigns
  'sms.send': 'SMS gonderildi',
  'sms.bulk_send': 'Toplu SMS gonderildi',
  'campaign.create': 'Kampanya olusturuldu',
  'campaign.send': 'Kampanya gonderildi',

  // Payment
  'payment.create': 'Odeme olusturuldu',
  'payment.update': 'Odeme guncellendi',
  'payment.refund': 'Odeme iade edildi',

  // Barcode
  'barcode.generate': 'Barkod uretildi',
  'barcode.validate': 'Barkod dogrulandi',

  // AI
  'ai.query': 'AI sorgusu yapildi',
  'ai.approve': 'AI islemi onaylandi',
  'ai.reject': 'AI islemi reddedildi',
  'ai.kill_switch': 'AI kill switch tetiklendi',

  // SGK
  'sgk.submit': 'SGK basvurusu yapildi',
  'sgk.download': 'SGK dosyasi indirildi',

  // Ticket
  'ticket.create': 'Destek talebi olusturuldu',
  'ticket.update': 'Destek talebi guncellendi',
  'ticket.close': 'Destek talebi kapatildi',

  // Subscription
  'subscription.create': 'Abonelik olusturuldu',
  'subscription.update': 'Abonelik guncellendi',
  'subscription.cancel': 'Abonelik iptal edildi',

  // Export / Report
  'export.create': 'Rapor disari aktarildi',
  'report.view': 'Rapor goruntulendi',
};

/**
 * Returns the Turkish human-readable label for a given action code.
 * Falls back to the raw action string if no mapping exists.
 */
function getActionLabelTR(action: string | undefined | null): string {
  if (!action) return '-';
  return ACTION_LABEL_TR[action] ?? action;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPaginationMeta(value: unknown): value is PaginationMeta {
  return isRecord(value);
}

function extractActivityLogList(value: unknown): { logs: ActivityLogItem[]; meta?: PaginationMeta } {
  if (Array.isArray(value)) {
    return { logs: value as ActivityLogItem[] };
  }

  if (!isRecord(value)) {
    return { logs: [] };
  }

  const response = value as ActivityLogListResponse;
  const nestedData = response.data;

  if (Array.isArray(nestedData)) {
    return {
      logs: nestedData,
      meta: response.meta ?? response.pagination,
    };
  }

  if (isRecord(nestedData)) {
    const nestedDataRecord = nestedData as Record<string, unknown>;
    const nestedLogs = Array.isArray(nestedData.logs)
      ? nestedData.logs
      : Array.isArray(nestedDataRecord.items)
        ? nestedDataRecord.items
        : [];

    return {
      logs: nestedLogs.length > 0 ? nestedLogs : response.logs ?? [],
      meta:
        (isPaginationMeta(nestedData.meta) ? nestedData.meta : undefined) ??
        (isPaginationMeta(nestedData.pagination) ? nestedData.pagination : undefined) ??
        response.meta ??
        response.pagination,
    };
  }

  return {
    logs: response.logs ?? (Array.isArray((value as Record<string, unknown>).items) ? (value as Record<string, unknown>).items as ActivityLogItem[] : []),
    meta: response.meta ?? response.pagination,
  };
}

function extractActivityLogStats(value: unknown): ActivityLogStats | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (isRecord(value.data)) {
    return value.data as ActivityLogStats;
  }

  return value as ActivityLogStats;
}

function extractFilterOptions(value: unknown): ActivityLogFilterOptions {
  if (!isRecord(value)) {
    return {};
  }

  const response = value as ActivityLogFilterOptionsResponse;
  return (response.options ?? response.data ?? response) as ActivityLogFilterOptions;
}

function getTopActionLabel(stats: ActivityLogStats): string {
  const topAction = stats.topActions?.[0] as TopAction | undefined;
  return getActionLabelTR(topAction?.action);
}

function formatDateTime(value?: string | null): string {
  return value ? new Date(value).toLocaleString('tr-TR') : '-';
}

function ActivityLogDetailModal({ log, onClose }: ActivityLogDetailModalProps) {
  return (
    <ResponsiveModal isOpen={true} onClose={onClose} title="Log Detayı">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Tarih</label>
            <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(log.createdAt)}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Aksiyon</label>
            <p className="font-medium text-gray-900 dark:text-white" title={log.action ?? undefined}>
              {getActionLabelTR(log.action)}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Kullanıcı</label>
            <p className="font-medium text-gray-900 dark:text-white">{log.userName || log.userId}</p>
            {log.userEmail && <p className="text-xs text-gray-500 dark:text-gray-400">{log.userEmail}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Tenant</label>
            <p className="font-medium text-gray-900 dark:text-white">{log.tenantName || log.tenantId || '-'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Şube</label>
            <p className="font-medium text-gray-900 dark:text-white">{log.branchName || log.branchId || '-'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Rol</label>
            <p className="font-medium text-gray-900 dark:text-white">{log.role || '-'}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Varlık</label>
            <p className="font-medium text-gray-900 dark:text-white">{log.entityType} - {log.entityId}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">IP Adresi</label>
            <p className="font-mono text-sm text-gray-900 dark:text-white">{log.ipAddress}</p>
          </div>
        </div>

        {log.message && (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Mesaj</label>
            <p className="font-medium text-gray-900 dark:text-white">{log.message}</p>
          </div>
        )}

        {log.data && Object.keys(log.data).length > 0 && (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Veri</label>
            <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl text-xs overflow-x-auto text-gray-900 dark:text-white">
              {JSON.stringify(log.data, null, 2)}
            </pre>
          </div>
        )}

        {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Detaylar</label>
            <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl text-xs overflow-x-auto text-gray-900 dark:text-white">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>
        )}

        {log.userAgent && (
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">User Agent</label>
            <p className="text-xs text-gray-600 dark:text-gray-400 break-all">{log.userAgent}</p>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}

export default function ActivityLogPage() {
  const { isMobile } = useAdminResponsive();
  const [filters, setFilters] = useState<ActivityLogFilters>({
    tenant_id: '',
    user_id: '',
    action: '',
    action_type: '',
    critical_only: 'false',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);

  const queryParams: ActivityLogListParams = {
    ...filters,
    critical_only: filters.critical_only === 'true',
    page,
    limit: pageSize,
  };

  const { data: logsData, isLoading } = useListActivityLogs(queryParams as ListActivityLogsParams);
  const { data: statsData } = useListActivityLogStats({});
  const { data: filterOptions } = useListActivityLogFilterOptions();

  const { logs, meta } = extractActivityLogList(logsData);
  const stats = extractActivityLogStats(statsData);
  const options = extractFilterOptions(filterOptions);

  const columns = [
    {
      key: 'critical',
      header: '',
      render: (log: ActivityLogItem) => log.isCritical ? (
        <AlertTriangle className="w-4 h-4 text-red-500" aria-label="Kritik İşlem" />
      ) : null,
    },
    {
      key: 'createdAt',
      header: 'Tarih',
      sortable: true,
      render: (log: ActivityLogItem) => (
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDateTime(log.createdAt)}
        </span>
      ),
    },
    {
      key: 'tenantName',
      header: 'Tenant',
      mobileHidden: true,
      sortable: true,
      render: (log: ActivityLogItem) => (
        <span className="text-gray-700 dark:text-gray-300 truncate" title={log.tenantName}>
          {log.tenantName || '-'}
        </span>
      ),
    },
    {
      key: 'userName',
      header: 'Kullanıcı',
      sortable: true,
      render: (log: ActivityLogItem) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white truncate">{log.userName || '-'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{log.userEmail}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Aksiyon',
      sortable: true,
      render: (log: ActivityLogItem) => (
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          title={log.action ?? undefined}
        >
          {getActionLabelTR(log.action)}
        </span>
      ),
    },
    {
      key: 'message',
      header: 'Mesaj',
      mobileHidden: true,
      render: (log: ActivityLogItem) => (
        <span className="text-gray-600 dark:text-gray-400 truncate" title={log.message ?? undefined}>
          {log.message || '-'}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP',
      mobileHidden: true,
      render: (log: ActivityLogItem) => (
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{log.ipAddress}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (log: ActivityLogItem) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(log);
          }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded touch-feedback"
          title="Detay"
        >
          <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      ),
    },
  ];

  return (
    <div className={isMobile ? 'p-4 pb-safe' : 'p-6 max-w-7xl mx-auto'}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Aktivite Logları
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Tüm tenantlardaki kullanıcı hareketleri</p>
        </div>
      </div>

      {stats && (
        <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Log</p>
            <p className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              {stats.total?.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Son 24 Saat</p>
            <p className={`font-bold text-blue-600 dark:text-blue-400 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              {stats.last24Hours?.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Kritik İşlemler</p>
            <p className={`font-bold text-red-600 dark:text-red-400 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              {stats.critical?.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">En Sık Aksiyon</p>
            <p className={`font-bold text-gray-900 dark:text-white truncate ${isMobile ? 'text-base' : 'text-lg'}`}>
              {getTopActionLabel(stats)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className={`grid gap-4 items-end ${isMobile ? 'grid-cols-1' : 'grid-cols-6'}`}>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Kullanıcı</label>
            <select
              className="w-full border dark:border-gray-600 rounded-2xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={filters.user_id}
              onChange={(e) => {
                setFilters({ ...filters, user_id: e.target.value });
                setPage(1);
              }}
            >
              <option value="">Tümü</option>
              {options.users?.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Aksiyon Tipi</label>
            <select
              className="w-full border dark:border-gray-600 rounded-2xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={filters.action_type}
              onChange={(e) => {
                setFilters({ ...filters, action_type: e.target.value });
                setPage(1);
              }}
            >
              <option value="">Tümü</option>
              {options.entityTypes?.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Aksiyon</label>
            <select
              className="w-full border dark:border-gray-600 rounded-2xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={filters.action}
              onChange={(e) => {
                setFilters({ ...filters, action: e.target.value });
                setPage(1);
              }}
            >
              <option value="">Tümü</option>
              {options.actions?.map((action) => (
                <option key={action} value={action}>{getActionLabelTR(action)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Kritik</label>
            <select
              className="w-full border dark:border-gray-600 rounded-2xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={filters.critical_only}
              onChange={(e) => {
                setFilters({ ...filters, critical_only: e.target.value as ActivityLogFilters['critical_only'] });
                setPage(1);
              }}
            >
              <option value="false">Tümü</option>
              <option value="true">Sadece Kritik</option>
            </select>
          </div>
          <div className={isMobile ? '' : 'col-span-2'}>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Arama</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mesaj veya aksiyon ara..."
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : (
          <>
            <ResponsiveTable
              data={logs}
              columns={columns}
              keyExtractor={(log) => log.id}
              onRowClick={(log) => setSelectedLog(log)}
              emptyMessage="Kayıt bulunamadı."
            />
            <Pagination
              currentPage={page}
              totalPages={meta?.totalPages || 1}
              totalItems={meta?.total || 0}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={setPageSize}
            />
          </>
        )}
      </div>

      {selectedLog && (
        <ActivityLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
