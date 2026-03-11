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
import { PosMovementsList } from '@/components/reports/PosMovementsList';

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
            <PosMovementsList
                movements={data}
                isLoading={isLoading}
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
