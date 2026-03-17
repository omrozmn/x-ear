import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatCurrency, formatDate } from '@/utils/format';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('reports');
  const getStatusBadge = (status?: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
      active: 'default',
      overdue: 'danger',
      paid: 'success',
      cancelled: 'secondary',
    };
    const labels: Record<string, string> = {
      active: t('active', 'Aktif'),
      overdue: t('overdueLabel', 'Vadesi Geçmiş'),
      paid: t('paid', 'Ödendi'),
      cancelled: t('cancelled', 'İptal'),
    };
    const s = (status || 'active').toLowerCase();
    return (
      <Badge variant={variants[s] || 'default'} size="sm">
        {labels[s] || status || t('active', 'Aktif')}
      </Badge>
    );
  };

  const columns: Column<PromissoryNote>[] = useMemo(() => [
    {
      key: 'noteNumber',
      title: t('noteNumber', 'Senet No'),
      sortable: true,
      render: (_, note) => (
        <span className="text-sm font-mono text-gray-900 dark:text-white">
          {note.noteNumber || '-'}
        </span>
      )
    },
    {
      key: 'partyName',
      title: t('customer', 'Müşteri'),
      sortable: true,
      render: (_, note) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {note.partyName || '-'}
        </span>
      )
    },
    {
      key: 'amount',
      title: t('amount', 'Tutar'),
      sortable: true,
      render: (_, note) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(note.amount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'dueDate',
      title: t('dueDate', 'Vade Tarihi'),
      sortable: true,
      render: (_, note) => (
        <span className="text-sm text-muted-foreground">
          {note.dueDate ? formatDate(note.dueDate) : '-'}
        </span>
      )
    },
    {
      key: 'bankName',
      title: t('bank', 'Banka'),
      render: (_, note) => (
        <span className="text-sm text-muted-foreground">
          {note.bankName || '-'}
        </span>
      )
    },
    {
      key: 'status',
      title: t('status', 'Durum'),
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
      emptyText={t('noNotes', 'Senet bulunamadı')}
    />
  );
}
