import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/useAuth';
import { useGetAdminDashboard } from '@/lib/api-client';
import { KillSwitchRecommendation } from '@/ai';
import { PermissionGate } from '@/hooks/PermissionGate';
import type { ResponseEnvelopeAdminDashboardMetrics } from '@/api/generated/schemas';
import { AdminPermissions } from '@/types';
import { useAdminResponsive } from '@/hooks';
import { DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Users,
    CreditCard,
    TrendingUp,
    AlertTriangle,
    Activity,
    UserPlus,
    UserMinus,
    Clock,
    Calendar,
    FileText,
    ShieldCheck,
    XCircle,
    Settings,
    Headphones,
    RefreshCw
} from 'lucide-react';

export default function AdminDashboardPage() {
    const { isMobile } = useAdminResponsive();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate({ to: '/login' });
        }
    }, [authLoading, isAuthenticated, navigate]);

    const { data: dashboardData, isLoading: metricsLoading, error: metricsError, refetch } = useGetAdminDashboard({
        query: {
            enabled: isAuthenticated && !authLoading,
            retry: 1,
            refetchOnWindowFocus: false,
        }
    });

    const metrics = getDashboardMetrics(dashboardData);
    const loading = metricsLoading;
    const errorMessage = getErrorMessage(metricsError);

    const alerts = metrics?.alerts;
    const overview = metrics?.overview;
    const revenue = metrics?.revenue;
    const health = metrics?.health_metrics;
    const activity = metrics?.recent_activity;
    const dailyStats = metrics?.daily_stats;
    const recentErrors = metrics?.recent_errors;
    const tenantTrend = metrics?.tenant_trend;
    const revenueTrend = metrics?.revenue_trend;
    const statusDistribution = metrics?.status_distribution;

    const loadDashboardData = () => {
        refetch();
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('tr-TR').format(num);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    };

    if (authLoading || (loading && !metrics && !errorMessage)) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-gray-500 font-medium">Veriler yükleniyor...</p>
            </div>
        );
    }

    const cards = [
        {
            title: "Aktif Aboneler",
            value: overview ? formatNumber(overview.active_tenants || 0) : '-',
            icon: <Activity className="w-6 h-6 text-white" />,
            color: "bg-gradient-to-br from-indigo-500 to-blue-600",
            subtext: "SaaS Platformu",
        },
        {
            title: "Aktif Kullanıcılar",
            value: overview ? formatNumber(overview.active_users || 0) : '-',
            icon: <Users className="w-6 h-6 text-white" />,
            color: "bg-gradient-to-br from-cyan-500 to-teal-600",
            subtext: "Toplam Erişim",
        },
        {
            title: "Aylık Gelir (MRR)",
            value: revenue ? formatCurrency(revenue.monthly_recurring_revenue || 0) : '-',
            icon: <CreditCard className="w-6 h-6 text-white" />,
            color: "bg-gradient-to-br from-emerald-500 to-green-600",
            subtext: "Gelir Akışı",
        },
        {
            title: "Churn Oranı",
            value: health ? `%${(health.churn_rate_percent || 0).toFixed(1)}` : '-',
            icon: <TrendingUp className="w-6 h-6 text-white" />,
            color: "bg-gradient-to-br from-rose-500 to-red-600",
            subtext: "Kayıp Oranı",
        }
    ];

    const quickActions = [
        { label: 'Yeni Abone Ekle', icon: Users, color: 'bg-indigo-50 text-indigo-600', path: '/tenants' },
        { label: 'Plan Yönetimi', icon: CreditCard, color: 'bg-emerald-50 text-emerald-600', path: '/plans' },
        { label: 'Destek Talepleri', icon: Headphones, color: 'bg-purple-50 text-purple-600', path: '/support' },
        { label: 'Sistem Ayarları', icon: Settings, color: 'bg-gray-50 text-gray-600', path: '/settings' },
    ];

    return (
        <div className={`mx-auto ${isMobile ? 'px-4 pb-safe' : 'max-w-7xl px-4 sm:px-6 lg:px-8'} space-y-6 pt-6`}>
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                <div>
                    <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white tracking-tight`}>
                        Hoşgeldiniz, {user?.first_name ? `${user.first_name}` : 'Admin'} 👋
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium text-sm">
                        Platform durumuna genel bakış ve yönetim paneli.
                    </p>
                </div>
                <button
                    onClick={loadDashboardData}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors touch-feedback"
                    title="Yenile"
                >
                    <RefreshCw className={`w-5 h-5 ${metricsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* AI Kill Switch Recommendation Banner - Shows when high-severity AI alerts exist */}
            <PermissionGate
                permissions={[AdminPermissions.AI_KILL_SWITCH, AdminPermissions.AI_MANAGE, AdminPermissions.SYSTEM_MANAGE]}
                mode="any"
            >
                <KillSwitchRecommendation />
            </PermissionGate>

            {/* Error State */}
            {errorMessage && (
                <div className={`bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl ${isMobile ? 'p-4' : 'p-6'} shadow-sm animate-in fade-in slide-in-from-top-4 duration-300`}>
                    <div className="flex items-start gap-3">
                        <div className={`${isMobile ? 'p-2' : 'p-3'} bg-red-100 dark:bg-red-900/40 rounded-full flex-shrink-0`}>
                            <AlertTriangle className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-red-600 dark:text-red-400`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-red-900 dark:text-red-200`}>Veri Yükleme Hatası</h3>
                            <p className="text-red-700 dark:text-red-300 mt-1 text-sm">{errorMessage}</p>
                            <p className="text-red-500 dark:text-red-400 text-xs mt-2">Arka plan servislerinin çalıştığından emin olun (Port 5003).</p>
                            <button
                                onClick={loadDashboardData}
                                className="mt-3 px-4 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-2xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm touch-feedback"
                            >
                                Tekrar Dene
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts Section */}
            {alerts && ((alerts.expiring_soon || 0) > 0 || (alerts.high_churn || 0) > 0 || (alerts.low_utilization || 0) > 0) && (
                <div className={`bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/60 dark:border-amber-800/60 rounded-2xl ${isMobile ? 'p-3' : 'p-4'} flex gap-3 items-center shadow-sm`}>
                    <AlertTriangle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-amber-600 dark:text-amber-400 flex-shrink-0`} />
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row gap-2 sm:gap-4`}>
                        {(alerts.expiring_soon || 0) > 0 && <span>• {alerts.expiring_soon} üyelik yakında bitiyor</span>}
                        {(alerts.high_churn || 0) > 0 && <span>• Yüksek churn riski</span>}
                    </div>
                </div>
            )}

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        className={`${card.color} rounded-xl ${isMobile ? 'p-3' : 'p-4'} shadow-md shadow-gray-100 dark:shadow-gray-900 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg relative overflow-hidden group`}
                    >
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>

                        <div className={`flex justify-between items-start ${isMobile ? 'mb-2' : 'mb-3'} relative z-10`}>
                            <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner border border-white/10 text-white`}>
                                {card.icon}
                            </div>
                            {card.subtext && (
                                <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-semibold text-white/90 bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/10`}>
                                    {card.subtext}
                                </span>
                            )}
                        </div>

                        <div className="relative z-10">
                            <h3 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white mb-0.5 tracking-tight`}>{card.value}</h3>
                            <p className={`text-white/80 font-medium ${isMobile ? 'text-[11px]' : 'text-xs'} tracking-wide`}>{card.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    {/* Quick Actions */}
                    <div className={`bg-white dark:bg-gray-800 rounded-xl ${isMobile ? 'p-3' : 'p-4'} shadow-sm border border-gray-100 dark:border-gray-700`}>
                        <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white mb-3 px-1`}>Hızlı İşlemler</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {quickActions.map((action, idx) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => navigate({ to: action.path })}
                                        className={`flex flex-col items-center justify-center ${isMobile ? 'p-2' : 'p-3'} rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-600 group touch-feedback`}
                                    >
                                        <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded-full mb-1.5 sm:mb-2 ${action.color} dark:bg-opacity-20 group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                                        </div>
                                        <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white text-center leading-tight`}>{action.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Daily Operations */}
                    {dailyStats && (
                        <div>
                            <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white mb-3 px-1`}>Günlük Operasyon</h2>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-2.5' : 'p-3'} rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl flex-shrink-0`}>
                                            <Calendar className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 font-medium`}>Randevular</p>
                                            <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>{formatNumber(dailyStats.today_appointments || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                {(dailyStats.fitted_patients || 0) > 0 && (
                                <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-2.5' : 'p-3'} rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:border-teal-100 dark:hover:border-teal-800 transition-colors`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-2xl flex-shrink-0`}>
                                            <ShieldCheck className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 font-medium`}>Cihazlanan</p>
                                            <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>{formatNumber(dailyStats.fitted_patients || 0)}</p>
                                        </div>
                                    </div>
                                </div>
                                )}

                                <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-2.5' : 'p-3'} rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:border-orange-100 dark:hover:border-orange-800 transition-colors`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex-shrink-0`}>
                                            <FileText className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 font-medium`}>Veri Yükleme</p>
                                            <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>{formatNumber(dailyStats.daily_uploads || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                {(dailyStats.sgk_processed || 0) > 0 && (
                                <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-2.5' : 'p-3'} rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:border-cyan-100 dark:hover:border-cyan-800 transition-colors`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`${isMobile ? 'p-1.5' : 'p-2'} bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-2xl flex-shrink-0`}>
                                            <Activity className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-500 dark:text-gray-400 font-medium`}>SGK İşlem</p>
                                            <p className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>{formatNumber(dailyStats.sgk_processed || 0)}</p>
                                        </div>
                                    </div>
                                </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="space-y-4">
                    {activity && (
                        <div className={`bg-white dark:bg-gray-800 rounded-xl ${isMobile ? 'p-3' : 'p-4'} shadow-sm border border-gray-100 dark:border-gray-700 h-full`}>
                            <h2 className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white mb-3 sm:mb-4`}>Büyüme & Durum</h2>
                            <div className="space-y-3">
                                <div className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-2.5'} rounded-2xl bg-gray-50 dark:bg-gray-700/50`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-1' : 'p-1.5'} rounded-xl shadow-sm text-indigo-600 dark:text-indigo-400 flex-shrink-0`}>
                                            <UserPlus className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                        </div>
                                        <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-600 dark:text-gray-300`}>Yeni Aboneler (7g)</span>
                                    </div>
                                    <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white flex-shrink-0`}>{formatNumber(activity.new_tenants_7d || 0)}</span>
                                </div>

                                <div className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-2.5'} rounded-2xl bg-gray-50 dark:bg-gray-700/50`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-1' : 'p-1.5'} rounded-xl shadow-sm text-rose-500 dark:text-rose-400 flex-shrink-0`}>
                                            <UserMinus className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                        </div>
                                        <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-600 dark:text-gray-300`}>Bitecek Üyelikler</span>
                                    </div>
                                    <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white flex-shrink-0`}>{formatNumber(activity.expiring_memberships_30d || 0)}</span>
                                </div>

                                <div className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-2.5'} rounded-2xl bg-gray-50 dark:bg-gray-700/50`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-1' : 'p-1.5'} rounded-xl shadow-sm text-blue-500 dark:text-blue-400 flex-shrink-0`}>
                                            <Clock className={`${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-medium text-gray-600 dark:text-gray-300`}>Koltuk Doluluğu</span>
                                        </div>
                                    </div>
                                    <span className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-gray-900 dark:text-white flex-shrink-0`}>%{(health?.avg_seat_utilization_percent || 0).toFixed(1)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                                    <div
                                        className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(health?.avg_seat_utilization_percent || 0, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Section - Desktop only */}
            {!isMobile && (tenantTrend.length > 0 || revenueTrend.length > 0 || statusDistribution.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Tenant Growth Trend */}
                    {tenantTrend.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Abone Büyüme Trendi</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={tenantTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} name="Abone" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Revenue Trend */}
                    {revenueTrend.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Gelir Trendi</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={revenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Gelir']} />
                                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Gelir" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Status Distribution Pie */}
                    {statusDistribution.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Abone Durumu</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {statusDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Errors Table */}
            <PermissionGate permissions={[AdminPermissions.SYSTEM_READ, AdminPermissions.AUDIT_READ]} mode="any">
            {recentErrors && recentErrors.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden mt-6 sm:mt-8">
                    <div className={`${isMobile ? 'px-4 py-4' : 'px-6 py-5'} border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-700/50`}>
                        <div className="flex items-center gap-2">
                            <div className={`${isMobile ? 'p-1' : 'p-1.5'} bg-red-100 dark:bg-red-900/30 rounded-xl`}>
                                <XCircle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-red-600 dark:text-red-400`} />
                            </div>
                            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-gray-900 dark:text-white`}>Son Sistem Hataları</h3>
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">Son 24 Saat</span>
                    </div>
                    <DataTable<DashboardRecentError>
                        data={recentErrors}
                        columns={[
                            {
                                key: 'created_at',
                                title: 'Tarih',
                                render: (_: unknown, record: DashboardRecentError) => (
                                    <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                        {new Date(record.created_at).toLocaleString('tr-TR')}
                                    </span>
                                )
                            },
                            {
                                key: 'action',
                                title: 'Aksiyon',
                                render: (_: unknown, record: DashboardRecentError) => (
                                    <span className="px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs border border-gray-200 dark:border-gray-600 truncate block max-w-[150px]" title={record.action}>
                                        {record.action}
                                    </span>
                                )
                            },
                            {
                                key: 'details',
                                title: 'Detay',
                                render: (_: unknown, record: DashboardRecentError) => (
                                    <span className="text-sm text-red-600/80 dark:text-red-400/80 font-medium break-words">
                                        {record.details}
                                    </span>
                                )
                            },
                            {
                                key: 'user_name',
                                title: 'Kullanıcı / Sistem',
                                render: (_: unknown, record: DashboardRecentError) => (
                                    <div className="flex flex-col text-sm">
                                        <span className="font-medium text-gray-900 dark:text-white">{record.user_name || 'System'}</span>
                                        {record.tenant_name && record.tenant_name !== 'System' && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{record.tenant_name}</span>
                                        )}
                                        {record.user_email && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{record.user_email}</span>
                                        )}
                                    </div>
                                )
                            },
                        ] as Column<DashboardRecentError>[]}
                        rowKey="id"
                        emptyText="Hata bulunamadı"
                        striped
                        hoverable
                        size="medium"
                    />
                </div>
            )}
            </PermissionGate>
        </div>
    );
}

