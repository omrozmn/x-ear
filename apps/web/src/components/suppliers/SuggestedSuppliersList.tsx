import React, { useState } from 'react';
import { Building2, CheckCircle, XCircle, Info, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { apiClient } from '@/api/orval-mutator';
import {
    SuggestedSupplier,
    SuggestedInvoice,
    useAcceptSuggestedSupplier,
    useRejectSuggestedSupplier,
} from '../../hooks/useSupplierInvoices';

async function fetchInvoiceDocument(invoiceId: number | string, format: 'pdf' | 'html' | 'xml', renderMode: 'auto' | 'local' | 'remote' = 'auto'): Promise<{ data: ArrayBuffer; contentType: string }> {
    const resp = await apiClient.get<ArrayBuffer>(`/api/invoices/${invoiceId}/document?format=${format}&render_mode=${renderMode}`, {
        responseType: 'arraybuffer',
    });
    const contentType = (resp.headers?.['content-type'] as string) || (format === 'pdf' ? 'application/pdf' : 'text/html');
    return { data: resp.data, contentType };
}

interface SuggestedSuppliersListProps {
    suppliers: SuggestedSupplier[];
    isLoading?: boolean;
    onSupplierAccepted?: () => void;
}

// PDF viewer modal overlay
function PdfViewerModal({ blobUrl, title, onClose }: { blobUrl: string; title: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl flex flex-col w-[90vw] h-[85vh] max-w-5xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-800 truncate">{title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={blobUrl.split('#')[0]}
                            download={`${title}.pdf`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            İndir
                        </a>
                        <button data-allow-raw="true" onClick={onClose} className="p-1 rounded hover:bg-gray-200 transition-colors ml-1">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>
                <iframe
                    src={blobUrl}
                    className="flex-1 w-full border-0"
                    title={title}
                />
            </div>
        </div>
    );
}

export function SuggestedSuppliersList({ suppliers, isLoading, onSupplierAccepted }: SuggestedSuppliersListProps) {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [pdfModal, setPdfModal] = useState<{ blobUrl: string; title: string } | null>(null);
    const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);

    const acceptMutation = useAcceptSuggestedSupplier();
    const rejectMutation = useRejectSuggestedSupplier();

    const handleAccept = async (supplier: SuggestedSupplier) => {
        try {
            await acceptMutation.mutateAsync(supplier);
            toast.success(`"${supplier.companyName}" tedarikçilerinize eklendi`);
            onSupplierAccepted?.();
        } catch {
            toast.error('Tedarikçi eklenirken bir hata oluştu');
        }
    };

    const handleReject = async (supplier: SuggestedSupplier) => {
        try {
            await rejectMutation.mutateAsync(supplier.companyName);
            toast.success(`"${supplier.companyName}" öneriler listesinden kaldırıldı`);
        } catch {
            toast.error('Reddetme işlemi başarısız');
        }
    };

    const handleViewInvoice = async (inv: SuggestedInvoice) => {
        if (!inv.invoiceId) { toast.error('Fatura ID bulunamadı'); return; }
        const key = String(inv.invoiceId);
        setInvoiceLoading(key);
        const toastId = toast.loading('Fatura yükleniyor...');
        try {
            const { data: buf, contentType } = await fetchInvoiceDocument(inv.invoiceId, 'pdf', 'local');
            const isPdf = contentType.includes('application/pdf');
            const mimeType = isPdf ? 'application/pdf' : 'text/html';
            const blob = new Blob([buf], { type: mimeType });
            const baseUrl = URL.createObjectURL(blob);
            const url = isPdf ? baseUrl + '#pagemode=none&toolbar=1' : baseUrl;
            if (pdfModal?.blobUrl) URL.revokeObjectURL(pdfModal.blobUrl.split('#')[0]);
            setPdfModal({ blobUrl: url, title: `${inv.invoiceNumber || inv.invoiceId}` });
            toast.dismiss(toastId);
        } catch {
            toast.error('Fatura yüklenemedi', { id: toastId });
        } finally {
            setInvoiceLoading(null);
        }
    };

    const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';

    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                <span className="ml-3 text-sm text-gray-500">Önerilen tedarikçiler yükleniyor...</span>
            </div>
        );
    }

    if (!safeSuppliers.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">Henüz önerilen tedarikçi yok</p>
                <p className="text-xs text-gray-400 mt-1">Gelen faturalardan tedarikçiler otomatik eklenir</p>
            </div>
        );
    }

    const invoiceColumns: Column<SuggestedInvoice>[] = [
        {
            key: '_invoiceNumber',
            title: 'Fatura No',
            render: (_, inv) => <span className="font-mono text-gray-700">{inv.invoiceNumber || `#${inv.invoiceId}`}</span>,
        },
        {
            key: '_invoiceDate',
            title: 'Tarih',
            render: (_, inv) => <span className="text-gray-600">{fmtDate(inv.invoiceDate)}</span>,
        },
        {
            key: '_totalAmount',
            title: 'Tutar',
            align: 'right',
            render: (_, inv) => <span className="font-semibold text-gray-800">{fmt(inv.totalAmount || 0)}</span>,
        },
        {
            key: '_view',
            title: 'Görüntüle',
            align: 'center',
            render: (_, inv) => (
                <button
                    data-allow-raw="true"
                    type="button"
                    onClick={() => handleViewInvoice(inv)}
                    disabled={invoiceLoading === String(inv.invoiceId)}
                    title="Faturayı görüntüle"
                    className="inline-flex items-center justify-center w-8 h-8 rounded text-blue-600 hover:bg-blue-200 disabled:opacity-50 transition-colors"
                >
                    {invoiceLoading === String(inv.invoiceId)
                        ? <span className="block h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        : <FileText className="w-3.5 h-3.5" />}
                </button>
            ),
        },
    ];

    return (
        <>
            {pdfModal && (
                <PdfViewerModal
                    blobUrl={pdfModal.blobUrl}
                    title={pdfModal.title}
                    onClose={() => {
                        URL.revokeObjectURL(pdfModal.blobUrl);
                        setPdfModal(null);
                    }}
                />
            )}

            <div className="space-y-4">
                {safeSuppliers.map((supplier) => (
                    <div key={supplier.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="space-y-1">
                                    <div className="font-medium text-gray-900">{supplier.companyName}</div>
                                    <div className="text-xs text-gray-500">Vergi No: {supplier.taxNumber || '—'}</div>
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        <span>Fatura: <span className="font-semibold text-blue-700">{supplier.invoiceCount ?? 0}</span></span>
                                        <span>Toplam: <span className="font-semibold text-gray-800">{fmt(supplier.totalAmount || 0)}</span></span>
                                        <span>İlk: {fmtDate(supplier.firstInvoiceDate)}</span>
                                        <span>Son: {supplier.lastInvoiceDate && supplier.lastInvoiceDate !== supplier.firstInvoiceDate ? fmtDate(supplier.lastInvoiceDate) : fmtDate(supplier.firstInvoiceDate)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    data-allow-raw="true"
                                    type="button"
                                    title="Fatura listesini göster"
                                    onClick={() => setExpandedRow(expandedRow === supplier.id ? null : supplier.id)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <Info className="w-3.5 h-3.5" />
                                    Faturalar
                                    {expandedRow === supplier.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                <button
                                    data-allow-raw="true"
                                    type="button"
                                    title="Tedarikçi listeme ekle"
                                    onClick={() => handleAccept(supplier)}
                                    disabled={acceptMutation.isPending}
                                    className="inline-flex items-center gap-1 rounded-xl bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Listeme Ekle
                                </button>
                                <button
                                    data-allow-raw="true"
                                    type="button"
                                    title="Reddet"
                                    onClick={() => handleReject(supplier)}
                                    disabled={rejectMutation.isPending}
                                    className="inline-flex items-center rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 disabled:opacity-60 transition-colors"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {expandedRow === supplier.id && (
                            <div className="mt-4 rounded-xl bg-blue-50/60 p-3">
                                {!supplier.invoices?.length ? (
                                    <p className="py-2 text-xs text-gray-500">Bu tedarikçi için fatura detayı yok.</p>
                                ) : (
                                    <DataTable<SuggestedInvoice>
                                        data={supplier.invoices}
                                        columns={invoiceColumns}
                                        rowKey={(inv) => String(inv.invoiceId)}
                                        emptyText="Fatura detayı yok"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}

