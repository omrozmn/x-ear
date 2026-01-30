import React, { useState } from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2,
    FileText,
    Receipt,
    DollarSign,
    Calendar,
    ChevronLeft,
    ChevronRight,
    X,
    Phone
} from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { unwrapObject, unwrapArray, unwrapPaginated } from '../../../utils/response-unwrap';
import {
    useListReportPromissoryNotes,
    useListReportPromissoryNoteByPatient as useListReportPromissoryNoteByParty,
    useListReportPromissoryNoteList,
    getListReportPromissoryNoteListQueryKey
} from '@/api/client/reports.client';
import {
    ReportPromissoryNotes,
    ReportPromissoryNoteByParty,
    ReportPromissoryNoteListItem
} from '../types';
import type { ResponseMeta } from '@/api/generated/schemas';

export function PromissoryNotesTab() {
    const [showListModal, setShowListModal] = useState(false);
    const [listFilter, setListFilter] = useState<'active' | 'overdue' | 'paid' | 'all'>('active');
    const [listPage, setListPage] = useState(1);

    // Using Orval-generated hooks for promissory notes reports
    const { data: notesData, isLoading, error, refetch } = useListReportPromissoryNotes({
        days: 365
    });

    const { data: byPartyData, isLoading: partyLoading } = useListReportPromissoryNoteByParty({
        status: 'active',
        page: 1,
        per_page: 10
    });

    const { data: listData, isLoading: listLoading } = useListReportPromissoryNoteList(
        { status: listFilter, page: listPage, per_page: 20 },
        { query: { queryKey: [...getListReportPromissoryNoteListQueryKey({ status: listFilter, page: listPage, per_page: 20 })], enabled: showListModal } }
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getMonthName = (month: number) => {
        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        return months[month - 1] || '';
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

    const notes = unwrapObject<ReportPromissoryNotes>(notesData);
    const byParty = unwrapArray<ReportPromissoryNoteByParty>(byPartyData);
    const { data: list, meta: listMeta } = unwrapPaginated<ReportPromissoryNoteListItem>(listData);
    const typedListMeta = listMeta as ResponseMeta | undefined;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Senet Raporları</h3>
                <Button
                    onClick={() => setShowListModal(true)}
                    variant="outline"
                    icon={<FileText className="w-4 h-4" />}
                >
                    Tüm Senetleri Görüntüle
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-2 rounded-lg">
                            <Receipt className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Toplam Senet</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{notes?.summary?.totalNotes || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500 p-2 rounded-lg">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-green-600 dark:text-green-400">Tahsil Edilen</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(notes?.summary?.totalCollected || 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/40 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500 p-2 rounded-lg">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">Aktif Senet</p>
                            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{notes?.summary?.activeNotes || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40 rounded-xl p-4 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500 p-2 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-red-600 dark:text-red-400">Vadesi Geçmiş</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{notes?.summary?.overdueNotes || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Note Count */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Aylık Senet Sayısı</h4>
                    {notes?.monthlyCounts && notes.monthlyCounts.length > 0 ? (
                        <div className="flex items-end gap-2 h-40">
                            {notes.monthlyCounts.map((item, idx) => {
                                const counts = notes.monthlyCounts || [];
                                const maxCount = Math.max(...counts.map((i) => i.count));
                                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                            title={`${item.count} senet`}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getMonthName(item.month)}</span>
                                        <span className="text-xs font-medium text-gray-900 dark:text-white">{item.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">Veri bulunamadı</p>
                    )}
                </div>

                {/* Monthly Revenue */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Aylık Senet Tahsilatı</h4>
                    {notes?.monthlyRevenue && notes.monthlyRevenue.length > 0 ? (
                        <div className="flex items-end gap-2 h-40">
                            {notes.monthlyRevenue.map((item, idx) => {
                                const revenues = notes.monthlyRevenue || [];
                                const maxRevenue = Math.max(...revenues.map((i) => i.revenue));
                                const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center">
                                        <div
                                            className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                            title={formatCurrency(item.revenue)}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getMonthName(item.month)}</span>
                                        <span className="text-xs font-medium text-gray-900 dark:text-white">{formatCurrency(item.revenue)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">Veri bulunamadı</p>
                    )}
                </div>
            </div>

            {/* Parties with Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">Hasta Bazlı Senet Özeti</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aktif senedi olan hastalar</p>
                </div>
                {partyLoading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                ) : byParty.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Hasta</th>
                                    <th className="px-4 py-3 font-medium text-center">Aktif</th>
                                    <th className="px-4 py-3 font-medium text-center">Vadesi Geçmiş</th>
                                    <th className="px-4 py-3 font-medium text-right">Toplam Tutar</th>
                                    <th className="px-4 py-3 font-medium text-right">Kalan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {byParty.map((party) => (
                                    <tr key={party.partyId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 dark:text-white">{party.partyName}</p>
                                            {party.phone && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {party.phone}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                {party.activeNotes}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {party.overdueNotes > 0 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                                                    {party.overdueNotes}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(party.totalAmount)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-red-600">
                                            {formatCurrency(party.remainingAmount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>Aktif senedi olan hasta bulunamadı</p>
                    </div>
                )}
            </div>

            {/* Promissory Notes List Modal */}
            {showListModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Senet Listesi</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tüm senetleri görüntüle ve filtrele</p>
                            </div>
                            <Button
                                onClick={() => setShowListModal(false)}
                                variant="ghost"
                                className="p-1 hover:bg-gray-100 rounded !w-auto !h-auto"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Filter Tabs */}
                        <div className="px-4 pt-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2">
                                {[
                                    { key: 'active', label: 'Aktif' },
                                    { key: 'overdue', label: 'Vadesi Geçmiş' },
                                    { key: 'paid', label: 'Ödendi' },
                                    { key: 'all', label: 'Tümü' }
                                ].map(tab => (
                                    <Button
                                        key={tab.key}
                                        onClick={() => { setListFilter(tab.key as "active" | "overdue" | "paid" | "all"); setListPage(1); }}
                                        variant="ghost"
                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors !w-auto !h-auto rounded-none rounded-t-md ${listFilter === tab.key
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {listLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : list.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">Senet No</th>
                                            <th className="px-3 py-2 font-medium">Hasta</th>
                                            <th className="px-3 py-2 font-medium text-right">Tutar</th>
                                            <th className="px-3 py-2 font-medium text-right">Kalan</th>
                                            <th className="px-3 py-2 font-medium">Vade</th>
                                            <th className="px-3 py-2 font-medium">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {list.map((note: ReportPromissoryNoteListItem) => (
                                            <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-300">
                                                <td className="px-3 py-2 font-mono text-xs">
                                                    {note.noteNumber || '-'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <p className="font-medium">{note.party?.name || '-'}</p>
                                                </td>
                                                <td className="px-3 py-2 text-right">{formatCurrency(note.amount)}</td>
                                                <td className="px-3 py-2 text-right font-medium text-red-600 dark:text-red-400">
                                                    {formatCurrency(note.remainingAmount)}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {note.dueDate ? new Date(note.dueDate).toLocaleDateString('tr-TR') : '-'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${note.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                        note.status === 'overdue' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                                            note.status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                                                'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                                        }`}>
                                                        {note.status === 'paid' ? 'Ödendi' :
                                                            note.status === 'overdue' ? 'Vadesi Geçti' :
                                                                note.status === 'partial' ? 'Kısmi' : 'Aktif'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p>Senet bulunamadı</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {typedListMeta && typedListMeta.totalPages && typedListMeta.totalPages > 1 && (
                            <div className="px-4 py-3 border-t flex items-center justify-between">
                                <span className="text-sm text-gray-500">
                                    Toplam {typedListMeta.total || 0} senet
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setListPage(p => Math.max(1, p - 1))}
                                        disabled={listPage === 1}
                                        variant="outline"
                                        className="p-1.5 border rounded disabled:opacity-50 hover:bg-gray-100 !w-auto !h-auto"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm">
                                        {listPage} / {typedListMeta.totalPages}
                                    </span>
                                    <Button
                                        onClick={() => setListPage(p => Math.min(typedListMeta.totalPages || 1, p + 1))}
                                        disabled={listPage >= (typedListMeta.totalPages || 1)}
                                        variant="outline"
                                        className="p-1.5 border rounded disabled:opacity-50 hover:bg-gray-100 !w-auto !h-auto"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-t">
                            <Button onClick={() => setShowListModal(false)} variant="outline" className="w-full">
                                Kapat
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
