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
import {
  useGetAdminAnalytics,
  type AdminAnalyticsData,
  type AdminAnalyticsDataDomainMetrics,
  type ResponseEnvelopeAdminAnalyticsData,
} from '@/lib/api-client';
import { useAdminResponsive } from '@/hooks';
import { unwrapData } from '@/lib/orval-response';

interface DomainMetricPoint {
  month: string;
  count: number;
  approved?: number;
}

type PieChartDatum = {
  name: string;
  value: number;
  color: string;
};

interface DomainMetricsView {
  sgkSubmissions: DomainMetricPoint[];
  deviceFittings: DomainMetricPoint[];
  appointmentConversion: number;
  avgFittingTime: number;
  totalPatientsFitted: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Bir hata oluştu';
}

function getMetricPoints(value: unknown): DomainMetricPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      month: typeof item.month === 'string' ? item.month : '',
      count: typeof item.count === 'number' ? item.count : 0,
      approved: typeof item.approved === 'number' ? item.approved : undefined,
    }))
    .filter((item) => item.month !== '');
}

function getDomainMetrics(value: AdminAnalyticsDataDomainMetrics | undefined): DomainMetricsView {
  const source = isRecord(value) ? value : null;

  return {
    sgkSubmissions: getMetricPoints(source?.sgkSubmissions),
    deviceFittings: getMetricPoints(source?.deviceFittings),
    appointmentConversion: typeof source?.appointmentConversion === 'number' ? source.appointmentConversion : 0,
    avgFittingTime: typeof source?.avgFittingTime === 'number' ? source.avgFittingTime : 0,
    totalPatientsFitted: typeof source?.totalPatientsFitted === 'number' ? source.totalPatientsFitted : 0,
  };
}

function getAnalyticsData(data: ResponseEnvelopeAdminAnalyticsData | undefined): AdminAnalyticsData | null {
  return unwrapData<AdminAnalyticsData>(data) ?? null;
}

