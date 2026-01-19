import { useState, useEffect } from 'react';
import { useListDashboard } from '@/api/client/dashboard.client';

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
interface ActivityItem {
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

// Type for API response payload
interface DashboardPayload {
  data?: {
    kpis?: Record<string, number>;
    recentActivity?: ActivityItem[];
    activity?: ActivityItem[];
  } & Record<string, unknown>;
  kpis?: Record<string, number>;
  recentActivity?: ActivityItem[];
  activity?: ActivityItem[];
  [key: string]: unknown;
}

export const useDashboardData = (): DashboardData => {
  const [data, setData] = useState<DashboardData>({
    stats: {
      totalParties: 0,
      todayAppointments: 0,
      monthlyRevenue: 0,
      activeTrials: 0,
      activeParties: 0,
      dailyRevenue: 0,
      pendingAppointments: 0,
      endingTrials: 0,
    },
    loading: true,
    error: null,
  });

  const query = useListDashboard();

  useEffect(() => {
    // Map query result into local shape and handle missing fields gracefully
    if (query.isLoading) return;
    if (query.isError) {
      const errorMessage = query.error instanceof Error ? query.error.message : 'Veri yüklenirken hata oluştu';
      setData(prev => ({ ...prev, loading: false, error: errorMessage }));
      return;
    }

    // Response structure: { totalParties, totalDevices, ... }
    const responseBody = (query.data || {}) as DashboardPayload;
    // Check if the body has a 'data' property (our API envelope), otherwise use body directly
    const payload = responseBody?.data || responseBody || {};
    const kpis = payload?.kpis || payload || {};

    const mappedStats: DashboardStats = {
      totalParties: Number(kpis.totalParties || kpis.totalPartiesCount || 0),
      todayAppointments: Number(kpis.todayAppointments || kpis.todaysAppointments || 0),
      monthlyRevenue: Number(kpis.estimatedRevenue || kpis.monthlyRevenue || 0),
      activeTrials: Number(kpis.activeTrials || 0),
      activeParties: Number(kpis.activeParties || kpis.totalParties || 0),
      dailyRevenue: Number(kpis.dailyRevenue || 0),
      pendingAppointments: Number(kpis.pendingAppointments || 0),
      endingTrials: Number(kpis.endingTrials || 0),
    };

    const recentActivity = payload?.recentActivity || payload?.activity || [];

    setData({ stats: mappedStats, recentActivity, loading: false, error: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isLoading, query.isError, query.data]); // query.error is only used when isError is true

  return data;
};