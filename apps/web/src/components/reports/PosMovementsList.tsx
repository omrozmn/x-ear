import React, { useMemo } from 'react';
import { DataTable, Column, Badge } from '@x-ear/ui-web';
import type { PosMovementItem } from '@/api/generated/schemas';
import { useTranslation } from 'react-i18next';

interface PosMovementsListProps {
  movements: PosMovementItem[];
  isLoading?: boolean;
  canViewFinancials?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
}

export function PosMovementsList({ movements, isLoading, pagination, canViewFinancials = true }: PosMovementsListProps) {
  const { t } = useTranslation('reports');
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatProtectedCurrency = (amount: number) => (
    canViewFinancials ? formatCurrency(amount) : t('hiddenForRole', 'Bu rol icin gizli')
  );

  const columns: Column<PosMovementItem>[] = useMemo(() => [
    {
      key: 'date',
      title: t('date', 'Tarih'),
      sortable: true,
      render: (_, item) => (
        <span className="text-sm text-muted-foreground">
          {new Date(item.date).toLocaleString('tr-TR')}
        </span>
      )
    },
    {
      key: 'posTransactionId',
      title: t('transactionId', 'İşlem ID'),
      render: (_, item) => (
        <span className="text-xs font-mono text-muted-foreground">
          {canViewFinancials ? (item.posTransactionId || '-') : t('hiddenForRole', 'Bu rol icin gizli')}
        </span>
      )
    },
    {
      key: 'patientName',
      title: t('patient', 'Hasta'),
      sortable: true,
      render: (_, item) => (
        <span className="text-sm text-gray-900 dark:text-white">
          {canViewFinancials ? (item.patientName || '-') : t('hiddenForRole', 'Bu rol icin gizli')}
        </span>
      )
    },
    {
      key: 'amount',
      title: t('amount', 'Tutar'),
      sortable: true,
      render: (_, item) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {formatProtectedCurrency(item.amount)}
        </span>
      )
    },
    {
      key: 'installment',
      title: t('installment', 'Taksit'),
      render: (_, item) => (
        <span className="text-sm text-muted-foreground">
          {item.installment && item.installment > 1 ? `${item.installment} Taksit` : t('singlePayment', 'Tek Çekim')}
        </span>
      )
    },
    {
      key: 'status',
      title: t('status', 'Durum'),
      sortable: true,
      render: (_, item) => (
        <div>
          <Badge variant={item.status === 'paid' ? 'success' : 'danger'} size="sm">
            {item.status === 'paid' ? t('successful', 'Başarılı') : t('failed', 'Başarısız')}
          </Badge>
          {canViewFinancials && item.errorMessage && (
            <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={item.errorMessage}>
              {item.errorMessage}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'saleId',
      title: t('saleRef', 'Satış Ref'),
      render: (_, item) => (
        <span className="text-xs font-mono text-muted-foreground">
          {canViewFinancials ? (item.saleId || '-') : t('hiddenForRole', 'Bu rol icin gizli')}
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
      emptyText={t('noPosMovements', 'Bu tarih aralığında POS işlemi bulunamadı')}
    />
  );
}
