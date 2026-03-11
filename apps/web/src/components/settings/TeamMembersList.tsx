import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';

interface TeamMember {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  lastActive?: string;
}

interface TeamMembersListProps {
  members: TeamMember[];
  isLoading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
  onEdit?: (member: TeamMember) => void;
  onDelete?: (member: TeamMember) => void;
}

export function TeamMembersList({ members, isLoading, pagination, onEdit, onDelete }: TeamMembersListProps) {
  const columns: Column<TeamMember>[] = useMemo(() => [
    {
      key: 'name',
      title: 'Ad Soyad',
      sortable: true,
      render: (_, member) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {member.name || '-'}
        </span>
      )
    },
    {
      key: 'email',
      title: 'E-posta',
      sortable: true,
      render: (_, member) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {member.email || '-'}
        </span>
      )
    },
    {
      key: 'role',
      title: 'Rol',
      sortable: true,
      render: (_, member) => (
        <Badge variant="default" size="sm">
          {member.role || 'Kullanıcı'}
        </Badge>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_, member) => (
        <Badge variant={member.status === 'active' ? 'success' : 'secondary'} size="sm">
          {member.status === 'active' ? 'Aktif' : 'Pasif'}
        </Badge>
      )
    },
    {
      key: 'lastActive',
      title: 'Son Aktivite',
      sortable: true,
      render: (_, member) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {member.lastActive || '-'}
        </span>
      )
    }
  ], []);

  const actions = useMemo(() => [
    {
      key: 'edit',
      label: 'Düzenle',
      onClick: (member: TeamMember) => onEdit?.(member)
    },
    {
      key: 'delete',
      label: 'Sil',
      onClick: (member: TeamMember) => onDelete?.(member),
      variant: 'danger' as const
    }
  ], [onEdit, onDelete]);

  return (
    <DataTable
      data={members}
      columns={columns}
      actions={actions}
      loading={isLoading}
      pagination={pagination}
      rowKey="id"
      emptyText="Ekip üyesi bulunamadı"
    />
  );
}
