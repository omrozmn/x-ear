import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatCurrency, formatDate } from '@/utils/format';

interface Payment {
  id: string;
  partyName?: string;
  amount?: number;
  date?: string;
  paymentMethod?: string;
  status?: string;
  reference?: string;
}

interface PaymentsListProps {
  payments: Payment[];
  isLoading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
  onRowClick?: (payment: Payment) => void;
}

export function PaymentsList({ payments, isLoading, pagination, onRowClick }: PaymentsListProps) {
  const getStatusBadge = (status?: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
      pending: 'warning',
      completed: 'success',
      failed: 'danger',
      cancelled: 'secondary',
    };
    const s = (status || 'pending').toLowerCase();
    return (
      <Badge variant={variants[s] || 'secondary'} size="sm">
        {status || 'Bekliyor'}
      </Badge>
    );
  };

  const columns: Column<Payment>[] = useMemo(() => [
    {
      key: 'date',
      title: 'Tarih',
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm text-muted-foreground">
          {payment.date ? formatDate(payment.date) : '-'}
        </span>
      )
    },
    {
      key: 'partyName',
      title: 'Müşteri',
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {payment.partyName || '-'}
        </span>
      )
    },
    {
      key: 'amount',
      title: 'Tutar',
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(payment.amount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'paymentMethod',
      title: 'Ödeme Yöntemi',
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm text-muted-foreground">
          {payment.paymentMethod || '-'}
        </span>
      )
    },
    {
      key: 'reference',
      title: 'Referans',
      render: (_, payment) => (
        <span className="text-xs font-mono text-muted-foreground">
          {payment.reference || '-'}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_, payment) => getStatusBadge(payment.status)
    }
  ], []);

  return (
    <DataTable
      data={payments}
      columns={columns}
      loading={isLoading}
      pagination={pagination}
      onRowClick={onRowClick}
      rowKey="id"
      emptyText="Ödeme bulunamadı"
    />
  );
}
