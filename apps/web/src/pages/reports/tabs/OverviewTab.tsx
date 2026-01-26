import React from 'react';
import {
    DollarSign,
    FileText,
    Calendar,
    TrendingUp,
    AlertTriangle,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { unwrapObject } from '../../../utils/response-unwrap';
import {
    useListReportOverview,
    useListReportFinancial,
    getListReportOverviewQueryKey,
    getListReportFinancialQueryKey
} from '@/api/client/reports.client';
import { KPICard } from '../components/KPICard';
import { FilterState, ReportOverview, ReportFinancial } from '../types';

interface OverviewTabProps {
    filters: FilterState;
}

export function OverviewTab({ filters }: OverviewTabProps) {
    const { data: overviewData, isLoading, error, refetch } = useListReportOverview(
        { days: filters.days },
        { query: { queryKey: [...getListReportOverviewQueryKey({ days: filters.days })] } }
    );

    const { data: financialData } = useListReportFinancial(
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

    const overview = unwrapObject<ReportOverview>(overviewData);
    const financial = unwrapObject<ReportFinancial>(financialData);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Toplam Ciro"
                    value={formatCurrency(overview?.total_revenue || 0)}
                    icon={DollarSign}
                    color="green"
                    subtitle={`${filters.days} günlük`}
                />
                <KPICard
                    title="Toplam Satış"
                    value={overview?.total_sales || 0}
                    icon={FileText}
                    color="blue"
                />
                <KPICard
                    title="Randevu Oranı"
                    value={`%${overview?.appointment_rate || 0}`}
                    icon={Calendar}
                    color="purple"
                />
                <KPICard
                    title="Dönüşüm Oranı"
                    value={`%${overview?.conversion_rate || 0}`}
                    icon={TrendingUp}
                    color="yellow"
                />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hasta İstatistikleri</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Toplam Hasta</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{overview?.total_parties || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Yeni Hastalar ({filters.days} gün)</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{overview?.new_parties || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Toplam Randevu</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{overview?.total_appointments || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ödeme Yöntemleri</h3>
                    <div className="space-y-3">
                        {financial?.payment_methods && Object.entries(financial.payment_methods).map(([method, data]) => (
                            <div key={method} className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400 capitalize">{method}</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(data.amount || 0)}</span>
                            </div>
                        ))}
                        {(!financial?.payment_methods || Object.keys(financial.payment_methods).length === 0) && (
                            <p className="text-gray-400 text-sm">Veri bulunamadı</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
