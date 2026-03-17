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
        green: 'bg-success/10 text-success border-green-200 dark:border-green-800',
        blue: 'bg-primary/10 text-primary border-blue-200 dark:border-blue-800',
        purple: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
        yellow: 'bg-warning/10 text-yellow-600 border-yellow-200 dark:text-yellow-400 dark:border-yellow-800',
        red: 'bg-destructive/10 text-destructive border-red-200 dark:border-red-800'
    };

    return (
        <div className={`rounded-xl p-6 border ${colorClasses[color]}`}>
            <div className="flex items-center justify-between mb-4">
                <Icon className="w-8 h-8" />
                {trend && (
                    <span className={`text-sm font-medium ${trend.direction === 'up' ? 'text-success' : 'text-destructive'}`}>
                        {trend.value}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
    );
}
