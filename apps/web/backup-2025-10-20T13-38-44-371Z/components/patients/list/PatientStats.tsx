import React from 'react';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

interface PatientStatsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
  className?: string;
}

export const PatientStats: React.FC<PatientStatsProps> = ({
  stats,
  className = ""
}) => {
  const statItems = [
    {
      id: 'total',
      label: 'Toplam Hasta',
      value: stats.total,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    },
    {
      id: 'active',
      label: 'Aktif Hasta',
      value: stats.active,
      icon: UserCheck,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    },
    {
      id: 'inactive',
      label: 'Pasif Hasta',
      value: stats.inactive,
      icon: UserX,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      textColor: 'text-red-900'
    },
    {
      id: 'new',
      label: 'Bu Ay Yeni',
      value: stats.newThisMonth,
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-900'
    }
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className={`${item.bgColor} rounded-lg p-6 border border-gray-200`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {item.label}
                </p>
                <p className={`text-2xl font-bold ${item.textColor}`}>
                  {item.value.toLocaleString('tr-TR')}
                </p>
              </div>
              <div className={`p-3 rounded-full ${item.bgColor}`}>
                <Icon className={`h-6 w-6 ${item.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};