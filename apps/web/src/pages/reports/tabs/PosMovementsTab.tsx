import React, { useState } from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2,
    CreditCard
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { unwrapObject, unwrapPaginated } from '../../../utils/response-unwrap';
import {
    useListReportPosMovements
} from '@/api/client/reports.client';
import { FilterState } from '../types';
import type { PosMovementItem, ResponseMeta } from '@/api/generated/schemas';

interface PosMovementsTabProps {
    filters: FilterState;
}

export function PosMovementsTab({ filters }: PosMovementsTabProps) {
    const [page, setPage] = useState(1);
    // Using Orval-generated hook for POS movements
    const { data: reportData, isLoading, error, refetch } = useListReportPosMovements(
        { page, per_page: 20, days: filters.days }
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

    const { data, meta } = unwrapPaginated<PosMovementItem>(reportData);
    const typedPosMeta = meta as ResponseMeta | undefined;
    const posData_unwrapped = unwrapObject<{ summary?: { totalAmount?: number; successCount?: number; failCount?: number; transactionCount?: number } }>(reportData);
    const summary = posData_unwrapped?.summary;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">POS Hareketleri</h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl p-5 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500 p-3 rounded-xl">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400">Toplam Başarılı İşlem</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {formatCurrency(summary?.totalAmount || 0)}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">{summary?.successCount || 0} işlem</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 rounded-xl p-5 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500 p-3 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400">Başarısız İşlemler</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                {summary?.failCount || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Movements Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {data.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Tarih</th>
                                        <th className="px-4 py-3 font-medium">İşlem ID</th>
                                        <th className="px-4 py-3 font-medium">Hasta</th>
                                        <th className="px-4 py-3 font-medium">Tutar</th>
                                        <th className="px-4 py-3 font-medium">Taksit</th>
                                        <th className="px-4 py-3 font-medium">Durum</th>
                                        <th className="px-4 py-3 font-medium">Satış Ref</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {data.map((item: PosMovementItem) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {new Date(item.date).toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {item.posTransactionId || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.patientName || '-'}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.installment && item.installment > 1 ? `${item.installment} Taksit` : 'Tek Çekim'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {item.status === 'paid' ? 'Başarılı' : 'Başarısız'}
                                                </span>
                                                {item.errorMessage && (
                                                    <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={item.errorMessage}>
                                                        {item.errorMessage}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {item.saleId || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {typedPosMeta && typedPosMeta.totalPages && typedPosMeta.totalPages > 1 && (
                            <div className="px-4 py-3 border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Toplam {typedPosMeta.total || 0} işlem
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        variant="outline"
                                        className="px-3 py-1.5 text-sm disabled:opacity-50 !w-auto !h-auto"
                                    >
                                        Önceki
                                    </Button>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">{page} / {typedPosMeta.totalPages}</span>
                                    <Button
                                        onClick={() => setPage(p => Math.min(Number(typedPosMeta.totalPages || 1), p + 1))}
                                        disabled={page >= Number(typedPosMeta.totalPages || 1)}
                                        variant="outline"
                                        className="px-3 py-1.5 text-sm disabled:opacity-50 !w-auto !h-auto"
                                    >
                                        Sonraki
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <p>Bu tarih aralığında POS işlemi bulunamadı</p>
                    </div>
                )}
            </div>
        </div>
    );
}
