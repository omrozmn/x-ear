import React, { useState } from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2,
    CreditCard
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { unwrapPaginated } from '../../../utils/response-unwrap';
import {
    useListReportPosMovements
} from '@/api/client/reports.client';
import { FilterState } from '../types';
import type { PosMovementItem, ResponseMeta } from '@/api/generated/schemas';
import { PosMovementsList } from '@/components/reports/PosMovementsList';
import { TabExportButton } from '../components/TabExportButton';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';

interface PosMovementsTabProps {
    filters: FilterState;
}

export function PosMovementsTab({ filters }: PosMovementsTabProps) {
  const { t } = useTranslation('reports');
    const { hasPermission } = usePermissions();
    const canViewFinancials = hasPermission('sensitive.reports.pos_movements.financials.view');
    const [page, setPage] = useState(1);
    const reportParams = {
        page,
        per_page: 20,
        days: filters.days,
        branch_id: filters.branch,
        startDate: filters.dateRange.start || undefined,
        endDate: filters.dateRange.end || undefined
    } as never;
    // Using Orval-generated hook for POS movements
    const { data: reportData, isLoading, error, refetch } = useListReportPosMovements(
        reportParams
    );

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

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Veriler yüklenirken hata oluştu</p>
                <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
                    Tekrar Dene
                </Button>
            </div>
        );
    }

    const { data, meta } = unwrapPaginated<PosMovementItem>(reportData);
    const typedPosMeta = meta as ResponseMeta | undefined;
    const summary = meta?.summary as { totalVolume?: number; successCount?: number; failCount?: number } | undefined;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">{t('posMovements', 'POS Hareketleri')}</h3>
                <TabExportButton filename="pos-hareketleri" rows={data as unknown as Array<Record<string, unknown>>} />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl p-5 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500 p-3 rounded-xl">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-success">Toplam Başarılı İşlem</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {formatProtectedCurrency(summary?.totalVolume || 0)}
                            </p>
                            <p className="text-xs text-success">{summary?.successCount || 0} işlem</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 rounded-xl p-5 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500 p-3 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-destructive">Başarısız İşlemler</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                {summary?.failCount || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Movements Table */}
            <PosMovementsList
                movements={data}
                isLoading={isLoading}
                canViewFinancials={canViewFinancials}
                pagination={{
                    current: page,
                    pageSize: 20,
                    total: typedPosMeta?.total || 0,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50, 100],
                    onChange: (newPage) => setPage(newPage)
                }}
            />
        </div>
    );
}
