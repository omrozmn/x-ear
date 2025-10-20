import React from 'react';
import { Users, Calendar, TrendingUp, Activity } from 'lucide-react';
import { StatsCard } from '../../../../../packages/ui-web/src/components/ui/StatsCard';

interface DashboardStatsProps {
  stats: {
    totalPatients: number;
    activeTrials: number;
    monthlyRevenue: number;
    todayAppointments: number;
  };
  onCardClick?: (cardType: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  onCardClick,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Toplam Hasta"
        value={stats.totalPatients.toString()}
        icon={<Users className="w-6 h-6" />}
        color="blue"
        trend={{ value: "+12%", direction: "up" }}
        onClick={() => onCardClick?.('patients')}
      />
      <StatsCard
        title="Aktif Denemeler"
        value={stats.activeTrials.toString()}
        icon={<Activity className="w-6 h-6" />}
        color="green"
        trend={{ value: "+5%", direction: "up" }}
        onClick={() => onCardClick?.('trials')}
      />
      <StatsCard
        title="Aylık Ciro"
        value={`₺${stats.monthlyRevenue.toLocaleString()}`}
        icon={<TrendingUp className="w-6 h-6" />}
        color="purple"
        trend={{ value: "+8%", direction: "up" }}
        onClick={() => onCardClick?.('revenue')}
      />
      <StatsCard
        title="Bugünkü Randevular"
        value={stats.todayAppointments.toString()}
        icon={<Calendar className="w-6 h-6" />}
        color="yellow"
        trend={{ value: "3 bekleyen", direction: "neutral" }}
        onClick={() => onCardClick?.('appointments')}
      />
    </div>
  );
};