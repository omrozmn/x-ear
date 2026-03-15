import { useEffect, useMemo } from 'react';
import { useListDashboard } from '@/api/client/dashboard.client';
import type { DashboardData as DashboardApiData, DashboardDataRecentActivityItem } from '@/api/generated/schemas';

interface DashboardStats {
  totalParties: number;
  todayAppointments: number;
  monthlyRevenue: number;
  activeTrials: number;
  activeParties: number;
  dailyRevenue: number;
  pendingAppointments: number;
  endingTrials: number;
}

interface LastTransaction {
  amount: string;
  date: string;
}

interface LastCalculation {
  amount: string;
  date: string;
}

// Activity item structure from API
interface ActivityItem extends DashboardDataRecentActivityItem {
  id?: string;
  type?: string;
  message?: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface DashboardData {
  stats: DashboardStats;
  lastTransaction?: LastTransaction;
  lastCalculation?: LastCalculation;
  recentActivity?: ActivityItem[];
  loading: boolean;
  error: string | null;
}

export const useDashboardData = (): DashboardData => {
  const query = useListDashboard();
  const { refetch } = query;

  useEffect(() => {
    const handleRefresh = () => {
      void refetch();
    };

    window.addEventListener('dashboard:refresh', handleRefresh);
    return () => window.removeEventListener('dashboard:refresh', handleRefresh);
  }, [refetch]);

  return useMemo(() => {
    const payload = (query.data?.data ?? null) as DashboardApiData | null;
    const kpis = payload?.kpis;

    const stats: DashboardStats = {
      totalParties: Number(kpis?.totalPatients ?? 0),
      todayAppointments: Number(kpis?.todayAppointments ?? kpis?.todaysAppointments ?? 0),
      monthlyRevenue: Number(kpis?.monthlyRevenue ?? kpis?.estimatedRevenue ?? 0),
      activeTrials: Number(kpis?.activeTrials ?? 0),
      activeParties: Number(kpis?.activePatients ?? kpis?.totalPatients ?? 0),
      dailyRevenue: Number(kpis?.dailyRevenue ?? 0),
      pendingAppointments: Number(kpis?.pendingAppointments ?? 0),
      endingTrials: Number(kpis?.endingTrials ?? 0),
    };

    return {
      stats,
      recentActivity: (payload?.recentActivity ?? []) as ActivityItem[],
      loading: query.isLoading,
      error: query.isError
        ? (query.error instanceof Error ? query.error.message : 'Veri yüklenirken hata oluştu')
        : null,
    };
  }, [query.data, query.error, query.isError, query.isLoading]);
};
