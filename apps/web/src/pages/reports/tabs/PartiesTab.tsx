import React from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { unwrapObject } from '../../../utils/response-unwrap';
import {
    useListReportPatients as useListReportParties,
    getListReportPatientsQueryKey as getListReportPartiesQueryKey
} from '@/api/client/reports.client';
import { FilterState, ReportParties } from '../types';

interface PartiesTabProps {
    filters: FilterState;
}

export function PartiesTab({ filters }: PartiesTabProps) {
    const { data: partiesData, isLoading, error, refetch } = useListReportParties(
        { days: filters.days },
        { query: { queryKey: [...getListReportPartiesQueryKey({ days: filters.days })] } }
    );

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

    const parties = unwrapObject<ReportParties>(partiesData);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Hasta Analizi</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Party Segments */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Hasta Segmentleri</h4>
                    <div className="space-y-4">
                        {parties?.party_segments && (
                            <>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <span className="text-gray-600 dark:text-gray-400">Yeni Hastalar</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">{parties.party_segments.new || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                        <span className="text-gray-600 dark:text-gray-400">Aktif Hastalar</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">{parties.party_segments.active || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <span className="text-gray-600 dark:text-gray-400">Deneme Aşamasında</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">{parties.party_segments.trial || 0}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                                        <span className="text-gray-600 dark:text-gray-400">Pasif Hastalar</span>
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">{parties.party_segments.inactive || 0}</span>
                                </div>
                            </>
                        )}
                        {!parties?.party_segments && (
                            <p className="text-gray-400 text-sm">Veri bulunamadı</p>
                        )}
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Randevu Durumu Dağılımı</h4>
                    <div className="space-y-4">
                        {parties?.status_distribution && Object.keys(parties.status_distribution).length > 0 ? (
                            Object.entries(parties.status_distribution).map(([status, count]) => {
                                const statusLabels: Record<string, string> = {
                                    'SCHEDULED': 'Planlandı',
                                    'COMPLETED': 'Tamamlandı',
                                    'CANCELLED': 'İptal Edildi',
                                    'NO_SHOW': 'Gelmedi',
                                    'IN_PROGRESS': 'Devam Ediyor',
                                    'PENDING': 'Beklemede',
                                    'CONFIRMED': 'Onaylandı',
                                };
                                return (
                                    <div key={status} className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-400">{statusLabels[status] || status}</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-400 text-sm">Veri bulunamadı</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
