import React, { useEffect, useState } from 'react';
import { subscriptionService, SubscriptionInfo } from '../../services/subscription.service';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const Subscription: React.FC = () => {
    const [info, setInfo] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const data = await subscriptionService.getCurrentSubscription();
                setInfo(data);
            } catch (error) {
                console.error('Failed to fetch subscription info', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, []);

    if (loading) return <div className="p-6">Yükleniyor...</div>;
    if (!info) return <div className="p-6">Abonelik bilgisi bulunamadı.</div>;

    const { plan, tenant, is_expired, days_remaining } = info;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Abonelik ve Paket Bilgileri</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Plan Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Mevcut Paket</h2>
                    {plan ? (
                        <div>
                            <div className="text-3xl font-bold text-blue-600 mb-2">{plan.name}</div>
                            <p className="text-gray-500 mb-4">{plan.description}</p>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                {/* @ts-ignore */}
                                <Clock className="w-4 h-4" />
                                <span>Bitiş Tarihi: {tenant.subscription_end_date ? new Date(tenant.subscription_end_date).toLocaleDateString('tr-TR') : '-'}</span>
                            </div>
                            <div className={`mt-4 p-3 rounded-lg flex items-center ${is_expired ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {is_expired ? (
                                    <>
                                        {/* @ts-ignore */}
                                        <AlertTriangle className="w-5 h-5 mr-2" />
                                        <span>Aboneliğiniz sona ermiş. Lütfen yenileyin.</span>
                                    </>
                                ) : (
                                    <>
                                        {/* @ts-ignore */}
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        <span>Aktif - {days_remaining} gün kaldı</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500">Herhangi bir paket tanımlı değil.</div>
                    )}
                </div>

                {/* Usage Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Kullanım Hakları</h2>
                    <div className="space-y-4">
                        {tenant.feature_usage && Object.entries(tenant.feature_usage).map(([key, usage]: [string, any]) => (
                            <div key={key}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-gray-500">{usage.used} / {usage.limit > 0 ? usage.limit : 'Sınırsız'}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full"
                                        style={{ width: `${usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {(!tenant.feature_usage || Object.keys(tenant.feature_usage).length === 0) && (
                            <div className="text-gray-500 text-sm">Kullanım limiti olan özellik bulunmuyor.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add-ons Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">Ek Özellikler (Add-ons)</h2>
                <AddOnsList />
            </div>
        </div>
    );
};

function AddOnsList() {
    const [addons, setAddons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAddons = async () => {
            try {
                // Assuming we can use the same public endpoint or an authenticated one
                // Since this is the web app (authenticated), we should probably use an authenticated endpoint if available.
                // But for now, let's try the public one or the one used in landing if no auth required, 
                // OR use the apiClient if there is a route.
                // Let's try fetching from the base URL directly if apiClient doesn't have it.
                // Actually, let's use fetch directly to the API URL for now to be safe, or assume apiClient has a base URL.
                // apiClient usually has interceptors.
                // Let's try using fetch with the hardcoded API URL for simplicity as I did in Landing, 
                // but usually Web app has a proxy or config.
                // I'll use the hardcoded URL http://localhost:5003/api/addons for consistency with Landing.
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5003/api'}/addons`);
                const data = await res.json();
                if (data.success) {
                    setAddons(data.data.filter((a: any) => a.is_active));
                }
            } catch (error) {
                console.error('Failed to fetch addons:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAddons();
    }, []);

    if (loading) return <div className="text-gray-500">Eklentiler yükleniyor...</div>;
    if (addons.length === 0) return <div className="text-gray-500">Mevcut eklenti bulunmuyor.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon) => (
                <div key={addon.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-800 dark:text-white">{addon.name}</h3>
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            {addon.addon_type === 'FLAT_FEE' ? 'Tek Seferlik' :
                                addon.addon_type === 'PER_USER' ? 'Kullanıcı Başına' : 'Kullanım Bazlı'}
                        </span>
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        ₺{addon.price}
                    </div>
                    <button className="mt-auto w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
                        Satın Al
                    </button>
                </div>
            ))}
        </div>
    );
}

export default Subscription;
