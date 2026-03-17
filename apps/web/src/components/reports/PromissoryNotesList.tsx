import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatCurrency, formatDate } from '@/utils/format';

interface PromissoryNote {
  id: string;
  partyName?: string;
  noteNumber?: string;
  amount?: number;
  dueDate?: string;
  status?: string;
  bankName?: string;
}

interface PromissoryNotesListProps {
  notes: PromissoryNote[];
  isLoading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
}

export function PromissoryNotesList({ notes, isLoading, pagination }: PromissoryNotesListProps) {
  const getStatusBadge = (status?: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
      active: 'default',
      overdue: 'danger',
      paid: 'success',
      cancelled: 'secondary',
    };
    const labels: Record<string, string> = {
      active: 'Aktif',
      overdue: 'Vadesi Geçmiş',
      paid: 'Ödendi',
      cancelled: 'İptal',
    };
    const s = (status || 'active').toLowerCase();
    return (
      <Badge variant={variants[s] || 'default'} size="sm">
        {labels[s] || status || 'Aktif'}
      </Badge>
    );
  };

  const columns: Column<PromissoryNote>[] = useMemo(() => [
    {
      key: 'noteNumber',
      title: 'Senet No',
      sortable: true,
      render: (_, note) => (
        <span className="text-sm font-mono text-gray-900 dark:text-white">
          {note.noteNumber || '-'}
        </span>
      )
    },
    {
      key: 'partyName',
      title: 'Müşteri',
      sortable: true,
      render: (_, note) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {note.partyName || '-'}
        </span>
      )
    },
    {
      key: 'amount',
      title: 'Tutar',
      sortable: true,
      render: (_, note) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(note.amount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'dueDate',
      title: 'Vade Tarihi',
      sortable: true,
      render: (_, note) => (
        <span className="text-sm text-muted-foreground">
          {note.dueDate ? formatDate(note.dueDate) : '-'}
        </span>
      )
    },
    {
      key: 'bankName',
      title: 'Banka',
      render: (_, note) => (
        <span className="text-sm text-muted-foreground">
          {note.bankName || '-'}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_, note) => getStatusBadge(note.status)
    }
  ], []);

  return (
    <DataTable
      data={notes}
      columns={columns}
      loading={isLoading}
      pagination={pagination}
      rowKey="id"
      emptyText="Senet bulunamadı"
    />
  );
}
