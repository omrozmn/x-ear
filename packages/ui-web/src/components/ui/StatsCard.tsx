import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendData {
  value: string;
  direction: 'up' | 'down' | 'neutral';
  period?: string;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  trend?: TrendData;
  subtitle?: string;
  clickable?: boolean;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  red: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  gray: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    icon: 'text-gray-600 dark:text-gray-400',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color = 'blue',
  trend,
  subtitle,
  clickable = false,
  onClick,
  loading = false,
  className = '',
}) => {
  const colorClass = colorClasses[color];
  const clickableClass = clickable ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : '';

  const renderTrend = () => {
    if (!trend) return null;

    const trendColor = trend.direction === 'up' 
      ? 'text-green-600 dark:text-green-400' 
      : trend.direction === 'down' 
      ? 'text-red-600 dark:text-red-400' 
      : 'text-gray-600 dark:text-gray-400';

    const TrendIcon = trend.direction === 'up' 
      ? TrendingUp 
      : trend.direction === 'down' 
      ? TrendingDown 
      : Minus;

    return (
      <div className="flex items-center mt-2">
        <span className={`text-sm ${trendColor} flex items-center`}>
          <TrendIcon className="w-4 h-4 mr-1" />
          <span>{trend.value}</span>
        </span>
        {trend.period && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
            {trend.period}
          </span>
        )}
      </div>
    );
  };

  const renderLoading = () => (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-20"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg ml-4"></div>
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
        {renderTrend()}
      </div>
      {icon && (
        <div className={`p-3 ${colorClass.bg} rounded-lg ml-4`}>
          <div className={colorClass.icon}>
            {icon}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
        ${clickableClass}
        ${className}
      `}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {loading ? renderLoading() : renderContent()}
    </div>
  );
};

// Predefined stats card configurations
export const createPatientStats = () => [
  {
    title: 'Toplam Hasta',
    value: '0',
    color: 'blue' as const,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
      </svg>
    ),
  },
  {
    title: 'Aktif Hasta',
    value: '0',
    color: 'green' as const,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    title: 'Bekleyen',
    value: '0',
    color: 'yellow' as const,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    title: 'Bu Ay Yeni',
    value: '0',
    color: 'purple' as const,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
      </svg>
    ),
  },
];

export const createInventoryStats = () => [
  {
    title: 'Toplam Ürün',
    value: '0',
    color: 'blue' as const,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM6 9a1 1 0 112 0 1 1 0 01-2 0zm6 0a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    title: 'Düşük Stok',
    value: '0',
    color: 'red' as const,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    title: 'Toplam Değer',
    value: '₺0',
    color: 'green' as const,
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5a1 1 0 10-2 0v.092z" clipRule="evenodd"/>
      </svg>
    ),
  },
];

export default StatsCard;