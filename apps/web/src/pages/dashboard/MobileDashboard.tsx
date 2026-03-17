import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Calendar, Banknote, Clock, TrendingUp, UserCheck, AlertCircle } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { formatCurrency } from '@/utils/format';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useNavigate } from '@tanstack/react-router';
import { useHaptic } from '@/hooks/useHaptic';
import { usePermissions } from '@/hooks/usePermissions';
import { useSector } from '@/hooks/useSector';
import { useSectorTerminology } from '@/hooks/useSectorTerminology';

export const MobileDashboard: React.FC = () => {
    const { t } = useTranslation('dashboard');
    const { stats, recentActivity, loading } = useDashboardData();
    const navigate = useNavigate();
    const { triggerSelection } = useHaptic();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const { isModuleEnabled } = useSector();
    const { st } = useSectorTerminology();

    const canViewParties = isSuperAdmin || hasPermission('parties.view');
    const canViewFinance = isSuperAdmin || hasPermission('finance.view');
    const canViewAppointments = isSuperAdmin || hasPermission('appointments.view');
    const canViewCashRegister = isSuperAdmin || hasPermission('finance.cash_register');
    const canViewActivityLogs = isSuperAdmin || hasPermission('activity_logs.view');

    const handleRefresh = async () => {
        window.location.reload();
    };

    const partyLabel = st('new_party') || 'Yeni Müşteri';

    const quickActions = [
        canViewParties && { icon: <Plus className="h-6 w-6" />, label: partyLabel, bg: 'bg-primary/10', text: 'text-primary', to: '/parties?new=true' },
        canViewAppointments && { icon: <Calendar className="h-6 w-6" />, label: 'Randevu', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', to: '/appointments?new=true' },
        canViewCashRegister && { icon: <Banknote className="h-6 w-6" />, label: 'Satış Yap', bg: 'bg-success/10', text: 'text-success', to: '/invoices/new' },
        { icon: <Clock className="h-6 w-6" />, label: 'Hızlı İşlem', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', to: '/actions' },
    ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string; bg: string; text: string; to: string }>;

    const hasDevicesModule = isModuleEnabled('devices');
    const partyTerm = st('party') || 'Müşteri';
    const partiesTerm = st('parties') || 'Müşteriler';

    const statCards = [
        canViewAppointments && { label: 'Bugünkü Randevular', value: stats?.todayAppointments || 0, color: 'bg-blue-500', icon: <Calendar className="h-5 w-5 text-white/80" /> },
        canViewParties && hasDevicesModule && { label: 'Aktif Denemeler', value: stats?.activeTrials || 0, color: 'bg-purple-500', icon: <Clock className="h-5 w-5 text-white/80" /> },
        canViewFinance && { label: 'Aylık Gelir', value: formatCurrency(stats?.monthlyRevenue || 0), color: 'bg-green-500', icon: <Banknote className="h-5 w-5 text-white/80" /> },
        canViewParties && { label: `Toplam ${partyTerm}`, value: stats?.totalParties || 0, color: 'bg-indigo-500', icon: <Users className="h-5 w-5 text-white/80" /> },
        canViewParties && { label: `Aktif ${partiesTerm}`, value: stats?.activeParties || 0, color: 'bg-teal-500', icon: <UserCheck className="h-5 w-5 text-white/80" /> },
        canViewFinance && { label: 'Günlük Gelir', value: formatCurrency(stats?.dailyRevenue || 0), color: 'bg-emerald-500', icon: <TrendingUp className="h-5 w-5 text-white/80" /> },
        canViewAppointments && { label: 'Bekleyen Randevular', value: stats?.pendingAppointments || 0, color: 'bg-amber-500', icon: <AlertCircle className="h-5 w-5 text-white/80" /> },
        canViewParties && hasDevicesModule && { label: 'Biten Denemeler', value: stats?.endingTrials || 0, color: 'bg-rose-500', icon: <Clock className="h-5 w-5 text-white/80" /> },
    ].filter(Boolean) as Array<{ label: string; value: string | number; color: string; icon: React.ReactNode }>;

    if (loading && !stats) return <div className="flex justify-center p-10 mt-20">{t('loading', 'Yükleniyor...')}</div>;

    return (
        <MobileLayout className="bg-gray-50 dark:bg-gray-950">
            <MobileHeader title="Dashboard" showBack={false} />

            <PullToRefresh onRefresh={handleRefresh}>
                <div className="p-4 space-y-6 min-h-[calc(100vh-120px)]">
                    {/* Stats Carousel (Horizontal Scroll) */}
                    <section>
                        <h2 className="text-lg font-semibold mb-3 px-1 text-gray-900 dark:text-white">{t('overview', 'Genel Bakış')}</h2>
                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x hide-scrollbar">
                            {statCards.map((stat, idx) => (
                                <div
                                    key={idx}
                                    className={`${stat.color} bg-opacity-90 backdrop-blur-md border border-white/20 p-4 rounded-3xl min-w-[160px] text-white shadow-lg shadow-gray-200/50 dark:shadow-none snap-start flex flex-col justify-between h-32 active:scale-95 transition-all duration-200 ease-out`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="p-2 bg-card/20 backdrop-blur-xl border border-white/10 rounded-2xl">{stat.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                                        <p className="text-sm opacity-90 font-medium">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Quick Actions Grid */}
                    {quickActions.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold mb-3 px-1 text-gray-900 dark:text-white">{t('quickActions', 'Hızlı İşlemler')}</h2>
                            <div className="grid grid-cols-4 gap-4">
                                {quickActions.map((action, idx) => (
                                    <button
                                        data-allow-raw="true"
                                        key={idx}
                                        onClick={() => {
                                            navigate({ to: action.to });
                                            triggerSelection();
                                        }}
                                        className="flex flex-col items-center gap-2 group active:scale-95 transition-all duration-200"
                                    >
                                        <div className={`${action.bg} ${action.text} bg-opacity-80 backdrop-blur-sm border border-white/40 dark:border-white/10 p-4 rounded-2xl shadow-sm w-full aspect-square flex items-center justify-center group-hover:brightness-95 transition-all`}>
                                            {action.icon}
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
                                            {action.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Recent Activity List */}
                    {canViewActivityLogs && (
                        <section>
                            <h2 className="text-lg font-semibold mb-3 px-1 text-gray-900 dark:text-white">{t('recentActivity', 'Son Aktiviteler')}</h2>
                            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-3xl shadow-sm overflow-hidden border border-border/50/50">
                                {recentActivity && recentActivity.length > 0 ? (
                                    <div className="divide-y divide-gray-200/30 dark:divide-gray-700/30">
                                        {recentActivity.map((activity: { description?: string; timestamp?: string; user?: string }, idx: number) => (
                                            <div key={idx} className="p-4 flex gap-3 hover:bg-card/40 dark:hover:bg-gray-700/40 active:bg-muted/50 dark:active:bg-gray-800/50 transition-colors cursor-pointer">
                                                <div className="h-10 w-10 rounded-2xl bg-muted/80/80 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-border/50/50">
                                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                                                        {activity.description || t('actionPerformed', 'İşlem yapıldı')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        {' • '}{activity.user || 'Sistem'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        {t('noActivity', 'Henüz aktivite yok')}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </PullToRefresh>
        </MobileLayout>
    );
};
