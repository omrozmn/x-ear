import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatCurrency, formatDate } from '@/utils/format';

interface Invoice {
  id: string;
  invoiceNumber?: string;
  partyName?: string;
  totalAmount?: number;
  date?: string;
  status?: string;
  type?: string;
}

interface InvoicesListProps {
  invoices: Invoice[];
  isLoading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
  onRowClick?: (invoice: Invoice) => void;
}

export function InvoicesList({ invoices, isLoading, pagination, onRowClick }: InvoicesListProps) {
  const getStatusBadge = (status?: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
      draft: 'secondary',
      pending: 'warning',
      sent: 'default',
      paid: 'success',
      cancelled: 'danger',
    };
    const s = (status || 'draft').toLowerCase();
    return (
      <Badge variant={variants[s] || 'secondary'} size="sm">
        {status || 'Taslak'}
      </Badge>
    );
  };

  const columns: Column<Invoice>[] = useMemo(() => [
    {
      key: 'invoiceNumber',
      title: 'Fatura No',
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
          {invoice.invoiceNumber || '-'}
        </span>
      )
    },
    {
      key: 'partyName',
      title: 'Müşteri',
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {invoice.partyName || '-'}
        </span>
      )
    },
    {
      key: 'date',
      title: 'Tarih',
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {invoice.date ? formatDate(invoice.date) : '-'}
        </span>
      )
    },
    {
      key: 'totalAmount',
      title: 'Tutar',
      sortable: true,
      render: (_, invoice) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(invoice.totalAmount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_, invoice) => getStatusBadge(invoice.status)
    }
  ], []);

  return (
    <DataTable
      data={invoices}
      columns={columns}
      loading={isLoading}
      pagination={pagination}
      onRowClick={onRowClick}
      rowKey="id"
      emptyText="Fatura bulunamadı"
    />
  );
}
