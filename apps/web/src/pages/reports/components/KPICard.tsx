import React from 'react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: 'green' | 'blue' | 'purple' | 'yellow' | 'red';
    trend?: { value: string; direction: 'up' | 'down' };
    subtitle?: string;
}

export function KPICard({ title, value, icon: Icon, color, trend, subtitle }: KPICardProps) {
    const colorClasses = {
        green: 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        blue: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        purple: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        red: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
    };

    return (
        <div className={`rounded-xl p-6 border ${colorClasses[color]}`}>
            <div className="flex items-center justify-between mb-4">
                <Icon className="w-8 h-8" />
                {trend && (
                    <span className={`text-sm font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.value}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{title}</p>
            {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
}
