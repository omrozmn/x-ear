import React, { useState, useMemo, useEffect } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  FileText,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Eye,
  X,
  Receipt,
  CreditCard,
  Wallet,
  Phone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { Button, Input, Select } from '@x-ear/ui-web';
import { usePermissions } from '../hooks/usePermissions';
import { unwrapObject, unwrapArray, unwrapPaginated } from '../utils/response-unwrap';
import {
  useListReportOverview,
  useListReportPatients as useListReportParties,
  useListReportFinancial,
  useListActivityLogs,
  useListReportPromissoryNotes,
  useListReportPromissoryNoteByPatient as useListReportPromissoryNoteByParty,
  useListReportPromissoryNoteList,
  getListReportPromissoryNoteListQueryKey,
  useListReportRemainingPayments,
  useListReportCashflowSummary,
  useListReportPosMovements,
  getListReportOverviewQueryKey,
  getListReportFinancialQueryKey,
  getListReportPatientsQueryKey as getListReportPartiesQueryKey,
  useListActivityLogFilterOptions,
} from '@/api/client/reports.client';
import type { 
  PromissoryNoteListItem, 
  PromissoryNotePatientItem, 
  PosMovementItem, 
  ReportPromissoryNotesResponse,
  ResponseMeta,
  RemainingPaymentItem,
  ActivityLogRead
} from '@/api/generated/schemas';

type TabId = 'overview' | 'sales' | 'parties' | 'promissory' | 'remaining' | 'activity' | 'pos_movements';

interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  branch?: string;
  days: number;
}

interface ReportOverview {
  total_revenue?: number;
  total_sales?: number;
  appointment_rate?: number;
  conversion_rate?: number;
  total_parties?: number;
  new_parties?: number;
  total_appointments?: number;
}

interface ReportFinancial {
  payment_methods?: Record<string, { amount: number }>;
  revenue_trend?: Record<string, number>;
  product_sales?: Record<string, { sales: number; revenue: number }>;
}

interface ReportParties {
  party_segments?: {
    new: number;
    active: number;
    trial: number;
    inactive: number;
  };
  status_distribution?: Record<string, number>;
}

// Use generated types instead of custom interfaces
type ReportPromissoryNotes = ReportPromissoryNotesResponse;
type ReportPromissoryNoteByParty = PromissoryNotePatientItem;
type ReportPromissoryNoteListItem = PromissoryNoteListItem;

