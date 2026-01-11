import React, { useState } from 'react';
import {
    MessageSquare,
    CheckCircle,
    XCircle,
    FileText,
    Search,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { Button, Input, Select } from '@x-ear/ui-web';
import {
    useListSmAdminHeaders,
    useUpdateSmAdminHeaderStatus
} from '../../lib/api-client';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import Pagination from '../../components/ui/Pagination';

export default function SMSHeadersPage() {
    const [statusFilter, setStatusFilter] = useState('pending');
    const [selectedHeader, setSelectedHeader] = useState<any>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: headersData, isLoading, refetch } = useListSmAdminHeaders({
        status: statusFilter,
        page,
        limit
    } as any);

    const updateStatusMutation = useUpdateSmAdminHeaderStatus();

    const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
        if (!selectedHeader) return;
        if (status === 'rejected' && !rejectionReason) {
            toast.error('Lütfen ret sebebi giriniz');
            return;
        }

        try {
            await updateStatusMutation.mutateAsync({
                headerId: selectedHeader.id,
                data: {
                    status,
                    rejection_reason: status === 'rejected' ? rejectionReason : undefined
                }
            });
            toast.success(`Başlık ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`);
            setSelectedHeader(null);
            setRejectionReason('');
            refetch();
        } catch (error) {
            toast.error('İşlem başarısız');
            console.error(error);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">SMS Başlık Talepleri</h1>
                    <p className="text-gray-500">Müşterilerin gönderici başlıklarını yönetin</p>
                </div>
                <div className="flex gap-2">
                    {['pending', 'approved', 'rejected'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${statusFilter === s
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {s === 'pending' ? 'Bekleyenler' : s === 'approved' ? 'Onaylananlar' : 'Reddedilenler'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Tenant ID</th>
                                    <th className="px-6 py-3 font-medium">Başlık</th>
                                    <th className="px-6 py-3 font-medium">Tip</th>
                                    <th className="px-6 py-3 font-medium">Belgeler</th>
                                    <th className="px-6 py-3 font-medium">Durum</th>
                                    <th className="px-6 py-3 font-medium text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {(headersData as any)?.data?.map((header: any) => (
                                    <tr key={header.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{header.tenantId}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">{header.headerText}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {header.headerType === 'company_title' ? 'Firma Unvanı' :
                                                header.headerType === 'trademark' ? 'Marka Tescili' :
                                                    header.headerType === 'domain' ? 'İnternet Sitesi' : 'Diğer'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {header.documents?.length > 0 ? (
                                                <div className="flex gap-2">
                                                    {header.documents.map((doc: any, i: number) => (
                                                        <a
                                                            key={i}
                                                            href={doc.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-indigo-600 hover:text-indigo-800"
                                                            title={doc.filename}
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Belge yok</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${header.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                header.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {header.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {header.status === 'pending' && (
                                                <Button size="sm" onClick={() => setSelectedHeader(header)}>
                                                    İncele
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(headersData as any)?.data?.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            Bu filtrede kayıt bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Pagination
                            currentPage={page}
                            totalPages={(headersData as any)?.pagination?.totalPages || 1}
                            totalItems={(headersData as any)?.pagination?.total || 0}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            onItemsPerPageChange={setLimit}
                        />
                    </>
                )}
            </div>

            {/* Review Modal */}
            <Dialog.Root open={!!selectedHeader} onOpenChange={(open) => !open && setSelectedHeader(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-xl w-full max-w-lg z-50">
                        <Dialog.Title className="text-lg font-bold mb-4">Başlık Talebi İnceleme</Dialog.Title>

                        {selectedHeader && (
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500 block">Başlık</span>
                                            <span className="font-bold text-lg">{selectedHeader.headerText}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 block">Tip</span>
                                            <span className="font-medium">{selectedHeader.headerType}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium mb-2">Belgeler</h4>
                                    {selectedHeader.documents?.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedHeader.documents.map((doc: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center p-2 border rounded">
                                                    <span className="text-sm truncate max-w-[200px]">{doc.filename}</span>
                                                    <a
                                                        href={doc.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 text-sm flex items-center hover:underline"
                                                    >
                                                        Görüntüle <ExternalLink className="w-3 h-3 ml-1" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">Bu talep için belge yüklenmemiş.</p>
                                    )}
                                </div>

                                <div className="pt-4 border-t">
                                    <label className="block text-sm font-medium mb-1">Ret Sebebi (Sadece ret durumunda)</label>
                                    <Input
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Eksik belge, hatalı başlık vb."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="ghost" onClick={() => setSelectedHeader(null)}>İptal</Button>
                                    <Button
                                        variant="danger"
                                        onClick={() => handleStatusUpdate('rejected')}
                                        disabled={updateStatusMutation.isPending}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" /> Reddet
                                    </Button>
                                    <Button
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleStatusUpdate('approved')}
                                        disabled={updateStatusMutation.isPending}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" /> Onayla
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
