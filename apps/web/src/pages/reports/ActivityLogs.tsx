import React, { useState } from 'react';
import {
    Search,
    Loader2,
    AlertTriangle,
    X,
    Eye,
    Calendar,
    FileText
} from 'lucide-react';
import {
    useListActivityLogs,
    useListActivityLogStats
} from '@/api/client/activity-logs.client';
import type { ActivityLogRead, ListActivityLogsParams } from '@/api/generated/schemas';
import { Button, Input, Select } from '@x-ear/ui-web';

// Extended interface to cover properties present in API response but missing from current schema
interface ExtendedActivityLogRead extends ActivityLogRead {
    ipAddress?: string;
    branchName?: string;
    branchId?: string;
    role?: string;
    partyName?: string;
    data?: Record<string, unknown>;
    userAgent?: string;
}

interface ActivityLogDetailModalProps {
    log: ExtendedActivityLogRead;
    onClose: () => void;
}

function ActivityLogDetailModal({ log, onClose }: ActivityLogDetailModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold dark:text-white">Aktivite Log Detayı</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="p-1"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="p-4 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Tarih</label>
                                <p className="font-medium dark:text-gray-200">{log.createdAt ? new Date(String(log.createdAt)).toLocaleString('tr-TR') : '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Aksiyon</label>
                                <p className="font-medium dark:text-gray-200">{log.action}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Kullanıcı</label>
                                <p className="font-medium dark:text-gray-200">{log.userName || log.userId}</p>
                                {log.userEmail && <p className="text-xs text-gray-500 dark:text-gray-400">{log.userEmail}</p>}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Şube</label>
                                <p className="font-medium dark:text-gray-200">{log.branchName || log.branchId || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Rol</label>
                                <p className="font-medium dark:text-gray-200">{log.role || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Varlık</label>
                                <p className="font-medium dark:text-gray-200">
                                    {log.entityType} - {log.partyName ? `${log.partyName} (${log.entityId})` : log.entityId}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">IP Adresi</label>
                                <p className="font-mono text-sm dark:text-gray-300">{log.ipAddress}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Kritik</label>
                                <p className="font-medium dark:text-gray-200">{log.isCritical ? 'Evet' : 'Hayır'}</p>
                            </div>
                        </div>

                        {log.message && (
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Mesaj</label>
                                <p className="font-medium dark:text-gray-200">{log.message}</p>
                            </div>
                        )}

                        {log.data && Object.keys(log.data).length > 0 && (
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Veri</label>
                                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs overflow-x-auto dark:text-gray-300">
                                    {JSON.stringify(log.data, null, 2)}
                                </pre>
                            </div>
                        )}

                        {log.details && Object.keys(log.details).length > 0 && (
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Detaylar</label>
                                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg text-xs overflow-x-auto dark:text-gray-300">
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
                </div>
                <div className="p-4 border-t dark:border-gray-700">
                    <Button
                        variant="default"
                        onClick={onClose}
                        fullWidth
                    >
                        Kapat
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function ActivityLogsPage() {
    const [filters, setFilters] = useState({
        branch_id: '',
        user_id: '',
        action: '',
        action_type: '',
        is_critical: undefined as boolean | undefined,
        search: ''
    });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [selectedLog, setSelectedLog] = useState<ExtendedActivityLogRead | null>(null);

    // Cast params to intersection type to allow extra filters missing from schema but potentially supported
    const queryParams: ListActivityLogsParams & { branch_id?: string; entity_type?: string; is_critical?: boolean; per_page?: number } = {
        branch_id: filters.branch_id || undefined,
        user_id: filters.user_id || undefined,
        action: filters.action || undefined,
        entity_type: filters.action_type || undefined,
        is_critical: filters.is_critical,
        search: filters.search || undefined,
        page,
        limit: perPage, // Map perPage to limit as per schema
        per_page: perPage // Keep per_page for backward compat if backend expects it
    };

    const { data: logsResponse, isLoading } = useListActivityLogs(queryParams as ListActivityLogsParams);

    // Filter options are not available in the new API, use empty defaults
    const filterOptions: { branches: { id: string, name: string }[], users: { id: string, name: string }[], actions: string[] } = {
        branches: [],
        users: [],
        actions: []
    };

    const logs: ExtendedActivityLogRead[] = (logsResponse?.data as unknown as ExtendedActivityLogRead[]) || [];
    const pagination = logsResponse?.meta;
    const options = filterOptions;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-7 h-7 text-blue-600" />
                        Aktivite Logları
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Sistemdeki tüm kullanıcı hareketlerini görüntüleyin</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <Select
                        label="Şube"
                        value={filters.branch_id}
                        onChange={(e) => setFilters({ ...filters, branch_id: e.target.value })}
                        options={[
                            { value: '', label: 'Tüm Şubeler' },
                            ...options.branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                        fullWidth
                    />
                    <Select
                        label="Kullanıcı"
                        value={filters.user_id}
                        onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                        options={[
                            { value: '', label: 'Tüm Kullanıcılar' },
                            ...options.users.map(u => ({ value: u.id, label: u.name }))
                        ]}
                        fullWidth
                    />
                    <Select
                        label="Aksiyon"
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        options={[
                            { value: '', label: 'Tüm Aksiyonlar' },
                            ...(options?.actions?.map((action: string) => ({ value: action, label: action })) || [])
                        ]}
                        fullWidth
                    />
                    <Select
                        label="Kritik"
                        value={filters.is_critical === undefined ? '' : filters.is_critical ? 'true' : 'false'}
                        onChange={(e) => setFilters({
                            ...filters,
                            is_critical: e.target.value === '' ? undefined : e.target.value === 'true'
                        })}
                        options={[
                            { value: '', label: 'Tümü' },
                            { value: 'true', label: 'Sadece Kritik' },
                            { value: 'false', label: 'Sadece Normal' }
                        ]}
                        fullWidth
                    />
                    <Input
                        label="Arama"
                        type="text"
                        placeholder="Mesaj veya aksiyon ara..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                        fullWidth
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-medium w-10"></th>
                                        <th className="px-4 py-3 font-medium">Tarih</th>
                                        <th className="px-4 py-3 font-medium">Kullanıcı</th>
                                        <th className="px-4 py-3 font-medium">Aksiyon</th>
                                        <th className="px-4 py-3 font-medium">Mesaj</th>
                                        <th className="px-4 py-3 font-medium">IP</th>
                                        <th className="px-4 py-3 font-medium w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
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
                                                    {log.createdAt ? new Date(String(log.createdAt)).toLocaleString('tr-TR') : '-'}
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
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[250px] truncate" title={log.message ?? undefined}>
                                                {log.message || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 font-mono">
                                                {log.ipAddress}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedLog(log)}
                                                    className="p-1.5"
                                                    title="Detay"
                                                >
                                                    <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                                <p>Kayıt bulunamadı.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && (pagination.total ?? 0) > 0 && (
                            <div className="px-4 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Toplam {pagination.total} kayıt, Sayfa {page}/{pagination.totalPages ?? 1}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Önceki
                                    </Button>
                                    <Select
                                        value={String(perPage)}
                                        onChange={(e) => {
                                            setPerPage(Number(e.target.value));
                                            setPage(1);
                                        }}
                                        options={[
                                            { value: '10', label: '10' },
                                            { value: '20', label: '20' },
                                            { value: '50', label: '50' },
                                            { value: '100', label: '100' }
                                        ]}
                                        className="w-20"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(pagination.totalPages ?? 1, p + 1))}
                                        disabled={page >= (pagination.totalPages ?? 1)}
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
