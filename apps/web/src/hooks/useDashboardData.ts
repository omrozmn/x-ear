import { useState, useEffect } from 'react';

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
        // TODO: Replace with actual API calls when backend is ready
        // For now, using mock data similar to legacy implementation
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockStats: DashboardStats = {
          totalPatients: 156,
          todayAppointments: 8,
          monthlyRevenue: 485000,
          activeTrials: 23,
          activePatients: 142,
          dailyRevenue: 12500,
          pendingAppointments: 5,
          endingTrials: 3,
        };

        const mockLastTransaction: LastTransaction = {
          amount: '₺2,500',
          date: '2 saat önce'
        };

        const mockLastCalculation: LastCalculation = {
          amount: '₺8,750',
          date: '1 gün önce'
        };

        setData({
          stats: mockStats,
          lastTransaction: mockLastTransaction,
          lastCalculation: mockLastCalculation,
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