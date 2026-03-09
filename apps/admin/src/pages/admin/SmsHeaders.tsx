import React, { useState } from 'react';
import {
    CheckCircle,
    XCircle,
    FileText,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { Button, Input } from '@x-ear/ui-web';
import {
    useListSmAdminHeaders,
    useUpdateSmAdminHeaderStatus,
    type HeaderStatusUpdate,
    type SmsHeaderRequestRead,
    type ResponseEnvelopeListSmsHeaderRequestRead,
} from '../../lib/api-client';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import Pagination from '../../components/ui/Pagination';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';
import { ResponsiveTable } from '../../components/responsive/ResponsiveTable';
import { extractPagination, unwrapArray } from '@/lib/orval-response';

interface SmsHeaderDocument {
    url: string;
    filename: string;
}

interface SmsHeaderRequestView extends SmsHeaderRequestRead {
    documentsView: SmsHeaderDocument[];
}

function getHeaders(data: ResponseEnvelopeListSmsHeaderRequestRead | undefined): SmsHeaderRequestView[] {
    const headers = unwrapArray<SmsHeaderRequestRead>(data);

    return headers.map((header) => ({
        ...header,
        documentsView: Array.isArray(header.documents)
            ? header.documents.map((url, index) => ({
                url,
                filename: url.split('/').pop() || `document-${index + 1}`,
            }))
            : [],
    }));
}

export default function SMSHeadersPage() {
    const { isMobile } = useAdminResponsive();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedHeader, setSelectedHeader] = useState<SmsHeaderRequestView | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: headersData, isLoading, refetch } = useListSmAdminHeaders<ResponseEnvelopeListSmsHeaderRequestRead>({
        page,
        per_page: limit
    });

    const updateStatusMutation = useUpdateSmAdminHeaderStatus();
    const pagination = extractPagination(headersData);
    const headers = getHeaders(headersData).filter((header) => {
        const matchesStatus = statusFilter === 'all' || (header.status ?? 'pending') === statusFilter;
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = !query || [header.headerText, header.tenantId, header.headerType]
            .some((value) => (value || '').toLowerCase().includes(query));
        return matchesStatus && matchesSearch;
    });

    const handleStatusUpdate = async (status: 'approved' | 'rejected') => {
        if (!selectedHeader) return;
        if (status === 'rejected' && !rejectionReason) {
            toast.error('Lütfen ret sebebi giriniz');
            return;
        }

        try {
            const payload: HeaderStatusUpdate = {
                status,
                rejection_reason: status === 'rejected' ? rejectionReason : undefined
            };

            await updateStatusMutation.mutateAsync({
                headerId: selectedHeader.id,
                data: payload
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

    const columns = [
        {
            key: 'tenantId',
            header: 'Tenant ID',
            mobileHidden: true,
            sortable: true,
            sortKey: 'tenantId',
            sortValue: (header: SmsHeaderRequestView) => header.tenantId || '',
            render: (header: SmsHeaderRequestView) => (
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{header.tenantId}</span>
            )
        },
        {
            key: 'headerText',
            header: 'Başlık',
            sortable: true,
            sortKey: 'headerText',
            sortValue: (header: SmsHeaderRequestView) => header.headerText || '',
            render: (header: SmsHeaderRequestView) => (
                <span className="font-bold text-gray-900 dark:text-white">{header.headerText}</span>
            )
        },
        {
            key: 'headerType',
            header: 'Tip',
            sortable: true,
            sortKey: 'headerType',
            sortValue: (header: SmsHeaderRequestView) => header.headerType || '',
            render: (header: SmsHeaderRequestView) => (
                <span className="text-gray-600 dark:text-gray-400">
                    {header.headerType === 'company_title' ? 'Firma Unvanı' :
                        header.headerType === 'trademark' ? 'Marka Tescili' :
                            header.headerType === 'domain' ? 'İnternet Sitesi' : 'Diğer'}
                </span>
            )
        },
        {
            key: 'documents',
            header: 'Belgeler',
            mobileHidden: true,
            render: (header: SmsHeaderRequestView) => header.documentsView.length > 0 ? (
                <div className="flex gap-2">
                    {header.documentsView.map((doc, i) => (
                        <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                            title={doc.filename}
                        >
                            <FileText className="w-4 h-4" />
                        </a>
                    ))}
                </div>
            ) : (
                <span className="text-gray-400 dark:text-gray-500 text-xs">Belge yok</span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            sortable: true,
            sortKey: 'status',
            sortValue: (header: SmsHeaderRequestView) => header.status || '',
            render: (header: SmsHeaderRequestView) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${header.status === 'approved' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    header.status === 'rejected' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                        'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    }`}>
                    {header.status}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'İşlemler',
            render: (header: SmsHeaderRequestView) => header.status === 'pending' ? (
                <Button size="sm" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); setSelectedHeader(header); }} className="touch-feedback">
                    İncele
                </Button>
            ) : null
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6 max-w-7xl mx-auto'}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>SMS Başlık Talepleri</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Müşterilerin gönderici başlıklarını yönetin</p>
                </div>
                <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
                    {['all', 'pending', 'approved', 'rejected'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize touch-feedback ${statusFilter === s
                                ? 'bg-indigo-600 dark:bg-indigo-700 text-white'
                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            {s === 'all' ? 'Tümü' : s === 'pending' ? 'Bekleyenler' : s === 'approved' ? 'Onaylananlar' : 'Reddedilenler'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mb-4">
                <div className="relative max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Başlık, tenant veya tip ara..."
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-gray-400 dark:text-gray-500" /></div>
                ) : (
                    <>
                        <ResponsiveTable
                            data={headers}
                            columns={columns}
                            keyExtractor={(header) => header.id}
                            onRowClick={(header) => header.status === 'pending' && setSelectedHeader(header)}
                            emptyMessage="Bu filtrede kayıt bulunamadı."
                        />
                        <Pagination
                            currentPage={page}
                            totalPages={pagination?.totalPages ?? 1}
                            totalItems={searchTerm ? headers.length : (pagination?.total ?? headers.length)}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            onItemsPerPageChange={(nextLimit) => {
                                setLimit(nextLimit);
                                setPage(1);
                            }}
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
                                    {selectedHeader.documentsView.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedHeader.documentsView.map((doc, i) => (
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
