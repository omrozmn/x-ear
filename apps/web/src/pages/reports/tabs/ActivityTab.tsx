import React, { useState } from 'react';
import {
    AlertTriangle,
    Loader2,
    Calendar,
    Eye,
    FileText
} from 'lucide-react';
import { Button, Input, Select } from '@x-ear/ui-web';
import { unwrapObject, unwrapPaginated } from '../../../utils/response-unwrap';
import {
    useListActivityLogs,
    useListActivityLogFilterOptions
} from '@/api/client/reports.client';
import { ActivityLogDetailModal } from '../components/ActivityLogDetailModal';
import type { ActivityLogRead, ResponseMeta } from '@/api/generated/schemas';

export function ActivityTab() {
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