type DashboardOverview = {
    active_tenants: number;
    active_users: number;
};

type DashboardRevenue = {
    monthly_recurring_revenue: number;
};

type DashboardHealth = {
    churn_rate_percent: number;
    avg_seat_utilization_percent: number;
};

type DashboardAlerts = {
    expiring_soon: number;
    high_churn: number;
    low_utilization: number;
};

type DashboardDailyStats = {
    today_appointments: number;
    fitted_patients: number;
    daily_uploads: number;
    sgk_processed: number;
};

type DashboardRecentActivity = {
    new_tenants_7d: number;
    expiring_memberships_30d: number;
};

type DashboardRecentError = {
    id: string;
    action: string;
    details: string;
    created_at: string;
    user_id: string;
    user_name: string;
    tenant_name: string;
    user_email: string;
};

type TrendPoint = { month: string; count: number };
type RevenueTrendPoint = { month: string; revenue: number };
type StatusDistPoint = { name: string; value: number; color: string };

type DashboardMetrics = {
    overview: DashboardOverview | null;
    revenue: DashboardRevenue | null;
    health_metrics: DashboardHealth | null;
    alerts: DashboardAlerts | null;
    daily_stats: DashboardDailyStats | null;
    recent_activity: DashboardRecentActivity | null;
    recent_errors: DashboardRecentError[];
    tenant_trend: TrendPoint[];
    revenue_trend: RevenueTrendPoint[];
    status_distribution: StatusDistPoint[];
};

