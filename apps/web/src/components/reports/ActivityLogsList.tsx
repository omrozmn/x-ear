import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatDate } from '@/utils/format';
import type { ActivityLogRead } from '@/api/generated/schemas';
import { useTranslation } from 'react-i18next';

interface ActivityLogsListProps {
  logs: ActivityLogRead[];
  isLoading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
  onSort?: (field: string, direction: 'asc' | 'desc' | null) => void;
}

export function ActivityLogsList({ logs, isLoading, pagination, onSort }: ActivityLogsListProps) {
  const { t } = useTranslation('reports');
  const getSeverityBadge = (severity?: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
      info: 'default',
      success: 'success',
      warning: 'warning',
      error: 'danger',
      critical: 'danger',
    };
    const s = (severity || 'info').toLowerCase();
    return (
      <Badge variant={variants[s] || 'secondary'} size="sm">
        {severity || 'Info'}
      </Badge>
    );
  };

  const formatDetails = (log: ActivityLogRead) => {
    if (typeof log.details === 'string') return log.details;
    if (log.details) return JSON.stringify(log.details);
    return log.message || '-';
  };

  const columns: Column<ActivityLogRead>[] = useMemo(() => [
    {
      key: 'createdAt',
      title: t('dateTime', 'Tarih/Saat'),
      sortable: true,
      render: (_, log) => (
        <span className="text-sm text-muted-foreground">
          {log.createdAt ? formatDate(log.createdAt) : '-'}
        </span>
      )
    },
    {
      key: 'userName',
      title: t('user', 'Kullanıcı'),
      sortable: true,
      render: (_, log) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {log.userName || log.userId || '-'}
        </span>
      )
    },
    {
      key: 'action',
      title: t('operation', 'İşlem'),
      sortable: true,
      render: (_, log) => (
        <span className="text-sm text-muted-foreground">
          {log.action || '-'}
        </span>
      )
    },
    {
      key: 'entityType',
      title: t('entityType', 'Varlık Tipi'),
      sortable: true,
      render: (_, log) => (
        <span className="text-sm text-muted-foreground">
          {log.entityType || '-'}
        </span>
      )
    },
    {
      key: 'details',
      title: t('detail', 'Detay'),
      render: (_, log) => (
        <span className="text-sm text-muted-foreground truncate max-w-xs">
          {formatDetails(log)}
        </span>
      )
    },
    {
      key: 'message',
      title: t('message', 'Mesaj'),
      render: (_, log) => (
        <span className="text-sm text-muted-foreground font-mono">
          {log.message || '-'}
        </span>
      )
    },
    {
      key: 'isCritical',
      title: t('importance', 'Önem'),
      sortable: true,
      render: (_, log) => getSeverityBadge(log.isCritical ? 'Critical' : 'Info')
    }
  ], []);

  return (
    <DataTable
      data={logs}
      columns={columns}
      loading={isLoading}
      sortable={true}
      onSort={onSort}
      pagination={pagination}
      rowKey="id"
      emptyText={t('noActivityLogs', 'Aktivite logu bulunamadı')}
    />
  );
}
