import React, { useState } from 'react';
import {
    useListCampaigns,
    useCreateCampaigns,
    useUpdateCampaign,
    useDeleteCampaign,
    CampaignRead,
    CampaignCreate
} from '@/lib/api-client';

// Local type aliases
type Campaign = CampaignRead;
type CampaignInput = CampaignCreate;
import {
    PlusIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const AdminCampaignsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

    // Queries
    const { data: campaignsData, isLoading } = useListCampaigns({
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
    } as any);

    // Mutations
    const createMutation = useCreateCampaigns({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['/admin/campaigns'] });
                toast.success('Kampanya başarıyla oluşturuldu');
                handleCloseModal();
            },
            onError: (error: any) => {
                toast.error(`Hata: ${error.message}`);
            }
        }
    });

    const updateMutation = useUpdateCampaign({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['/admin/campaigns'] });
                toast.success('Kampanya güncellendi');
                handleCloseModal();
            },
            onError: (error: any) => {
                toast.error(`Hata: ${error.message}`);
            }
        }
    });

    const deleteMutation = useDeleteCampaign({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['/admin/campaigns'] });
                toast.success('Kampanya silindi');
            },
            onError: (error: any) => {
                toast.error(`Hata: ${error.message}`);
            }
        }
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCampaign(null);
    };

    const handleEdit = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) {
            deleteMutation.mutate({ campaignId: String(id) });
        }
    };

    const campaigns = (campaignsData as any)?.data?.campaigns || [];
    const pagination = (campaignsData as any)?.data?.pagination;

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return format(new Date(dateString), 'dd MMM yyyy', { locale: tr });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Kampanya Yönetimi</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Yeni Kampanya
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow sm:flex sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex-1 min-w-0 max-w-lg">
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
                            placeholder="Kampanya ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="sm:ml-4">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {isLoading ? (
                    <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kampanya Adı</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İndirim</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih Aralığı</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hedef Kitle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {campaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                            Kayıt bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    campaigns.map((campaign) => (
                                        <tr key={campaign.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                                                <div className="text-sm text-gray-500 truncate max-w-xs">{campaign.description}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(campaign as any).discountType === 'PERCENTAGE' ? `%${(campaign as any).discountValue}` : `${(campaign as any).discountValue} TL`}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div>{formatDate((campaign as any).startDate)}</div>
                                                <div>{formatDate((campaign as any).endDate)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(campaign as any).targetAudience === 'ALL' ? 'Tümü' : (campaign as any).targetAudience}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${(campaign as any).isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {(campaign as any).isActive ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleEdit(campaign)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(campaign.id!)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && (pagination.totalPages || 0) > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Önceki
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(pagination?.totalPages || 1, p + 1))}
                                disabled={page === (pagination?.totalPages || 1)}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Sonraki
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Toplam <span className="font-medium">{pagination?.total || 0}</span> kayıttan <span className="font-medium">{(page - 1) * limit + 1}</span> - <span className="font-medium">{Math.min(page * limit, pagination?.total || 0)}</span> arası gösteriliyor
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    {Array.from({ length: pagination?.totalPages || 1 }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i + 1)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === i + 1
                                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <CampaignModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    initialData={editingCampaign}
                    onSubmit={(data) => {
                        if (editingCampaign) {
                            updateMutation.mutate({ campaignId: String(editingCampaign.id!), data });
                        } else {
                            createMutation.mutate({ data });
                        }
                    }}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                />
            )}
        </div>
    );
};

interface CampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: Campaign | null;
    onSubmit: (data: CampaignInput) => void;
    isLoading: boolean;
}

const CampaignModal: React.FC<CampaignModalProps> = ({
    isOpen,
    onClose,
    initialData,
    onSubmit,
    isLoading
}) => {
    const [formData, setFormData] = useState<any>({
        name: initialData?.name || '',
        description: initialData?.description || '',
        discountType: (initialData as any)?.discountType || 'PERCENTAGE',
        discountValue: (initialData as any)?.discountValue || 0,
        startDate: (initialData as any)?.startDate ? new Date((initialData as any).startDate).toISOString().split('T')[0] : '',
        endDate: (initialData as any)?.endDate ? new Date((initialData as any).endDate).toISOString().split('T')[0] : '',
        isActive: (initialData as any)?.isActive ?? true,
        targetAudience: (initialData as any)?.targetAudience || 'ALL'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Convert dates to ISO string if needed, but backend expects date-time string
        // The input type="date" returns YYYY-MM-DD. We might need to append time.
        const submitData = {
            ...formData,
            startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
            endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined
        };
        onSubmit(submitData as any);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                        {initialData ? 'Kampanya Düzenle' : 'Yeni Kampanya Ekle'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Kampanya Adı *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">İndirim Tipi</label>
                            <select
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="PERCENTAGE">Yüzde (%)</option>
                                <option value="FIXED_AMOUNT">Sabit Tutar (TL)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">İndirim Değeri</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hedef Kitle</label>
                        <select
                            value={formData.targetAudience}
                            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="ALL">Tümü</option>
                            <option value="NEW_USERS">Yeni Kullanıcılar</option>
                            <option value="PREMIUM_USERS">Premium Kullanıcılar</option>
                        </select>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="isActive"
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                            Kampanya Aktif
                        </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminCampaignsPage;
