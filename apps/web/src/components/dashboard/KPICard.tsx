import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    trend: 'text-blue-600 dark:text-blue-400'
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    trend: 'text-green-600 dark:text-green-400'
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    trend: 'text-yellow-600 dark:text-yellow-400'
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    trend: 'text-purple-600 dark:text-purple-400'
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    trend: 'text-red-600 dark:text-red-400'
  }
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
  onClick,
  className = ''
}) => {
  const colors = colorClasses[color];

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-none border dark:border border-transparent dark:border-gray-700 p-6 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''
        } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <svg
                className={`w-4 h-4 mr-1 ${trend.direction === 'up' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={trend.direction === 'up'
                    ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                    : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
                  }
                />
              </svg>
              <span className={`text-sm ${trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 ${colors.bg} rounded-lg`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
};