import React from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';
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
                                <div className="h-24 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-end justify-center mb-2">
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
                {financial?.product_sales && Object.keys(financial.product_sales).length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Marka</th>
                                    <th className="px-4 py-3 font-medium text-right">Satış Adedi</th>
                                    <th className="px-4 py-3 font-medium text-right">Gelir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {Object.entries(financial.product_sales).map(([brand, data]) => (
                                    <tr key={brand} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                                        <td className="px-4 py-3 font-medium">{brand}</td>
                                        <td className="px-4 py-3 text-right">{data.sales || 0}</td>
                                        <td className="px-4 py-3 text-right font-medium text-green-600">
                                            {formatCurrency(data.revenue || 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-8">Veri bulunamadı</p>
                )}
            </div>
        </div>
    );
}
