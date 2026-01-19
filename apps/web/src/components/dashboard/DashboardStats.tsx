import React from 'react';
import { Users, Calendar, TrendingUp, Activity } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalParties: number;
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
  const cards = [
    {
      title: "Toplam Hasta",
      value: stats.totalParties.toString(),
      icon: <Users className="w-6 h-6 text-white" />,
      color: "bg-gradient-to-br from-blue-600 to-blue-700", // Medical Trust Blue
      trend: "+12%",
      key: 'parties'
    },
    {
      title: "Aktif Denemeler",
      value: stats.activeTrials.toString(),
      icon: <Activity className="w-6 h-6 text-white" />,
      color: "bg-gradient-to-br from-cyan-500 to-teal-600", // Tech/Innovation Cyan
      trend: "+5%",
      key: 'trials'
    },
    {
      title: "Aylık Ciro",
      value: `₺${stats.monthlyRevenue.toLocaleString()}`,
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      color: "bg-gradient-to-br from-emerald-500 to-emerald-700", // Growth Green
      trend: "+8%",
      key: 'revenue'
    },
    {
      title: "Bugünkü Randevular",
      value: stats.todayAppointments.toString(),
      icon: <Calendar className="w-6 h-6 text-white" />,
      color: "bg-gradient-to-br from-violet-500 to-purple-600", // Distinct Schedule Color
      trend: "3 bekleyen",
      key: 'appointments'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <div
          key={card.key}
          onClick={() => onCardClick?.(card.key)}
          className={`${card.color} rounded-2xl p-6 shadow-lg shadow-gray-100 transform transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer relative overflow-hidden group`}
        >
          {/* Decorative background circle */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>

          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner border border-white/10">
              {card.icon}
            </div>
            {card.trend && (
              <span className="text-xs font-medium text-white/90 bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10">
                {card.trend}
              </span>
            )}
          </div>

          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{card.value}</h3>
            <p className="text-white/80 font-medium text-sm tracking-wide bg-white/5 inline-block px-2 py-0.5 rounded-md">{card.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};