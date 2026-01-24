import React from 'react';
import { DataTable, Badge, Button, Modal } from '@x-ear/ui-web';
import { Building2, CheckCircle, XCircle, Eye } from 'lucide-react';
import {
    SuggestedSupplier,
    useAcceptSuggestedSupplier,
    useRejectSuggestedSupplier,
    useSupplierInvoices
} from '../../hooks/useSupplierInvoices';

interface SuggestedSuppliersListProps {
    suppliers: SuggestedSupplier[];
    isLoading?: boolean;
    onSupplierAccepted?: () => void;
}

// Helper component to display invoices for a suggested supplier
function InvoiceListSection({ supplierId }: { supplierId: number }) {
    const { data, isLoading, error } = useSupplierInvoices({
        supplierId: String(supplierId),
        page: 1,
        perPage: 10,
        type: 'all',
    });

    if (isLoading) {
        return <p className="text-sm text-gray-600">Faturalar yükleniyor...</p>;
    }
    if (error) {
        return <p className="text-sm text-red-600">Faturalar yüklenirken bir hata oluştu.</p>;
    }
    const invoices = data?.invoices || [];
    if (invoices.length === 0) {
        return <p className="text-sm text-gray-500">Bu tedarikçi için fatura bulunamadı.</p>;
    }
    return (
        <div className="col-span-2">
            <h4 className="text-lg font-medium mb-2">Fatura Listesi</h4>
            <div className="border rounded-md overflow-hidden">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium">Fatura No</th>
                            <th className="px-4 py-2 text-left text-sm font-medium">Tarih</th>
                            <th className="px-4 py-2 text-right text-sm font-medium">Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((inv: any) => (
                            <tr key={inv.id} className="border-t">
                                <td className="px-4 py-2 text-sm">{inv.invoiceNumber}</td>
                                <td className="px-4 py-2 text-sm">{new Date(inv.invoiceDate).toLocaleDateString('tr-TR')}</td>
                                <td className="px-4 py-2 text-sm text-right">
                                    {new Intl.NumberFormat('tr-TR', {
                                        style: 'currency',
                                        currency: inv.currency || 'TRY'
                                    }).format(inv.totalAmount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function SuggestedSuppliersList({ suppliers, isLoading, onSupplierAccepted }: SuggestedSuppliersListProps) {
    console.log('🔍 SuggestedSuppliersList render:', {
        suppliersCount: suppliers?.length,
        isLoading,
        suppliers: suppliers
    });

    const [selectedSupplier, setSelectedSupplier] = React.useState<SuggestedSupplier | null>(null);
    const acceptMutation = useAcceptSuggestedSupplier();
    const rejectMutation = useRejectSuggestedSupplier();

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleAccept = async (supplier: SuggestedSupplier) => {
        try {
            await acceptMutation.mutateAsync(supplier.id ?? 0);
            setSelectedSupplier(null);
            onSupplierAccepted?.();
        } catch (error) {
            console.error('Failed to accept supplier:', error);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleReject = async (supplierId: number | undefined) => {
        if (!supplierId) return;
        try {
            await rejectMutation.mutateAsync(supplierId);
        } catch (error) {
            console.error('Failed to reject supplier:', error);
        }
    };

     
    const columns: any = React.useMemo(
        () => {
            const safeAcceptMutation = acceptMutation || { isPending: false };
            const safeRejectMutation = rejectMutation || { isPending: false };

            return [
                {
                    key: 'companyName',
                    id: 'companyName',
                    header: 'Firma Adı',
                    accessorKey: 'companyName',
                    cell: ({ row }: any) => (
                        <div className="flex items-center gap-2">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{row.original?.companyName || 'N/A'}</div>
                                <div className="text-sm text-gray-500">{row.original?.city || 'Bilinmiyor'}</div>
                            </div>
                        </div>
                    ),
                },
                {
                    key: 'taxNumber',
                    id: 'taxNumber',
                    header: 'Vergi No',
                    accessorKey: 'taxNumber',
                    cell: ({ row }: any) => (
                        <div>
                            <div className="text-sm font-medium text-gray-900">{row.original?.taxNumber || 'N/A'}</div>
                            {row.original?.taxOffice && (
                                <div className="text-xs text-gray-500">{row.original.taxOffice}</div>
                            )}
                        </div>
                    ),
                },
                {
                    key: 'invoiceCount',
                    id: 'invoiceCount',
                    header: 'Fatura Sayısı',
                    accessorKey: 'invoiceCount',
                    cell: ({ row }: any) => (
                        <div className="text-center">
                            <Badge variant="default">{row.original?.invoiceCount || 0} fatura</Badge>
                        </div>
                    ),
                },
                {
                    key: 'totalAmount',
                    id: 'totalAmount',
                    header: 'Toplam Tutar',
                    accessorKey: 'totalAmount',
                    cell: ({ row }: any) => (
                        <div className="text-right font-medium">
                            {new Intl.NumberFormat('tr-TR', {
                                style: 'currency',
                                currency: 'TRY',
                            }).format(row.original?.totalAmount || 0)}
                        </div>
                    ),
                },
                {
                    key: 'invoiceDates',
                    id: 'invoiceDates',
                    header: 'İlk / Son Fatura',
                    accessorKey: 'lastInvoiceDate',
                    cell: ({ row }: any) => (
                        <div className="text-sm text-gray-600">
                            {row.original?.firstInvoiceDate && (
                                <div>{new Date(row.original.firstInvoiceDate).toLocaleDateString('tr-TR')}</div>
                            )}
                            {row.original?.lastInvoiceDate && (
                                <div className="text-xs text-gray-500">
                                    Son: {new Date(row.original.lastInvoiceDate).toLocaleDateString('tr-TR')}
                                </div>
                            )}
                        </div>
                    ),
                },
                {
                    key: 'actions',
                    id: 'actions',
                    header: 'Aksiyonlar',
                    cell: ({ row }: any) => (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedSupplier(row.original)}
                            >
                                <Eye className="h-4 w-4 mr-1" />
                                Detay
                            </Button>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleAccept(row.original)}
                                disabled={safeAcceptMutation.isPending}
                            >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Ekle
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleReject(row.original?.id)}
                                disabled={safeRejectMutation.isPending}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    ),
                },
            ];
        },
         
        [acceptMutation, rejectMutation, setSelectedSupplier, handleAccept, handleReject]
    );

    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

    return (
        <>
            <DataTable
                data={safeSuppliers}
                columns={columns}
                loading={isLoading}
            />

            {selectedSupplier && (
                <Modal
                    isOpen={!!selectedSupplier}
                    onClose={() => setSelectedSupplier(null)}
                    title="Tedarikçi Detayları"
                    size="lg"
                >
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start justify-between pb-4 border-b">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    {selectedSupplier.companyName}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    VKN: {selectedSupplier.taxNumber}
                                </p>
                            </div>
                            <Badge variant="default" className="text-lg px-3 py-1">
                                {selectedSupplier.invoiceCount} Fatura
                            </Badge>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Vergi Dairesi</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {selectedSupplier.taxOffice || '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Şehir</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {selectedSupplier.city || '-'}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-500">Adres</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {selectedSupplier.address || '-'}
                                </p>
                            </div>

                            {/* Invoice List */}
                            <InvoiceListSection supplierId={selectedSupplier.id ?? 0} />

                            <div>
                                <label className="text-sm font-medium text-gray-500">Toplam Tutar</label>
                                <p className="mt-1 text-lg font-semibold text-gray-900">
                                    {new Intl.NumberFormat('tr-TR', {
                                        style: 'currency',
                                        currency: 'TRY',
                                    }).format(selectedSupplier.totalAmount || 0)}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Fatura Dönemi</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {selectedSupplier.firstInvoiceDate &&
                                        new Date(selectedSupplier.firstInvoiceDate).toLocaleDateString('tr-TR')}
                                    {' - '}
                                    {selectedSupplier.lastInvoiceDate &&
                                        new Date(selectedSupplier.lastInvoiceDate).toLocaleDateString('tr-TR')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => setSelectedSupplier(null)}
                        >
                            İptal
                        </Button>
                        <Button
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                                handleReject(selectedSupplier.id);
                                setSelectedSupplier(null);
                            }}
                            disabled={rejectMutation.isPending}
                        >
                            Reddet
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAccept(selectedSupplier)}
                            disabled={acceptMutation.isPending}
                        >
                            {acceptMutation.isPending ? 'Ekleniyor...' : 'Tedarikçilerime Ekle'}
                        </Button>
                    </div>
                </Modal>
            )}
        </>
    );
}
