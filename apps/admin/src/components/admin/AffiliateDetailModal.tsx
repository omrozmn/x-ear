import React from 'react';
import { XMarkIcon, UserGroupIcon, CurrencyDollarIcon, ChartBarIcon, CalendarIcon, ShoppingBagIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { adminApi } from '@/lib/apiMutator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface AffiliateDetailModalProps {
    affiliateId: string;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: () => void;
}

interface ReferralSubscription {
    plan_name: string;
    price: number;
    status: string;
    start_date: string;
    end_date: string;
}

interface Referral {
    tenant_id: string;
    tenant_name: string;
    created_at: string;
    subscription: ReferralSubscription | null;
}

interface Commission {
    id: number;
    event: string;
    amount: number;
    status: string;
    created_at: string;
}

interface AffiliateDetails {
    id: number;
    display_id: string;
    email: string;
    code: string;
    iban: string | null;
    account_holder_name: string | null;
    phone_number: string | null;
    is_active: boolean;
    created_at: string;
    stats: {
        total_referrals: number;
        total_revenue: number;
        total_commission: number;
        active_subscriptions: number;
    };
    referrals: Referral[];
    recent_commissions: Commission[];
}

const AffiliateDetailModal: React.FC<AffiliateDetailModalProps> = ({
    affiliateId,
    isOpen,
    onClose,
    onStatusChange
}) => {
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery<AffiliateDetails>({
        queryKey: ['affiliate-details', affiliateId],
        queryFn: () => adminApi({ url: `/affiliate/${affiliateId}/details`, method: 'GET' }),
        enabled: isOpen && !!affiliateId,
    });

    const toggleStatusMutation = useMutation({
        mutationFn: () => adminApi({
            url: `/affiliate/${affiliateId}/toggle-status`,
            method: 'PATCH'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['affiliate-details', affiliateId] });
            toast.success('Affiliate durumu güncellendi');
            onStatusChange();
        },
        onError: (error: any) => {
            toast.error(`Hata: ${error.message || 'Durum güncellenemedi'}`);
        }
    });

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR');
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { className: string; label: string }> = {
            active: { className: 'bg-green-100 text-green-800', label: 'Aktif' },
            past_due: { className: 'bg-yellow-100 text-yellow-800', label: 'Gecikmiş' },
            canceled: { className: 'bg-red-100 text-red-800', label: 'İptal' },
            trialing: { className: 'bg-blue-100 text-blue-800', label: 'Deneme' }
        };

        const config = statusConfig[status] || statusConfig.active;
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${config.className}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white mb-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <UserGroupIcon className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Affiliate Detayları
                            </h3>
                            {data && (
                                <p className="text-sm text-gray-500">
                                    {data.email} • #{data.display_id}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                {isLoading && (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                        Hata: {(error as any).message || 'Veri yüklenemedi'}
                    </div>
                )}

                {data && (
                    <div className="space-y-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blue-600 font-medium">Toplam Yönlendirme</p>
                                        <p className="text-2xl font-bold text-blue-900 mt-1">{data.stats.total_referrals}</p>
                                    </div>
                                    <UserGroupIcon className="h-8 w-8 text-blue-500" />
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-green-600 font-medium">Aktif Abonelik</p>
                                        <p className="text-2xl font-bold text-green-900 mt-1">{data.stats.active_subscriptions}</p>
                                    </div>
                                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                                </div>
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-purple-600 font-medium">Toplam Gelir</p>
                                        <p className="text-xl font-bold text-purple-900 mt-1">{formatCurrency(data.stats.total_revenue)}</p>
                                    </div>
                                    <ChartBarIcon className="h-8 w-8 text-purple-500" />
                                </div>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-orange-600 font-medium">Toplam Komisyon</p>
                                        <p className="text-xl font-bold text-orange-900 mt-1">{formatCurrency(data.stats.total_commission)}</p>
                                    </div>
                                    <CurrencyDollarIcon className="h-8 w-8 text-orange-500" />
                                </div>
                            </div>
                        </div>

                        {/* Affiliate Info */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3">Affiliate Bilgileri</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Referans Kodu</p>
                                    <p className="font-mono font-semibold text-primary-600 mt-1">{data.code}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Ad Soyad</p>
                                    <p className="font-medium text-gray-900 mt-1">{data.account_holder_name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Telefon</p>
                                    <p className="font-medium text-gray-900 mt-1">{data.phone_number || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-500">IBAN</p>
                                    <p className="font-mono text-sm text-gray-900 mt-1">{data.iban || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Kayıt Tarihi</p>
                                    <p className="font-medium text-gray-900 mt-1">{formatDate(data.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Durum</p>
                                    <div className="mt-1">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${data.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {data.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Referrals Table */}
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <ShoppingBagIcon className="h-5 w-5 mr-2 text-primary-600" />
                                Getirilen Aboneler ({data.referrals.length})
                            </h4>
                            {data.referrals.length > 0 ? (
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paket</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {data.referrals.map((ref, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ref.tenant_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                        {ref.subscription?.plan_name || 'Paket yok'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                        {ref.subscription ? formatCurrency(ref.subscription.price) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        {ref.subscription ? getStatusBadge(ref.subscription.status) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(ref.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
                                    <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500">Henüz yönlendirme yok</p>
                                </div>
                            )}
                        </div>

                        {/* Recent Commissions */}
                        {data.recent_commissions.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
                                    Son Komisyonlar
                                </h4>
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Olay</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {data.recent_commissions.map((comm) => (
                                                <tr key={comm.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{comm.event}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{formatCurrency(comm.amount)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${comm.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                            {comm.status === 'paid' ? 'Ödendi' : 'Beklemede'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(comm.created_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Actions */}
                {data && (
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                        <button
                            onClick={() => toggleStatusMutation.mutate()}
                            disabled={toggleStatusMutation.isPending}
                            className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${data.is_active
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {toggleStatusMutation.isPending ? 'Güncelleniyor...' : (data.is_active ? 'Pasif Yap' : 'Aktif Yap')}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Kapat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AffiliateDetailModal;
