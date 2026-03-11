import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';

interface Branch {
  id: string;
  name?: string;
  code?: string;
  city?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

interface BranchesListProps {
  branches: Branch[];
  isLoading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
  onEdit?: (branch: Branch) => void;
  onDelete?: (branch: Branch) => void;
}

export function BranchesList({ branches, isLoading, pagination, onEdit, onDelete }: BranchesListProps) {
  const columns: Column<Branch>[] = useMemo(() => [
    {
      key: 'name',
      title: 'Şube Adı',
      sortable: true,
      render: (_, branch) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {branch.name || '-'}
        </span>
      )
    },
    {
      key: 'code',
      title: 'Kod',
      sortable: true,
      render: (_, branch) => (
        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
          {branch.code || '-'}
        </span>
      )
    },
    {
      key: 'city',
      title: 'Şehir',
      sortable: true,
      render: (_, branch) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {branch.city || '-'}
        </span>
      )
    },
    {
      key: 'phone',
      title: 'Telefon',
      render: (_, branch) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {branch.phone || '-'}
        </span>
      )
    },
    {
      key: 'address',
      title: 'Adres',
      render: (_, branch) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
          {branch.address || '-'}
        </span>
      )
    },
    {
      key: 'isActive',
      title: 'Durum',
      sortable: true,
      render: (_, branch) => (
        <Badge variant={branch.isActive ? 'success' : 'secondary'} size="sm">
          {branch.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      )
    }
  ], []);

  const actions = useMemo(() => [
    {
      key: 'edit',
      label: 'Düzenle',
      onClick: (branch: Branch) => onEdit?.(branch)
    },
    {
      key: 'delete',
      label: 'Sil',
      onClick: (branch: Branch) => onDelete?.(branch),
      variant: 'danger' as const
    }
  ], [onEdit, onDelete]);

  return (
    <DataTable
      data={branches}
      columns={columns}
      actions={actions}
      loading={isLoading}
      pagination={pagination}
      rowKey="id"
      emptyText="Şube bulunamadı"
    />
  );
}
