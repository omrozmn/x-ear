import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Search, X } from 'lucide-react';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';
import { adminApi } from '@/lib/api-client';
import { unwrapArray, unwrapData } from '@/lib/orval-response';
import toast from 'react-hot-toast';

interface Campaign {
    id: string;
    name: string;
    description?: string;
    campaignType?: string;
    messageTemplate?: string;
    status?: string;
    totalRecipients?: number;
    successfulSends?: number;
    failedSends?: number;
    sentAt?: string;
    scheduledAt?: string;
    tenantName?: string;
    tenantEmail?: string;
    createdAt?: string;
}

interface CampaignListResponse {
  data?: Campaign[];
  meta?: {
        total?: number;
        totalPages?: number;
    };
}

function isCampaignListResponse(value: unknown): value is CampaignListResponse {
    return typeof value === 'object' && value !== null;
}

export default function TenantCampaignsTab() {
    const { isMobile } = useAdminResponsive();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const perPage = 20;

    const fetchCampaigns = useCallback(async (searchValue: string) => {
        try {
            setIsLoading(true);
            const response = await adminApi<CampaignListResponse>({
                url: '/admin/campaigns',
                method: 'GET',
                params: {
                    page,
                    limit: perPage,
                    search: searchValue,
                    status: statusFilter !== 'all' ? statusFilter : undefined
                }
            });

            const campaignsPayload = unwrapData<Campaign[] | CampaignListResponse>(response);
            setCampaigns(Array.isArray(campaignsPayload) ? campaignsPayload : unwrapArray<Campaign>(campaignsPayload));
            setTotal(isCampaignListResponse(campaignsPayload) && typeof campaignsPayload.meta?.total === 'number' ? campaignsPayload.meta.total : 0);
            setTotalPages(isCampaignListResponse(campaignsPayload) && typeof campaignsPayload.meta?.totalPages === 'number' ? campaignsPayload.meta.totalPages : 1);
        } catch (error) {
            if (import.meta.env.DEV) console.error('Failed to fetch campaigns:', error);
            toast.error('Kampanyalar yüklenirken hata oluştu');
        } finally {
            setIsLoading(false);
        }
    }, [page, perPage, statusFilter]);

    // Fetch campaigns from backend
    useEffect(() => {
        void fetchCampaigns(debouncedSearchTerm);
    }, [debouncedSearchTerm, fetchCampaigns]);

    // Refetch when search changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);



    const columns = [
        {
            key: 'tenant',
            header: 'Abone',
            sortable: true,
            sortKey: 'tenantName',
            render: (campaign: Campaign) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {campaign.tenantName || 'Bilinmeyen Abone'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {campaign.tenantEmail || '-'}
                    </div>
                </div>
            )
        },
        {
            key: 'campaign',
            header: 'Kampanya',
            sortable: true,
            sortKey: 'name',
            render: (campaign: Campaign) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {campaign.messageTemplate || campaign.description || '-'}
                    </div>
                </div>
            )
        },
        {
            key: 'recipients',
            header: 'Alıcı',
            mobileHidden: true,
            sortable: true,
            sortKey: 'totalRecipients',
            render: (campaign: Campaign) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {campaign.totalRecipients || 0} kişi
                </span>
            )
        },
        {
            key: 'sent',
            header: 'Gönderim',
            mobileHidden: true,
            sortable: true,
            sortKey: 'createdAt',
            render: (campaign: Campaign) => (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    <div>{campaign.successfulSends || 0} / {campaign.totalRecipients || 0}</div>
                    <div className="text-xs">
                        {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString('tr-TR') : 
                         campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString('tr-TR') : 
                         campaign.createdAt ? new Date(campaign.createdAt).toLocaleString('tr-TR') : '-'}
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            sortable: true,
            sortKey: 'status',
            render: (campaign: Campaign) => {
                const statusMap: Record<string, { label: string; className: string }> = {
                    'sent': { label: 'Gönderildi', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
                    'sending': { label: 'Gönderiliyor', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
                    'scheduled': { label: 'Zamanlandı', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
                    'draft': { label: 'Taslak', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
                    'cancelled': { label: 'İptal', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
                };
                const status = statusMap[campaign.status || 'draft'] || statusMap.draft;
                
                return (
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${status.className}`}>
                        {status.label}
                    </span>
                );
            }
        },
        {
            key: 'actions',
            header: 'İşlemler',
            render: (campaign: Campaign) => (
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={() => setSelectedCampaign(campaign)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm touch-feedback"
                    >
                        Detay
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        placeholder="Kampanya veya abone ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="sent">Gönderildi</option>
                        <option value="sending">Gönderiliyor</option>
                        <option value="scheduled">Zamanlandı</option>
                        <option value="draft">Taslak</option>
                        <option value="cancelled">İptal</option>
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="text-sm text-gray-500 dark:text-gray-400">
                Toplam {total} kampanya bulundu
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {isLoading ? (
                    <div className={`${isMobile ? 'p-8' : 'p-12'} text-center`}>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Kampanyalar yükleniyor...</p>
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className={`${isMobile ? 'p-8' : 'p-16'} text-center`}>
                        <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Kampanya Bulunamadı</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {searchTerm || statusFilter !== 'all' 
                                ? 'Arama kriterlerinize uygun kampanya bulunamadı.'
                                : 'Henüz hiçbir abone SMS kampanyası oluşturmamış.'}
                        </p>
                    </div>
                ) : (
                    <ResponsiveTable
                        data={campaigns}
                        columns={columns}
                        keyExtractor={(campaign) => campaign.id}
                        emptyMessage="Kayıt bulunamadı"
                    />
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 sm:px-6 rounded-2xl">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                            Önceki
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                        >
                            Sonraki
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{(page - 1) * perPage + 1}</span> - <span className="font-medium">{Math.min(page * perPage, total)}</span> arası, toplam <span className="font-medium">{total}</span> kayıt
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Önceki</span>
                                    ‹
                                </button>
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                                page === pageNum
                                                    ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                    : 'text-gray-900 dark:text-gray-100 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Sonraki</span>
                                    ›
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedCampaign && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedCampaign(null)}></div>
                        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                        <div className="relative inline-block transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                        Kampanya Detayları
                                    </h3>
                                    <button
                                        onClick={() => setSelectedCampaign(null)}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                    >
                                        <X className="h-6 w-6" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Abone</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCampaign.tenantName}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCampaign.tenantEmail}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Kampanya Adı</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCampaign.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mesaj</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedCampaign.messageTemplate || selectedCampaign.description}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Alıcı</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCampaign.totalRecipients || 0}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Başarılı</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCampaign.successfulSends || 0}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Durum</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white capitalize">{selectedCampaign.status}</p>
                                    </div>
                                    {selectedCampaign.createdAt && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Oluşturulma</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{new Date(selectedCampaign.createdAt).toLocaleString('tr-TR')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCampaign(null)}
                                    className="mt-3 inline-flex w-full justify-center rounded-xl bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 sm:mt-0 sm:w-auto"
                                >
                                    Kapat
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
