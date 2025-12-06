import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Helmet } from 'react-helmet-async';
import { useGetAdminAnalytics } from '@/lib/api-client';

const Analytics: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useGetAdminAnalytics({
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    metric: selectedMetric
  });

  const data = analyticsData?.data;

  const handleExport = () => {
    console.log('Exporting analytics data...');
    // Implement export logic here
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('tr-TR').format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Raporlar - Admin Paneli</title>
      </Helmet>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Raporlar ve Analizler</h1>
            <p className="mt-1 text-sm text-gray-500">
              SaaS platformunuz için kapsamlı analizler ve içgörüler
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
            />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
            >
              <option value="revenue">Gelir</option>
              <option value="users">Kullanıcılar</option>
              <option value="engagement">Etkileşim</option>
            </select>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
              Dışa Aktar
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Toplam Gelir</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(data?.overview?.total_revenue || 0)}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${(data?.overview?.revenue_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(data?.overview?.revenue_growth || 0) >= 0 ? (
                        <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                      ) : (
                        <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {(data?.overview?.revenue_growth || 0) >= 0 ? 'Arttı' : 'Azaldı'}
                      </span>
                      {Math.abs(data?.overview?.revenue_growth || 0)}%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Active Tenants */}
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Aktif Kiracılar</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatNumber(data?.overview?.active_tenants || 0)}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${(data?.overview?.tenants_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(data?.overview?.tenants_growth || 0) >= 0 ? (
                        <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                      ) : (
                        <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {(data?.overview?.tenants_growth || 0) >= 0 ? 'Arttı' : 'Azaldı'}
                      </span>
                      {Math.abs(data?.overview?.tenants_growth || 0)}%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Monthly Active Users */}
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Aylık Aktif Kullanıcılar</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatNumber(data?.overview?.monthly_active_users || 0)}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${(data?.overview?.mau_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(data?.overview?.mau_growth || 0) >= 0 ? (
                        <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                      ) : (
                        <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {(data?.overview?.mau_growth || 0) >= 0 ? 'Arttı' : 'Azaldı'}
                      </span>
                      {Math.abs(data?.overview?.mau_growth || 0)}%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Churn Rate */}
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingDownIcon className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Kayıp Oranı (Churn)</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {data?.overview?.churn_rate || 0}%
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${(data?.overview?.churn_growth || 0) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(data?.overview?.churn_growth || 0) <= 0 ? (
                        <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                      ) : (
                        <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {(data?.overview?.churn_growth || 0) <= 0 ? 'Azaldı' : 'Arttı'}
                      </span>
                      {Math.abs(data?.overview?.churn_growth || 0)}%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Gelir Trendi</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(data?.revenue_trend || []) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Gelir']} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0ea5e9"
                    fill="#e0f2fe"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Plan Dağılımı</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(data?.plan_distribution || []) as any[]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {data?.plan_distribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Engagement */}
          <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Kullanıcı Etkileşimi</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(data?.user_engagement || []) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="dau" stroke="#8b5cf6" name="GAK" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="wau" stroke="#10b981" name="HAK" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mau" stroke="#f59e0b" name="AAK" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Growth */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Gelir Büyümesi</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(data?.revenue_trend || []) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Büyüme']} />
                  <Bar dataKey="growth" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Domain Metrics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SGK Submissions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">SGK Başvuru Durumu</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(data?.domain_metrics?.sgk_submissions || []) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Başvuru" fill="#94a3b8" />
                  <Bar dataKey="approved" name="Onaylanan" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Fittings Trend */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Cihaz Uygulama Trendi</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(data?.domain_metrics?.device_fittings || []) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" name="Uygulama" stroke="#f59e0b" fill="#fcd34d" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Randevu Dönüşüm Oranı</p>
              <p className="text-2xl font-bold text-gray-900">%{data?.domain_metrics?.appointment_conversion}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <ArrowTrendingUpIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ort. Uygulama Süresi</p>
              <p className="text-2xl font-bold text-gray-900">{data?.domain_metrics?.avg_fitting_time} dk</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <UsersIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Toplam Cihazlanan Hasta</p>
              <p className="text-2xl font-bold text-gray-900">{data?.domain_metrics?.total_patients_fitted}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
              <UsersIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Top Tenants Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">En İyi Performans Gösteren Kiracılar</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kiracı
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gelir
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Büyüme
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcılar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.top_tenants?.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(tenant.revenue || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`flex items-center ${(tenant.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(tenant.growth || 0) >= 0 ? (
                          <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                        )}
                        {Math.abs(tenant.growth || 0)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(tenant.users || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default Analytics;