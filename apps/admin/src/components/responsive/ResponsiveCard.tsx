import React from 'react';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';

interface ResponsiveCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ResponsiveCard({
  children,
  title,
  subtitle,
  actions,
  className = '',
  padding = 'md',
}: ResponsiveCardProps) {
  const { isMobile } = useAdminResponsive();

  const paddingClasses = {
    none: '',
    sm: isMobile ? 'p-3' : 'p-4',
    md: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-5' : 'p-8',
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        ${isMobile ? 'rounded-xl' : 'rounded-2xl'}
        shadow-sm
        ${className}
      `}
    >
      {(title || subtitle || actions) && (
        <div
          className={`
            flex items-start justify-between 
            border-b border-gray-200 dark:border-gray-700
            ${isMobile ? 'p-4' : 'p-6'}
          `}
        >
          <div className="flex-1">
            {title && (
              <h3 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="ml-4 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={paddingClasses[padding]}>
        {children}
      </div>
    </div>
  );
}
