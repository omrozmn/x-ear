import React, { useState, useMemo } from 'react';
import {
    AlertTriangle,
    RefreshCw,
    Loader2,
    FileText,
    Receipt,
    CreditCard,
    Calendar,
    X,
    Phone
} from 'lucide-react';
import { Button, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
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
import type { FilterState } from '../types';
import { TabExportButton } from '../components/TabExportButton';
import PieChartSimple from '@/components/charts/PieChartSimple';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';

interface PromissoryNotesTabProps {
    filters: FilterState;
}

export function PromissoryNotesTab({ filters }: PromissoryNotesTabProps) {
  const { t } = useTranslation('reports');
    const { hasPermission } = usePermissions();
    const canViewFinancials = hasPermission('sensitive.reports.promissory.financials.view');
    const canViewContact = hasPermission('sensitive.parties.list.contact.view');
    const [showListModal, setShowListModal] = useState(false);
    const [listFilter, setListFilter] = useState<'active' | 'overdue' | 'paid' | 'all'>('all');
    const [listPage, setListPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedNote, setSelectedNote] = useState<ReportPromissoryNoteListItem | null>(null);

    const reportParams = {
        days: filters.days,
        branch_id: filters.branch,
        startDate: filters.dateRange.start || undefined,
        endDate: filters.dateRange.end || undefined
    } as never;

    // Using Orval-generated hooks for promissory notes reports
    const { data: notesData, isLoading, error, refetch } = useListReportPromissoryNotes(reportParams);

    const { data: byPartyData, isLoading: partyLoading } = useListReportPromissoryNoteByParty({
        status: 'active',
        page: 1,
        per_page: 10,
        branch_id: filters.branch,
        startDate: filters.dateRange.start || undefined,
        endDate: filters.dateRange.end || undefined
    } as never);

    const { data: listData, isLoading: listLoading } = useListReportPromissoryNoteList(
        {
            status: listFilter,
            page: listPage,
            per_page: 20,
            search,
            branch_id: filters.branch,
            startDate: filters.dateRange.start || undefined,
            endDate: filters.dateRange.end || undefined
        } as never,
        {
            query: {
                queryKey: [
                    ...getListReportPromissoryNoteListQueryKey({
                        status: listFilter,
                        page: listPage,
                        per_page: 20,
                        search,
                        startDate: filters.dateRange.start || undefined,
                        endDate: filters.dateRange.end || undefined
                    } as never),
                    filters.branch
                ],
                enabled: showListModal
            }
        }
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

    const getMonthName = (month: number) => {
        const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        return months[month - 1] || '';
    };

    const renderMonthlyDonut = (
        items: Array<{ month: number; value: number; display: (value: number) => string }>,
        config: {
            centerLabel: string;
            footerLabel: string;
            totalFormatter?: (value: number) => string;
            detailFormatter?: (value: number) => string;
        }
    ) => {
        if (!items.length) {
            return <p className="text-muted-foreground text-center py-8">{t('noData', 'Veri bulunamadı')}</p>;
        }

        return (
            <div className="space-y-4">
                <PieChartSimple
                    size={220}
                    centerLabel={config.centerLabel}
                    footerLabel={config.footerLabel}
                    valueFormatter={config.totalFormatter}
                    detailFormatter={config.detailFormatter}
                    data={items.map((item) => ({
                        label: getMonthName(item.month),
                        value: item.value
                    }))}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((item) => (
                        <div key={`${item.month}-${item.value}`} className="rounded-xl border border-border bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{getMonthName(item.month)}</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{item.display(item.value)}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const notes = unwrapObject<ReportPromissoryNotes>(notesData);
    const byParty = unwrapArray<ReportPromissoryNoteByParty>(byPartyData);
    const { data: list, meta: listMeta } = unwrapPaginated<ReportPromissoryNoteListItem>(listData);
    const typedListMeta = listMeta as ResponseMeta | undefined;

    const byPartyColumns = useMemo<Column<ReportPromissoryNoteByParty>[]>(() => [
        {
            key: 'partyName',
            title: t('patient', 'Hasta'),
            render: (_: unknown, record: ReportPromissoryNoteByParty) => (
                <>
                    <p className="font-medium text-gray-900 dark:text-white">{record.partyName}</p>
                    {canViewContact && record.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {record.phone}
                        </p>
                    )}
                </>
            )
        },
        {
            key: 'totalNotes',
            title: t('totalNotes', t('totalNotes', 'Toplam Senet')),
            align: 'center',
            render: (_: unknown, record: ReportPromissoryNoteByParty) => (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-blue-800 dark:text-blue-300">
                    {record.totalNotes}
                </span>
            )
        },
        {
            key: 'firstDueDate',
            title: t('firstDue', 'İlk Vade'),
            render: (_: unknown, record: ReportPromissoryNoteByParty) => (
                <span className="text-sm text-foreground">
                    {record.firstDueDate ? new Date(record.firstDueDate).toLocaleDateString('tr-TR') : '-'}
                </span>
            )
        },
        {
            key: 'lastDueDate',
            title: t('lastDue', 'Son Vade'),
            render: (_: unknown, record: ReportPromissoryNoteByParty) => (
                <span className="text-sm text-foreground">
                    {record.lastDueDate ? new Date(record.lastDueDate).toLocaleDateString('tr-TR') : '-'}
                </span>
            )
        },
        {
            key: 'totalAmount',
            title: t('totalAmount', 'Toplam Tutar'),
            align: 'right',
            render: (_: unknown, record: ReportPromissoryNoteByParty) => formatProtectedCurrency(record.totalAmount)
        },
        {
            key: 'remainingAmount',
            title: t('remaining', 'Kalan'),
            align: 'right',
            render: (_: unknown, record: ReportPromissoryNoteByParty) => (
                <span className="font-medium text-destructive">{formatProtectedCurrency(record.remainingAmount)}</span>
            )
        },
    ], []);

    const listColumns = useMemo<Column<ReportPromissoryNoteListItem>[]>(() => [
        {
            key: 'noteNumber',
            title: t('noteNumber', 'Senet No'),
            render: (_: unknown, record: ReportPromissoryNoteListItem) => (
                <span className="font-mono text-xs">{record.noteNumber || '-'}</span>
            )
        },
        {
            key: 'party',
            title: t('patient', 'Hasta'),
            render: (_: unknown, record: ReportPromissoryNoteListItem) => (
                <span className="font-medium">{record.party?.name || '-'}</span>
            )
        },
        {
            key: 'amount',
            title: t('amount', 'Tutar'),
            align: 'right',
            render: (_: unknown, record: ReportPromissoryNoteListItem) => formatProtectedCurrency(record.amount)
        },
        {
            key: 'remainingAmount',
            title: t('remaining', 'Kalan'),
            align: 'right',
            render: (_: unknown, record: ReportPromissoryNoteListItem) => (
                <span className="font-medium text-destructive">
                    {formatProtectedCurrency(record.remainingAmount)}
                </span>
            )
        },
        {
            key: 'dueDate',
            title: t('dueDate', 'Vade'),
            render: (_: unknown, record: ReportPromissoryNoteListItem) =>
                record.dueDate ? new Date(record.dueDate).toLocaleDateString('tr-TR') : '-'
        },
        {
            key: 'status',
            title: t('status', 'Durum'),
            render: (_: unknown, record: ReportPromissoryNoteListItem) => (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'paid' ? 'bg-success/10 text-success' :
                    record.status === 'overdue' ? 'bg-destructive/10 text-red-800 dark:text-red-300' :
                    record.status === 'partial' ? 'bg-warning/10 text-yellow-800 dark:text-yellow-300' :
                    'bg-primary/10 text-blue-800 dark:text-blue-300'
                }`}>
                    {record.status === 'paid' ? t('paid', 'Ödendi') :
                     record.status === 'overdue' ? t('overdue', 'Vadesi Geçti') :
                     record.status === 'partial' ? t('partial', 'Kısmi') : t('active', 'Aktif')}
                </span>
            )
        },
        {
            key: 'id',
            title: '',
            render: (_: unknown, record: ReportPromissoryNoteListItem) => (
                <Button
                    variant="ghost"
                    onClick={() => setSelectedNote(record)}
                    className="!w-auto !h-auto px-2 py-1"
                >
                    Detay
                </Button>
            )
        },
    ], []);

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">{t('promissoryReports', 'Senet Raporları')}</h3>
                <div className="flex items-center gap-2">
                    <TabExportButton filename="senet-raporu" rows={byParty as unknown as Array<Record<string, unknown>>} />
                    <Button
                        onClick={() => setShowListModal(true)}
                        variant="outline"
                        icon={<FileText className="w-4 h-4" />}
                    >
                        Tüm Senetleri Görüntüle
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-2 rounded-2xl">
                            <Receipt className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-primary">Toplam Senet</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{notes?.summary?.totalNotes || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-500 p-2 rounded-2xl">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-success">Tahsil Edilen</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatProtectedCurrency(notes?.summary?.totalCollected || 0)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/40 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500 p-2 rounded-2xl">
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
                        <div className="bg-red-500 p-2 rounded-2xl">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-destructive">Vadesi Geçmiş</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{notes?.summary?.overdueNotes || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Note Count */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">{t('monthlyNoteCount', 'Aylık Senet Sayısı')}</h4>
                    {renderMonthlyDonut(
                        (notes?.monthlyCounts || []).map((item) => ({
                            month: item.month,
                            value: item.count,
                            display: (value) => `${value} senet`,
                        })),
                        {
                            centerLabel: 'Toplam',
                            footerLabel: 'Senet',
                            detailFormatter: (value) => `${value} senet`,
                        }
                    )}
                </div>

                {/* Monthly Revenue */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">{t('monthlyNoteCollection', 'Aylık Senet Tahsilatı')}</h4>
                    {renderMonthlyDonut(
                        (notes?.monthlyRevenue || []).map((item) => ({
                            month: item.month,
                            value: item.revenue,
                            display: (value) => formatProtectedCurrency(value),
                        })),
                        {
                            centerLabel: 'Tahsilat',
                            footerLabel: 'TL',
                            totalFormatter: formatProtectedCurrency,
                            detailFormatter: formatProtectedCurrency,
                        }
                    )}
                </div>
            </div>

            {/* Parties with Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white">{t('patientBasedNoteSummary', 'Hasta Bazlı Senet Özeti')}</h4>
                    <p className="text-sm text-muted-foreground">Aktif senedi olan hastalar</p>
                </div>
                {partyLoading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <DataTable<ReportPromissoryNoteByParty>
                        data={byParty}
                        columns={byPartyColumns}
                        rowKey="partyId"
                        emptyText={t('noActiveNotePatients', 'Aktif senedi olan hasta bulunamadı')}
                        striped
                        hoverable
                        size="medium"
                    />
                )}
            </div>

            {/* Promissory Notes List Modal */}
            {showListModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('notesList', 'Senet Listesi')}</h2>
                                <p className="text-sm text-muted-foreground">Tüm senetleri görüntüle ve filtrele</p>
                            </div>
                            <Button
                                onClick={() => setShowListModal(false)}
                                variant="ghost"
                                className="p-1 hover:bg-muted rounded !w-auto !h-auto"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Filter Tabs */}
                        <div className="px-4 pt-3 border-b border-border">
                            <div className="flex gap-2">
                                {[
                                    { key: 'active', label: t('active', 'Aktif') },
                                    { key: 'overdue', label: t('overdueLabel', 'Vadesi Geçmiş') },
                                    { key: 'paid', label: t('paid', 'Ödendi') },
                                    { key: 'all', label: t('all', 'Tümü') }
                                ].map(tab => (
                                    <Button
                                        key={tab.key}
                                        onClick={() => { setListFilter(tab.key as "active" | "overdue" | "paid" | "all"); setListPage(1); }}
                                        variant="ghost"
                                        className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors !w-auto !h-auto rounded-none rounded-t-md ${listFilter === tab.key
                                            ? 'border-blue-500 text-primary dark:border-blue-400 bg-primary/10'
                                            : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
                                            }`}
                                    >
                                        {tab.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-b border-border">
                            <input
                                data-allow-raw="true"
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setListPage(1); }}
                                placeholder="Hasta adı, telefon veya senet no ile ara"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <DataTable<ReportPromissoryNoteListItem>
                                data={list}
                                columns={listColumns}
                                loading={listLoading}
                                rowKey="id"
                                emptyText={t('noNotes', t('noNotes', 'Senet bulunamadı'))}
                                striped
                                hoverable
                                size="medium"
                                pagination={typedListMeta?.total ? {
                                    current: listPage,
                                    pageSize: 20,
                                    total: typedListMeta.total,
                                    onChange: (p: number) => setListPage(p)
                                } : undefined}
                            />
                        </div>

                        <div className="p-4 border-t">
                            <Button onClick={() => setShowListModal(false)} variant="outline" className="w-full">
                                {t('close', 'Kapat')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {selectedNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 p-6 mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{t('noteDetail', 'Senet Detayı')}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {selectedNote.noteNumber || t('unnumberedNote', 'Numarasız senet')}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedNote(null)}
                                className="!w-auto !h-auto px-2 py-1"
                            >
                                {t('close', 'Kapat')}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Hasta</span>
                                <p className="font-medium text-gray-900 dark:text-white">{selectedNote.party?.name || '-'}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Telefon</span>
                                <p className="font-medium text-gray-900 dark:text-white">{canViewContact ? (selectedNote.party?.phone || '-') : t('hiddenForRole', 'Bu rol icin gizli')}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Senet Tutarı</span>
                                <p className="font-medium text-gray-900 dark:text-white">{formatProtectedCurrency(selectedNote.amount)}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Tahsil Edilen</span>
                                <p className="font-medium text-gray-900 dark:text-white">{formatProtectedCurrency(selectedNote.paidAmount)}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Kalan Tutar</span>
                                <p className="font-medium text-destructive">{formatProtectedCurrency(selectedNote.remainingAmount)}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Vade Tarihi</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {selectedNote.dueDate ? new Date(selectedNote.dueDate).toLocaleDateString('tr-TR') : '-'}
                                </p>
                            </div>
                            <div className="md:col-span-2">
                                <span className="text-muted-foreground">Durum</span>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {selectedNote.status === 'paid' ? t('paid', 'Ödendi') :
                                     selectedNote.status === 'overdue' ? t('overdue', 'Vadesi Geçti') :
                                     selectedNote.status === 'partial' ? t('partialCollection', 'Kısmi Tahsilat') : t('active', 'Aktif')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
