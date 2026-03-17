import React, { useMemo } from 'react';
import { DataTable, Column } from '@x-ear/ui-web';
import { formatCurrency } from '@/utils/format';

interface SalesReportItem {
  productName?: string;
  quantity?: number;
  totalAmount?: number;
  averagePrice?: number;
}

interface SalesReportListProps {
  items: SalesReportItem[];
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

export function SalesReportList({ items, isLoading, pagination }: SalesReportListProps) {
  const columns: Column<SalesReportItem>[] = useMemo(() => [
    {
      key: 'productName',
      title: 'Ürün',
      sortable: true,
      render: (_, item) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {item.productName || '-'}
        </span>
      )
    },
    {
      key: 'quantity',
      title: 'Adet',
      sortable: true,
      render: (_, item) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {item.quantity || 0}
        </span>
      )
    },
    {
      key: 'totalAmount',
      title: 'Toplam Tutar',
      sortable: true,
      render: (_, item) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(item.totalAmount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'averagePrice',
      title: 'Ortalama Fiyat',
      sortable: true,
      render: (_, item) => (
        <span className="text-sm text-muted-foreground">
          {formatCurrency(Number(item.averagePrice || 0), 'TRY')}
        </span>
      )
    }
  ], []);

  return (
    <DataTable
      data={items}
      columns={columns}
      loading={isLoading}
      pagination={pagination}
      rowKey="productName"
      emptyText="Satış verisi bulunamadı"
    />
  );
}
