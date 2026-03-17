import React from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2,
    Users,
    Calendar,
    ShoppingBag,
    Star
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { unwrapObject } from '../../../utils/response-unwrap';
import { TabExportButton } from '../components/TabExportButton';
import {
    useListReportPatients as useListReportParties,
    getListReportPatientsQueryKey as getListReportPartiesQueryKey
} from '@/api/client/reports.client';
import { ReportParties, FilterState } from '../types';

interface PartiesTabProps {
    filters: FilterState;
}

const SEGMENT_LABELS: Record<string, string> = {
    new: 'Yeni',
    active: 'Aktif',
    trial: 'Deneme Sürecinde',
    inactive: 'Pasif',
    vip: 'VIP',
    lost: 'Kaybedilen',
};

const ACQUISITION_LABELS: Record<string, string> = {
    referans: 'Referans',
    referral: 'Referans',
    reklam: 'Reklam',
    ads: 'Reklam',
    social_media: 'Sosyal Medya',
    sosyal_medya: 'Sosyal Medya',
    walk_in: 'Doğrudan Başvuru',
    direct: 'Doğrudan Başvuru',
    doctor: 'Doktor Yönlendirmesi',
    doktor: 'Doktor Yönlendirmesi',
    call_center: 'Çağrı Merkezi',
};

function humanizeLabel(value: string, labels: Record<string, string>) {
    return labels[value] || value.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function PartiesTab({ filters }: PartiesTabProps) {
    const reportParams = {
        days: filters.days,
        branch_id: filters.branch,
        startDate: filters.dateRange.start || undefined,
        endDate: filters.dateRange.end || undefined
    } as never;

    const { data: partiesData, isLoading, error, refetch } = useListReportParties(
        reportParams,
        { query: { queryKey: [...getListReportPartiesQueryKey(reportParams), filters.branch] } }
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

    const parties = unwrapObject<ReportParties>(partiesData);
    const summary = parties?.summary;
    const ageDistribution = parties?.ageDistribution || {};
    const acquisitionBreakdown = parties?.acquisitionBreakdown || {};
    const statusDistribution = parties?.statusDistribution || {};

    const topAcquisitionSources = Object.entries(acquisitionBreakdown)
        .sort(([, left], [, right]) => right - left)
        .slice(0, 5);
    const segmentBreakdown = parties?.segmentBreakdown || {};
    const exportRows = [
        {
            toplam_hasta: summary?.totalPatients || 0,
            yeni_hasta: summary?.newPatients || 0,
            satisa_donen: summary?.patientsWithSales || 0,
            yaklasan_randevu: summary?.patientsWithUpcomingAppointments || 0,
            oncelikli_hasta: summary?.highPriorityPatients || 0,
        },
        ...Object.entries(segmentBreakdown).map(([segment, count]) => ({ tip: 'segment', ad: segment, adet: count })),
        ...Object.entries(acquisitionBreakdown).map(([source, count]) => ({ tip: 'kazanım', ad: source, adet: count })),
    ];

    const appointmentFlow = [
        { label: 'Tamamlandı', value: statusDistribution.COMPLETED || 0 },
        { label: 'Planlandı', value: statusDistribution.SCHEDULED || 0 },
        { label: 'Onaylandı', value: statusDistribution.CONFIRMED || 0 },
        { label: 'İptal', value: statusDistribution.CANCELLED || 0 },
        { label: 'Gelmedi', value: statusDistribution.NO_SHOW || 0 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Hasta Performansı</h3>
                <TabExportButton filename="hasta-raporu" rows={exportRows} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {[
                    { label: 'Toplam Hasta', value: summary?.totalPatients || 0, icon: Users, tone: 'blue' },
                    { label: 'Yeni Hasta', value: summary?.newPatients || 0, icon: Star, tone: 'green' },
                    { label: 'Satışa Dönen', value: summary?.patientsWithSales || 0, icon: ShoppingBag, tone: 'emerald' },
                    { label: 'Yaklaşan Randevu', value: summary?.patientsWithUpcomingAppointments || 0, icon: Calendar, tone: 'amber' },
                    { label: 'Öncelikli Hasta', value: summary?.highPriorityPatients || 0, icon: AlertTriangle, tone: 'rose' },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="rounded-xl border border-border bg-white dark:bg-gray-800 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-muted-foreground">{item.label}</span>
                                <Icon className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-3xl font-semibold text-gray-900 dark:text-white">{item.value}</p>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Randevu Sonuçları</h4>
                    <div className="space-y-4">
                        {appointmentFlow.map((item) => (
                            <div key={item.label} className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">{item.label}</span>
                                <div className="flex items-center gap-3 w-40">
                                    <div className="h-2 rounded-full bg-muted flex-1 overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{ width: `${Math.min(100, item.value === 0 ? 0 : (item.value / Math.max(...appointmentFlow.map((flow) => flow.value), 1)) * 100)}%` }}
                                        />
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white min-w-[2rem] text-right">{item.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Hasta Kaynakları</h4>
                    <div className="space-y-4">
                        {topAcquisitionSources.length > 0 ? (
                            topAcquisitionSources.map(([source, count]) => (
                                <div key={source} className="flex justify-between items-center">
                                    <span className="text-muted-foreground">{humanizeLabel(source, ACQUISITION_LABELS)}</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm">Veri bulunamadı</p>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Hasta Segmentleri</h4>
                    <div className="space-y-4">
                        {Object.entries(segmentBreakdown).length > 0 ? Object.entries(segmentBreakdown).map(([segment, count]) => (
                            <div key={segment} className="flex justify-between items-center">
                                <span className="text-muted-foreground">{humanizeLabel(segment, SEGMENT_LABELS)}</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-sm">Veri bulunamadı</p>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6 lg:col-span-2">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Yaş Dağılımı</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(ageDistribution).map(([label, count]) => (
                            <div key={label} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4 text-center">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
