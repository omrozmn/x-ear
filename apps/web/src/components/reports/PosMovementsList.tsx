import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import type { PosMovementItem } from '@/api/generated/schemas';

interface PosMovementsListProps {
  movements: PosMovementItem[];
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

export function PosMovementsList({ movements, isLoading, pagination }: PosMovementsListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const columns: Column<PosMovementItem>[] = useMemo(() => [
    {
      key: 'date',
      title: 'Tarih',
      sortable: true,
      render: (_, item) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(item.date).toLocaleString('tr-TR')}
        </span>
      )
    },
    {
      key: 'posTransactionId',
      title: 'İşlem ID',
      render: (_, item) => (
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {item.posTransactionId || '-'}
        </span>
      )
    },
    {
      key: 'patientName',
      title: 'Hasta',
      sortable: true,
      render: (_, item) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {item.patientName || '-'}
        </span>
      )
    },
    {
      key: 'amount',
      title: 'Tutar',
      sortable: true,
      render: (_, item) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {formatCurrency(item.amount)}
        </span>
      )
    },
    {
      key: 'installment',
      title: 'Taksit',
      render: (_, item) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {item.installment && item.installment > 1 ? `${item.installment} Taksit` : 'Tek Çekim'}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_, item) => (
        <div>
          <Badge variant={item.status === 'paid' ? 'success' : 'danger'} size="sm">
            {item.status === 'paid' ? 'Başarılı' : 'Başarısız'}
          </Badge>
          {item.errorMessage && (
            <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={item.errorMessage}>
              {item.errorMessage}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'saleId',
      title: 'Satış Ref',
      render: (_, item) => (
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {item.saleId || '-'}
        </span>
      )
    }
  ], []);

  return (
    <DataTable
      data={movements}
      columns={columns}
      loading={isLoading}
      pagination={pagination}
      rowKey="id"
      emptyText="Bu tarih aralığında POS işlemi bulunamadı"
    />
  );
}
