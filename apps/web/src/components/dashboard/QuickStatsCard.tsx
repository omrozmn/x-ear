import React from 'react';
import { Users, DollarSign, Calendar, Clock, ChevronRight } from 'lucide-react';

interface QuickStatsCardProps {
  stats: {
    activePatients: number;
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
      value: stats.activePatients,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Günlük Ciro',
      value: formatCurrency(stats.dailyRevenue),
      icon: DollarSign,
      color: 'emerald',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Bekleyen Randevular',
      value: stats.pendingAppointments,
      icon: Calendar,
      color: 'violet',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20',
      textColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Biten Denemeler',
      value: stats.endingTrials,
      icon: Clock,
      color: 'amber',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-600 dark:text-amber-400',
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full flex flex-col justify-center">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Hızlı İstatistikler</h3>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-full border border-gray-100 dark:border-gray-600">Bugün</span>
      </div>

      <div className="space-y-3">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 border border-transparent hover:border-gray-100 dark:hover:border-gray-600 cursor-default"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.textColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {stat.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${stat.textColor}`}>
                  {stat.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};