// Activity Log Detail Modal
function ActivityLogDetailModal({ log, onClose }: { log: ActivityLogRead; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aktivite Log Detayı</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 !w-auto !h-auto"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Tarih</label>
                <p className="font-medium text-gray-900 dark:text-white">
                  {log.createdAt ? new Date(log.createdAt).toLocaleString('tr-TR') : '-'}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Aksiyon</label>
                <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Kullanıcı</label>
                <p className="font-medium text-gray-900 dark:text-white">{log.userName || log.userId || '-'}</p>
                {log.userEmail && <p className="text-xs text-gray-500 dark:text-gray-400">{log.userEmail}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Varlık</label>
                <p className="font-medium text-gray-900 dark:text-white">
                  {log.entityType || '-'} {log.entityId ? `- ${log.entityId}` : ''}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Kritik</label>
                <p className="font-medium text-gray-900 dark:text-white">{log.isCritical ? 'Evet' : 'Hayır'}</p>
              </div>
            </div>

            {log.message && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Mesaj</label>
                <p className="font-medium text-gray-900 dark:text-white">{log.message}</p>
              </div>
            )}

            {log.details && (
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Detaylar</label>
                <pre className="bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg text-xs overflow-x-auto text-gray-900 dark:text-gray-300">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="outline" className="w-full">
            Kapat
          </Button>
        </div>
      </div>
    </div>
  );
}

// No Permission Component
function NoPermission() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <ShieldAlert className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Erişim Yetkiniz Yok</h3>
      <p className="text-gray-500 text-center max-w-md">
        Bu sayfayı görüntülemek için gerekli izinlere sahip değilsiniz.
        Yöneticinizle iletişime geçin.
      </p>
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, icon: Icon, color, trend, subtitle }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'purple' | 'yellow' | 'red';
  trend?: { value: string; direction: 'up' | 'down' };
  subtitle?: string;
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
    red: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
  };

  return (
    <div className={`rounded-xl p-6 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-8 h-8" />
        {trend && (
          <span className={`text-sm font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Overview Tab Content
function OverviewTab({ filters }: { filters: FilterState }) {
  const { data: overviewData, isLoading, error, refetch } = useListReportOverview(
    { days: filters.days },
    { query: { queryKey: [...getListReportOverviewQueryKey({ days: filters.days })] } }
  );

  const { data: financialData } = useListReportFinancial(
    { days: filters.days },
    { query: { queryKey: [...getListReportFinancialQueryKey({ days: filters.days })] } }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Veriler yüklenirken hata oluştu</p>
        <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const overview = unwrapObject<ReportOverview>(overviewData);
  const financial = unwrapObject<ReportFinancial>(financialData);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Toplam Ciro"
          value={formatCurrency(overview?.total_revenue || 0)}
          icon={DollarSign}
          color="green"
          subtitle={`${filters.days} günlük`}
        />
        <KPICard
          title="Toplam Satış"
          value={overview?.total_sales || 0}
          icon={FileText}
          color="blue"
        />
        <KPICard
          title="Randevu Oranı"
          value={`%${overview?.appointment_rate || 0}`}
          icon={Calendar}
          color="purple"
        />
        <KPICard
          title="Dönüşüm Oranı"
          value={`%${overview?.conversion_rate || 0}`}
          icon={TrendingUp}
          color="yellow"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hasta İstatistikleri</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Toplam Hasta</span>
              <span className="font-semibold text-gray-900 dark:text-white">{overview?.total_parties || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Yeni Hastalar ({filters.days} gün)</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{overview?.new_parties || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Toplam Randevu</span>
              <span className="font-semibold text-gray-900 dark:text-white">{overview?.total_appointments || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ödeme Yöntemleri</h3>
          <div className="space-y-3">
            {financial?.payment_methods && Object.entries(financial.payment_methods).map(([method, data]) => (
              <div key={method} className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 capitalize">{method}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(data.amount || 0)}</span>
              </div>
            ))}
            {(!financial?.payment_methods || Object.keys(financial.payment_methods).length === 0) && (
              <p className="text-gray-400 text-sm">Veri bulunamadı</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sales Tab Content
function SalesTab({ filters }: { filters: FilterState }) {
  const { data: financialData, isLoading, error, refetch } = useListReportFinancial(
    { days: filters.days },
    { query: { queryKey: [...getListReportFinancialQueryKey({ days: filters.days })] } }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Veriler yüklenirken hata oluştu</p>
        <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const financial = unwrapObject<ReportFinancial>(financialData);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Satış Performansı Analizi</h3>

      {/* Revenue Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Aylık Gelir Trendi</h4>
        {financial?.revenue_trend && Object.keys(financial.revenue_trend).length > 0 ? (
          <div className="grid grid-cols-6 gap-4">
            {Object.entries(financial.revenue_trend).map(([month, amount]) => (
              <div key={month} className="text-center">
                <div className="h-24 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-end justify-center mb-2">
                  <div
                    className="bg-blue-500 rounded w-full"
                    style={{ height: `${Math.min(100, (amount / Math.max(...Object.values(financial.revenue_trend as object).map(Number)) * 100))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{month}. Ay</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Veri bulunamadı</p>
        )}
      </div>

      {/* Product Sales */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Marka Bazlı Satışlar</h4>
        {financial?.product_sales && Object.keys(financial.product_sales).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Marka</th>
                  <th className="px-4 py-3 font-medium text-right">Satış Adedi</th>
                  <th className="px-4 py-3 font-medium text-right">Gelir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(financial.product_sales).map(([brand, data]) => (
                  <tr key={brand} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                    <td className="px-4 py-3 font-medium">{brand}</td>
                    <td className="px-4 py-3 text-right">{data.sales || 0}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {formatCurrency(data.revenue || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">Veri bulunamadı</p>
        )}
      </div>
    </div>
  );
}

// Parties Tab Content
function PartiesTab({ filters }: { filters: FilterState }) {
  const { data: partiesData, isLoading, error, refetch } = useListReportParties(
    { days: filters.days },
    { query: { queryKey: [...getListReportPartiesQueryKey({ days: filters.days })] } }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Veriler yüklenirken hata oluştu</p>
        <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const parties = unwrapObject<ReportParties>(partiesData);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Hasta Analizi</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Party Segments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Hasta Segmentleri</h4>
          <div className="space-y-4">
            {parties?.party_segments && (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">Yeni Hastalar</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{parties.party_segments.new || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">Aktif Hastalar</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{parties.party_segments.active || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-gray-600 dark:text-gray-400">Deneme Aşamasında</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{parties.party_segments.trial || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Pasif Hastalar</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{parties.party_segments.inactive || 0}</span>
                </div>
              </>
            )}
            {!parties?.party_segments && (
              <p className="text-gray-400 text-sm">Veri bulunamadı</p>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Randevu Durumu Dağılımı</h4>
          <div className="space-y-4">
            {parties?.status_distribution && Object.keys(parties.status_distribution).length > 0 ? (
              Object.entries(parties.status_distribution).map(([status, count]) => {
                const statusLabels: Record<string, string> = {
                  'SCHEDULED': 'Planlandı',
                  'COMPLETED': 'Tamamlandı',
                  'CANCELLED': 'İptal Edildi',
                  'NO_SHOW': 'Gelmedi',
                  'IN_PROGRESS': 'Devam Ediyor',
                  'PENDING': 'Beklemede',
                  'CONFIRMED': 'Onaylandı',
                };
                return (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">{statusLabels[status] || status}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm">Veri bulunamadı</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Promissory Notes Tab Content
function PromissoryNotesTab() {
  const [showListModal, setShowListModal] = useState(false);
  const [listFilter, setListFilter] = useState<'active' | 'overdue' | 'paid' | 'all'>('active');
  const [listPage, setListPage] = useState(1);

  // Using Orval-generated hooks for promissory notes reports
  const { data: notesData, isLoading, error, refetch } = useListReportPromissoryNotes({
    days: 365
  });

  const { data: byPartyData, isLoading: partyLoading } = useListReportPromissoryNoteByParty({
    status: 'active',
    page: 1,
    per_page: 10
  });

  const { data: listData, isLoading: listLoading } = useListReportPromissoryNoteList(
    { status: listFilter, page: listPage, per_page: 20 },
    { query: { queryKey: [...getListReportPromissoryNoteListQueryKey({ status: listFilter, page: listPage, per_page: 20 })], enabled: showListModal } }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return months[month - 1] || '';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Veriler yüklenirken hata oluştu</p>
        <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const notes = unwrapObject<ReportPromissoryNotes>(notesData);
  const byParty = unwrapArray<ReportPromissoryNoteByParty>(byPartyData);
  const { data: list, meta: listMeta } = unwrapPaginated<PromissoryNoteListItem>(listData);
  const typedListMeta = listMeta as ResponseMeta | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Senet Raporları</h3>
        <Button
          onClick={() => setShowListModal(true)}
          variant="outline"
          icon={<FileText className="w-4 h-4" />}
        >
          Tüm Senetleri Görüntüle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Toplam Senet</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{notes?.summary?.totalNotes || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Tahsil Edilen</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(notes?.summary?.totalCollected || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/40 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Aktif Senet</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{notes?.summary?.activeNotes || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-2 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">Vadesi Geçmiş</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">{notes?.summary?.overdueNotes || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Note Count */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Aylık Senet Sayısı</h4>
          {notes?.monthlyCounts && notes.monthlyCounts.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {notes.monthlyCounts.map((item, idx) => {
                const counts = notes.monthlyCounts || [];
                const maxCount = Math.max(...counts.map((i) => i.count));
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${item.count} senet`}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getMonthName(item.month)}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{item.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Veri bulunamadı</p>
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Aylık Senet Tahsilatı</h4>
          {notes?.monthlyRevenue && notes.monthlyRevenue.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {notes.monthlyRevenue.map((item, idx) => {
                const revenues = notes.monthlyRevenue || [];
                const maxRevenue = Math.max(...revenues.map((i) => i.revenue));
                const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={formatCurrency(item.revenue)}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getMonthName(item.month)}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{formatCurrency(item.revenue)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Veri bulunamadı</p>
          )}
        </div>
      </div>

      {/* Parties with Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Hasta Bazlı Senet Özeti</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Aktif senedi olan hastalar</p>
        </div>
        {partyLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : byParty.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Hasta</th>
                  <th className="px-4 py-3 font-medium text-center">Aktif</th>
                  <th className="px-4 py-3 font-medium text-center">Vadesi Geçmiş</th>
                  <th className="px-4 py-3 font-medium text-right">Toplam Tutar</th>
                  <th className="px-4 py-3 font-medium text-right">Kalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {byParty.map((party) => (
                  <tr key={party.partyId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{party.partyName}</p>
                      {party.phone && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {party.phone}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {party.activeNotes}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {party.overdueNotes > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                          {party.overdueNotes}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(party.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {formatCurrency(party.remainingAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Aktif senedi olan hasta bulunamadı</p>
          </div>
        )}
      </div>

      {/* Promissory Notes List Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Senet Listesi</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tüm senetleri görüntüle ve filtrele</p>
              </div>
              <Button
                onClick={() => setShowListModal(false)}
                variant="ghost"
                className="p-1 hover:bg-gray-100 rounded !w-auto !h-auto"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 pt-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                {[
                  { key: 'active', label: 'Aktif' },
                  { key: 'overdue', label: 'Vadesi Geçmiş' },
                  { key: 'paid', label: 'Ödendi' },
                  { key: 'all', label: 'Tümü' }
                ].map(tab => (
                  <Button
                    key={tab.key}
                    onClick={() => { setListFilter(tab.key as "active" | "overdue" | "paid" | "all"); setListPage(1); }}
                    variant="ghost"
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors !w-auto !h-auto rounded-none rounded-t-md ${listFilter === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {listLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : list.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">Senet No</th>
                      <th className="px-3 py-2 font-medium">Hasta</th>
                      <th className="px-3 py-2 font-medium text-right">Tutar</th>
                      <th className="px-3 py-2 font-medium text-right">Kalan</th>
                      <th className="px-3 py-2 font-medium">Vade</th>
                      <th className="px-3 py-2 font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {list.map((note: ReportPromissoryNoteListItem) => (
                      <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                        <td className="px-3 py-2 font-mono text-xs">
                          {note.noteNumber || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{note.party?.name || '-'}</p>
                        </td>
                        <td className="px-3 py-2 text-right">{formatCurrency(note.amount)}</td>
                        <td className="px-3 py-2 text-right font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(note.remainingAmount)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {note.dueDate ? new Date(note.dueDate).toLocaleDateString('tr-TR') : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${note.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            note.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                              note.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            }`}>
                            {note.status === 'paid' ? 'Ödendi' :
                              note.status === 'overdue' ? 'Vadesi Geçti' :
                                note.status === 'partial' ? 'Kısmi' : 'Aktif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Senet bulunamadı</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {typedListMeta && typedListMeta.totalPages && typedListMeta.totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Toplam {typedListMeta.total || 0} senet
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setListPage(p => Math.max(1, p - 1))}
                    disabled={listPage === 1}
                    variant="outline"
                    className="p-1.5 border rounded disabled:opacity-50 hover:bg-gray-100 !w-auto !h-auto"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    {listPage} / {typedListMeta.totalPages}
                  </span>
                  <Button
                    onClick={() => setListPage(p => Math.min(typedListMeta.totalPages || 1, p + 1))}
                    disabled={listPage >= (typedListMeta.totalPages || 1)}
                    variant="outline"
                    className="p-1.5 border rounded disabled:opacity-50 hover:bg-gray-100 !w-auto !h-auto"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="p-4 border-t">
              <Button onClick={() => setShowListModal(false)} variant="outline" className="w-full">
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Remaining Payments Tab Content
function RemainingPaymentsTab({ filters }: { filters: FilterState }) {
  const [page, setPage] = useState(1);
  const [minAmount, setMinAmount] = useState(0);

  // Using Orval-generated hooks for reports API
  const { data: paymentsData, isLoading, error, refetch } = useListReportRemainingPayments(
    { page, per_page: 20, min_amount: minAmount }
  );

  const { data: cashflowData } = useListReportCashflowSummary(
    { days: filters.days }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Veriler yüklenirken hata oluştu</p>
        <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const { data: payments, meta } = unwrapPaginated<RemainingPaymentItem>(paymentsData);
  const typedMeta = meta as ResponseMeta | undefined;
  const paymentsSummary = unwrapObject<{ summary?: { totalRemaining?: number; totalPaid?: number; totalParties?: number } }>(paymentsData);
  const summary = paymentsSummary?.summary;
  const cashflowData_unwrapped = unwrapObject<{ totalIncome?: number; totalExpense?: number; netCashflow?: number }>(cashflowData);
  const cashflow = cashflowData_unwrapped;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Kalan Ödemeler & Kasa Özeti</h3>

      {/* Cashflow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl p-5 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Toplam Gelir</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(cashflow?.totalIncome || 0)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Son {filters.days} gün</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 rounded-xl p-5 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-3 rounded-xl">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {formatCurrency(cashflow?.totalExpense || 0)}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">Son {filters.days} gün</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-3 rounded-xl">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Net Nakit</p>
              <p className={`text-2xl font-bold ${(cashflow?.netCashflow || 0) >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                {formatCurrency(cashflow?.netCashflow || 0)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Son {filters.days} gün</p>
            </div>
          </div>
        </div>
      </div>

      {/* Remaining Payments Summary */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/40 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400">Tahsil Edilecek Toplam</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                {formatCurrency(summary?.totalRemaining || 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-orange-600 dark:text-orange-400">Borçlu Hasta Sayısı</p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{summary?.totalParties || 0}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Minimum Tutar</label>
            <Select
              className="px-3 py-1.5 text-sm"
              value={String(minAmount)}
              onChange={(e) => { setMinAmount(Number(e.target.value)); setPage(1); }}
              options={[
                { value: "0", label: "Tümü" },
                { value: "1000", label: "1.000 ₺ ve üzeri" },
                { value: "5000", label: "5.000 ₺ ve üzeri" },
                { value: "10000", label: "10.000 ₺ ve üzeri" },
                { value: "25000", label: "25.000 ₺ ve üzeri" }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Parties with Remaining Payments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Kalan Ödemeler - Hasta Listesi</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ödemesi kalan hastalar</p>
        </div>

        {payments.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-medium">Hasta</th>
                    <th className="px-4 py-3 font-medium text-center">Satış Sayısı</th>
                    <th className="px-4 py-3 font-medium text-right">Toplam Tutar</th>
                    <th className="px-4 py-3 font-medium text-right">Ödenen</th>
                    <th className="px-4 py-3 font-medium text-right">Kalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payments.map((party) => (
                    <tr key={party.partyId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                      <td className="px-4 py-3">
                        <p className="font-medium">{party.partyName}</p>
                        {party.phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {party.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {party.saleCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(party.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {formatCurrency(party.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {formatCurrency(party.remainingAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {typedMeta && typedMeta.totalPages && typedMeta.totalPages > 1 && (
              <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Toplam {typedMeta.total || 0} hasta
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    className="px-3 py-1.5 text-sm disabled:opacity-50 !w-auto !h-auto"
                  >
                    Önceki
                  </Button>
                  <span className="text-sm">{page} / {typedMeta.totalPages}</span>
                  <Button
                    onClick={() => setPage(p => Math.min(typedMeta.totalPages || 1, p + 1))}
                    disabled={page >= (typedMeta.totalPages || 1)}
                    variant="outline"
                    className="px-3 py-1.5 text-sm disabled:opacity-50 !w-auto !h-auto"
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Ödemesi kalan hasta bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Activity Tab Content
function ActivityTab() {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedLog, setSelectedLog] = useState<ActivityLogRead | null>(null);
  const [activityFilters, setActivityFilters] = useState({
    action: '',
    user_id: '',
    search: ''
  });

  const { data: logsResponse, isLoading } = useListActivityLogs({
    action: activityFilters.action || undefined,
    user_id: activityFilters.user_id || undefined,
    search: activityFilters.search || undefined,
    page,
    limit: perPage
  });

  // Replace stub with generated hook
  const { data: filterOptions } = useListActivityLogFilterOptions();

  const { data: logs, pagination } = unwrapPaginated<ActivityLogRead>(logsResponse);
  const typedPagination = pagination as ResponseMeta | undefined;
  const options = unwrapObject<{ actions?: string[]; users?: Array<{ id: string; name: string }> }>(filterOptions);

  return (
    <div className="space-y-6">
      {/* Activity Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Kullanıcı</label>
            <Select
              className="w-full text-sm"
              value={activityFilters.user_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActivityFilters({ ...activityFilters, user_id: e.target.value })}
              options={[
                { value: "", label: "Tüm Kullanıcılar" },
                ...(options?.users?.map((u: { id: string; name: string }) => ({ value: u.id, label: u.name })) || [])
              ]}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Aksiyon</label>
            <Select
              className="w-full text-sm"
              value={activityFilters.action}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActivityFilters({ ...activityFilters, action: e.target.value })}
              options={[
                { value: "", label: "Tüm Aksiyonlar" },
                ...(options?.actions?.map((action: string) => ({ value: action, label: action })) || [])
              ]}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Arama</label>
            <Input
              type="text"
              className="w-full text-sm"
              placeholder="Mesaj veya aksiyon ara..."
              value={activityFilters.search}
              onChange={(e) => setActivityFilters({ ...activityFilters, search: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-medium w-10"></th>
                    <th className="px-4 py-3 font-medium">Tarih</th>
                    <th className="px-4 py-3 font-medium">Kullanıcı</th>
                    <th className="px-4 py-3 font-medium">Aksiyon</th>
                    <th className="px-4 py-3 font-medium">Mesaj</th>
                    <th className="px-4 py-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3">
                        {log.isCritical && (
                          <span title="Kritik İşlem">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {log.createdAt && new Date(log.createdAt).toLocaleString('tr-TR')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                          {log.userName || '-'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                          {log.userEmail}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[250px] truncate" title={log.message || undefined}>
                        {log.message || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          onClick={() => setSelectedLog(log)}
                          variant="ghost"
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors !w-auto !h-auto"
                          title="Detay"
                        >
                          <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>Kayit bulunamadi.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {typedPagination && typedPagination.total && typedPagination.total > 0 && (
              <div className="px-4 py-3 border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam {typedPagination.total} kayit, Sayfa {page}/{typedPagination.totalPages || 1}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    className="px-3 py-1.5 text-sm disabled:opacity-50 !w-auto !h-auto"
                  >
                    Onceki
                  </Button>
                  <Select
                    value={String(perPage)}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1.5 text-sm"
                    options={[
                      { value: "10", label: "10" },
                      { value: "20", label: "20" },
                      { value: "50", label: "50" }
                    ]}
                  />
                  <Button
                    onClick={() => setPage(p => Math.min(Number(typedPagination.totalPages || 1), p + 1))}
                    disabled={page >= Number(typedPagination.totalPages || 1)}
                    variant="outline"
                    className="px-3 py-1.5 text-sm disabled:opacity-50 !w-auto !h-auto"
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <ActivityLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}


// POS Movements Tab Content
function PosMovementsTab({ filters }: { filters: FilterState }) {
  const [page, setPage] = useState(1);
  // Using Orval-generated hook for POS movements
  const { data: reportData, isLoading, error, refetch } = useListReportPosMovements(
    { page, per_page: 20, days: filters.days }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Veriler yüklenirken hata oluştu</p>
        <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const { data, meta } = unwrapPaginated<PosMovementItem>(reportData);
  const typedPosMeta = meta as ResponseMeta | undefined;
  const posData_unwrapped = unwrapObject<{ summary?: { totalAmount?: number; successCount?: number; failCount?: number; transactionCount?: number } }>(reportData);
  const summary = posData_unwrapped?.summary;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">POS Hareketleri</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl p-5 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-3 rounded-xl">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Toplam Başarılı İşlem</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(summary?.totalAmount || 0)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">{summary?.successCount || 0} işlem</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 rounded-xl p-5 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">Başarısız İşlemler</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {summary?.failCount || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tarih</th>
                    <th className="px-4 py-3 font-medium">İşlem ID</th>
                    <th className="px-4 py-3 font-medium">Hasta</th>
                    <th className="px-4 py-3 font-medium">Tutar</th>
                    <th className="px-4 py-3 font-medium">Taksit</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Satış Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.map((item: PosMovementItem) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(item.date).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.posTransactionId || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {item.patientName || '-'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {item.installment && item.installment > 1 ? `${item.installment} Taksit` : 'Tek Çekim'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {item.status === 'paid' ? 'Başarılı' : 'Başarısız'}
                        </span>
                        {item.errorMessage && (
                          <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={item.errorMessage}>
                            {item.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {item.saleId || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {typedPosMeta && typedPosMeta.totalPages && typedPosMeta.totalPages > 1 && (
              <div className="px-4 py-3 border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Toplam {typedPosMeta.total || 0} işlem
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    variant="outline"
                    className="px-3 py-1.5 text-sm disabled:opacity-50 !w-auto !h-auto"
                  >
                    Önceki
                  </Button>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{page} / {typedPosMeta.totalPages}</span>
                  <Button
                    onClick={() => setPage(p => Math.min(Number(typedPosMeta.totalPages || 1), p + 1))}
                    disabled={page >= Number(typedPosMeta.totalPages || 1)}
                    variant="outline"
                    className="px-3 py-1.5 text-sm disabled:opacity-50 !w-auto !h-auto"
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>Bu tarih aralığında POS işlemi bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Reports Page

export function DesktopReportsPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const search = useSearch({ from: '/reports/' });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>(() => search.tab || 'overview');
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    days: 30
  });

  // Sync URL param with state
  useEffect(() => {
    if (search.tab && search.tab !== activeTab) {
      setActiveTab(search.tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.tab]);

  // Update URL when tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    navigate({ to: '/reports', search: { tab: tabId } });
  };

  // Permission check
  const canViewReports = hasPermission('reports.view');
  const canExportReports = hasPermission('reports.export');
  const canViewActivityLogs = hasPermission('activity_logs.view') || hasPermission('reports.view');

  // Tab definitions with permissions
  const tabs = useMemo(() => [
    { id: 'overview' as const, label: 'Genel Bakış', icon: BarChart3, permission: 'reports.view' },
    { id: 'sales' as const, label: 'Satış Raporları', icon: TrendingUp, permission: 'reports.view' },
    { id: 'parties' as const, label: 'Hasta Raporları', icon: Users, permission: 'reports.view' },
    { id: 'promissory' as const, label: 'Senet Raporları', icon: Receipt, permission: 'reports.view' },
    { id: 'remaining' as const, label: 'Kalan Ödemeler', icon: Wallet, permission: 'reports.view' },
    { id: 'pos_movements' as const, label: 'POS Hareketleri', icon: CreditCard, permission: 'reports.view' },
    { id: 'activity' as const, label: 'İşlem Dökümü', icon: Activity, permission: 'activity_logs.view' }
  ], []);

  // Filter allowed tabs based on permissions
  const allowedTabs = useMemo(() => {
    return tabs.filter(tab => {
      if (tab.permission === 'activity_logs.view') {
        return canViewActivityLogs;
      }
      return canViewReports;
    });
  }, [tabs, canViewReports, canViewActivityLogs]);

  // Reset to first allowed tab if current is not allowed
  React.useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.find(t => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [allowedTabs, activeTab]);

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exporting report as ${format}`);
    // TODO: Implement export with proper API call
  };

  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No permission at all
  if (!canViewReports && !canViewActivityLogs) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <NoPermission />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-7 h-7 text-blue-600" />
                Raporlar ve Analizler
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Satış performansı, hasta analizleri ve işlem dökümleri
              </p>
            </div>
            {canExportReports && (
              <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
                <Button
                  onClick={() => handleExport('pdf')}
                  variant="outline"
                  icon={<Download className="w-4 h-4" />}
                >
                  PDF İndir
                </Button>
                <Button
                  onClick={() => handleExport('excel')}
                  variant="outline"
                  icon={<Download className="w-4 h-4" />}
                >
                  Excel İndir
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters - Only show for report tabs, not activity */}
        {activeTab !== 'activity' && canViewReports && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtreler:</span>
              </div>
              <div>
                <Select
                  className="px-3 py-2 text-sm"
                  value={String(filters.days)}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters(prev => ({ ...prev, days: Number(e.target.value) }))}
                  options={[
                    { value: "7", label: "Son 7 Gun" },
                    { value: "30", label: "Son 30 Gun" },
                    { value: "90", label: "Son 90 Gun" },
                    { value: "365", label: "Son 1 Yil" }
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
              {allowedTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    variant="ghost"
                    className={`${isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 rounded-none'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors !w-auto !h-auto rounded-none`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && canViewReports && <OverviewTab filters={filters} />}
            {activeTab === 'sales' && canViewReports && <SalesTab filters={filters} />}
            {activeTab === 'parties' && canViewReports && <PartiesTab filters={filters} />}
            {activeTab === 'promissory' && canViewReports && <PromissoryNotesTab />}
            {activeTab === 'remaining' && canViewReports && <RemainingPaymentsTab filters={filters} />}
            {activeTab === 'pos_movements' && canViewReports && <PosMovementsTab filters={filters} />}
            {activeTab === 'activity' && canViewActivityLogs && <ActivityTab />}

            {/* Show no permission if tab doesn't match permissions */}
            {activeTab === 'overview' && !canViewReports && <NoPermission />}
            {activeTab === 'sales' && !canViewReports && <NoPermission />}
            {activeTab === 'parties' && !canViewReports && <NoPermission />}
            {activeTab === 'promissory' && !canViewReports && <NoPermission />}
            {activeTab === 'remaining' && !canViewReports && <NoPermission />}
            {activeTab === 'pos_movements' && !canViewReports && <NoPermission />}
            {activeTab === 'activity' && !canViewActivityLogs && <NoPermission />}
          </div>
        </div>
      </div>
    </div>
  );
}

