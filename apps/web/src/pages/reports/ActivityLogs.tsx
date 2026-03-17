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
    useListActivityLogs
} from '@/api/client/activity-logs.client';
import { useExecuteToolApiAiComposerExecutePost } from '@/api/client/ai-composer.client';
import type { ActivityLogRead, ExecuteResponse, ListActivityLogsParams } from '@/api/generated/schemas';
import { Button, Input, Select, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';
import toast from 'react-hot-toast';

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
                                <label className="text-xs text-muted-foreground">Tarih</label>
                                <p className="font-medium dark:text-gray-200">{log.createdAt ? new Date(String(log.createdAt)).toLocaleString('tr-TR') : '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Aksiyon</label>
                                <p className="font-medium dark:text-gray-200">{log.action}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Kullanıcı</label>
                                <p className="font-medium dark:text-gray-200">{log.userName || log.userId}</p>
                                {log.userEmail && <p className="text-xs text-muted-foreground">{log.userEmail}</p>}
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Şube</label>
                                <p className="font-medium dark:text-gray-200">{log.branchName || log.branchId || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Rol</label>
                                <p className="font-medium dark:text-gray-200">{log.role || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Varlık</label>
                                <p className="font-medium dark:text-gray-200">
                                    {log.entityType} - {log.partyName ? `${log.partyName} (${log.entityId})` : log.entityId}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">IP Adresi</label>
                                <p className="font-mono text-sm dark:text-gray-300">{log.ipAddress}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Kritik</label>
                                <p className="font-medium dark:text-gray-200">{log.isCritical ? 'Evet' : 'Hayır'}</p>
                            </div>
                        </div>

                        {log.message && (
                            <div>
                                <label className="text-xs text-muted-foreground">Mesaj</label>
                                <p className="font-medium dark:text-gray-200">{log.message}</p>
                            </div>
                        )}

                        {log.data && Object.keys(log.data).length > 0 && (
                            <div>
                                <label className="text-xs text-muted-foreground">Veri</label>
                                <pre className="bg-muted p-3 rounded-2xl text-xs overflow-x-auto dark:text-gray-300">
                                    {JSON.stringify(log.data, null, 2)}
                                </pre>
                            </div>
                        )}

                        {log.details && Object.keys(log.details).length > 0 && (
                            <div>
                                <label className="text-xs text-muted-foreground">Detaylar</label>
                                <pre className="bg-muted p-3 rounded-2xl text-xs overflow-x-auto dark:text-gray-300">
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            </div>
                        )}

                        {log.userAgent && (
                            <div>
                                <label className="text-xs text-muted-foreground">User Agent</label>
                                <p className="text-xs text-muted-foreground break-all">{log.userAgent}</p>
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

    const { mutate: executeTool, isPending: isRollingBack } = useExecuteToolApiAiComposerExecutePost({
        mutation: {
            onSuccess: (data: ExecuteResponse) => {
                if (data.status === 'error') {
                    toast.error('Geri alma işleminde hata: ' + data.error);
                } else {
                    toast.success('Geri alma işlemi başarıyla tamamlandı.');
                    // Refresh logs (tanstack query invalidation is better, but simple refresh works)
                    window.location.reload();
                }
            },
            onError: (error: unknown) => {
                const msg = error instanceof Error ? error.message : JSON.stringify(error);
                toast.error('Geri alma işleminde teknik bir hata oluştu: ' + msg);
            }
        }
    });

    const handleRollback = (batchId: string) => {
        if (confirm('Bu toplu yükleme işlemi geri alınacaktır. Eklenen tüm kayıtlar silinecektir. Emin misiniz?')) {
            executeTool({
                data: {
                    tool_id: 'rollback_bulk_import',
                    args: { batch_id: batchId },
                    dry_run: false
                }
            });
        }
    };

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

    const activityColumns: Column<ExtendedActivityLogRead>[] = [
        {
            key: '_critical',
            title: '',
            render: (_, log) => log.isCritical ? (
                <span title="Kritik İşlem"><AlertTriangle className="w-4 h-4 text-destructive" /></span>
            ) : null,
        },
        {
            key: 'createdAt',
            title: 'Tarih',
            render: (_, log) => (
                <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap text-xs">
                    <Calendar className="w-3 h-3" />
                    {log.createdAt ? new Date(String(log.createdAt)).toLocaleString('tr-TR') : '-'}
                </div>
            ),
        },
        {
            key: 'user',
            title: 'Kullanıcı',
            render: (_, log) => (
                <div>
                    <p className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{log.userName || '-'}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{log.userEmail}</p>
                </div>
            ),
        },
        {
            key: 'action',
            title: 'Aksiyon',
            render: (_, log) => (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-blue-800 dark:text-blue-200">{log.action}</span>
            ),
        },
        {
            key: 'message',
            title: 'Mesaj',
            render: (_, log) => (
                <span className="text-muted-foreground max-w-[250px] truncate block" title={log.message ?? undefined}>{log.message || '-'}</span>
            ),
        },
        {
            key: 'ipAddress',
            title: 'IP',
            render: (_, log) => (
                <span className="text-xs text-muted-foreground font-mono">{log.ipAddress}</span>
            ),
        },
        {
            key: '_actions',
            title: '',
            render: (_, log) => (
                <div className="flex items-center gap-1">
                    {log.action === 'TOPLU_YUKLEME' && log.data?.batch_id && !log.data?.rolled_back ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRollback(String(log.data!.batch_id))}
                            className="p-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-red-900/20"
                            title="Bu Toplu Yüklemeyi Geri Al"
                            disabled={isRollingBack}
                        >
                            {isRollingBack ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-semibold select-none flex items-center gap-1"> Geri Al</span>}
                        </Button>
                    ) : null}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5"
                        title="Detay"
                    >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <DesktopPageHeader
                className="mb-8"
                title="Aktivite Logları"
                description="Sistemdeki tüm kullanıcı hareketlerini görüntüleyin"
                icon={<FileText className="w-6 h-6" />}
                eyebrow={{ tr: 'Sistem Kayıtları', en: 'Activity Logs' }}
            />

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-border mb-6">
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
                        leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
                        fullWidth
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border overflow-hidden">
                <DataTable<ExtendedActivityLogRead>
                    data={logs}
                    columns={activityColumns}
                    loading={isLoading}
                    rowKey="id"
                    emptyText="Kayıt bulunamadı."
                    pagination={pagination ? {
                        current: page,
                        pageSize: perPage,
                        total: pagination.total ?? 0,
                        showSizeChanger: true,
                        pageSizeOptions: [10, 20, 50, 100],
                        onChange: (p, ps) => { setPage(p); setPerPage(ps); },
                    } : undefined}
                />
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
