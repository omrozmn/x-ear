import React from 'react';
import { Users, DollarSign, Calendar, Clock } from 'lucide-react';

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
      color: 'blue'
    },
    {
      label: 'Günlük Ciro',
      value: formatCurrency(stats.dailyRevenue),
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Bekleyen Randevular',
      value: stats.pendingAppointments,
      icon: Calendar,
      color: 'orange'
    },
    {
      label: 'Biten Denemeler',
      value: stats.endingTrials,
      icon: Clock,
      color: 'yellow'
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      yellow: 'bg-yellow-100 text-yellow-600'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İstatistikler</h3>
      <div className="space-y-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${getColorClasses(stat.color)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm text-gray-600">{stat.label}</span>
              </div>
              <span className={`text-lg font-semibold ${
                stat.color === 'green' ? 'text-green-600' : 
                stat.color === 'orange' ? 'text-orange-600' :
                stat.color === 'yellow' ? 'text-yellow-600' :
                'text-gray-900'
              }`}>
                {stat.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};