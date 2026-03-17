import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('settings_extra');
  const columns: Column<Branch>[] = useMemo(() => [
    {
      key: 'name',
      title: t('branchName', 'Şube Adı'),
      sortable: true,
      render: (_, branch) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {branch.name || '-'}
        </span>
      )
    },
    {
      key: 'code',
      title: t('code', 'Kod'),
      sortable: true,
      render: (_, branch) => (
        <span className="text-sm font-mono text-muted-foreground">
          {branch.code || '-'}
        </span>
      )
    },
    {
      key: 'city',
      title: t('city', 'Şehir'),
      sortable: true,
      render: (_, branch) => (
        <span className="text-sm text-muted-foreground">
          {branch.city || '-'}
        </span>
      )
    },
    {
      key: 'phone',
      title: t('phone', 'Telefon'),
      render: (_, branch) => (
        <span className="text-sm text-muted-foreground">
          {branch.phone || '-'}
        </span>
      )
    },
    {
      key: 'address',
      title: t('address', 'Adres'),
      render: (_, branch) => (
        <span className="text-sm text-muted-foreground truncate max-w-xs">
          {branch.address || '-'}
        </span>
      )
    },
    {
      key: 'isActive',
      title: t('status', 'Durum'),
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
      emptyText={t('noBranchesFound', 'Şube bulunamadı')}
    />
  );
}
