import { useState, useEffect } from 'react';
import { CreditCard, MessageSquare, PlusCircle, Plus, Settings, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import {
    useGetAdminPlans,
    useGetAdminAddons,
    useSubscribeTenant,
    useAddTenantAddon,
    useUpdateTenant,
} from '@/lib/api-client';

// Local type since Tenant is not exported from generated client
interface ExtendedTenant {
    id?: string;
    settings?: Record<string, any>;
    status?: string;
    current_plan?: string;
    current_plan_id?: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
    feature_usage?: Record<string, any>;
}

export const SubscriptionTab = ({ tenant, onUpdate }: { tenant: ExtendedTenant, onUpdate: () => void }) => {
    const { data: plansData } = useGetAdminPlans();
    const plans = (plansData as any)?.data?.plans || (plansData as any)?.plans || [];

    const { data: addonsData } = useGetAdminAddons();
    const addons = (addonsData as any)?.data?.addons || (addonsData as any)?.addons || [];

    const [selectedPlanId, setSelectedPlanId] = useState(tenant.current_plan_id || '');
    const [billingInterval, setBillingInterval] = useState('YEARLY');
    const [selectedAddonId, setSelectedAddonId] = useState('');
    const [selectedSmsPackage, setSelectedSmsPackage] = useState<number | null>(null);
    const [manualSmsLimit, setManualSmsLimit] = useState<number | string>(0);

    const [loadingSubscribe, setLoadingSubscribe] = useState(false);
    const [loadingAddon, setLoadingAddon] = useState(false);
    const [loadingRemoveAddon, setLoadingRemoveAddon] = useState(false);
    const [loadingSmsUpdate, setLoadingSmsUpdate] = useState(false);

    const { mutateAsync: subscribeTenant } = useSubscribeTenant();
    const { mutateAsync: addTenantAddon } = useAddTenantAddon();
    const { mutateAsync: updateTenant } = useUpdateTenant();

    useEffect(() => {
        setSelectedPlanId(tenant.current_plan_id || '');
        const smsLimit = tenant.feature_usage?.['sms']?.limit ?? tenant.feature_usage?.['SMS']?.limit ?? 0;
        setManualSmsLimit(smsLimit);
    }, [tenant]);

    const handleSubscribe = async () => {
        if (!selectedPlanId) return;
        setLoadingSubscribe(true);
        try {
            await subscribeTenant({
                tenantId: tenant.id!,
                data: {
                    plan_id: selectedPlanId,
                    billing_interval: billingInterval
                }
            });
            toast.success('Abonelik güncellendi');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Abonelik güncellenemedi');
        } finally {
            setLoadingSubscribe(false);
        }
    };

    const handleAddAddon = async () => {
        if (!selectedAddonId) return;
        setLoadingAddon(true);
        try {
            await addTenantAddon({
                tenantId: tenant.id!,
                data: {
                    addon_id: selectedAddonId
                }
            });
            toast.success('Ek özellik eklendi');
            setSelectedAddonId('');
            onUpdate();
        } catch (error: any) {
            console.error('Add addon error:', error);
            toast.error(error.response?.data?.error?.message || 'Ek özellik eklenemedi');
        } finally {
            setLoadingAddon(false);
        }
    };

    const handleRemoveAddon = async (addonId: string) => {
        if (!addonId) return;
        if (!confirm('Bu özelliği kaldırmak istediğinize emin misiniz?')) return;
        setLoadingRemoveAddon(true);
        try {
            await apiClient.delete(`/admin/tenants/${tenant.id}/addons`, {
                data: { addon_id: addonId }
            });
            toast.success('Ek özellik kaldırıldı');
            onUpdate();
        } catch (error: any) {
            console.error('Remove addon error:', error);
            toast.error(error.response?.data?.error?.message || 'Ek özellik kaldırılamadı');
        } finally {
            setLoadingRemoveAddon(false);
        }
    };

    const handleUpdateSmsLimit = async () => {
        const limitVal = typeof manualSmsLimit === 'string' ? parseInt(manualSmsLimit) || 0 : manualSmsLimit;
        if (limitVal < 0) {
            toast.error('Limit 0\'dan küçük olamaz');
            return;
        }
        setLoadingSmsUpdate(true);
        try {
            const currentUsage = { ...(tenant.feature_usage || {}) };
            const key = 'sms';

            if (currentUsage['SMS']) {
                currentUsage['sms'] = currentUsage['SMS'];
                delete currentUsage['SMS'];
            }

            currentUsage[key] = {
                ...(currentUsage[key] || {}),
                limit: typeof manualSmsLimit === 'string' ? parseInt(manualSmsLimit) || 0 : manualSmsLimit,
                used: currentUsage[key]?.used || 0
            };

            await updateTenant({
                tenantId: tenant.id!,
                data: {
                    feature_usage: currentUsage
                } as any
            });
            toast.success('SMS limiti güncellendi');
            onUpdate();
        } catch (error: any) {
            console.error('Update SMS limit error:', error);
            toast.error(error.response?.data?.error?.message || 'SMS limiti güncellenemedi');
        } finally {
            setLoadingSmsUpdate(false);
        }
    };

    const handleAddSmsPackage = async () => {
        if (!selectedSmsPackage) {
            toast.error('Lütfen bir SMS paketi seçin');
            return;
        }
        setLoadingSmsUpdate(true);
        try {
            const currentUsage = { ...(tenant.feature_usage || {}) };
            const key = 'sms';

            if (currentUsage['SMS']) {
                currentUsage['sms'] = currentUsage['SMS'];
                delete currentUsage['SMS'];
            }

            const currentLimit = currentUsage[key]?.limit || 0;
            const newLimit = currentLimit + selectedSmsPackage;

            currentUsage[key] = {
                ...(currentUsage[key] || {}),
                limit: newLimit,
                used: currentUsage[key]?.used || 0
            };

            await updateTenant({
                tenantId: tenant.id!,
                data: {
                    feature_usage: currentUsage
                } as any
            });
            toast.success(`${selectedSmsPackage} SMS paketi eklendi`);
            setSelectedSmsPackage(null);
            setManualSmsLimit(newLimit);
            onUpdate();
        } catch (error: any) {
            console.error('Add SMS package error:', error);
            toast.error(error.response?.data?.error?.message || 'SMS paketi eklenemedi');
        } finally {
            setLoadingSmsUpdate(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <CreditCard className="w-16 h-16 text-blue-900" />
                    </div>
                    <h4 className="text-sm font-semibold text-blue-800 mb-3">Mevcut Abonelik</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Plan:</span>
                            <span className="font-bold text-gray-900">{tenant.current_plan || 'Yok'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Durum:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tenant.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                {tenant.status}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Bitiş:</span>
                            <span className="text-gray-900">
                                {(tenant as any).subscription_end_date
                                    ? new Date((tenant as any).subscription_end_date).toLocaleDateString('tr-TR')
                                    : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <MessageSquare className="w-16 h-16 text-indigo-900" />
                    </div>
                    <h4 className="text-sm font-semibold text-indigo-800 mb-3">SMS Durumu</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500">Toplam Limit:</span>
                            <span className="font-bold text-gray-900">{tenant.feature_usage?.['sms']?.limit || tenant.feature_usage?.['SMS']?.limit || 0}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500">Kullanılan:</span>
                            <span className="text-gray-900">{tenant.feature_usage?.['sms']?.used || tenant.feature_usage?.['SMS']?.used || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (((tenant.feature_usage?.['sms']?.used || 0) / (tenant.feature_usage?.['sms']?.limit || 1)) * 100))}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-500">Kalan:</span>
                            <span className="text-indigo-600 font-bold text-lg">
                                {Math.max(0, (tenant.feature_usage?.['sms']?.limit || 0) - (tenant.feature_usage?.['sms']?.used || 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yönetim Alanı */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-b py-8 border-gray-100">
                {/* Add-on Yönetimi */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Ek Özellikler (Add-ons)
                        </h4>
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={selectedAddonId}
                            onChange={e => setSelectedAddonId(e.target.value)}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">Özellik Seç...</option>
                            {addons.map(addon => (
                                <option key={addon.id} value={addon.id || ''}>
                                    {addon.name} ({addon.limit_amount} {addon.unit_name}) - {addon.price} TL
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddAddon}
                            disabled={loadingAddon || !selectedAddonId}
                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                        >
                            {loadingAddon ? '...' : '+ Ekle'}
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden min-h-[150px]">
                        {((tenant.settings as any)?.addons || []).length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm italic">
                                Henüz eklenmiş özellik yok.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {((tenant.settings as any)?.addons || []).map((addon: any, idx: number) => (
                                    <li key={idx} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {addon.limit_amount} {addon.unit_name} • {addon.price} TL
                                                {addon.added_at && ` • ${new Date(addon.added_at).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveAddon(addon.addon_id || addon.id)}
                                            disabled={loadingRemoveAddon}
                                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                                            title="Kaldır"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* SMS Yönetimi */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            SMS Yönetimi
                        </h4>
                    </div>

                    <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-800 mb-1">Mevcut SMS Limiti (Manuel Düzenle)</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={manualSmsLimit}
                                onChange={(e) => setManualSmsLimit(e.target.value === '' ? '' : parseInt(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                className="flex-1 rounded border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1.5"
                            />
                            <button
                                onClick={handleUpdateSmsLimit}
                                disabled={loadingSmsUpdate}
                                className="bg-indigo-600 text-white px-3 text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Güncelle
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hızlı Paket Ekle</label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {[100, 500, 1000, 5000].map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => setSelectedSmsPackage(selectedSmsPackage === amount ? null : amount)}
                                    className={`
                                        px-3 py-2 border rounded-md text-center transition-all
                                        ${selectedSmsPackage === amount
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'}
                                    `}
                                >
                                    <span className="font-bold block">{amount}</span>
                                    <span className="text-xs text-opacity-80">SMS</span>
                                </button>
                            ))}
                        </div>

                        {selectedSmsPackage && (
                            <button
                                onClick={handleAddSmsPackage}
                                disabled={loadingSmsUpdate}
                                className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 shadow-md flex items-center justify-center font-medium transition-all animate-in fade-in slide-in-from-top-2"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {loadingSmsUpdate ? 'Ekleniyor...' : `${selectedSmsPackage} SMS Paketini Ekle`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mevcut Limitler Tablosu */}
            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">Mevcut Özellik Limitleri (Read-Only)</h4>
                <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Özellik</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Limit</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kullanılan</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sıfırlanma</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tenant.feature_usage && Object.entries(tenant.feature_usage).map(([key, value]: [string, any]) => (
                                <tr key={key}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{key}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{value.limit === 0 ? 'Sınırsız' : value.limit}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{value.used || 0}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-400 text-xs">
                                        {value.last_reset ? new Date(value.last_reset).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Plan Değiştirme */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-8">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Plan Değişikliği
                </h4>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Yeni Plan</label>
                        <select
                            value={selectedPlanId}
                            onChange={e => setSelectedPlanId(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">Plan Seçin...</option>
                            {plans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name} ({plan.price} TL)</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Fatura Dönemi</label>
                        <select
                            value={billingInterval}
                            onChange={e => setBillingInterval(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="MONTHLY">Aylık</option>
                            <option value="YEARLY">Yıllık</option>
                        </select>
                    </div>
                    <button
                        onClick={handleSubscribe}
                        disabled={loadingSubscribe || !selectedPlanId}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium h-[38px]"
                    >
                        {loadingSubscribe ? '...' : 'Planı Güncelle'}
                    </button>
                </div>
            </div>
        </div>
    );
};
