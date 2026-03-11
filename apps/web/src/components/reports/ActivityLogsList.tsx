import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatDate } from '@/utils/format';
import type { ActivityLogRead } from '@/api/generated/schemas';

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

  const columns: Column<ActivityLogRead>[] = useMemo(() => [
    {
      key: 'timestamp',
      title: 'Tarih/Saat',
      sortable: true,
      render: (_, log) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {log.timestamp ? formatDate(log.timestamp) : '-'}
        </span>
      )
    },
    {
      key: 'userName',
      title: 'Kullanıcı',
      sortable: true,
      render: (_, log) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {log.userName || log.userId || '-'}
        </span>
      )
    },
    {
      key: 'action',
      title: 'İşlem',
      sortable: true,
      render: (_, log) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {log.action || '-'}
        </span>
      )
    },
    {
      key: 'entityType',
      title: 'Varlık Tipi',
      sortable: true,
      render: (_, log) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {log.entityType || '-'}
        </span>
      )
    },
    {
      key: 'details',
      title: 'Detay',
      render: (_, log) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
          {log.details || '-'}
        </span>
      )
    },
    {
      key: 'ipAddress',
      title: 'IP Adresi',
      render: (_, log) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
          {log.ipAddress || '-'}
        </span>
      )
    },
    {
      key: 'severity',
      title: 'Durum',
      sortable: true,
      render: (_, log) => getSeverityBadge(log.severity)
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
      emptyText="Aktivite logu bulunamadı"
    />
  );
}
