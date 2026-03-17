import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import { formatCurrency, formatDate } from '@/utils/format';
import type { SaleRead } from '@/api/generated/schemas';
import { useNavigate } from '@tanstack/react-router';

interface SalesListProps {
  sales: SaleRead[];
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
}

export function SalesList({ sales, isLoading, pagination, onSort }: SalesListProps) {
  const navigate = useNavigate();

  const getStatusBadge = (status?: string | null) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
      draft: 'secondary',
      confirmed: 'default',
      delivered: 'warning',
      paid: 'success',
      cancelled: 'danger',
    };
    const labels: Record<string, string> = {
      draft: 'Taslak',
      confirmed: 'Onaylandı',
      delivered: 'Teslim Edildi',
      paid: 'Ödendi',
      cancelled: 'İptal Edildi',
    };
    const s = (status || 'draft').toLowerCase();
    return (
      <Badge variant={variants[s] || 'secondary'} size="sm">
        {labels[s] || status || 'Taslak'}
      </Badge>
    );
  };

  const getPatientName = (sale: SaleRead) => {
    const p = sale.patient as { firstName?: string; lastName?: string } | undefined;
    if (p?.firstName || p?.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return '—';
  };

  const columns: Column<SaleRead>[] = useMemo(() => [
    {
      key: 'patient',
      title: 'Hasta',
      sortable: true,
      render: (_, sale) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {getPatientName(sale)}
          </div>
          {sale.partyId && (
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              {sale.partyId.slice(0, 8)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'productName',
      title: 'Ürün',
      sortable: true,
      render: (_, sale) => (
        <span className="text-sm text-muted-foreground">
          {sale.productName || sale.brand || '-'}
        </span>
      )
    },
    {
      key: 'finalAmount',
      title: 'Tutar',
      sortable: true,
      render: (_, sale) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(Number(sale.finalAmount || sale.totalAmount || 0), 'TRY')}
        </span>
      )
    },
    {
      key: 'saleDate',
      title: 'Tarih',
      sortable: true,
      render: (_, sale) => (
        <span className="text-sm text-muted-foreground">
          {sale.saleDate ? formatDate(String(sale.saleDate)) : '-'}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      sortable: true,
      render: (_, sale) => getStatusBadge(sale.status as string)
    }
  ], []);

  const actions = useMemo(() => [
    {
      key: 'view',
      label: 'Hasta Detayı',
      onClick: (sale: SaleRead) => {
        if (sale.partyId) {
          navigate({ to: '/parties/$partyId', params: { partyId: sale.partyId } });
        }
      },
      disabled: (sale: SaleRead) => !sale.partyId
    }
  ], [navigate]);

  return (
    <DataTable
      data={sales}
      columns={columns}
      actions={actions}
      loading={isLoading}
      sortable={true}
      onSort={onSort}
      pagination={pagination}
      rowKey="id"
      emptyText="Satış kaydı bulunamadı"
    />
  );
}
