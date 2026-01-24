import React from 'react';
import { AxiosError } from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGetAdminAnalytics,

} from '@/lib/api-client';

const Dashboard = () => {
  const { user } = useAuth();

  // Use new Analytics hook
  const { data: analyticsData, isLoading, error } = useGetAdminAnalytics();
  const data = (analyticsData as any)?.data;
  const overview = data?.overview;

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '-';
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '-';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  return (
    <>
      {(
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {String(user?.first_name || user?.email || '')}
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your admin panel today.
            </p>
          </div>

          {/* Error State */}
          {!!error && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                    <p className="text-sm text-red-700 mt-1">{(error as AxiosError<any>)?.response?.data?.error?.message || 'Failed to load dashboard data'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Stats cards */}
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Aktif Aboneler
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {isLoading ? '-' : formatNumber(overview?.active_tenants)}
                        </dd>
                        <dd className="text-xs text-green-600 mt-1">
                          +{overview?.tenants_growth}% geçen aya göre
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Aylık Aktif Kullanıcı
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {isLoading ? '-' : formatNumber(overview?.monthly_active_users)}
                        </dd>
                        <dd className="text-xs text-green-600 mt-1">
                          +{overview?.mau_growth}% geçen aya göre
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Toplam Ciro
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {isLoading ? '-' : formatCurrency(overview?.total_revenue)}
                        </dd>
                        <dd className="text-xs text-green-600 mt-1">
                          +{overview?.revenue_growth}% geçen aya göre
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            {overview && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card">
                  <div className="card-body">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Churn Rate
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {overview.churn_rate?.toFixed(1)}%
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome message */}
            <div className="mt-8">
              <div className="card">
                <div className="card-body">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Welcome to X-Ear Admin Panel
                  </h3>
                  <div className="prose text-gray-600">
                    <p>
                      You are successfully logged in as <strong>{String(user?.role || '')}</strong>.
                      This is the admin panel for managing X-Ear CRM tenants, users, billing, and support operations.
                    </p>

                    {user?.tenant_id && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-md">
                        <p className="text-blue-800">
                          <strong>Tenant Context:</strong> You are currently managing tenant ID: {String(user.tenant_id)}
                        </p>
                      </div>
                    )}

                    {String(user?.role) === 'SUPER_ADMIN' && (
                      <div className="mt-4 p-4 bg-purple-50 rounded-md">
                        <p className="text-purple-800">
                          <strong>Super Admin:</strong> You have access to all tenants and system-wide operations.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Top Tenants</h3>
              </div>
              <div className="card-body">
                {data?.top_tenants?.length ? (
                  <ul className="divide-y divide-gray-200">
                    {data.top_tenants.map((tenant: any) => (
                      <li key={tenant.id} className="py-4 flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                          <p className="text-xs text-gray-500">{tenant.users} Users</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(tenant.revenue)}</p>
                          <p className="text-xs text-green-600">+{tenant.growth}%</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>No data available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
              </div>
              <div className="card-body">
                {data?.revenue_trend?.length ? (
                  <div className="space-y-4">
                    {data.revenue_trend.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center">
                        <span className="w-12 text-sm text-gray-500">{item.month}</span>
                        <div className="flex-1 mx-4 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${Math.min((item.revenue || 0) / 50000 * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>No data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;