const Analytics: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Fetch analytics data
  const { data: analyticsResponse, isLoading, error } = useGetAdminAnalytics();
  const data = getAnalyticsData(analyticsResponse);
  const domainMetrics = getDomainMetrics(data?.domainMetrics);
  const planDistributionData: PieChartDatum[] = (data?.planDistribution ?? []).map((item) => ({
    name: item.name,
    value: item.value,
    color: item.color,
  }));

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

  if (error) {
    return (
        <div className="p-6 text-center text-red-600 bg-red-50 m-4 rounded-2xl border border-red-200">
        <h3 className="font-bold text-lg">Veriler Yüklenemedi</h3>
        <p className="mt-2">{getErrorMessage(error)}</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Raporlar - Admin Paneli</title>
      </Helmet>

      {/* Debug Bar: Veri durumunu kontrol etmek için */}
      <div className="bg-yellow-50 p-1 text-[10px] text-gray-400 text-center border-b border-yellow-100 font-mono">
        DEBUG: Trend={data?.revenueTrend.length} | Plans={data?.planDistribution.length} | Engagement={data?.userEngagement.length} | Rev={data?.overview.totalRevenue}
      </div>

      <div className={isMobile ? 'p-4 pb-safe max-w-7xl mx-auto space-y-6' : 'p-6 max-w-7xl mx-auto space-y-6'}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              Raporlar ve Analizler
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              SaaS platformunuz için kapsamlı analizler ve içgörüler
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
            />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="block rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
            >
              <option value="revenue">Gelir</option>
              <option value="users">Kullanıcılar</option>
              <option value="engagement">Etkileşim</option>
            </select>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-feedback"
            >
              <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
              {!isMobile && 'Dışa Aktar'}
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {/* Total Revenue */}
          <div className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl ${isMobile ? 'p-3' : 'p-5'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-gray-400 dark:text-gray-500`} />
              </div>
              <div className={`${isMobile ? 'ml-2' : 'ml-5'} w-0 flex-1`}>
                <dl>
                  <dt className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 truncate`}>Toplam Gelir</dt>
                  <dd className="flex items-baseline">
                    <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-semibold text-gray-900 dark:text-white`}>
                      {formatCurrency(data?.overview.totalRevenue || 0)}
                    </div>
                    {!isMobile && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${(data?.overview.revenueGrowth || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {(data?.overview.revenueGrowth || 0) >= 0 ? (
                          <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                        ) : (
                          <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {(data?.overview.revenueGrowth || 0) >= 0 ? 'Arttı' : 'Azaldı'}
                        </span>
                        {Math.abs(data?.overview.revenueGrowth || 0)}%
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Active Tenants */}
          <div className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl ${isMobile ? 'p-3' : 'p-5'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-gray-400 dark:text-gray-500`} />
              </div>
              <div className={`${isMobile ? 'ml-2' : 'ml-5'} w-0 flex-1`}>
                <dl>
                  <dt className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 truncate`}>Aktif Aboneler</dt>
                  <dd className="flex items-baseline">
                    <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-semibold text-gray-900 dark:text-white`}>
                      {formatNumber(data?.overview.activeTenants || 0)}
                    </div>
                    {!isMobile && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${(data?.overview.tenantsGrowth || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {(data?.overview.tenantsGrowth || 0) >= 0 ? (
                          <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                        ) : (
                          <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {(data?.overview.tenantsGrowth || 0) >= 0 ? 'Arttı' : 'Azaldı'}
                        </span>
                        {Math.abs(data?.overview.tenantsGrowth || 0)}%
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Monthly Active Users */}
          <div className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl ${isMobile ? 'p-3' : 'p-5'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-purple-400`} />
              </div>
              <div className={`${isMobile ? 'ml-2' : 'ml-5'} w-0 flex-1`}>
                <dl>
                  <dt className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 truncate`}>{isMobile ? 'AAK' : 'Aylık Aktif Kullanıcılar'}</dt>
                  <dd className="flex items-baseline">
                    <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-semibold text-gray-900 dark:text-white`}>
                      {formatNumber(data?.overview.monthlyActiveUsers || 0)}
                    </div>
                    {!isMobile && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${(data?.overview.mauGrowth || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {(data?.overview.mauGrowth || 0) >= 0 ? (
                          <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                        ) : (
                          <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {(data?.overview.mauGrowth || 0) >= 0 ? 'Arttı' : 'Azaldı'}
                        </span>
                        {Math.abs(data?.overview.mauGrowth || 0)}%
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Churn Rate */}
          <div className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-2xl ${isMobile ? 'p-3' : 'p-5'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingDownIcon className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-red-400`} />
              </div>
              <div className={`${isMobile ? 'ml-2' : 'ml-5'} w-0 flex-1`}>
                <dl>
                  <dt className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 truncate`}>{isMobile ? 'Kayıp' : 'Kayıp Oranı (Churn)'}</dt>
                  <dd className="flex items-baseline">
                    <div className={`${isMobile ? 'text-base' : 'text-2xl'} font-semibold text-gray-900 dark:text-white`}>
                      {data?.overview.churnRate || 0}%
                    </div>
                    {!isMobile && (
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${(data?.overview.churnGrowth || 0) <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {(data?.overview.churnGrowth || 0) <= 0 ? (
                          <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" aria-hidden="true" />
                        ) : (
                          <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {(data?.overview.churnGrowth || 0) <= 0 ? 'Azaldı' : 'Arttı'}
                        </span>
                        {Math.abs(data?.overview.churnGrowth || 0)}%
                      </div>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 - Hide on mobile */}
        {!isMobile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Gelir Trendi</h3>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data?.revenueTrend || []}>
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
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Plan Dağılımı</h3>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={planDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {planDistributionData.map((entry, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row 2 - Hide on mobile */}
        {!isMobile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Engagement */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Kullanıcı Etkileşimi</h3>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={data?.userEngagement || []}>
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
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Gelir Büyümesi</h3>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data?.revenueTrend || []}>
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
        )}

        {/* Domain Metrics Row - Hide on mobile */}
        {!isMobile && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SGK Submissions */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">SGK Başvuru Durumu</h3>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={domainMetrics.sgkSubmissions}>
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
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Cihaz Uygulama Trendi</h3>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={domainMetrics.deviceFittings}>
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
        )}

        {/* KPI Cards */}
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-6'}`}>
          <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-3' : 'p-6'} rounded-2xl shadow flex items-center justify-between`}>
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400`}>Randevu Dönüşüm</p>
              <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>%{domainMetrics.appointmentConversion}</p>
            </div>
            <div className={`${isMobile ? 'p-2' : 'p-3'} bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400`}>
              <ArrowTrendingUpIcon className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
            </div>
          </div>
          <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-3' : 'p-6'} rounded-2xl shadow flex items-center justify-between`}>
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400`}>Ort. Uygulama</p>
              <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>{domainMetrics.avgFittingTime} dk</p>
            </div>
            <div className={`${isMobile ? 'p-2' : 'p-3'} bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400`}>
              <UsersIcon className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
            </div>
          </div>
          <div className={`bg-white dark:bg-gray-800 ${isMobile ? 'p-3 col-span-2' : 'p-6'} rounded-2xl shadow flex items-center justify-between`}>
            <div>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400`}>Toplam Cihazlanan</p>
              <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>{domainMetrics.totalPatientsFitted}</p>
            </div>
            <div className={`${isMobile ? 'p-2' : 'p-3'} bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400`}>
              <UsersIcon className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'}`} />
            </div>
          </div>
        </div>

        {/* Top Tenants Table - Hide on mobile */}
        {!isMobile && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">En İyi Performans Gösteren Aboneler</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Abone
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gelir
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Büyüme
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Kullanıcılar
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data?.topTenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {tenant.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(tenant.revenue || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={`flex items-center ${(tenant.growth || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {(tenant.growth || 0) >= 0 ? (
                            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                          )}
                          {Math.abs(tenant.growth || 0)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatNumber(tenant.users || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Analytics;
