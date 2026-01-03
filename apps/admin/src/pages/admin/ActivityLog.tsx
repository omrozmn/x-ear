import React, { useState } from 'react';
import {
    Activity,
    Search,
    Loader2,
    Filter,
    AlertTriangle,
    X,
    ChevronDown,
    Eye
} from 'lucide-react';
import { Input, Select } from '@x-ear/ui-web';
import {
    useAdminGetActivityLogs,
    useAdminGetActivityLogsStats,
    useAdminGetActivityLogFilterOptions
} from '../../lib/api-client';
import Pagination from '../../components/ui/Pagination';

interface ActivityLogDetailModalProps {
    log: any;
    onClose: () => void;
}

function ActivityLogDetailModal({ log, onClose }: ActivityLogDetailModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Log Detayı</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500">Tarih</label>
                                <p className="font-medium">{new Date(log.createdAt).toLocaleString('tr-TR')}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Aksiyon</label>
                                <p className="font-medium">{log.action}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Kullanıcı</label>
                                <p className="font-medium">{log.userName || log.userId}</p>
                                {log.userEmail && <p className="text-xs text-gray-500">{log.userEmail}</p>}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Tenant</label>
                                <p className="font-medium">{log.tenantName || log.tenantId || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Şube</label>
                                <p className="font-medium">{log.branchName || log.branchId || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Rol</label>
                                <p className="font-medium">{log.role || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Varlık</label>
                                <p className="font-medium">{log.entityType} - {log.entityId}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">IP Adresi</label>
                                <p className="font-mono text-sm">{log.ipAddress}</p>
                            </div>
                        </div>

                        {log.message && (
                            <div>
                                <label className="text-xs text-gray-500">Mesaj</label>
                                <p className="font-medium">{log.message}</p>
                            </div>
                        )}

                        {log.data && Object.keys(log.data).length > 0 && (
                            <div>
                                <label className="text-xs text-gray-500">Veri</label>
                                <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                                    {JSON.stringify(log.data, null, 2)}
                                </pre>
                            </div>
                        )}

                        {log.details && Object.keys(log.details).length > 0 && (
                            <div>
                                <label className="text-xs text-gray-500">Detaylar</label>
                                <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            </div>
                        )}

                        {log.userAgent && (
                            <div>
                                <label className="text-xs text-gray-500">User Agent</label>
                                <p className="text-xs text-gray-600 break-all">{log.userAgent}</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ActivityLogPage() {
    const [filters, setFilters] = useState({
        tenant_id: '',
        user_id: '',
        action: '',
        action_type: '',
        critical_only: 'false',
        search: ''
    });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const { data: logsData, isLoading } = useAdminGetActivityLogs({
        ...filters,
        critical_only: filters.critical_only === 'true',
        page,
        page_size: pageSize
    } as any);

    const { data: statsData } = useAdminGetActivityLogsStats({});
    const { data: filterOptions } = useAdminGetActivityLogFilterOptions();

    const logs = (logsData?.data as any)?.logs || [];
    const meta = (logsData?.data as any)?.meta;
    const stats = statsData?.data as any;
    const options = filterOptions?.data as any || {};

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Aktivite Logları</h1>
                    <p className="text-gray-500">Tüm tenantlardaki kullanıcı hareketleri</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Toplam Log</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total?.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Son 24 Saat</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.last24Hours?.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Kritik İşlemler</p>
                        <p className="text-2xl font-bold text-red-600">{stats.critical?.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">En Sık Aksiyon</p>
                        <p className="text-lg font-bold text-gray-900 truncate">
                            {stats.topActions?.[0]?.action || '-'}
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="grid grid-cols-6 gap-4 items-end">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Tenant</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            value={filters.tenant_id}
                            onChange={(e) => setFilters({ ...filters, tenant_id: e.target.value })}
                        >
                            <option value="">Tümü</option>
                            {options?.tenants?.map((t: any) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Aksiyon Tipi</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            value={filters.action_type}
                            onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
                        >
                            <option value="">Tümü</option>
                            {options?.actionTypes?.map((type: string) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Aksiyon</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        >
                            <option value="">Tümü</option>
                            {options?.actions?.map((action: string) => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Kritik</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                            value={filters.critical_only}
                            onChange={(e) => setFilters({ ...filters, critical_only: e.target.value })}
                        >
                            <option value="false">Tümü</option>
                            <option value="true">Sadece Kritik</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Arama</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                className="pl-9"
                                placeholder="Mesaj veya aksiyon ara..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium w-10"></th>
                                    <th className="px-4 py-3 font-medium">Tarih</th>
                                    <th className="px-4 py-3 font-medium">Tenant</th>
                                    <th className="px-4 py-3 font-medium">Kullanıcı</th>
                                    <th className="px-4 py-3 font-medium">Aksiyon</th>
                                    <th className="px-4 py-3 font-medium">Mesaj</th>
                                    <th className="px-4 py-3 font-medium">IP</th>
                                    <th className="px-4 py-3 font-medium w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            {log.isCritical && (
                                                <span title="Kritik İşlem">
                                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                            {new Date(log.createdAt).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 truncate max-w-[120px]" title={log.tenantName}>
                                            {log.tenantName || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 truncate max-w-[150px]">{log.userName || '-'}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{log.userEmail}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={log.message}>
                                            {log.message || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ipAddress}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-1 hover:bg-gray-100 rounded"
                                                title="Detay"
                                            >
                                                <Eye className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                            Kayıt bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
