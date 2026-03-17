import React, { useState, useMemo, useEffect } from 'react';
import {
    AlertTriangle,
    Calendar,
    Eye
} from 'lucide-react';
import { Button, Input, Select, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { unwrapObject, unwrapPaginated } from '../../../utils/response-unwrap';
import {
    useListActivityLogs,
    useListActivityLogFilterOptions
} from '@/api/client/reports.client';
import { ActivityLogDetailModal } from '../components/ActivityLogDetailModal';
import { TabExportButton } from '../components/TabExportButton';
import type { ActivityLogRead, ResponseMeta } from '@/api/generated/schemas';
import type { FilterState } from '../types';
import { translateActivityAction, translateActivityMessage } from '../utils/activityLogPresentation';
import { usePermissions } from '../../../hooks/usePermissions';

interface ActivityTabProps {
    filters: FilterState;
}

export function ActivityTab({ filters }: ActivityTabProps) {
    const { hasPermission } = usePermissions();
    const canViewDetails = hasPermission('sensitive.reports.activity.details.view');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [selectedLog, setSelectedLog] = useState<ActivityLogRead | null>(null);
    const [activityFilters, setActivityFilters] = useState({
        branch_id: filters.branch || '',
        action: '',
        user_id: '',
        search: ''
    });

    useEffect(() => {
        setActivityFilters((current) => ({ ...current, branch_id: filters.branch || '' }));
    }, [filters.branch]);

    const { data: logsResponse, isLoading } = useListActivityLogs({
        branch_id: activityFilters.branch_id || undefined,
        action: activityFilters.action || undefined,
        user_id: activityFilters.user_id || undefined,
        search: activityFilters.search || undefined,
        date_from: filters.dateRange.start || undefined,
        date_to: filters.dateRange.end || undefined,
        page,
        limit: perPage
    } as never);

    // Replace stub with generated hook
    const { data: filterOptions } = useListActivityLogFilterOptions();

    const { data: logs, pagination } = unwrapPaginated<ActivityLogRead>(logsResponse);
    const typedPagination = pagination as ResponseMeta | undefined;
    const options = unwrapObject<{ actions?: string[]; users?: Array<{ id: string; name: string }>; branches?: Array<{ id: string; name: string }> }>(filterOptions);

    const columns = useMemo<Column<ActivityLogRead>[]>(() => [
        {
            key: 'isCritical',
            title: '',
            width: 40,
            align: 'center',
            render: (_: unknown, record: ActivityLogRead) =>
                record.isCritical ? (
                    <span title="Kritik İşlem">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                    </span>
                ) : null
        },
        {
            key: 'createdAt',
            title: 'Tarih',
            sortable: true,
            render: (_: unknown, record: ActivityLogRead) => (
                <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Calendar className="w-3 h-3" />
                    {record.createdAt && new Date(record.createdAt).toLocaleString('tr-TR')}
                </div>
            )
        },
        {
            key: 'userName',
            title: 'Kullanıcı',
            render: (_: unknown, record: ActivityLogRead) => (
                <>
                    <p className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                        {record.userName || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {canViewDetails ? (record.userEmail || '') : ''}
                    </p>
                </>
            )
        },
        {
            key: 'action',
            title: 'Aksiyon',
            render: (_: unknown, record: ActivityLogRead) => (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-blue-800 dark:text-blue-300">
                    {translateActivityAction(record.action)}
                </span>
            )
        },
        {
            key: 'message',
            title: 'Mesaj',
            render: (_: unknown, record: ActivityLogRead) => (
                <span
                    className="text-muted-foreground max-w-[250px] truncate block"
                    title={translateActivityMessage(record)}
                >
                    {translateActivityMessage(record)}
                </span>
            )
        },
        {
            key: 'branchName',
            title: 'Şube',
            render: (_: unknown, record: ActivityLogRead) => (
                <span className="text-sm text-muted-foreground">
                    {record.branchName || record.branchId || '-'}
                </span>
            )
        },
        {
            key: 'id',
            title: '',
            width: 48,
            align: 'center',
            render: (_: unknown, record: ActivityLogRead) => (
                <Button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedLog(record); }}
                    variant="ghost"
                    className="p-1.5 hover:bg-muted dark:hover:bg-gray-700 rounded-2xl transition-colors !w-auto !h-auto"
                    title={canViewDetails ? 'Detay' : 'Detaylar gizli'}
                >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                </Button>
            )
        }
    ], []);

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <TabExportButton filename="islem-dokumu" rows={logs as unknown as Array<Record<string, unknown>>} />
            </div>
            {/* Activity Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Şube</label>
                        <Select
                            className="w-full text-sm"
                            value={activityFilters.branch_id}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActivityFilters({ ...activityFilters, branch_id: e.target.value })}
                            options={[
                                { value: "", label: "Tüm Şubeler" },
                                ...(options?.branches?.map((branch) => ({ value: branch.id, label: branch.name })) || [])
                            ]}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Kullanıcı</label>
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
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Aksiyon</label>
                        <Select
                            className="w-full text-sm"
                            value={activityFilters.action}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActivityFilters({ ...activityFilters, action: e.target.value })}
                            options={[
                                { value: "", label: "Tüm Aksiyonlar" },
                                ...(options?.actions?.map((action: string) => ({ value: action, label: translateActivityAction(action) })) || [])
                            ]}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Arama</label>
                        <Input
                            type="text"
                            className="w-full text-sm"
                            placeholder="Kullanıcı, mesaj, işlem türü veya kayıt ara..."
                            value={activityFilters.search}
                            onChange={(e) => setActivityFilters({ ...activityFilters, search: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Activity Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-border overflow-hidden">
                <DataTable<ActivityLogRead>
                    data={logs}
                    columns={columns}
                    loading={isLoading}
                    rowKey="id"
                    emptyText="Kayıt bulunamadı"
                    striped
                    hoverable
                    size="medium"
                    pagination={typedPagination?.total ? {
                        current: page,
                        pageSize: perPage,
                        total: typedPagination.total,
                        showSizeChanger: true,
                        pageSizeOptions: [10, 20, 50],
                        onChange: (p: number, size: number) => {
                            setPage(p);
                            if (size !== perPage) { setPerPage(size); setPage(1); }
                        }
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
