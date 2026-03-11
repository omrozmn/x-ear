import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatCurrency, formatDate } from '@/utils/format';
import type { IncomingInvoiceResponse } from '@/api/generated/schemas';

interface PurchasesListProps {
  purchases: IncomingInvoiceResponse[];
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
  onRowClick?: (purchase: IncomingInvoiceResponse) => void;
}

export function PurchasesList({ purchases, isLoading, pagination, onSort, onRowClick }: PurchasesListProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
      RECEIVED: 'default',
      PROCESSED: 'success',
      PAID: 'success',
    };
    const labels: Record<string, string> = {
      RECEIVED: 'Alındı',
      PROCESSED: 'İşlendi',
      PAID: 'Ödendi',
    };
    return (
      <Badge variant={variants[status] || 'secondary'} size="sm">
        {labels[status] || status}
      </Badge>
    );
  };

  const columns: Column<IncomingInvoiceResponse>[] = useMemo(() => [
    {
      key: 'supplierName',
      title: 'Tedarikçi',
      sortable: true,
      render: (_, purchase) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {purchase.supplierName || '-'}
        </span>
      )
    },
    {
      key: 'invoiceNumber',
      title: 'Fatura No',
      sortable: true,
      render: (_, purchase) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
          {purchase.invoiceNumber || '-'}
        </span>
      )
    },
    {
      key: 'invoiceDate',
      title: 'Tarih',
      sortable: true,
      render: (_, purchase) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {purchase.invoiceDate ? formatDate(purchase.invoiceDate) : '-'}
        </span>
      )
    },
    {
      key: 'totalAmount',
      title: 'Tutar',
      sortable: true,
      render: (_, purchase) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(purchase.totalAmount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_, purchase) => getStatusBadge(purchase.status || 'RECEIVED')
    }
  ], []);

  return (
    <DataTable
      data={purchases}
      columns={columns}
      loading={isLoading}
      sortable={true}
      onSort={onSort}
      pagination={pagination}
      onRowClick={onRowClick}
      rowKey="invoiceId"
      emptyText="Alış faturası bulunamadı"
    />
  );
}
