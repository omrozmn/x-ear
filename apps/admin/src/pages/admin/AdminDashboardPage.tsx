import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useGetAdminDashboard } from '@/lib/api-client';
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
    Plus,
    Settings,
    Headphones,
    RefreshCw
} from 'lucide-react';

export default function AdminDashboardPage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate({ to: '/login' });
        }
    }, [authLoading, isAuthenticated, navigate]);

    const { data: dashboardData, isLoading: metricsLoading, error: metricsError, refetch } = useGetAdminDashboard({
        query: {
            retry: 1,
            refetchOnWindowFocus: false,
        }
    });

    const metrics = (dashboardData as any)?.data?.metrics || (dashboardData as any)?.metrics;
    const loading = metricsLoading;
    const errorMessage = metricsError ? (metricsError as any).response?.data?.error?.message || (metricsError as any).message || 'Sunucuyla bağlantı kurulamadı' : null;

    const alerts = metrics?.alerts;
    const overview = metrics?.overview;
    const revenue = metrics?.revenue;
    const health = metrics?.health_metrics;
    const activity = metrics?.recent_activity;
    const dailyStats = metrics?.daily_stats;
    const recentErrors = metrics?.recent_errors;

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12 pt-6">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Hoşgeldiniz, {user?.first_name ? `${user.first_name}` : 'Admin'} 👋
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">
                        Platform durumuna genel bakış ve yönetim paneli.
                    </p>
                </div>
                <button
                    onClick={loadDashboardData}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Yenile"
                >
                    <RefreshCw className={`w-5 h-5 ${metricsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Error State */}
            {errorMessage && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-red-900">Veri Yükleme Hatası</h3>
                            <p className="text-red-700 mt-1">{errorMessage}</p>
                            <p className="text-red-500 text-sm mt-2">Arka plan servislerinin çalıştığından emin olun (Port 5003).</p>
                            <button
                                onClick={loadDashboardData}
                                className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm"
                            >
                                Tekrar Dene
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts Section - Only show if critical */}
            {alerts && ((alerts.expiring_soon || 0) > 0 || (alerts.high_churn || 0) > 0 || (alerts.low_utilization || 0) > 0) && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-4 flex gap-3 items-center shadow-sm">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div className="text-sm font-medium text-amber-900 flex gap-4">
                        {(alerts.expiring_soon || 0) > 0 && <span>• {alerts.expiring_soon} üyelik yakında bitiyor</span>}
                        {(alerts.high_churn || 0) > 0 && <span>• Yüksek churn riski</span>}
                    </div>
                </div>
            )}

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`${card.color} rounded-2xl p-6 shadow-lg shadow-gray-100 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl relative overflow-hidden group`}
                    >
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner border border-white/10 text-white">
                                {card.icon}
                            </div>
                            {card.subtext && (
                                <span className="text-xs font-semibold text-white/90 bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10">
                                    {card.subtext}
                                </span>
                            )}
                        </div>

                        <div className="relative z-10">
                            <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{card.value}</h3>
                            <p className="text-white/80 font-medium text-sm tracking-wide bg-white/5 inline-block px-2 py-0.5 rounded-md">{card.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area (2/3) - Daily Operations & Growth */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Hızlı İşlemler</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {quickActions.map((action, idx) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => navigate({ to: action.path })}
                                        className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group"
                                    >
                                        <div className={`p-3 rounded-full mb-3 ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{action.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Daily Operations */}
                    {dailyStats && (
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-4 px-1">Günlük Operasyon</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-indigo-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Randevular</p>
                                            <p className="text-xl font-bold text-gray-900">{formatNumber(dailyStats.today_appointments || 0)}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">Bugün</div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-teal-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-teal-100 text-teal-600 rounded-xl">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Cihazlanan Hasta</p>
                                            <p className="text-xl font-bold text-gray-900">{formatNumber(dailyStats.fitted_patients || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-orange-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">Veri Yükleme</p>
                                            <p className="text-xl font-bold text-gray-900">{formatNumber(dailyStats.daily_uploads || 0)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-cyan-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-cyan-100 text-cyan-600 rounded-xl">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 font-medium">SGK İşlem</p>
                                            <p className="text-xl font-bold text-gray-900">{formatNumber(dailyStats.sgk_processed || 0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Column (1/3) - Growth & Status aka Secondary Metrics */}
                <div className="space-y-6">
                    {activity && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                            <h2 className="text-lg font-bold text-gray-900 mb-6">Büyüme & Durum</h2>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm text-indigo-600">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Yeni Aboneler (7 gün)</span>
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">{formatNumber(activity.new_tenants_7d || 0)}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm text-rose-500">
                                            <UserMinus className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-600">Bitecek Üyelikler</span>
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">{formatNumber(activity.expiring_memberships_30d || 0)}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-600">Koltuk Doluluğu</span>
                                        </div>
                                    </div>
                                    <span className="text-lg font-bold text-gray-900">%{(health?.avg_seat_utilization_percent || 0).toFixed(1)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(health?.avg_seat_utilization_percent || 0, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Errors Table - Cleaner Look */}
            {recentErrors && recentErrors.length > 0 && (
                <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden mt-8">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-red-100 rounded-md">
                                <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Son Sistem Hataları</h3>
                        </div>
                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">Son 24 Saat</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 table-fixed">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Tarih</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Aksiyon</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Detay</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kullanıcı / Sistem</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {(recentErrors as any[]).map((error) => (
                                    <tr key={error.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {new Date(error.created_at).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs border border-gray-200 truncate block max-w-[150px]" title={error.action}>
                                                {error.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-red-600/80 font-medium break-words">
                                            {error.details}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{error.user_name || 'System'}</span>
                                                {error.tenant_name && error.tenant_name !== 'System' && (
                                                    <span className="text-xs text-gray-400">{error.tenant_name}</span>
                                                )}
                                                {error.user_email && (
                                                    <span className="text-xs text-gray-400">{error.user_email}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
