import React, { useState, useEffect } from 'react';
import {listInventoryStats} from '@/api/client/inventory.client';

interface InventoryStatsProps {
  className?: string;
}

interface InventoryStats {
  total: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
  byCategory?: Record<string, number>;
  byStatus?: Record<string, number>;
  hearingAid?: {
    count: number;
    stock: number;
  };
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const response = await listInventoryStats() as any;
        const data = response?.data || response || {};

        const calculatedStats: InventoryStats = {
          // Use DB-level totals returned by the stats endpoint (avoids pagination limits)
          total: data.dbTotalItems ?? data.totalItems ?? 0,
          totalValue: parseFloat(data.totalValue ?? 0),
          lowStock: data.lowStockCount ?? 0,
          outOfStock: data.outOfStockCount ?? 0,
          byCategory: data.categoryBreakdown ? Object.keys(data.categoryBreakdown).reduce((acc: any, k: string) => {
            acc[k] = data.categoryBreakdown[k].count ?? 0; return acc;
          }, {}) : {},
          byStatus: {},
          // totalStock provided by backend (sum of available_inventory)
          // default to 0 when missing
          ...(data.totalStock !== undefined ? { totalStock: parseInt(data.totalStock, 10) || 0 } : {})
        };

        // Attach hearing-aid info if available
        if (data.hearingAid) {
          (calculatedStats as any).hearingAid = {
            count: data.hearingAid.count || 0,
            stock: data.hearingAid.stock || 0
          };
        }

        setStats(calculatedStats);
        setError(null);
      } catch (err) {
        console.error('Failed to load stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">İstatistikler yüklenirken hata</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      name: 'Toplam Ürün',
      value: stats.total.toLocaleString(),
      subtitle: (stats as any).totalStock !== undefined ? `Stok: ${(stats as any).totalStock.toLocaleString()}` : undefined,
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      name: 'Toplam Değer',
      value: formatCurrency(stats.totalValue),
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      name: 'Düşük Stok',
      value: stats.lowStock.toLocaleString(),
      icon: (
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
    },
    {
      name: 'Tükenen Ürünler',
      value: stats.outOfStock.toLocaleString(),
      icon: (
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
      ),
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
  ];

  // If backend provided hearing-aid KPIs, add a dedicated card
  const hearingAidInfo = (stats as any).hearingAid;
  if (hearingAidInfo) {
    statCards.splice(1, 0, {
      name: 'Toplam İşitme Cihazı',
      value: (hearingAidInfo.count || 0).toLocaleString(),
      subtitle: `Stok: ${hearingAidInfo.stock || 0}`,
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    });
  }


  return (
    <div className={className}>
      {/* Use a single-row flex layout so KPIs stay on one line and shrink on small screens */}
      <div className="flex gap-4 items-stretch w-full flex-nowrap">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-slate-800 overflow-hidden shadow rounded-lg flex-1 min-w-0">
            <div className="p-4 sm:p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.bgColor} p-2 rounded-md`}>{stat.icon}</div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{stat.name}</dt>
                    <dd
                      className={`font-medium ${stat.color} text-lg sm:text-2xl md:text-3xl leading-tight`}
                      style={{
                        // Force single-line and allow the font to scale down more aggressively
                        // so large currency values fit without wrapping.
                        fontSize: 'clamp(0.75rem, 1.8vw, 1.6rem)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                      }}
                    >
                      {stat.value}
                    </dd>
                    {stat.subtitle && (
                      <dd className="text-sm text-gray-500 mt-1" style={{ overflowWrap: 'anywhere', whiteSpace: 'normal' }}>
                        {stat.subtitle}
                      </dd>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};