import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { useGetAdminDashboardMetrics } from '@/lib/api-client';

const Dashboard = () => {
  const { user } = useAuth();

  // Use Orval hook
  const { data: dashboardData, isLoading, error } = useGetAdminDashboardMetrics();
  const metrics = dashboardData?.data?.metrics;

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
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.first_name || user?.email}
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your admin panel today.
          </p>
        </div>

        {/* Error State */}
        {error && (
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
                  <p className="text-sm text-red-700 mt-1">{(error as any).response?.data?.error?.message || 'Failed to load dashboard data'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {metrics && metrics.alerts && (
          (metrics.alerts.expiring_soon || 0) > 0 ||
          (metrics.alerts.high_churn || 0) > 0 ||
          (metrics.alerts.low_utilization || 0) > 0
        ) && (
            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Attention Required</h3>
                    <div className="text-sm text-yellow-700 mt-1">
                      {(metrics.alerts.expiring_soon || 0) > 0 && (
                        <p>{metrics.alerts.expiring_soon} memberships expiring soon</p>
                      )}
                      {(metrics.alerts.high_churn || 0) > 0 && (
                        <p>High churn rate detected</p>
                      )}
                      {(metrics.alerts.low_utilization || 0) > 0 && (
                        <p>{metrics.alerts.low_utilization} tenants with low seat utilization</p>
                      )}
                    </div>
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
                        Aktif Kiracılar
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {isLoading ? '-' : formatNumber(metrics?.overview?.active_tenants)}
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
                        Aktif Kullanıcılar
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {isLoading ? '-' : formatNumber(metrics?.overview?.active_users)}
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
                        Aylık Gelir
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {isLoading ? '-' : formatCurrency(metrics?.revenue?.monthly_recurring_revenue)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          New Tenants (7d)
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {formatNumber(metrics.recent_activity?.new_tenants_7d)}
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
                          {metrics.health_metrics?.churn_rate_percent?.toFixed(1)}%
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
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Seat Utilization
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {metrics.health_metrics?.avg_seat_utilization_percent?.toFixed(1)}%
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
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Expiring Soon
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {formatNumber(metrics.recent_activity?.expiring_memberships_30d)}
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
                    You are successfully logged in as <strong>{user?.role}</strong>.
                    This is the admin panel for managing X-Ear CRM tenants, users, billing, and support operations.
                  </p>

                  {user?.tenant_id && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <p className="text-blue-800">
                        <strong>Tenant Context:</strong> You are currently managing tenant ID: {user.tenant_id}
                      </p>
                    </div>
                  )}

                  {user?.role === 'SUPER_ADMIN' && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-md">
                      <p className="text-purple-800">
                        <strong>Super Admin:</strong> You have access to all tenants and system-wide operations.
                      </p>
                    </div>
                  )}

                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-2">Available Features:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Tenant Management</li>
                      <li>User Management</li>
                      <li>Billing & Invoicing</li>
                      <li>Support Tickets</li>
                      <li>Analytics & Reporting</li>
                      <li>Audit Logging</li>
                      {user?.role === 'SUPER_ADMIN' && <li>Impersonation</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="card-body">
              <div className="text-center py-6 text-gray-500">
                <p>Activity data will be loaded here</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">System Status</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Status</span>
                  <span className="badge-success">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="badge-success">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <span className="text-sm text-gray-900">2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;