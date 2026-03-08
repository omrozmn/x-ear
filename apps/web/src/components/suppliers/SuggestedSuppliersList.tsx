import React, { useState } from 'react';
import { Building2, CheckCircle, XCircle, Info, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/orval-mutator';
import {
    SuggestedSupplier,
    SuggestedInvoice,
    useAcceptSuggestedSupplier,
    useRejectSuggestedSupplier,
} from '../../hooks/useSupplierInvoices';

async function fetchInvoiceDocument(invoiceId: number | string, format: 'pdf' | 'html' | 'xml'): Promise<ArrayBuffer> {
    const resp = await apiClient.get<ArrayBuffer>(`/api/invoices/${invoiceId}/document?format=${format}`, {
        responseType: 'arraybuffer',
    });
    return resp.data;
}

interface SuggestedSuppliersListProps {
    suppliers: SuggestedSupplier[];
    isLoading?: boolean;
    onSupplierAccepted?: () => void;
}

// PDF viewer modal overlay
function PdfViewerModal({ blobUrl, title, onClose }: { blobUrl: string; title: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-xl shadow-2xl flex flex-col w-[90vw] h-[85vh] max-w-5xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-800 truncate">{title}</span>
                    </div>
                    <button data-allow-raw="true" onClick={onClose} className="p-1 rounded hover:bg-gray-200 transition-colors ml-2">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
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
            const buf = await fetchInvoiceDocument(inv.invoiceId, 'html');
            const blob = new Blob([buf], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            if (pdfModal?.blobUrl) URL.revokeObjectURL(pdfModal.blobUrl);
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

            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide text-xs">Firma Adı</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide text-xs">Vergi No</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase tracking-wide text-xs">Fatura Sayısı</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide text-xs">Toplam Tutar</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase tracking-wide text-xs">İlk / Son Fatura</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase tracking-wide text-xs">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {safeSuppliers.map((supplier) => (
                            <React.Fragment key={supplier.id}>
                                <tr className="hover:bg-gray-50 transition-colors">
                                    {/* Firma Adı */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 shrink-0 rounded-full bg-blue-50 flex items-center justify-center">
                                                <Building2 className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <span className="font-medium text-gray-900">{supplier.companyName}</span>
                                        </div>
                                    </td>

                                    {/* Vergi No */}
                                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                                        {supplier.taxNumber || <span className="text-gray-400">—</span>}
                                    </td>

                                    {/* Fatura Sayısı */}
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold">
                                            {supplier.invoiceCount ?? 0}
                                        </span>
                                    </td>

                                    {/* Toplam Tutar */}
                                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                        {fmt(supplier.totalAmount || 0)}
                                    </td>

                                    {/* İlk / Son Fatura */}
                                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                                        <div>{fmtDate(supplier.firstInvoiceDate)}</div>
                                        {supplier.lastInvoiceDate && supplier.lastInvoiceDate !== supplier.firstInvoiceDate && (
                                            <div className="text-gray-400">— {fmtDate(supplier.lastInvoiceDate)}</div>
                                        )}
                                    </td>

                                    {/* İşlemler */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {/* i button — show/hide invoices */}
                                            <button
                                                data-allow-raw="true"
                                                type="button"
                                                title="Fatura listesini göster"
                                                onClick={() => setExpandedRow(expandedRow === supplier.id ? null : supplier.id)}
                                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-100 transition-colors"
                                            >
                                                <Info className="w-3.5 h-3.5" />
                                                {expandedRow === supplier.id
                                                    ? <ChevronUp className="w-3 h-3" />
                                                    : <ChevronDown className="w-3 h-3" />}
                                            </button>

                                            {/* Listeme Ekle */}
                                            <button
                                                data-allow-raw="true"
                                                type="button"
                                                title="Tedarikçi listeme ekle"
                                                onClick={() => handleAccept(supplier)}
                                                disabled={acceptMutation.isPending}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Listeme Ekle
                                            </button>

                                            {/* Reddet */}
                                            <button
                                                data-allow-raw="true"
                                                type="button"
                                                title="Reddet"
                                                onClick={() => handleReject(supplier)}
                                                disabled={rejectMutation.isPending}
                                                className="inline-flex items-center px-2 py-1.5 rounded-md border border-red-200 text-red-500 text-xs hover:bg-red-50 disabled:opacity-60 transition-colors"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* Expanded invoice rows */}
                                {expandedRow === supplier.id && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-0 bg-blue-50/60">
                                            <div className="py-3">
                                                {!supplier.invoices?.length ? (
                                                    <p className="text-xs text-gray-500 py-2">Bu tedarikçi için fatura detayı yok.</p>
                                                ) : (
                                                    <table className="w-full text-xs border-collapse">
                                                        <thead>
                                                            <tr className="text-gray-500 border-b border-blue-200">
                                                                <th className="py-1.5 text-left font-semibold pl-1">Fatura No</th>
                                                                <th className="py-1.5 text-left font-semibold">Tarih</th>
                                                                <th className="py-1.5 text-right font-semibold pr-1">Tutar</th>
                                                                <th className="py-1.5 text-center font-semibold w-16">Görüntüle</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-blue-100">
                                                            {supplier.invoices.map((inv: SuggestedInvoice) => (
                                                                <tr key={inv.invoiceId} className="hover:bg-blue-100/40 transition-colors">
                                                                    <td className="py-1.5 pl-1 font-mono text-gray-700">{inv.invoiceNumber || `#${inv.invoiceId}`}</td>
                                                                    <td className="py-1.5 text-gray-600">{fmtDate(inv.invoiceDate)}</td>
                                                                    <td className="py-1.5 pr-1 text-right font-semibold text-gray-800">{fmt(inv.totalAmount || 0)}</td>
                                                                    <td className="py-1.5 text-center">
                                                                        <button
                                                                            data-allow-raw="true"
                                                                            type="button"
                                                                            onClick={() => handleViewInvoice(inv)}
                                                                            disabled={invoiceLoading === String(inv.invoiceId)}
                                                                            title="Faturayı görüntüle"
                                                                            className="inline-flex items-center justify-center w-6 h-6 rounded text-blue-600 hover:bg-blue-200 disabled:opacity-50 transition-colors"
                                                                        >
                                                                            {invoiceLoading === String(inv.invoiceId)
                                                                                ? <span className="block h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                                                                : <FileText className="w-3.5 h-3.5" />}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

