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
    bg: 'bg-primary/10',
    icon: 'text-primary',
    trend: 'text-primary'
  },
  green: {
    bg: 'bg-success/10',
    icon: 'text-success',
    trend: 'text-success'
  },
  yellow: {
    bg: 'bg-warning/10',
    icon: 'text-yellow-600 dark:text-yellow-400',
    trend: 'text-yellow-600 dark:text-yellow-400'
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    trend: 'text-purple-600 dark:text-purple-400'
  },
  red: {
    bg: 'bg-destructive/10',
    icon: 'text-destructive',
    trend: 'text-destructive'
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
      className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-border/50/50 p-6 hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:bg-white/80 dark:hover:bg-gray-800/80' : ''
        } ${className}`}
      onClick={onClick}
      data-testid="kpi-card"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <svg
                className={`w-4 h-4 mr-1 ${trend.direction === 'up' ? 'text-success' : 'text-destructive'
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
              <span className={`text-sm ${trend.direction === 'up' ? 'text-success' : 'text-destructive'
                }`}>
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 ${colors.bg} rounded-2xl`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
};