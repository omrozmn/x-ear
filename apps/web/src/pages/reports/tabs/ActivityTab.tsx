import React, { useState } from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2,
    Filter,
    Eye,
    Download
} from 'lucide-react';
import { Button, Input, Select, Pagination } from '@x-ear/ui-web';
import { unwrapObject, unwrapPaginated } from '../../../utils/response-unwrap';
import {
    useListActivityLogs,
    useListActivityLogFilterOptions
} from '@/api/client/reports.client';
import { ActivityLogDetailModal } from '../components/ActivityLogDetailModal';
import type { ActivityLogRead, ResponseMeta } from '@/api/generated/schemas';

interface ActivityFilters {
    user_id?: string;
    action?: string;
    entity_type?: string;
    is_critical?: boolean;
    start_date?: string;
    end_date?: string;
}

export function ActivityTab() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<ActivityFilters>({});
    const [selectedLog, setSelectedLog] = useState<ActivityLogRead | null>(null);

    // Fetch filter options
    const { data: filterOptionsData } = useListActivityLogFilterOptions();
    const filterOptions = unwrapObject<{
        actions: string[];
        entity_types: string[];
        users: { id: string; name: string }[];
    }>(filterOptionsData);

    // Fetch logs
    const { data: logsData, isLoading, error, refetch } = useListActivityLogs({
        page,
        per_page: 20,
        ...filters
    });

    const { data: logs, meta } = unwrapPaginated<ActivityLogRead>(logsData);
    const typedMeta = meta as ResponseMeta | undefined;

    const handleFilterChange = (key: keyof ActivityFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value || undefined }));
        setPage(1);
    };

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

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sistem Aktivite Kayıtları</h3>
                <Button variant="outline" icon={<Download className="w-4 h-4" />}>
                    Dışa Aktar
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Filter className="w-4 h-4" />
                    Filtreler
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select
                        label="Kullanıcı"
                        value={filters.user_id || ''}
                        onChange={(e) => handleFilterChange('user_id', e.target.value)}
                        options={[
                            { value: '', label: 'Tüm Kullanıcılar' },
                            ...(filterOptions?.users?.map(u => ({ value: u.id, label: u.name })) || [])
                        ]}
                    />
                    <Select
                        label="İşlem Türü"
                        value={filters.action || ''}
                        onChange={(e) => handleFilterChange('action', e.target.value)}
                        options={[
                            { value: '', label: 'Tüm İşlemler' },
                            ...(filterOptions?.actions?.map(a => ({ value: a, label: a })) || [])
                        ]}
                    />
                    <Select
                        label="Varlık Türü"
                        value={filters.entity_type || ''}
                        onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                        options={[
                            { value: '', label: 'Tüm Varlıklar' },
                            ...(filterOptions?.entity_types?.map(t => ({ value: t, label: t })) || [])
                        ]}
                    />
                    <div className="flex gap-2">
                        <Input
                            type="date"
                            label="Başlangıç"
                            value={filters.start_date || ''}
                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                        />
                        <Input
                            type="date"
                            label="Bitiş"
                            value={filters.end_date || ''}
                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : logs.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-nowrap">Tarih</th>
                                        <th className="px-4 py-3 font-medium">Kullanıcı</th>
                                        <th className="px-4 py-3 font-medium">Aksiyon</th>
                                        <th className="px-4 py-3 font-medium">Varlık</th>
                                        <th className="px-4 py-3 font-medium">Mesaj</th>
                                        <th className="px-4 py-3 font-medium w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {logs.map((log) => (
                                        <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${log.isCritical ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {new Date(log.createdAt).toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                {log.userName || log.userId}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                {log.entityType}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={log.message || ''}>
                                                {log.message || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedLog(log)}
                                                    className="!p-1 h-auto"
                                                >
                                                    <Eye className="w-4 h-4 text-gray-500" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <Pagination
                                currentPage={page}
                                totalPages={typedMeta?.totalPages || 1}
                                onPageChange={setPage}
                                itemsPerPage={20}
                                totalItems={typedMeta?.total || logs.length}
                            />
                        </div>
                    </>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        Aktivite kaydı bulunamadı
                    </div>
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
