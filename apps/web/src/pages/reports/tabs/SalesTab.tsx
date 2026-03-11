import React, { useMemo } from 'react';
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

interface SalesTabProps {
    filters: FilterState;
}

export function SalesTab({ filters }: SalesTabProps) {
    const { data: financialData, isLoading, error, refetch } = useListReportFinancial(
        { days: filters.days },
        { query: { queryKey: [...getListReportFinancialQueryKey({ days: filters.days })] } }
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    type SaleRow = { brand: string; sales: number; revenue: number };

    const salesRows = useMemo<SaleRow[]>(() => {
        if (!financial?.product_sales) return [];
        return Object.entries(financial.product_sales).map(([brand, data]) => ({
            brand,
            sales: (data as { sales?: number; revenue?: number }).sales || 0,
            revenue: (data as { sales?: number; revenue?: number }).revenue || 0,
        }));
    }, [financial]);

    const salesColumns: Column<SaleRow>[] = [
        { key: 'brand', title: 'Marka', sortable: true },
        { key: 'sales', title: 'Satış Adedi', sortable: true, align: 'right' },
        {
            key: 'revenue',
            title: 'Gelir',
            sortable: true,
            align: 'right',
            render: (value: number) => (
                <span className="font-medium text-green-600">{formatCurrency(value)}</span>
            )
        },
    ];

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Veriler yüklenirken hata oluştu</p>
                <Button onClick={() => refetch()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
                    Tekrar Dene
                </Button>
            </div>
        );
    }

    const financial = unwrapObject<ReportFinancial>(financialData);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Satış Performansı Analizi</h3>

            {/* Revenue Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Aylık Gelir Trendi</h4>
                {financial?.revenue_trend && Object.keys(financial.revenue_trend).length > 0 ? (
                    <div className="grid grid-cols-6 gap-4">
                        {Object.entries(financial.revenue_trend).map(([month, amount]) => (
                            <div key={month} className="text-center">
                                <div className="h-24 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-end justify-center mb-2">
                                    <div
                                        className="bg-blue-500 rounded w-full"
                                        style={{ height: `${Math.min(100, (amount / Math.max(...Object.values(financial.revenue_trend as object).map(Number)) * 100))}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{month}. Ay</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-8">Veri bulunamadı</p>
                )}
            </div>

            {/* Product Sales */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Marka Bazlı Satışlar</h4>
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
