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
import {
    useListActivityLogs,
    useListActivityLogStats,
    useListActivityLogFilterOptions
} from '../../lib/api-client';
import Pagination from '../../components/ui/Pagination';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';
import { ResponsiveTable } from '../../components/responsive/ResponsiveTable';
import { ResponsiveModal } from '../../components/responsive/ResponsiveModal';

interface ActivityLogDetailModalProps {
    log: any;
    onClose: () => void;
}

function ActivityLogDetailModal({ log, onClose }: ActivityLogDetailModalProps) {
    return (
        <ResponsiveModal isOpen={true} onClose={onClose} title="Log Detayı">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Tarih</label>
                        <p className="font-medium text-gray-900 dark:text-white">{new Date(log.createdAt).toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Aksiyon</label>
                        <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
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
                        <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-xs overflow-x-auto text-gray-900 dark:text-white">
                            {JSON.stringify(log.data, null, 2)}
                        </pre>
                    </div>
                )}

                {log.details && Object.keys(log.details).length > 0 && (
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Detaylar</label>
                        <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-xs overflow-x-auto text-gray-900 dark:text-white">
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

    const { data: logsData, isLoading } = useListActivityLogs({
        ...filters,
        critical_only: filters.critical_only === 'true',
        page,
        page_size: pageSize
    } as any);

    const { data: statsData } = useListActivityLogStats({});
    const { data: filterOptions } = useListActivityLogFilterOptions();

    const logs = (logsData as any)?.logs || (logsData as any)?.data?.logs || (logsData as any)?.data || [];
    const meta = (logsData as any)?.meta || (logsData as any)?.data?.meta || (logsData as any)?.data?.pagination;
    const stats = (statsData as any)?.stats || (statsData as any)?.data || statsData;
    const options = (filterOptions as any)?.options || (filterOptions as any)?.data || {};

    const columns = [
        {
            key: 'critical',
            header: '',
            render: (log: any) => log.isCritical ? (
                <AlertTriangle className="w-4 h-4 text-red-500" aria-label="Kritik İşlem" />
            ) : null
        },
        {
            key: 'createdAt',
            header: 'Tarih',
            sortable: true,
            render: (log: any) => (
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                </span>
            )
        },
        {
            key: 'tenantName',
            header: 'Tenant',
            mobileHidden: true,
            sortable: true,
            render: (log: any) => (
                <span className="text-gray-700 dark:text-gray-300 truncate" title={log.tenantName}>
                    {log.tenantName || '-'}
                </span>
            )
        },
        {
            key: 'userName',
            header: 'Kullanıcı',
            sortable: true,
            render: (log: any) => (
                <div>
                    <p className="font-medium text-gray-900 dark:text-white truncate">{log.userName || '-'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{log.userEmail}</p>
                </div>
            )
        },
        {
            key: 'action',
            header: 'Aksiyon',
            sortable: true,
            render: (log: any) => (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {log.action}
                </span>
            )
        },
        {
            key: 'message',
            header: 'Mesaj',
            mobileHidden: true,
            render: (log: any) => (
                <span className="text-gray-600 dark:text-gray-400 truncate" title={log.message}>
                    {log.message || '-'}
                </span>
            )
        },
        {
            key: 'ipAddress',
            header: 'IP',
            mobileHidden: true,
            render: (log: any) => (
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{log.ipAddress}</span>
            )
        },
        {
            key: 'actions',
            header: '',
            render: (log: any) => (
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
            )
        }
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

            {/* Stats Cards */}
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
                            {stats.topActions?.[0]?.action || '-'}
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <div className={`grid gap-4 items-end ${isMobile ? 'grid-cols-1' : 'grid-cols-6'}`}>
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Tenant</label>
                        <select
                            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Aksiyon Tipi</label>
                        <select
                            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Aksiyon</label>
                        <select
                            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Kritik</label>
                        <select
                            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={filters.critical_only}
                            onChange={(e) => setFilters({ ...filters, critical_only: e.target.value })}
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
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Mesaj veya aksiyon ara..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
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
                            keyExtractor={(log: any) => log.id}
                            onRowClick={(log: any) => setSelectedLog(log)}
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
