import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { Button, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { unwrapObject } from '../../../utils/response-unwrap';
import {
    useListReportFinancial,
    getListReportFinancialQueryKey
} from '@/api/client/reports.client';
import { ReportFinancial, FilterState } from '../types';
import { TabExportButton } from '../components/TabExportButton';
import { usePermissions } from '@/hooks/usePermissions';

interface SalesTabProps {
    filters: FilterState;
}

export function SalesTab({ filters }: SalesTabProps) {
    const { t } = useTranslation('sales');
    const { hasPermission } = usePermissions();
    const canViewFinancials = hasPermission('sensitive.reports.sales.financials.view');
    const reportParams = {
        days: filters.days,
        branch_id: filters.branch,
        startDate: filters.dateRange.start || undefined,
        endDate: filters.dateRange.end || undefined
    } as never;

    const { data: financialData, isLoading, error, refetch } = useListReportFinancial(
        reportParams,
        { query: { queryKey: [...getListReportFinancialQueryKey(reportParams)] } }
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

    type SaleRow = { brand: string; sales: number; revenue: number };
    const financial = unwrapObject<ReportFinancial>(financialData);
    const revenueTrend = financial?.revenueTrend ?? {};

    const salesRows = useMemo<SaleRow[]>(() => {
        if (!financial?.productSales) return [];
        return Object.entries(financial.productSales).map(([brand, data]) => ({
            brand,
            sales: (data as { sales?: number; revenue?: number }).sales || 0,
            revenue: (data as { sales?: number; revenue?: number }).revenue || 0,
        }));
    }, [financial]);

    const salesColumns: Column<SaleRow>[] = [
        { key: 'brand', title: t('columns.brand', 'Marka'), sortable: true },
        { key: 'sales', title: t('columns.salesCount', 'Satış Adedi'), sortable: true, align: 'right' },
        {
            key: 'revenue',
            title: t('columns.revenue', 'Gelir'),
            sortable: true,
            align: 'right',
            render: (value: number) => (
                <span className="font-medium text-success">{formatProtectedCurrency(value)}</span>
            )
        },
    ];

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
                <p className="text-muted-foreground mb-4">{t('loadError', 'Veriler yüklenirken hata oluştu')}</p>
                <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
                    {t('retry', 'Tekrar Dene')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('salesPerformance', 'Satış Performansı Analizi')}</h3>
                <TabExportButton filename="satis-raporu" rows={salesRows} />
            </div>

            {/* Revenue Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">{t('monthlyRevenueTrend', 'Aylık Gelir Trendi')}</h4>
                {Object.keys(revenueTrend).length > 0 ? (
                    <div className="grid grid-cols-6 gap-4">
                        {Object.entries(revenueTrend).map(([month, amount]) => (
                            <div key={month} className="text-center">
                                <div className="h-24 bg-primary/10 rounded-2xl flex items-end justify-center mb-2">
                                    <div
                                        className="bg-blue-500 rounded w-full"
                                        style={{ height: `${Math.min(100, (amount / Math.max(...Object.values(revenueTrend).map(Number)) * 100))}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">{month}. Ay</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatProtectedCurrency(amount)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">Veri bulunamadı</p>
                )}
            </div>

            {/* Product Sales */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">{t('brandSales', 'Marka Bazlı Satışlar')}</h4>
                <DataTable<SaleRow>
                    data={salesRows}
                    columns={salesColumns}
                    rowKey="brand"
                    emptyText="Veri bulunamadı"
                    striped
                    hoverable
                    size="medium"
                />
            </div>
        </div>
    );
}
