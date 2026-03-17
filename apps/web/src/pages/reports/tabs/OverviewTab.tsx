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
import { TabExportButton } from '../components/TabExportButton';
import { FilterState, ReportOverview, ReportFinancial } from '../types';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';

interface OverviewTabProps {
    filters: FilterState;
}

export function OverviewTab({ filters }: OverviewTabProps) {
    const { t } = useTranslation('reports');
    const { hasPermission } = usePermissions();
    const canViewFinancials = hasPermission('sensitive.reports.overview.financials.view');
    const reportParams = {
        days: filters.days,
        branch_id: filters.branch,
        startDate: filters.dateRange.start || undefined,
        endDate: filters.dateRange.end || undefined
    } as never;

    const { data: overviewData, isLoading, error, refetch } = useListReportOverview(
        reportParams,
        { query: { queryKey: [...getListReportOverviewQueryKey(reportParams)] } }
    );

    const { data: financialData } = useListReportFinancial(
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

    const overview = unwrapObject<ReportOverview>(overviewData);
    const financial = unwrapObject<ReportFinancial>(financialData);
    const exportRows = [
        {
            toplam_ciro: overview?.totalRevenue || 0,
            toplam_satis: overview?.totalSales || 0,
            randevu_orani: overview?.appointmentRate || 0,
            donusum_orani: overview?.conversionRate || 0,
            toplam_hasta: overview?.totalPatients || 0,
            yeni_hasta: overview?.newPatients || 0,
            toplam_randevu: overview?.totalAppointments || 0,
        },
        ...Object.entries(financial?.paymentMethods || {}).map(([method, data]) => ({
            odeme_yontemi: method,
            tutar: data.amount || 0,
        }))
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <TabExportButton filename="genel-bakis-raporu" rows={exportRows} />
            </div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title={t('totalRevenue', 'Toplam Ciro')}
                    value={formatProtectedCurrency(overview?.totalRevenue || 0)}
                    icon={DollarSign}
                    color="green"
                    subtitle={`${filters.dateRange.start} - ${filters.dateRange.end}`}
                />
                <KPICard
                    title={t('totalSales', 'Toplam Satış')}
                    value={overview?.totalSales || 0}
                    icon={FileText}
                    color="blue"
                />
                <KPICard
                    title={t('appointmentRate', 'Randevu Oranı')}
                    value={`%${overview?.appointmentRate || 0}`}
                    icon={Calendar}
                    color="purple"
                />
                <KPICard
                    title={t('conversionRate', 'Dönüşüm Oranı')}
                    value={`%${overview?.conversionRate || 0}`}
                    icon={TrendingUp}
                    color="yellow"
                />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('patientStats', 'Hasta İstatistikleri')}</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t('totalPatients', 'Toplam Hasta')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{overview?.totalPatients || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t('newPatients', 'Yeni Hastalar')}</span>
                            <span className="font-semibold text-success">{overview?.newPatients || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t('totalAppointments', 'Toplam Randevu')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{overview?.totalAppointments || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('paymentMethods', 'Ödeme Yöntemleri')}</h3>
                    <div className="space-y-3">
                        {financial?.paymentMethods && Object.entries(financial.paymentMethods).map(([method, data]) => (
                            <div key={method} className="flex justify-between items-center">
                                <span className="text-muted-foreground capitalize">{method}</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{formatProtectedCurrency(data.amount || 0)}</span>
                            </div>
                        ))}
                        {(!financial?.paymentMethods || Object.keys(financial.paymentMethods).length === 0) && (
                            <p className="text-muted-foreground text-sm">{t('noData', 'Veri bulunamadı')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
