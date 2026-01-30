import React, { useState } from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2,
    TrendingUp,
    CreditCard,
    Wallet,
    Filter,
    Phone,
    DollarSign
} from 'lucide-react';
import { Button, Select } from '@x-ear/ui-web';
import { unwrapObject, unwrapPaginated } from '../../../utils/response-unwrap';
import {
    useListReportRemainingPayments,
    useListReportCashflowSummary
} from '@/api/client/reports.client';
import { FilterState } from '../types';
import type { RemainingPaymentItem, ResponseMeta } from '@/api/generated/schemas';

interface RemainingPaymentsTabProps {
    filters: FilterState;
}

export function RemainingPaymentsTab({ filters }: RemainingPaymentsTabProps) {
    const [page, setPage] = useState(1);
    const [minAmount, setMinAmount] = useState(0);

    // Using Orval-generated hooks for reports API
    const { data: paymentsData, isLoading, error, refetch } = useListReportRemainingPayments(
        { page, per_page: 20, min_amount: minAmount }
    );

    const { data: cashflowData } = useListReportCashflowSummary(
        { days: filters.days }
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

    const { data: payments, meta } = unwrapPaginated<RemainingPaymentItem>(paymentsData);
    const typedMeta = meta as ResponseMeta | undefined;
    const paymentsSummary = unwrapObject<{ summary?: { totalRemaining?: number; totalPaid?: number; totalParties?: number } }>(paymentsData);
    const summary = paymentsSummary?.summary;
    const cashflowData_unwrapped = unwrapObject<{ totalIncome?: number; totalExpense?: number; netCashflow?: number }>(cashflowData);
    const cashflow = cashflowData_unwrapped;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Kalan Ödemeler & Kasa Özeti</h3>

            {/* Cashflow Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl p-5 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500 p-3 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400">Toplam Gelir</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                                {formatCurrency(cashflow?.totalIncome || 0)}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">Son {filters.days} gün</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 rounded-xl p-5 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500 p-3 rounded-xl">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400">Toplam Gider</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                                {formatCurrency(cashflow?.totalExpense || 0)}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400">Son {filters.days} gün</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-3 rounded-xl">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Net Nakit</p>
                            <p className={`text-2xl font-bold ${(cashflow?.netCashflow || 0) >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                                {formatCurrency(cashflow?.netCashflow || 0)}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Son {filters.days} gün</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Remaining Payments Summary */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/40 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-500 p-3 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-orange-600 dark:text-orange-400">Tahsil Edilecek Toplam</p>
                            <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                                {formatCurrency(summary?.totalRemaining || 0)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-orange-600 dark:text-orange-400">Borçlu Hasta Sayısı</p>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{summary?.totalParties || 0}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-4">
                    <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Minimum Tutar</label>
                        <Select
                            className="px-3 py-1.5 text-sm"
                            value={String(minAmount)}
                            onChange={(e) => { setMinAmount(Number(e.target.value)); setPage(1); }}
                            options={[
                                { value: "0", label: "Tümü" },
                                { value: "1000", label: "1.000 ₺ ve üzeri" },
                                { value: "5000", label: "5.000 ₺ ve üzeri" },
                                { value: "10000", label: "10.000 ₺ ve üzeri" },
                                { value: "25000", label: "25.000 ₺ ve üzeri" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Parties with Remaining Payments */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">Kalan Ödemeler - Hasta Listesi</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ödemesi kalan hastalar</p>
                </div>

                {payments.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Hasta</th>
                                        <th className="px-4 py-3 font-medium text-center">Satış Sayısı</th>
                                        <th className="px-4 py-3 font-medium text-right">Toplam Tutar</th>
                                        <th className="px-4 py-3 font-medium text-right">Ödenen</th>
                                        <th className="px-4 py-3 font-medium text-right">Kalan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {payments.map((party) => (
                                        <tr key={party.partyId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                                            <td className="px-4 py-3">
                                                <p className="font-medium">{party.partyName}</p>
                                                {party.phone && (
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Phone className="w-3 h-3" /> {party.phone}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                    {party.saleCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(party.totalAmount)}</td>
                                            <td className="px-4 py-3 text-right text-green-600">
                                                {formatCurrency(party.paidAmount)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-red-600">
                                                {formatCurrency(party.remainingAmount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {typedMeta && typedMeta.totalPages && typedMeta.totalPages > 1 && (
                            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                                <span className="text-sm text-gray-500">
                                    Toplam {typedMeta.total || 0} hasta
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
                                    <span className="text-sm">{page} / {typedMeta.totalPages}</span>
                                    <Button
                                        onClick={() => setPage(p => Math.min(typedMeta.totalPages || 1, p + 1))}
                                        disabled={page >= (typedMeta.totalPages || 1)}
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
                        <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>Ödemesi kalan hasta bulunamadı</p>
                    </div>
                )}
            </div>
        </div>
    );
}
