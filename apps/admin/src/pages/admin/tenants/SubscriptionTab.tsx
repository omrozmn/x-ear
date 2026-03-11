import { useState, useEffect } from 'react';
import { CreditCard, MessageSquare, PlusCircle, Plus, Settings, Trash2, AlertTriangle } from 'lucide-react';
import { DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { apiClient } from '@/lib/api';
import { useListAdminPlans, useListAdminAddons } from '@/lib/api-client';
import type { AddonRead, DetailedPlanRead } from '@/api/generated/schemas';

interface ApiErrorLike {
    response?: {
        data?: {
            error?: {
                message?: string;
            };
            message?: string;
        };
    };
}

interface FeatureUsageItem {
    limit?: number;
    used?: number;
    last_reset?: string;
    lastReset?: string;
}

type FeatureUsageMap = Record<string, FeatureUsageItem>;

interface TenantAddon {
    id?: string;
    addon_id?: string;
    name?: string;
    limit_amount?: number;
    unit_name?: string;
    price?: number;
    added_at?: string;
}

interface TenantSettings {
    addons?: TenantAddon[];
}

interface ExtendedTenant {
    id?: string;
    settings?: TenantSettings;
    status?: string;
    current_plan?: string;
    currentPlan?: string;
    current_plan_id?: string;
    currentPlanId?: string;
    subscription_start_date?: string;
    subscriptionStartDate?: string;
    subscription_end_date?: string;
    subscriptionEndDate?: string;
    feature_usage?: FeatureUsageMap;
    featureUsage?: FeatureUsageMap;
}

interface SubscriptionTabProps {
    tenant: ExtendedTenant;
    onUpdate: () => void;
}

type BillingInterval = 'MONTHLY' | 'YEARLY';

function getApiErrorMessage(error: unknown, fallback: string): string {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.error?.message || apiError.response?.data?.message || fallback;
}

function isDetailedPlanRead(value: unknown): value is DetailedPlanRead {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.id === 'string' && typeof candidate.name === 'string' && typeof candidate.price === 'number';
}

function isAddonRead(value: unknown): value is AddonRead {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.id === 'string' && typeof candidate.name === 'string' && typeof candidate.price === 'number';
}

function getPlans(data: unknown): DetailedPlanRead[] {
    if (Array.isArray(data)) {
        return data.filter(isDetailedPlanRead);
    }

    if (!data || typeof data !== 'object') {
        return [];
    }

    if ('plans' in data && Array.isArray(data.plans)) {
        return data.plans.filter(isDetailedPlanRead);
    }

    if ('data' in data && data.data && typeof data.data === 'object' && 'plans' in data.data && Array.isArray(data.data.plans)) {
        return data.data.plans.filter(isDetailedPlanRead);
    }

    return [];
}

function getAddons(data: unknown): AddonRead[] {
    if (Array.isArray(data)) {
        return data.filter(isAddonRead);
    }

    if (!data || typeof data !== 'object') {
        return [];
    }

    if ('addons' in data && Array.isArray(data.addons)) {
        return data.addons.filter(isAddonRead);
    }

    if ('data' in data && data.data && typeof data.data === 'object' && 'addons' in data.data && Array.isArray(data.data.addons)) {
        return data.data.addons.filter(isAddonRead);
    }

    return [];
}

function getFeatureUsage(tenant: ExtendedTenant): FeatureUsageMap {
    return tenant.feature_usage ?? tenant.featureUsage ?? {};
}

function getSmsUsage(tenant: ExtendedTenant): FeatureUsageItem {
    const featureUsage = getFeatureUsage(tenant);
    return featureUsage.sms ?? featureUsage.SMS ?? {};
}

export const SubscriptionTab = ({ tenant, onUpdate }: SubscriptionTabProps) => {
    const queryClient = useQueryClient();

    // Use generated hooks for reading data (GET usually works fine)
    const { data: plansData } = useListAdminPlans();
    const plans = getPlans(plansData);

    const { data: addonsData } = useListAdminAddons();
    const addons = getAddons(addonsData);

    const [selectedPlanId, setSelectedPlanId] = useState(tenant.current_plan_id || '');
    const [billingInterval, setBillingInterval] = useState<BillingInterval>('YEARLY');
    const [selectedAddonId, setSelectedAddonId] = useState('');
    const [selectedSmsPackage, setSelectedSmsPackage] = useState<number | null>(null);
    const [manualSmsLimit, setManualSmsLimit] = useState<number | string>(0);

    const [loadingSubscribe, setLoadingSubscribe] = useState(false);
    const [loadingAddon, setLoadingAddon] = useState(false);
    const [loadingRemoveAddon, setLoadingRemoveAddon] = useState(false);
    const [loadingSmsUpdate, setLoadingSmsUpdate] = useState(false);

    // Modal state for deletions
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        setSelectedPlanId(tenant.current_plan_id || tenant.currentPlanId || '');
        const smsLimit = getSmsUsage(tenant).limit ?? 0;
        setManualSmsLimit(smsLimit);
    }, [tenant]);

    // Use apiClient manually for updates to ensure consistency and avoid auth issues

    const handleSubscribe = async () => {
        if (!selectedPlanId || !tenant.id) return;
        setLoadingSubscribe(true);
        try {
            await apiClient.post(`/api/admin/tenants/${tenant.id}/subscribe`, {
                plan_id: selectedPlanId,
                billing_interval: billingInterval
            });

            toast.success('Abonelik güncellendi');
            await queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
            onUpdate();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Abonelik güncellenemedi'));
        } finally {
            setLoadingSubscribe(false);
        }
    };

    const handleAddAddon = async () => {
        if (!selectedAddonId || !tenant.id) return;
        setLoadingAddon(true);
        try {
            await apiClient.post(`/api/admin/tenants/${tenant.id}/addons`, {
                addon_id: selectedAddonId
            });

            toast.success('Ek özellik eklendi');
            setSelectedAddonId('');
            await queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
            onUpdate();
        } catch (error: unknown) {
            console.error('Add addon error:', error);
            toast.error(getApiErrorMessage(error, 'Ek özellik eklenemedi'));
        } finally {
            setLoadingAddon(false);
        }
    };

    const handleRemoveAddon = async () => {
        if (!confirmDeleteId || !tenant.id) return;
        setLoadingRemoveAddon(true);
        try {
            await apiClient.delete(`/api/admin/tenants/${tenant.id}/addons`, {
                data: { addon_id: confirmDeleteId }
            });

            toast.success('Ek özellik kaldırıldı');
            await queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
            onUpdate();
        } catch (error: unknown) {
            console.error('Remove addon error:', error);
            toast.error(getApiErrorMessage(error, 'Ek özellik kaldırılamadı'));
        } finally {
            setLoadingRemoveAddon(false);
            setConfirmDeleteId(null);
        }
    };

    // SMS updates use the general tenant update endpoint
    const updateTenantFeatureUsage = async (newUsage: FeatureUsageMap) => {
        if (!tenant.id) {
            throw new Error('Tenant bilgisi eksik');
        }

        await apiClient.put(`/api/admin/tenants/${tenant.id}`, {
            feature_usage: newUsage
        });
    };

    const handleUpdateSmsLimit = async () => {
        const limitVal = typeof manualSmsLimit === 'string' ? parseInt(manualSmsLimit) || 0 : manualSmsLimit;
        if (limitVal < 0) {
            toast.error('Limit 0\'dan küçük olamaz');
            return;
        }
        setLoadingSmsUpdate(true);
        try {
            const featureUsage = getFeatureUsage(tenant);
            const currentUsage = { ...featureUsage };
            const key = 'sms';

            // Normalize key
            if (currentUsage['SMS']) {
                currentUsage['sms'] = currentUsage['SMS'];
                delete currentUsage['SMS'];
            }

            currentUsage[key] = {
                ...(currentUsage[key] || {}),
                limit: limitVal,
                used: currentUsage[key]?.used || 0
            };

            await updateTenantFeatureUsage(currentUsage);

            toast.success('SMS limiti güncellendi');
            await queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
            onUpdate();
        } catch (error: unknown) {
            console.error('Update SMS limit error:', error);
            toast.error(getApiErrorMessage(error, 'SMS limiti güncellenemedi'));
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
            const featureUsage = getFeatureUsage(tenant);
            const currentUsage = { ...featureUsage };
            const key = 'sms';

            // Normalize key
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

            await updateTenantFeatureUsage(currentUsage);

            toast.success(`${selectedSmsPackage} SMS paketi eklendi`);
            setSelectedSmsPackage(null);
            setManualSmsLimit(newLimit);
            await queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
            onUpdate();
        } catch (error: unknown) {
            console.error('Add SMS package error:', error);
            toast.error(getApiErrorMessage(error, 'SMS paketi eklenemedi'));
        } finally {
            setLoadingSmsUpdate(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <CreditCard className="w-16 h-16 text-blue-900" />
                    </div>
                    <h4 className="text-sm font-semibold text-blue-800 mb-3">Mevcut Abonelik</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Plan:</span>
                            <span className="font-bold text-gray-900">{tenant.current_plan || tenant.currentPlan || 'Yok'}</span>
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
                                {(() => {
                                    const subscriptionEndDate = tenant.subscription_end_date ?? tenant.subscriptionEndDate;
                                    return subscriptionEndDate
                                        ? new Date(subscriptionEndDate).toLocaleDateString('tr-TR')
                                    : '-'}
                                )()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <MessageSquare className="w-16 h-16 text-indigo-900" />
                    </div>
                    <h4 className="text-sm font-semibold text-indigo-800 mb-3">SMS Durumu</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500">Toplam Limit:</span>
                            <span className="font-bold text-gray-900">
                                {getSmsUsage(tenant).limit || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500">Kullanılan:</span>
                            <span className="text-gray-900">
                                {getSmsUsage(tenant).used || 0}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                style={{
                                    width: `${(() => {
                                        const smsUsage = getSmsUsage(tenant);
                                        const used = smsUsage.used || 0;
                                        const limit = smsUsage.limit || 1;
                                        return Math.min(100, (used / limit) * 100);
                                    })()}%`
                                }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-500">Kalan:</span>
                            <span className="text-indigo-600 font-bold text-lg">
                                {(() => {
                                    const smsUsage = getSmsUsage(tenant);
                                    const limit = smsUsage.limit || 0;
                                    const used = smsUsage.used || 0;
                                    return Math.max(0, limit - used);
                                })()}
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
                            className="flex-1 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">Özellik Seç...</option>
                            {addons.map((addon) => (
                                <option key={addon.id} value={addon.id || ''}>
                                    {addon.name} ({addon.limitAmount ?? 0} {addon.unitName ?? ''}) - {addon.price} TL
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddAddon}
                            type="button"
                            disabled={loadingAddon || !selectedAddonId}
                            className="bg-green-600 text-white px-3 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                        >
                            {loadingAddon ? '...' : '+ Ekle'}
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden min-h-[150px]">
                        {(tenant.settings?.addons ?? []).length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm italic">
                                Henüz eklenmiş özellik yok.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {(tenant.settings?.addons ?? []).map((addon, idx) => (
                                    <li key={idx} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {addon.limit_amount ?? 0} {addon.unit_name ?? ''} • {addon.price ?? 0} TL
                                                {addon.added_at && ` • ${new Date(addon.added_at).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setConfirmDeleteId(addon.addon_id ?? addon.id ?? null)}
                                            type="button"
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

                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
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
                                type="button"
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
                                    type="button"
                                    onClick={() => setSelectedSmsPackage(selectedSmsPackage === amount ? null : amount)}
                                    className={`
                                        px-3 py-2 border rounded-xl text-center transition-all
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
                                type="button"
                                disabled={loadingSmsUpdate}
                                className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-xl hover:bg-indigo-700 shadow-md flex items-center justify-center font-medium transition-all animate-in fade-in slide-in-from-top-2"
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
                {(() => {
                    type FeatureRow = { key: string; limit?: number; used?: number; lastReset?: string; };
                    const featureRows: FeatureRow[] = [
                        ...Object.entries(tenant.feature_usage || {}).map(([key, value]) => ({
                            key,
                            limit: value.limit,
                            used: value.used,
                            lastReset: value.last_reset,
                        })),
                        ...Object.entries(tenant.featureUsage || {}).map(([key, value]) => ({
                            key,
                            limit: value.limit,
                            used: value.used,
                            lastReset: value.last_reset || value.lastReset,
                        })),
                    ];
                    const featureColumns: Column<FeatureRow>[] = [
                        {
                            key: 'key',
                            title: 'Özellik',
                            render: (_: unknown, row: FeatureRow) => <span className="capitalize">{row.key}</span>,
                        },
                        {
                            key: 'limit',
                            title: 'Limit',
                            render: (_: unknown, row: FeatureRow) => row.limit === 0 ? 'Sınırsız' : String(row.limit ?? '-'),
                        },
                        {
                            key: 'used',
                            title: 'Kullanılan',
                            render: (_: unknown, row: FeatureRow) => String(row.used ?? 0),
                        },
                        {
                            key: 'lastReset',
                            title: 'Sıfırlanma',
                            render: (_: unknown, row: FeatureRow) => row.lastReset ? new Date(row.lastReset).toLocaleDateString() : '-',
                        },
                    ];
                    return (
                        <DataTable<FeatureRow>
                            data={featureRows}
                            columns={featureColumns}
                            rowKey={(r) => r.key}
                            emptyText="Henüz özellik kullanımı kaydı yok"
                            size="small"
                            striped
                        />
                    );
                })()}
            </div>

            {/* Plan Değiştirme */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mt-8">
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
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">Plan Seçin...</option>
                            {plans.map((plan) => (
                                <option key={plan.id} value={plan.id}>{plan.name} ({plan.price} TL)</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Fatura Dönemi</label>
                        <select
                            value={billingInterval}
                            onChange={e => setBillingInterval(e.target.value as BillingInterval)}
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="MONTHLY">Aylık</option>
                            <option value="YEARLY">Yıllık</option>
                        </select>
                    </div>
                    <button
                        onClick={handleSubscribe}
                        type="button"
                        disabled={loadingSubscribe || !selectedPlanId}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium h-[38px]"
                    >
                        {loadingSubscribe ? '...' : 'Planı Güncelle'}
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <Dialog.Root open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl z-50">
                        <div className="flex items-center mb-4 text-red-500">
                            <AlertTriangle className="h-6 w-6 mr-2" />
                            <Dialog.Title className="text-xl font-bold text-gray-900">Özelliği Kaldır</Dialog.Title>
                        </div>
                        <div className="mb-6 text-gray-600">
                            Bu özelliği kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">İptal</button>
                            <button onClick={handleRemoveAddon} disabled={loadingRemoveAddon} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">
                                {loadingRemoveAddon ? 'Kaldırılıyor...' : 'Kaldır'}
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

        </div>
    );
};
