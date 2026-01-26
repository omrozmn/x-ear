import React from 'react';
import { Plus, Users, Calendar, Banknote, Clock } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { formatCurrency } from '@/utils/format';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNavigate } from '@tanstack/react-router';
import { useHaptic } from '@/hooks/useHaptic';

export const MobileDashboard: React.FC = () => {
    const { stats, recentActivity, loading } = useDashboardData();
    const navigate = useNavigate();
    const { triggerSelection } = useHaptic();

    const handleRefresh = async () => {
        window.location.reload();
    };

    const quickActions = [
        { icon: <Plus className="h-6 w-6" />, label: 'Hasta Ekle', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', to: '/parties?new=true' },
        { icon: <Calendar className="h-6 w-6" />, label: 'Randevu', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', to: '/appointments?new=true' },
        { icon: <Banknote className="h-6 w-6" />, label: 'Satış Yap', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', to: '/invoices/new' },
        { icon: <Clock className="h-6 w-6" />, label: 'Hızlı İşlem', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', to: '/actions' },
    ];

    const statCards = [
        { label: 'Bugünkü Randevular', value: stats?.todayAppointments || 0, color: 'bg-blue-500', icon: <Calendar className="h-5 w-5 text-white/80" /> },
        { label: 'Aktif Denemeler', value: stats?.activeTrials || 0, color: 'bg-purple-500', icon: <Clock className="h-5 w-5 text-white/80" /> },
        { label: 'Aylık Gelir', value: formatCurrency(stats?.monthlyRevenue || 0), color: 'bg-green-500', icon: <Banknote className="h-5 w-5 text-white/80" /> },
        { label: 'Toplam Hasta', value: stats?.totalParties || 0, color: 'bg-indigo-500', icon: <Users className="h-5 w-5 text-white/80" /> },
    ];

    if (loading && !stats) return <div className="flex justify-center p-10 mt-20">Yükleniyor...</div>;

    return (
        <MobileLayout className="bg-gray-50 dark:bg-gray-950">
            <MobileHeader title="Dashboard" showBack={false} />

            <PullToRefresh onRefresh={handleRefresh}>
                <div className="p-4 space-y-6 min-h-[calc(100vh-120px)]">
                    {/* Stats Carousel (Horizontal Scroll) */}
                    <section>
                        <h2 className="text-lg font-semibold mb-3 px-1 text-gray-900 dark:text-white">Genel Bakış</h2>
                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x hide-scrollbar">
                            {statCards.map((stat, idx) => (
                                <div
                                    key={idx}
                                    className={`${stat.color} p-4 rounded-2xl min-w-[160px] text-white shadow-lg snap-start flex flex-col justify-between h-32 active:scale-95 transition-transform duration-100`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="p-2 bg-white/20 rounded-lg">{stat.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                        <p className="text-sm opacity-90">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Quick Actions Grid */}
                    <section>
                        <h2 className="text-lg font-semibold mb-3 px-1 text-gray-900 dark:text-white">Hızlı İşlemler</h2>
                        <div className="grid grid-cols-4 gap-4">
                            {quickActions.map((action, idx) => (
                                <button
                                    data-allow-raw="true"
                                    key={idx}
                                    onClick={() => {
                                        navigate({ to: action.to });
                                        triggerSelection();
                                    }}
                                    className="flex flex-col items-center gap-2 group active:scale-95 transition-transform duration-100"
                                >
                                    <div className={`${action.bg} ${action.text} p-4 rounded-2xl shadow-sm w-full aspect-square flex items-center justify-center group-hover:brightness-95 transition-all`}>
                                        {action.icon}
                                    </div>
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight">
                                        {action.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Recent Activity List */}
                    <section>
                        <h2 className="text-lg font-semibold mb-3 px-1 text-gray-900 dark:text-white">Son Aktiviteler</h2>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
                            {recentActivity && recentActivity.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {recentActivity.map((activity: { description?: string; timestamp?: string; user?: string }, idx: number) => (
                                        <div key={idx} className="p-4 flex gap-3 active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
                                            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                                                    {activity.description || 'İşlem yapıldı'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    {' • '}{activity.user || 'Sistem'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                    Henüz aktivite yok
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </PullToRefresh>
        </MobileLayout>
    );
};
