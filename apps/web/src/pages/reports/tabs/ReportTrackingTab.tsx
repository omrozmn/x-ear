import React, { useMemo, useState } from 'react';
import { Button, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { AlertTriangle, FileText, Loader2, RefreshCw, Search } from 'lucide-react';
import { useListReportTracking } from '@/api/client/reports.client';
import { unwrapPaginated } from '../../../utils/response-unwrap';
import type { ResponseMeta } from '@/api/generated/schemas';
import type { FilterState, ReportTrackingItem } from '../types';
import { TabExportButton } from '../components/TabExportButton';
import { usePermissions } from '@/hooks/usePermissions';

interface ReportTrackingTabProps {
    filters: FilterState;
}

const REPORT_STATUS_LABELS: Record<string, string> = {
    pending: 'Rapor Beklemede',
    received: 'Rapor Teslim Alındı',
    none: 'Rapor Yok',
    report_pending: 'Rapor Beklemede',
    report_delivered: 'Rapor Teslim Alındı',
    raporlu: 'Rapor Teslim Alındı',
    raporsuz: 'Rapor Yok',
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
    pending: 'Teslim Bekliyor',
    delivered: 'Teslim Edildi',
};

function getStatusLabel(value?: string, fallback = '-') {
    if (!value) return fallback;
    return REPORT_STATUS_LABELS[value] || DELIVERY_STATUS_LABELS[value] || value;
}

export function ReportTrackingTab({ filters }: ReportTrackingTabProps) {
    const { hasPermission } = usePermissions();
    const canViewDetails = hasPermission('sensitive.reports.report_tracking.details.view');
    const [page, setPage] = useState(1);
    const [reportStatus, setReportStatus] = useState('all');
    const [deliveryStatus, setDeliveryStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRow, setSelectedRow] = useState<ReportTrackingItem | null>(null);
    const effectiveStartDate = startDate || filters.dateRange.start || undefined;
    const effectiveEndDate = endDate || filters.dateRange.end || undefined;

    const { data: reportResponse, isLoading, error, refetch } = useListReportTracking({
        page,
        per_page: 20,
        branch_id: filters.branch,
        report_status: reportStatus,
        delivery_status: deliveryStatus,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        search: search || undefined,
    });

    const { data, meta } = unwrapPaginated<ReportTrackingItem>(reportResponse);
    const typedMeta = meta as ResponseMeta | undefined;

    const columns = useMemo<Column<ReportTrackingItem>[]>(() => [
        {
            key: 'partyName',
            title: 'Hasta',
            render: (_, item) => (
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">{canViewDetails ? item.partyName : 'Bu rol icin gizli'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.branchName || 'Şube yok'}</p>
                </div>
            )
        },
        {
            key: 'deviceName',
            title: 'Cihaz',
            render: (_, item) => (
                <div>
                    <p className="font-medium text-gray-900 dark:text-white">{canViewDetails ? (item.deviceName || '-') : 'Bu rol icin gizli'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{canViewDetails ? (item.serialNumber || 'Seri no yok') : 'Bu rol icin gizli'}</p>
                </div>
            )
        },
        {
            key: 'reportStatus',
            title: 'Rapor Durumu',
            render: (_, item) => (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {getStatusLabel(item.reportStatus)}
                </span>
            )
        },
        {
            key: 'deliveryStatus',
            title: 'Teslim Durumu',
            render: (_, item) => (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    item.deliveryStatus === 'delivered'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                    {getStatusLabel(item.deliveryStatus)}
                </span>
            )
        },
        {
            key: 'saleDate',
            title: 'Satış Tarihi',
            render: (_, item) => item.saleDate ? new Date(item.saleDate).toLocaleDateString('tr-TR') : '-'
        },
        {
            key: 'assignedDate',
            title: 'Kayıt Tarihi',
            render: (_, item) => item.assignedDate ? new Date(item.assignedDate).toLocaleString('tr-TR') : '-'
        },
        {
            key: 'id',
            title: '',
            render: (_, item) => (
                <Button variant="ghost" onClick={() => setSelectedRow(item)} className="!w-auto !h-auto px-2 py-1">
                    Detay
                </Button>
            )
        }
    ], []);

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
                <p className="text-gray-600 mb-4">Rapor takibi verileri yüklenirken hata oluştu</p>
                <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
                    Tekrar Dene
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rapor Takibi</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cihaz satışlarındaki rapor ve teslim durumlarını izleyin</p>
                </div>
                <TabExportButton filename="rapor-takibi" rows={data as unknown as Array<Record<string, unknown>>} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <select
                    data-allow-raw="true"
                    value={reportStatus}
                    onChange={(e) => { setReportStatus(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                >
                    <option value="all">Tüm Rapor Durumları</option>
                    <option value="pending">Rapor Beklemede</option>
                    <option value="received">Rapor Teslim Alındı</option>
                    <option value="none">Rapor Yok</option>
                </select>

                <select
                    data-allow-raw="true"
                    value={deliveryStatus}
                    onChange={(e) => { setDeliveryStatus(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                >
                    <option value="all">Tüm Teslim Durumları</option>
                    <option value="pending">Teslim Bekliyor</option>
                    <option value="delivered">Teslim Edildi</option>
                </select>

                <input
                    data-allow-raw="true"
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />

                <input
                    data-allow-raw="true"
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />

                <div className="md:col-span-4">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            data-allow-raw="true"
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Hasta, seri no veya satış no ara"
                            className="w-full bg-transparent text-sm outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
                <DataTable<ReportTrackingItem>
                    data={data}
                    columns={columns}
                    rowKey="id"
                    emptyText="Filtrelere uygun kayıt bulunamadı"
                    striped
                    hoverable
                    size="medium"
                    pagination={typedMeta?.total ? {
                        current: page,
                        pageSize: 20,
                        total: typedMeta.total,
                        onChange: (nextPage) => setPage(nextPage),
                    } : undefined}
                />
            </div>

            {selectedRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 p-6 mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Takip Detayı</h4>
                            <Button variant="ghost" onClick={() => setSelectedRow(null)} className="!w-auto !h-auto px-2 py-1">Kapat</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-gray-500">Hasta</span><p className="font-medium">{canViewDetails ? (selectedRow.partyName || '-') : 'Bu rol icin gizli'}</p></div>
                            <div><span className="text-gray-500">Şube</span><p className="font-medium">{selectedRow.branchName || '-'}</p></div>
                            <div><span className="text-gray-500">Cihaz</span><p className="font-medium">{canViewDetails ? (selectedRow.deviceName || '-') : 'Bu rol icin gizli'}</p></div>
                            <div><span className="text-gray-500">Seri No</span><p className="font-medium">{canViewDetails ? (selectedRow.serialNumber || '-') : 'Bu rol icin gizli'}</p></div>
                            <div><span className="text-gray-500">Rapor Durumu</span><p className="font-medium">{getStatusLabel(selectedRow.reportStatus)}</p></div>
                            <div><span className="text-gray-500">Teslim Durumu</span><p className="font-medium">{getStatusLabel(selectedRow.deliveryStatus)}</p></div>
                            <div><span className="text-gray-500">Satış Tarihi</span><p className="font-medium">{selectedRow.saleDate ? new Date(selectedRow.saleDate).toLocaleString('tr-TR') : '-'}</p></div>
                            <div><span className="text-gray-500">Kayıt Tarihi</span><p className="font-medium">{selectedRow.assignedDate ? new Date(selectedRow.assignedDate).toLocaleString('tr-TR') : '-'}</p></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