function getDashboardMetrics(
    dashboardData: ResponseEnvelopeAdminDashboardMetrics | undefined
): DashboardMetrics {
    // Orval mutator unwraps ResponseEnvelope, so dashboardData may be the inner payload directly
    // Try multiple access paths: unwrapped (dashboardData.metrics) or wrapped (dashboardData.data.metrics)
    const asRec = asRecord(dashboardData);
    const rawMetrics = asRecord(asRec?.metrics) || asRecord((asRec?.data as Record<string, unknown>)?.metrics);
    return {
        overview: parseOverview(rawMetrics?.overview),
        revenue: parseRevenue(rawMetrics?.revenue),
        health_metrics: parseHealth(rawMetrics?.health_metrics),
        alerts: parseAlerts(rawMetrics?.alerts),
        daily_stats: parseDailyStats(rawMetrics?.daily_stats),
        recent_activity: parseRecentActivity(rawMetrics?.recent_activity),
        recent_errors: parseRecentErrors(rawMetrics?.recent_errors),
        tenant_trend: parseTrendPoints(rawMetrics?.tenant_trend),
        revenue_trend: parseRevenueTrend(rawMetrics?.revenue_trend),
        status_distribution: parseStatusDistribution(rawMetrics?.status_distribution),
    };
}

function getErrorMessage(error: unknown): string | null {
    if (!error) {
        return null;
    }

    if (typeof error === 'object' && error !== null) {
        const maybeError = error as {
            message?: string;
            response?: {
                data?: {
                    error?: {
                        message?: string;
                    };
                };
            };
        };

        return maybeError.response?.data?.error?.message
            ?? maybeError.message
            ?? 'Sunucuyla bağlantı kurulamadı';
    }

    return 'Sunucuyla bağlantı kurulamadı';
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function getNumber(value: unknown): number {
    return typeof value === 'number' ? value : 0;
}

function getString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function parseOverview(value: unknown): DashboardOverview | null {
    const record = asRecord(value);
    return record ? {
        active_tenants: getNumber(record.active_tenants),
        active_users: getNumber(record.active_users),
    } : null;
}

function parseRevenue(value: unknown): DashboardRevenue | null {
    const record = asRecord(value);
    return record ? {
        monthly_recurring_revenue: getNumber(record.monthly_recurring_revenue),
    } : null;
}

function parseHealth(value: unknown): DashboardHealth | null {
    const record = asRecord(value);
    return record ? {
        churn_rate_percent: getNumber(record.churn_rate_percent),
        avg_seat_utilization_percent: getNumber(record.avg_seat_utilization_percent),
    } : null;
}

function parseAlerts(value: unknown): DashboardAlerts | null {
    const record = asRecord(value);
    return record ? {
        expiring_soon: getNumber(record.expiring_soon),
        high_churn: getNumber(record.high_churn),
        low_utilization: getNumber(record.low_utilization),
    } : null;
}

function parseDailyStats(value: unknown): DashboardDailyStats | null {
    const record = asRecord(value);
    return record ? {
        today_appointments: getNumber(record.today_appointments),
        fitted_patients: getNumber(record.fitted_patients),
        daily_uploads: getNumber(record.daily_uploads),
        sgk_processed: getNumber(record.sgk_processed),
    } : null;
}

function parseRecentActivity(value: unknown): DashboardRecentActivity | null {
    const record = asRecord(value);
    return record ? {
        new_tenants_7d: getNumber(record.new_tenants_7d),
        expiring_memberships_30d: getNumber(record.expiring_memberships_30d),
    } : null;
}

function parseRecentErrors(value: unknown): DashboardRecentError[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap((item) => {
        const record = asRecord(item);
        if (!record) {
            return [];
        }

        return [{
            id: getString(record.id),
            action: getString(record.action),
            details: getString(record.details),
            created_at: getString(record.created_at),
            user_id: getString(record.user_id),
            user_name: getString(record.user_name),
            tenant_name: getString(record.tenant_name),
            user_email: getString(record.user_email),
        }];
    });
}

function parseTrendPoints(value: unknown): TrendPoint[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        const record = asRecord(item);
        if (!record) return [];
        return [{ month: getString(record.month), count: getNumber(record.count) }];
    });
}

function parseRevenueTrend(value: unknown): RevenueTrendPoint[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        const record = asRecord(item);
        if (!record) return [];
        return [{ month: getString(record.month), revenue: getNumber(record.revenue) }];
    });
}

function parseStatusDistribution(value: unknown): StatusDistPoint[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        const record = asRecord(item);
        if (!record) return [];
        return [{ name: getString(record.name), value: getNumber(record.value), color: getString(record.color) }];
    });
}
