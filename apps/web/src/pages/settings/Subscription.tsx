import React from 'react';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import {
    useListSmPackages,
    useListSmCredit,
    getListSmCreditQueryKey
} from '@/api/client/sms-integration.client';
import { useListSubscriptionCurrent } from '@/api/client/subscriptions.client';
import { useListAddons } from '@/api/client/sms.client';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';

type FeatureUsageStats = {
    used?: number;
    limit?: number;
};

const Subscription: React.FC = () => {
    const { t } = useTranslation('settings_extra');
    const { token, user } = useAuthStore();
    const { data: subscriptionData, isLoading, isError } = useListSubscriptionCurrent();
    const { data: creditData } = useListSmCredit({
        query: { queryKey: getListSmCreditQueryKey(), enabled: !!token }
    });
    interface SubscriptionResponse {
        data: {
            plan?: { name: string; description?: string };
            tenant?: { subscriptionEndDate?: string; featureUsage?: Record<string, FeatureUsageStats> };
            isExpired?: boolean;
            daysRemaining?: number;
            is_super_admin?: boolean;
        }
    }
    const info = (subscriptionData as unknown as { data: SubscriptionResponse['data'] })?.data;

    if (isLoading) return <div className="p-6">{t('loading', 'Yükleniyor...')}</div>;
    if (isError) return <div className="p-6">{t('subscriptionLoadError', 'Abonelik bilgisi yüklenirken hata oluştu.')}</div>;

    // Super admin check
    if (info?.is_super_admin || user?.role === 'super_admin') {
        return (
            <div className="space-y-6">
                <div className="bg-primary/10 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
                    <div className="text-6xl mb-4">👑</div>
                    <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-300 mb-2">Super Admin</h2>
                    <p className="text-primary">
                        {t('superAdminAccess', 'Platform yöneticisi olarak tüm özelliklere sınırsız erişiminiz var.')}
                    </p>
                    <p className="text-sm text-primary mt-4">
                        {t('useAdminPanelForTenants', "Tenant aboneliklerini yönetmek için Admin Panel'i kullanın.")}
                    </p>
                </div>
            </div>
        );
    }

    if (!info) return <div className="p-6">{t('subscriptionNotFound', 'Abonelik bilgisi bulunamadı.')}</div>;

    const { plan, tenant, isExpired, daysRemaining } = info;

    // Handle different response structures for credit balance
    let creditBalance = 0;
    if (creditData) {
        // creditData could be: number | { balance: number } | { data: number | { balance: number } }
        const creditDataUnknown = creditData as unknown;
        if (typeof creditDataUnknown === 'number') {
            creditBalance = creditDataUnknown;
        } else if (typeof creditDataUnknown === 'object' && creditDataUnknown !== null) {
            const creditObj = creditDataUnknown as Record<string, unknown>;
            if (typeof creditObj.balance === 'number') {
                creditBalance = creditObj.balance;
            } else if (creditObj.data !== undefined) {
                const innerData = creditObj.data;
                if (typeof innerData === 'number') {
                    creditBalance = innerData;
                } else if (typeof innerData === 'object' && innerData !== null) {
                    const innerObj = innerData as Record<string, unknown>;
                    if (typeof innerObj.balance === 'number') {
                        creditBalance = innerObj.balance;
                    } else if (typeof innerObj.data === 'object' && innerObj.data !== null) {
                        const deepObj = innerObj.data as Record<string, unknown>;
                        if (typeof deepObj.balance === 'number') {
                            creditBalance = deepObj.balance;
                        }
                    }
                }
            }
        }
    }
    const subscriptionEndsAt = tenant?.subscriptionEndDate
        ? new Date(tenant.subscriptionEndDate).toLocaleDateString('tr-TR')
        : '-';
    const featureUsage = (tenant?.featureUsage ?? {}) as Record<string, FeatureUsageStats>;

    return (
        <div className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Plan Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border p-6">
                    {/* ... existing plan card content ... */}
                    {plan ? (
                        <div>
                            <div className="text-3xl font-bold text-primary mb-2">{plan.name}</div>
                            <p className="text-muted-foreground mb-4">{plan.description || t('noPlanDescription', 'Plan açıklaması bulunmuyor.')}</p>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{t('endDate', 'Bitiş Tarihi')}: {subscriptionEndsAt}</span>
                            </div>
                            <div className={`mt-4 p-3 rounded-2xl flex items-center ${isExpired ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                                {isExpired ? (
                                    <>
                                        <AlertTriangle className="w-5 h-5 mr-2" />
                                        <span>{t('subscriptionExpired', 'Aboneliğiniz sona ermiş. Lütfen yenileyin.')}</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        <span>{t('activeSubscription', 'Aktif')} - {daysRemaining ?? 0} {t('daysRemaining', 'gün kaldı')}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted-foreground">{t('noPlanDefined', 'Herhangi bir paket tanımlı değil.')}</div>
                    )}
                </div>

                {/* Usage Stats & SMS Credit */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border p-6">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">{t('usageRights', 'Kullanım Hakları')}</h2>

                    {/* SMS Credit Display */}
                    <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-indigo-900 dark:text-indigo-300">SMS Kredisi</span>
                            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {creditBalance.toLocaleString('tr-TR')}
                            </span>
                        </div>
                        <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                            {t('remainingSmsCredits', 'Kalan SMS hakkınız')}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(featureUsage).map(([key, usage]) => {
                            const used = usage.used ?? 0;
                            const limit = usage.limit ?? 0;
                            const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

                            return (
                                <div key={key}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-muted-foreground">{used} / {limit > 0 ? limit : t('unlimited', 'Sınırsız')}</span>
                                    </div>
                                    <div className="w-full bg-accent rounded-full h-2.5">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(featureUsage).length === 0 && (
                            <div className="text-muted-foreground text-sm">{t('noUsageLimits', 'Kullanım limiti olan özellik bulunmuyor.')}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* SMS Packages Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-foreground">{t('smsPackages', 'SMS Paketleri')}</h2>
                <SmsPackagesList />
            </div>

            {/* Add-ons Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-foreground">{t('addOns', 'Ek Özellikler (Add-ons)')}</h2>
                <AddOnsList />
            </div>
        </div>
    );
};

function SmsPackagesList() {
  const { t } = useTranslation('settings_extra');
    const { data: packagesData, isLoading, isError } = useListSmPackages();
    if (isLoading) return <div className="text-muted-foreground">{t('smsPackagesLoading', 'SMS Paketleri yükleniyor...')}</div>;
    if (isError) return <div className="text-muted-foreground">{t('smsPackagesLoadFailed', 'SMS paketleri yüklenemedi.')}</div>;

    // Extract packages from nested response structure
    interface SmsPackage {
        id: string;
        name: string;
        smsCount?: number;
        price?: number;
    }
    const packagesResponse = packagesData as unknown as { data?: { data?: SmsPackage[] } } | undefined;
    const packages: SmsPackage[] = packagesResponse?.data?.data ?? [];
    if (packages.length === 0) return <div className="text-muted-foreground">{t('noSmsPackages', 'Mevcut SMS paketi bulunmuyor.')}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
                const smsCount = pkg.smsCount ?? 0;
                const price = pkg.price ?? 0;

                return (
                    <div key={pkg.id} className="border border-border rounded-2xl p-4 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                            <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                                {smsCount.toLocaleString('tr-TR')} SMS
                            </span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            ₺{price.toLocaleString('tr-TR')}
                        </div>
                        <Button variant="primary" className="mt-auto w-full">
                            {t('purchase', 'Satın Al')}
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

function AddOnsList() {
    const { t } = useTranslation('settings_extra');
    const { data: addonsData, isLoading, isError } = useListAddons();
    if (isLoading) return <div className="text-muted-foreground">{t('addOnsLoading', 'Eklentiler yükleniyor...')}</div>;
    if (isError) return <div className="text-muted-foreground">{t('addOnsLoadFailed', 'Eklentiler yüklenemedi.')}</div>;

    // Extract addons from nested response structure
    interface Addon {
        id: string;
        name: string;
        price?: number;
        isActive?: boolean;
        description?: string;
        addonType?: string;
    }
    // Backend returns ResponseEnvelope: {success: true, data: [...]}
    // Orval unwraps to {data: [...]}
    const addons = (Array.isArray(addonsData?.data) ? addonsData.data : []).filter((addon) => addon.isActive) as Addon[];
    if (addons.length === 0) return <div className="text-muted-foreground">{t('noAddOns', 'Mevcut eklenti bulunmuyor.')}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon) => {
                const price = addon.price ?? 0;

                return (
                    <div key={addon.id} className="border border-border rounded-2xl p-4 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground">{addon.name}</h3>
                            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-blue-800 rounded-full">
                                {addon.addonType === 'FLAT_FEE' ? 'Tek Seferlik' :
                                    addon.addonType === 'PER_USER' ? 'Kullanıcı Başına' : 'Kullanım Bazlı'}
                            </span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            ₺{price.toLocaleString('tr-TR')}
                        </div>
                        <Button variant="primary" className="mt-auto w-full">
                            {t('purchase', 'Satın Al')}
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

export default Subscription;
