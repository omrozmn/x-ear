import { useState, useEffect } from 'react';
import { useGetDashboardApiDashboardGet } from '@/api/generated';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  monthlyRevenue: number;
  activeTrials: number;
  activePatients: number;
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

interface DashboardData {
  stats: DashboardStats;
  lastTransaction?: LastTransaction;
  lastCalculation?: LastCalculation;
  recentActivity?: any[];
  loading: boolean;
  error: string | null;
}

export const useDashboardData = (): DashboardData => {
  const [data, setData] = useState<DashboardData>({
    stats: {
      totalPatients: 0,
      todayAppointments: 0,
      monthlyRevenue: 0,
      activeTrials: 0,
      activePatients: 0,
      dailyRevenue: 0,
      pendingAppointments: 0,
      endingTrials: 0,
    },
    loading: true,
    error: null,
  });

  const query = useGetDashboardApiDashboardGet();

  useEffect(() => {
    // Map query result into local shape and handle missing fields gracefully
    if (query.isLoading) return;
    if (query.isError) {
      setData(prev => ({ ...prev, loading: false, error: (query.error as any)?.message || 'Veri yüklenirken hata oluştu' }));
      return;
    }

    // Response structure: { totalPatients, totalDevices, ... }
    const responseBody = query.data || {};
    // Check if the body has a 'data' property (our API envelope), otherwise use body directly
    const payload = (responseBody as any)?.data || responseBody || {};
    const kpis = (payload as any)?.kpis || payload || {};

    const mappedStats: DashboardStats = {
      totalPatients: Number(kpis.totalPatients || kpis.totalPatientsCount || 0),
      todayAppointments: Number(kpis.todayAppointments || kpis.todaysAppointments || 0),
      monthlyRevenue: Number(kpis.estimatedRevenue || kpis.monthlyRevenue || kpis.estimatedRevenue || 0),
      activeTrials: Number(kpis.activeTrials || 0),
      activePatients: Number(kpis.activePatients || kpis.totalPatients || 0),
      dailyRevenue: Number(kpis.dailyRevenue || 0),
      pendingAppointments: Number(kpis.pendingAppointments || 0),
      endingTrials: Number(kpis.endingTrials || 0),
    };

    const recentActivity = (payload as any)?.recentActivity || (payload as any)?.activity || [];

    setData({ stats: mappedStats, recentActivity, loading: false, error: null });
  }, [query.isLoading, query.isError, query.data]);

  return data;
};