import React from 'react';
import { Users, Calendar, TrendingUp, Activity } from 'lucide-react';
import { useSector } from '../../hooks/useSector';
import { useSectorTerminology } from '../../hooks/useSectorTerminology';

interface DashboardStatsProps {
  stats: {
    totalParties: number;
    activeTrials?: number;
    monthlyRevenue: number;
    todayAppointments: number;
  };
  onCardClick?: (cardType: string) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  onCardClick,
}) => {
  const { isModuleEnabled } = useSector();
  const { st } = useSectorTerminology();

  const cards = [
    {
      title: st('parties') ? `Toplam ${st('party')}` : 'Toplam Müşteri',
      value: stats.totalParties.toString(),
      icon: <Users className="w-6 h-6 text-white" />,
      background: 'linear-gradient(135deg, rgba(14,165,233,0.96) 0%, rgba(2,132,199,0.94) 50%, rgba(8,145,178,0.92) 100%)',
      trend: "+12%",
      key: 'parties',
      show: true,
    },
    {
      title: "Aktif Denemeler",
      value: (stats.activeTrials ?? 0).toString(),
      icon: <Activity className="w-6 h-6 text-white" />,
      background: 'linear-gradient(135deg, rgba(6,182,212,0.96) 0%, rgba(14,165,233,0.94) 52%, rgba(3,105,161,0.92) 100%)',
      trend: "+5%",
      key: 'trials',
      show: isModuleEnabled('devices'),
    },
    {
      title: "Aylık Ciro",
      value: `₺${stats.monthlyRevenue.toLocaleString()}`,
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      background: 'linear-gradient(135deg, rgba(16,185,129,0.96) 0%, rgba(5,150,105,0.94) 50%, rgba(13,148,136,0.92) 100%)',
      trend: "+8%",
      key: 'revenue',
      show: true,
    },
    {
      title: "Bugünkü Randevular",
      value: stats.todayAppointments.toString(),
      icon: <Calendar className="w-6 h-6 text-white" />,
      background: 'linear-gradient(135deg, rgba(71,85,105,0.96) 0%, rgba(51,65,85,0.94) 50%, rgba(3,105,161,0.9) 100%)',
      trend: "3 bekleyen",
      key: 'appointments',
      show: true,
    }
  ];

  const visibleCards = cards.filter(c => c.show);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${visibleCards.length} gap-6 mb-8`} data-testid="dashboard-stats-container">
      {visibleCards.map((card) => (
        <div
          key={card.key}
          onClick={() => onCardClick?.(card.key)}
          className="relative cursor-pointer overflow-hidden rounded-[28px] border border-white/20 p-6 shadow-[0_20px_56px_-36px_rgba(15,23,42,0.34)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_26px_72px_-40px_rgba(15,23,42,0.4)] group dark:border-white/10 dark:shadow-[0_24px_80px_-44px_rgba(2,6,23,0.85)]"
          style={{ background: card.background }}
          data-testid={`dashboard-widget-${card.key}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_34%)] opacity-90" />
          <div className="absolute inset-x-8 bottom-0 h-20 rounded-full bg-black/10 blur-3xl dark:bg-black/30" />
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-card/12 blur-2xl group-hover:bg-card/22 transition-all duration-500" />

          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="rounded-2xl border border-white/20 bg-white/18 p-3 backdrop-blur-md shadow-inner dark:bg-white/10 dark:border-white/15">
              {card.icon}
            </div>
            {card.trend && (
              <span className="rounded-2xl border border-white/15 bg-white/16 px-2 py-1 text-xs font-medium text-white/92 backdrop-blur-md dark:bg-white/10">
                {card.trend}
              </span>
            )}
          </div>

          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{card.value}</h3>
            <p className="inline-block rounded-xl bg-white/8 px-2 py-0.5 text-sm font-medium tracking-wide text-white/84 dark:bg-white/6">
              {card.title}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
