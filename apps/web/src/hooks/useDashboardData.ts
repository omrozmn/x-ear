import { useState, useEffect } from 'react';
import { getEnvVar } from '../utils/env';

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

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const API_BASE = getEnvVar('REACT_APP_API_URL') || getEnvVar('VITE_API_URL') || 'http://localhost:5003/api';

        const resp = await fetch(`${API_BASE}/dashboard`);
        if (!resp.ok) throw new Error(`API error: ${resp.status} ${resp.statusText}`);
        const json: any = await resp.json();

        const kpis = json?.data?.kpis || {};

        const mappedStats: DashboardStats = {
          totalPatients: Number(kpis.totalPatients || 0),
          todayAppointments: Number(kpis.todayAppointments || 0),
          monthlyRevenue: Number(kpis.estimatedRevenue || kpis.monthlyRevenue || 0),
          activeTrials: Number(kpis.activeTrials || 0),
          activePatients: Number(kpis.activePatients || 0),
          dailyRevenue: Number(kpis.dailyRevenue || 0),
          pendingAppointments: Number(kpis.pendingAppointments || 0),
          endingTrials: Number(kpis.endingTrials || 0),
        };

        const recentActivity = json?.data?.recentActivity || json?.data?.recentActivity || json?.data?.recent_activity || [];

        setData({
          stats: mappedStats,
          recentActivity,
          loading: false,
          error: null,
        });
      } catch (error) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Veri yüklenirken hata oluştu',
        }));
      }
    };

    loadDashboardData();
  }, []);

  return data;
};