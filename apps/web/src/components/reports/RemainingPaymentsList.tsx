import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatCurrency, formatDate } from '@/utils/format';

interface RemainingPayment {
  id: string;
  partyName?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  dueDate?: string;
  status?: string;
}

interface RemainingPaymentsListProps {
  payments: RemainingPayment[];
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

export function RemainingPaymentsList({ payments, isLoading, pagination }: RemainingPaymentsListProps) {
  const { t } = useTranslation('payments');

  const columns: Column<RemainingPayment>[] = useMemo(() => [
    {
      key: 'partyName',
      title: t('columns.customer', 'Müşteri'),
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {payment.partyName || '-'}
        </span>
      )
    },
    {
      key: 'invoiceNumber',
      title: t('columns.invoiceNumber', 'Fatura No'),
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm font-mono text-muted-foreground">
          {payment.invoiceNumber || '-'}
        </span>
      )
    },
    {
      key: 'totalAmount',
      title: t('columns.totalAmount', 'Toplam Tutar'),
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {formatCurrency(Number(payment.totalAmount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'paidAmount',
      title: t('columns.paid', 'Ödenen'),
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm text-success">
          {formatCurrency(Number(payment.paidAmount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'remainingAmount',
      title: t('columns.remaining', 'Kalan'),
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm font-semibold text-destructive">
          {formatCurrency(Number(payment.remainingAmount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'dueDate',
      title: t('columns.dueDate', 'Vade Tarihi'),
      sortable: true,
      render: (_, payment) => (
        <span className="text-sm text-muted-foreground">
          {payment.dueDate ? formatDate(payment.dueDate) : '-'}
        </span>
      )
    },
    {
      key: 'status',
      title: t('columns.status', 'Durum'),
      sortable: true,
      render: (_, payment) => {
        const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date();
        return (
          <Badge variant={isOverdue ? 'danger' : 'warning'} size="sm">
            {isOverdue ? t('status.overdue', 'Vadesi Geçmiş') : t('status.pending', 'Bekliyor')}
          </Badge>
        );
      }
    }
  ], []);

  return (
    <DataTable
      data={payments}
      columns={columns}
      loading={isLoading}
      pagination={pagination}
      rowKey="id"
      emptyText={t('noRemainingPayments', 'Kalan ödeme bulunamadı')}
    />
  );
}
