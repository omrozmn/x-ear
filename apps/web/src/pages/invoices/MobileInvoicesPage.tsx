import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FileText, Search, CheckSquare, Square, X, Download, RefreshCw, CreditCard, Clock3, Trash2, Filter } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { invoiceService } from '@/services/invoice.service';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { Input, Button, Card } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/orval-mutator';
import { useDebounce } from '@/hooks/useDebounce';
import { listOutgoingInvoices } from '@/api/client/invoices.client';
import type { OutgoingInvoiceResponse } from '@/api/generated/schemas';

async function fetchInvoiceDocument(invoiceId: string | number, format: 'pdf' | 'html' | 'xml', renderMode: 'auto' | 'local' | 'remote' = 'auto'): Promise<{ data: ArrayBuffer; contentType: string }> {
    const resp = await apiClient.get<ArrayBuffer>(`/api/invoices/${invoiceId}/document?format=${format}&render_mode=${renderMode}`, {
        responseType: 'arraybuffer',
    });
    const contentType = (resp.headers?.['content-type'] as string) || (format === 'pdf' ? 'application/pdf' : 'text/html');
    return { data: resp.data, contentType };
}

export const MobileInvoicesPage: React.FC = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<OutgoingInvoiceResponse[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const { triggerSelection } = useHaptic();
    const debouncedSearch = useDebounce(searchValue, 300);

    const [pdfModal, setPdfModal] = useState<{ open: boolean; blobUrl: string; title: string; fileName: string } | null>(null);

    // Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [mobileVisibleCount, setMobileVisibleCount] = useState(25);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const loadMoreRef = useState(() => ({ current: null as HTMLDivElement | null }))[0];

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
        triggerSelection();
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredInvoices.map((inv) => String(inv.invoiceId))));
        }
        triggerSelection();
    };

    const handleCancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        triggerSelection();
    };

    const loadInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const response = await listOutgoingInvoices({
                page: 1,
                per_page: mobileVisibleCount,
                party_name: debouncedSearch || undefined,
            });

            const payload = response?.data;
            const items = payload?.invoices ?? [];
            const pagination = payload?.pagination;

            setInvoices(items);
            setTotalCount(pagination?.total ?? items.length);
            setTotalAmount(Number(payload?.totalAmount ?? 0));
            setHasMore((pagination?.total ?? items.length) > items.length);
        } catch (error) {
            console.error('Failed to load invoices:', error);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    }, [debouncedSearch, mobileVisibleCount]);

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    useEffect(() => {
        setMobileVisibleCount(25);
        setSelectedIds(new Set());
    }, [debouncedSearch]);

    useEffect(() => {
        if (!hasMore || !loadMoreRef.current || loading || isFetchingMore) return;

        const node = loadMoreRef.current;
        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry?.isIntersecting) {
                    setIsFetchingMore(true);
                    setMobileVisibleCount((prev) => prev + 25);
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, loading, isFetchingMore, loadMoreRef]);

    const handleRefresh = async () => {
        await loadInvoices();
    };

    const filteredInvoices = useMemo(() => invoices, [invoices]);

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'text-blue-700 bg-blue-50 border-blue-100';
            case 'overdue': return 'text-orange-700 bg-orange-50 border-orange-100';
            case 'sent': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
            case 'cancelled': return 'text-red-700 bg-red-50 border-red-100';
            case 'draft': return 'text-gray-600 bg-gray-50 border-gray-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            paid: 'Ödendi',
            overdue: 'Gecikmiş',
            sent: 'Gönderildi',
            draft: 'Taslak',
            cancelled: 'İptal'
        };
        return map[status?.toLowerCase()] || status;
    };

    const handleOpenInvoice = useCallback(async (invoice: OutgoingInvoiceResponse) => {
        if ((invoice.status || '').toLowerCase() === 'draft') {
            navigate({ to: '/invoices/new', search: { draftId: Number(invoice.invoiceId) } as { type?: string; draftId?: number } });
            return;
        }

        const toastId = toast.loading('Fatura yükleniyor...');
        try {
            const { data, contentType } = await fetchInvoiceDocument(invoice.invoiceId, 'pdf');
            const isPdf = contentType.includes('application/pdf');
            const mimeType = isPdf ? 'application/pdf' : 'text/html';
            const blob = new Blob([data], { type: mimeType });
            const baseUrl = URL.createObjectURL(blob);
            const url = isPdf ? `${baseUrl}#pagemode=none&toolbar=1` : baseUrl;
            if (pdfModal?.blobUrl) URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]);
            toast.dismiss(toastId);
            const fileName = `${invoice.invoiceNumber || invoice.invoiceId}${isPdf ? '.pdf' : '.html'}`;
            setPdfModal({ open: true, blobUrl: url, title: `${invoice.invoiceNumber} — ${`${invoice.partyFirstName || ''} ${invoice.partyLastName || ''}`.trim()}`, fileName });
        } catch {
            toast.error('Fatura önizlemesi açılamadı', { id: toastId });
        }
    }, [navigate, pdfModal]);

    const handleDownloadInvoice = useCallback(async (invoice: OutgoingInvoiceResponse) => {
        try {
            const invoiceId = invoice.invoiceId;
            const { data, contentType } = await fetchInvoiceDocument(invoiceId, 'pdf');
            const isPdf = contentType.includes('application/pdf');
            const blob = new Blob([data], { type: isPdf ? 'application/pdf' : 'text/html' });
            invoiceService.downloadPdfBlob(blob, `${invoice.invoiceNumber || invoice.invoiceId}${isPdf ? '.pdf' : '.html'}`);
            toast.success('PDF indirildi');
        } catch {
            toast.error('PDF indirilemedi');
        }
    }, []);

    const handleBulkExportCsv = useCallback(() => {
        const selected = filteredInvoices.filter((invoice) => selectedIds.has(String(invoice.invoiceId)));
        const headers = ['Fatura No', 'Alıcı', 'Durum', 'Tarih', 'Tutar'];
        const rows = selected.map((invoice) => [
            invoice.invoiceNumber || '',
            `${invoice.partyFirstName || ''} ${invoice.partyLastName || ''}`.trim(),
            getStatusLabel(invoice.status || ''),
            invoice.invoiceDate || '',
            String(invoice.totalAmount || 0),
        ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `giden_faturalar_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('CSV dışa aktarıldı');
    }, [filteredInvoices, selectedIds]);

    const handleBulkDeleteDrafts = useCallback(async () => {
        const selectedDrafts = filteredInvoices.filter((invoice) => selectedIds.has(String(invoice.invoiceId)) && (invoice.status || '').toLowerCase() === 'draft');

        if (selectedDrafts.length === 0) {
            toast.error('Sadece taslak faturalar silinebilir');
            return;
        }

        try {
            await Promise.all(selectedDrafts.map((invoice) => apiClient.delete(`/api/invoices/draft/${invoice.invoiceId}`)));
            toast.success(`${selectedDrafts.length} taslak silindi`);
            setSelectedIds(new Set());
            setIsSelectionMode(false);
            await loadInvoices();
        } catch {
            toast.error('Taslaklar silinemedi');
        }
    }, [filteredInvoices, selectedIds, loadInvoices]);

    const draftCount = invoices.filter((invoice) => (invoice.status || '').toLowerCase() === 'draft').length;

    return (
        <>
        <MobileLayout>
            <>
                <MobileHeader
                    title={isSelectionMode ? `${selectedIds.size} Seçilen` : 'Giden Faturalar'}
                    showBack={false}
                    actions={
                        isSelectionMode ? (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="px-2 py-1 h-auto text-sm text-blue-600 font-medium">
                                    {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? 'Hiçbiri' : 'Tümünü Seç'}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleCancelSelection} className="p-2 text-gray-600">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        ) : undefined
                    }
                />

                <PullToRefresh onRefresh={handleRefresh}>
                    <div className="p-6 space-y-6 min-h-[calc(100vh-140px)] bg-gray-50 dark:bg-gray-950">


                        <div className="grid grid-cols-3 gap-3 md:gap-6">
                            <Card className="p-3 md:p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Toplam Fatura</p>
                                        <p className="text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalCount}</p>
                                    </div>
                                    <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-2xl">
                                        <FileText className="text-blue-600 dark:text-blue-400 w-4 h-4 md:w-6 md:h-6" />
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-3 md:p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Taslak</p>
                                        <p className="text-lg md:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{draftCount}</p>
                                    </div>
                                    <div className="p-2 md:p-3 bg-amber-100 dark:bg-amber-900/20 rounded-2xl">
                                        <Clock3 className="text-amber-600 dark:text-amber-400 w-4 h-4 md:w-6 md:h-6" />
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-3 md:p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Gönderilen</p>
                                        <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totalAmount, 'TRY')}</p>
                                    </div>
                                    <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/20 rounded-2xl">
                                        <CreditCard className="text-green-600 dark:text-green-400 w-4 h-4 md:w-6 md:h-6" />
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center gap-3">
                            <CreditCard className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={20} />
                            <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                                Bu sayfada GİB üzerinden gönderilmiş e-fatura ve e-irsaliyeleriniz listelenir.
                            </p>
                        </div>

                        <Card className="p-3 md:p-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <Input
                                            type="text"
                                            placeholder="Alıcı adı veya fatura no ara..."
                                            value={searchValue}
                                            onChange={(e) => setSearchValue(e.target.value)}
                                            className="w-full pl-10 pr-4"
                                            fullWidth
                                        />
                                    </div>
                                    <Button variant="outline" onClick={() => setShowMobileFilters((v) => !v)} className="shrink-0 flex items-center gap-2">
                                        <Filter size={18} />
                                        Filtreler
                                    </Button>
                                    <Button variant="outline" onClick={() => { if (isSelectionMode) { handleCancelSelection(); } else { setIsSelectionMode(true); triggerSelection(); } }} className="shrink-0 flex items-center gap-2">
                                        <CheckSquare size={18} />
                                        {isSelectionMode ? 'Kapat' : 'Seç'}
                                    </Button>
                                </div>
                                {showMobileFilters && (
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" onClick={() => { setSearchValue(''); setShowMobileFilters(false); }}>Temizle</Button>
                                            <Button onClick={handleRefresh} className="flex items-center gap-2"><RefreshCw size={18} />Ara</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
                            </div>
                        ) : filteredInvoices.length > 0 ? (
                            filteredInvoices.map((inv) => (
                                <div
                                    key={inv.invoiceId}
                                    className={cn(
                                        'bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-visible relative transition-all',
                                        selectedIds.has(String(inv.invoiceId))
                                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500'
                                            : 'border-gray-200 dark:border-gray-700'
                                    )}
                                >
                                    {isSelectionMode && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                            {selectedIds.has(String(inv.invoiceId)) ? (
                                                <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            ) : (
                                                <Square className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                            )}
                                        </div>
                                    )}

                                    <div
                                        className={cn('p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors', isSelectionMode && 'pr-12')}
                                        onClick={() => {
                                            triggerSelection();
                                            if (isSelectionMode) {
                                                toggleSelect(String(inv.invoiceId));
                                            } else {
                                                void handleOpenInvoice(inv);
                                            }
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-3 gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{inv.invoiceNumber || 'Fatura'}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{`${inv.partyFirstName || ''} ${inv.partyLastName || ''}`.trim() || 'Alıcı bilgisi yok'}</p>
                                                </div>
                                            </div>
                                            <span className={cn('text-[10px] px-2 py-1 rounded-full font-medium border shrink-0', getStatusColor(inv.status || ''))}>
                                                {getStatusLabel(inv.status || '')}
                                            </span>
                                        </div>

                                        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between items-end gap-3">
                                            <div>
                                                <p className="text-xs text-gray-400">Tarih</p>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {inv.invoiceDate ? formatDate(inv.invoiceDate) : '-'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">Tutar</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(Number(inv.totalAmount || 0), 'TRY')}
                                                </p>
                                            </div>
                                        </div>

                                        {!isSelectionMode && (
                                            <div className="mt-3 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-xl px-2 text-gray-500"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handleDownloadInvoice(inv);
                                                    }}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
                                    <FileText className="h-8 w-8 text-gray-300 dark:text-gray-500" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Fatura Bulunamadı</h3>
                                <p className="text-gray-500 text-sm mt-1">
                                    Kriterlere uygun fatura yok.
                                </p>
                            </div>
                        )}

                        {hasMore && <div ref={(node) => { loadMoreRef.current = node; }} className="h-10 w-full" aria-hidden="true" />}

                        {isFetchingMore && !loading && (
                            <div className="flex justify-center pb-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        )}
                    </div>
                </PullToRefresh>

                {selectedIds.size > 0 && isSelectionMode && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-3xl">
                        <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
                            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedIds.size} fatura seçildi</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Toplu işlem seçerek devam edebilirsin</p>
                                </div>
                                <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-9 rounded-xl px-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 p-3">
                                <Button variant="ghost" onClick={handleBulkExportCsv} className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 h-auto">
                                    <Download className="w-4 h-4" /> CSV Aktar
                                </Button>
                                <Button variant="ghost" onClick={handleBulkDeleteDrafts} className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 h-auto">
                                    <Trash2 className="w-4 h-4" /> Taslak Sil
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {!isSelectionMode && (
                    <FloatingActionButton
                        onClick={() => navigate({ to: '/invoices/new' })}
                    />
                )}
            </>
        </MobileLayout>

        {/* PDF / HTML preview modal */}
        {pdfModal?.open && (
            <div
                className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-2"
                onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
            >
                <div
                    className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col"
                    style={{ height: '92vh' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate pr-3">{pdfModal.title}</h2>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                                href={pdfModal.blobUrl.split('#')[0]}
                                download={pdfModal.fileName}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white premium-gradient tactile-press rounded-xl"
                            >
                                <Download size={15} />
                                İndir
                            </a>
                            <Button
                                variant="ghost"
                                onClick={() => { URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]); setPdfModal(null); }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={24} />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <iframe
                            src={pdfModal.blobUrl}
                            className="w-full h-full border-0"
                            title="Fatura PDF"
                        />
                    </div>
                </div>
            </div>
        )}
        </>
    );
};
