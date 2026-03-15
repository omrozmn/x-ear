import React from 'react';
import { Users, DollarSign, Calendar, Clock } from 'lucide-react';

interface QuickStatsCardProps {
  stats: {
    activeParties: number;
    dailyRevenue: number;
    pendingAppointments: number;
    endingTrials: number;
  };
}

export const QuickStatsCard: React.FC<QuickStatsCardProps> = ({ stats }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const quickStats = [
    {
      label: 'Aktif Hastalar',
      value: stats.activeParties,
      icon: Users,
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-600',
    },
    {
      label: 'Gunluk Ciro',
      value: formatCurrency(stats.dailyRevenue),
      icon: DollarSign,
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Bekleyen Randevular',
      value: stats.pendingAppointments,
      icon: Calendar,
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-700',
    },
    {
      label: 'Biten Denemeler',
      value: stats.endingTrials,
      icon: Clock,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div className="relative h-full overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_52px_-36px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-900/46 dark:shadow-[0_24px_80px_-44px_rgba(2,6,23,0.9)]">
      <div className="absolute inset-x-8 top-0 h-20 rounded-full bg-gradient-to-r from-sky-200/40 via-white/30 to-emerald-200/30 blur-3xl dark:from-sky-500/20 dark:via-slate-900/10 dark:to-emerald-500/20" />
      <div className="relative mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Hizli Istatistikler</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gun icindeki operasyon ozetleri</p>
        </div>
        <span className="rounded-full border border-white/55 bg-white/55 px-3 py-1 text-xs font-semibold text-sky-700 backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-sky-300">
          Canli
        </span>
      </div>

      <div className="relative space-y-3">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/84 p-3.5 backdrop-blur-md transition-all duration-200 hover:bg-white dark:border-white/10 dark:bg-slate-950/32 dark:hover:bg-slate-900/48"
            >
              <div className="flex items-center space-x-4">
                <div className={`rounded-xl p-2.5 ${stat.bgColor} ${stat.textColor} transition-transform group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">
                  {stat.label}
                </span>
              </div>

              <span className={`text-lg font-bold ${stat.textColor}`}>
                {stat.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
