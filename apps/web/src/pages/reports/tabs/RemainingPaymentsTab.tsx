import React, { useState } from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2,
    Wallet,
    Calendar,
    Phone,
    ArrowRight,
    TrendingDown
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { unwrapObject, unwrapArray } from '../../../utils/response-unwrap';
import {
    useListReportRemainingPayments,
    useListReportCashflowSummary
} from '@/api/client/reports.client';
import { FilterState } from '../types';
import type { RemainingPaymentItem } from '@/api/generated/schemas';

interface RemainingPaymentsTabProps {
    filters: FilterState;
}

export function RemainingPaymentsTab({ filters }: RemainingPaymentsTabProps) {
    // We don't filter remaining payments by date usually, as debt is cumulative
    // But we might want to see payments due within the date range
    const { data: remainingData, isLoading, error, refetch } = useListReportRemainingPayments({
        min_amount: 1 // Filter out zero debts
    });

    const { data: cashflowData } = useListReportCashflowSummary({
        days: filters.days
    });

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

    const remainingPayments = unwrapArray<RemainingPaymentItem>(remainingData);

    // Calculate totals
    const totalReceivable = remainingPayments.reduce((sum, item) => sum + (item.remainingAmount || 0), 0);
    const totalOverdue = remainingPayments.reduce((sum, item) => {
        if (item.dueDate && new Date(item.dueDate) < new Date()) {
            return sum + (item.remainingAmount || 0);
        }
        return sum;
    }, 0);

    // Group by due date status
    const overduePayments = remainingPayments.filter(item => item.dueDate && new Date(item.dueDate) < new Date());
    const upcomingPayments = remainingPayments.filter(item => item.dueDate && new Date(item.dueDate) >= new Date());
    const noDatePayments = remainingPayments.filter(item => !item.dueDate);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kalan Ödemeler ve Alacaklar</h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Alacak</p>
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalReceivable)}</h4>
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{remainingPayments.length} hasta borçlu</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Vadesi Geçen Alacaklar</p>
                            <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalOverdue)}</h4>
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${totalReceivable > 0 ? (totalOverdue / totalReceivable) * 100 : 0}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Toplam alacağın %{totalReceivable > 0 ? ((totalOverdue / totalReceivable) * 100).toFixed(1) : 0}'i</p>
                </div>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overdue List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
                        <h4 className="text-md font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Gecikmiş Ödemeler
                        </h4>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                        {overduePayments.length > 0 ? (
                            overduePayments.map((item) => (
                                <div key={item.salesId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-medium text-gray-900 dark:text-white">{item.partyName}</p>
                                        <p className="font-semibold text-red-600">{formatCurrency(item.remainingAmount)}</p>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            <span>Vade: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('tr-TR') : '-'}</span>
                                        </div>
                                        {item.daysOverdue && (
                                            <span className="text-red-500 font-medium">{item.daysOverdue} gün gecikti</span>
                                        )}
                                    </div>
                                    {item.phone && (
                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                                            <Phone className="w-3 h-3" />
                                            {item.phone}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">Gecikmiş ödeme bulunmuyor</p>
                        )}
                    </div>
                </div>

                {/* Upcoming List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Yaklaşan Ödemeler
                        </h4>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                        {upcomingPayments.length > 0 ? (
                            upcomingPayments.map((item) => (
                                <div key={item.salesId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-medium text-gray-900 dark:text-white">{item.partyName}</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.remainingAmount)}</p>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            <span>Vade: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('tr-TR') : '-'}</span>
                                        </div>
                                        {item.daysUntilDue !== undefined && (
                                            <span className="text-blue-600 font-medium">{item.daysUntilDue} gün kaldı</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">Yaklaşan ödeme bulunmuyor</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
