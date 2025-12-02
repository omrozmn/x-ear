import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useGetAdminDashboardMetrics } from '@/lib/api-client';
import { DashboardMetrics } from '@/types';
import {
    Users,
    CreditCard,
    TrendingUp,
    AlertTriangle,
    Activity,
    UserPlus,
    UserMinus,
    Clock
} from 'lucide-react';

export default function AdminDashboardPage() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate({ to: '/login' });
        }
    }, [authLoading, isAuthenticated, navigate]);

    const { data: dashboardData, isLoading: metricsLoading, error: metricsError, refetch } = useGetAdminDashboardMetrics();

    const metrics = dashboardData?.data?.metrics;
    const loading = metricsLoading;
    const error = metricsError ? (metricsError as any).response?.data?.error?.message || 'Failed to load dashboard data' : null;

    const alerts = metrics?.alerts;
    const overview = metrics?.overview;
    const revenue = metrics?.revenue;
    const health = metrics?.health_metrics;
    const activity = metrics?.recent_activity;

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

    if (authLoading || (loading && !metrics && !error)) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Welcome section */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Hoşgeldiniz, {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : (user?.email || 'Admin')}
                </h1>
                <p className="text-gray-600">
                    Admin panelinize genel bakış.
                </p>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Veriler yüklenirken hata oluştu</h3>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                            <button
                                onClick={loadDashboardData}
                                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
                            >
                                Tekrar Dene
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts */}
            {alerts && ((alerts.expiring_soon || 0) > 0 || (alerts.high_churn || 0) > 0 || (alerts.low_utilization || 0) > 0) ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">Dikkat Gerektiren Durumlar</h3>
                            <div className="text-sm text-yellow-700 mt-1">
                                {(alerts.expiring_soon || 0) > 0 && (
                                    <p>{alerts.expiring_soon} üyelik yakında sona eriyor</p>
                                )}
                                {(alerts.high_churn || 0) > 0 && (
                                    <p>Yüksek churn oranı tespit edildi</p>
                                )}
                                {(alerts.low_utilization || 0) > 0 && (
                                    <p>{alerts.low_utilization} kiracıda düşük kullanım oranı</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Active Tenants */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Aktif Kiracılar</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {overview ? formatNumber(overview.active_tenants || 0) : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Active Users */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Aktif Kullanıcılar</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {overview ? formatNumber(overview.active_users || 0) : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* MRR */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Aylık Gelir (MRR)</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {revenue ? formatCurrency(revenue.monthly_recurring_revenue || 0) : '-'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Churn Rate */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 text-red-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-500">Churn Oranı</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {health ? `%${(health.churn_rate_percent || 0).toFixed(1)}` : '-'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Metrics */}
            {activity && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <UserPlus className="h-5 w-5 text-purple-500 mr-3" />
                            <div>
                                <p className="text-sm text-gray-500">Yeni Kiracılar (7 gün)</p>
                                <p className="text-lg font-semibold">{formatNumber(activity.new_tenants_7d || 0)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <UserMinus className="h-5 w-5 text-orange-500 mr-3" />
                            <div>
                                <p className="text-sm text-gray-500">Sona Erecek (30 gün)</p>
                                <p className="text-lg font-semibold">{formatNumber(activity.expiring_memberships_30d || 0)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center">
                            <Clock className="h-5 w-5 text-blue-500 mr-3" />
                            <div>
                                <p className="text-sm text-gray-500">Koltuk Doluluk</p>
                                <p className="text-lg font-semibold">%{(health?.avg_seat_utilization_percent || 0).toFixed(1)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
