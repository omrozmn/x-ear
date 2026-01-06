import React from 'react';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import {
    useListSmsPackagesApiSmsPackagesGet,
    useGetSmsCreditApiSmsCreditGet,
    useGetCurrentApiSubscriptionsCurrentGet,
    useGetAddonsApiAddonsGet
} from '@/api/generated';
import { useAuthStore } from '@/stores/authStore';

type FeatureUsageStats = {
    used?: number;
    limit?: number;
};

const Subscription: React.FC = () => {
    const { token, user } = useAuthStore();
    const { data: subscriptionData, isLoading, isError } = useGetCurrentApiSubscriptionsCurrentGet();
    const { data: creditData } = useGetSmsCreditApiSmsCreditGet({
        query: { enabled: !!token }
    });
    const info = (subscriptionData as any)?.data?.data;

    if (isLoading) return <div className="p-6">Yükleniyor...</div>;
    if (isError) return <div className="p-6">Abonelik bilgisi yüklenirken hata oluştu.</div>;

    // Super admin check
    if (info?.is_super_admin || user?.role === 'super_admin') {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Abonelik ve Paket Bilgileri</h1>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
                    <div className="text-6xl mb-4">👑</div>
                    <h2 className="text-2xl font-bold text-blue-900 dark:text-blue-300 mb-2">Super Admin</h2>
                    <p className="text-blue-700 dark:text-blue-400">
                        Platform yöneticisi olarak tüm özelliklere sınırsız erişiminiz var.
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-500 mt-4">
                        Tenant aboneliklerini yönetmek için Admin Panel'i kullanın.
                    </p>
                </div>
            </div>
        );
    }

    if (!info) return <div className="p-6">Abonelik bilgisi bulunamadı.</div>;

    const { plan, tenant, isExpired, daysRemaining } = info;

    // Handle different response structures for credit balance
    let creditBalance = 0;
    if (creditData) {
        if (typeof creditData === 'number') {
            creditBalance = creditData;
        } else if ((creditData as any)?.balance !== undefined) {
            creditBalance = (creditData as any).balance;
        } else if ((creditData as any)?.data) {
            const innerData = (creditData as any).data;
            if (typeof innerData === 'number') {
                creditBalance = innerData;
            } else if (innerData?.balance !== undefined) {
                creditBalance = innerData.balance;
            } else if (innerData?.data?.balance !== undefined) {
                creditBalance = innerData.data.balance;
            }
        }
    }
    const subscriptionEndsAt = tenant?.subscriptionEndDate
        ? new Date(tenant.subscriptionEndDate).toLocaleDateString('tr-TR')
        : '-';
    const featureUsage = (tenant?.featureUsage ?? {}) as Record<string, FeatureUsageStats>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Abonelik ve Paket Bilgileri</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Plan Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    {/* ... existing plan card content ... */}
                    {plan ? (
                        <div>
                            <div className="text-3xl font-bold text-blue-600 mb-2">{plan.name}</div>
                            <p className="text-gray-500 mb-4">{plan.description || 'Plan açıklaması bulunmuyor.'}</p>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span>Bitiş Tarihi: {subscriptionEndsAt}</span>
                            </div>
                            <div className={`mt-4 p-3 rounded-lg flex items-center ${isExpired ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {isExpired ? (
                                    <>
                                        <AlertTriangle className="w-5 h-5 mr-2" />
                                        <span>Aboneliğiniz sona ermiş. Lütfen yenileyin.</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        <span>Aktif - {daysRemaining ?? 0} gün kaldı</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500">Herhangi bir paket tanımlı değil.</div>
                    )}
                </div>

                {/* Usage Stats & SMS Credit */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Kullanım Hakları</h2>

                    {/* SMS Credit Display */}
                    <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-indigo-900 dark:text-indigo-300">SMS Kredisi</span>
                            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {creditBalance.toLocaleString('tr-TR')}
                            </span>
                        </div>
                        <div className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                            Kalan SMS hakkınız
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
                                        <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-gray-500">{used} / {limit > 0 ? limit : 'Sınırsız'}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(featureUsage).length === 0 && (
                            <div className="text-gray-500 text-sm">Kullanım limiti olan özellik bulunmuyor.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* SMS Packages Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">SMS Paketleri</h2>
                <SmsPackagesList />
            </div>

            {/* Add-ons Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Ek Özellikler (Add-ons)</h2>
                <AddOnsList />
            </div>
        </div>
    );
};

function SmsPackagesList() {
    const { data: packagesData, isLoading, isError } = useListSmsPackagesApiSmsPackagesGet();
    if (isLoading) return <div className="text-gray-500">SMS Paketleri yükleniyor...</div>;
    if (isError) return <div className="text-gray-500">SMS paketleri yüklenemedi.</div>;

    const packages = (packagesData as any)?.data?.data ?? [];
    if (packages.length === 0) return <div className="text-gray-500">Mevcut SMS paketi bulunmuyor.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
                const smsCount = pkg.smsCount ?? 0;
                const price = pkg.price ?? 0;

                return (
                    <div key={pkg.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-800 dark:text-white">{pkg.name}</h3>
                            <span className="text-xs font-medium px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                                {smsCount.toLocaleString('tr-TR')} SMS
                            </span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            ₺{price.toLocaleString('tr-TR')}
                        </div>
                        <Button variant="primary" className="mt-auto w-full">
                            Satın Al
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

function AddOnsList() {
    const { data: addonsData, isLoading, isError } = useGetAddonsApiAddonsGet();
    if (isLoading) return <div className="text-gray-500">Eklentiler yükleniyor...</div>;
    if (isError) return <div className="text-gray-500">Eklentiler yüklenemedi.</div>;

    const addons = ((addonsData as any)?.data?.data || []).filter((addon: any) => addon.isActive);
    if (addons.length === 0) return <div className="text-gray-500">Mevcut eklenti bulunmuyor.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon) => {
                const price = addon.price ?? 0;

                return (
                    <div key={addon.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-800 dark:text-white">{addon.name}</h3>
                            <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {addon.addonType === 'FLAT_FEE' ? 'Tek Seferlik' :
                                    addon.addonType === 'PER_USER' ? 'Kullanıcı Başına' : 'Kullanım Bazlı'}
                            </span>
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            ₺{price.toLocaleString('tr-TR')}
                        </div>
                        <Button variant="primary" className="mt-auto w-full">
                            Satın Al
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

export default Subscription;
