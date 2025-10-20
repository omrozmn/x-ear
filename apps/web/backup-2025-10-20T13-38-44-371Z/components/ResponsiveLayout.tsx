import React from 'react';
import { useResponsive } from '../hooks/useResponsive';
import { MobileNavigation } from './MobileNavigation';
import { PWAInstallPrompt, PWAUpdatePrompt } from './PWAInstallPrompt';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showMobileNav?: boolean;
  showPWAPrompts?: boolean;
  className?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  showMobileNav = true,
  showPWAPrompts = true,
  className = '',
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Mobile Navigation */}
      {showMobileNav && isMobile && <MobileNavigation />}

      {/* Main Content */}
      <main
        className={`
          ${isMobile ? 'pt-16 pb-20' : ''}
          ${isTablet ? 'px-6' : ''}
          ${isDesktop ? 'px-8' : ''}
          transition-all duration-200
        `}
      >
        {children}
      </main>

      {/* PWA Prompts */}
      {showPWAPrompts && (
        <>
          <PWAInstallPrompt />
          <PWAUpdatePrompt />
        </>
      )}
    </div>
  );
};

// Grid Layout Component for responsive grids
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 4,
  className = '',
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getGridCols = () => {
    if (isMobile) return cols.mobile || 1;
    if (isTablet) return cols.tablet || 2;
    if (isDesktop) return cols.desktop || 3;
    return 1;
  };

  const gridCols = getGridCols();

  return (
    <div
      className={`grid gap-${gap} ${className}`}
      style={{
        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
};

// Responsive Container Component
interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'xl',
  padding = { mobile: 'px-4', tablet: 'px-6', desktop: 'px-8' },
  className = '',
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getPadding = () => {
    if (isMobile) return padding.mobile || 'px-4';
    if (isTablet) return padding.tablet || 'px-6';
    if (isDesktop) return padding.desktop || 'px-8';
    return 'px-4';
  };

  const maxWidthClass = maxWidth === 'full' ? 'w-full' : `max-w-${maxWidth}`;

  return (
    <div className={`mx-auto ${maxWidthClass} ${getPadding()} ${className}`}>
      {children}
    </div>
  );
};

// Responsive Card Component
interface ResponsiveCardProps {
  children: React.ReactNode;
  padding?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  className?: string;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  padding = { mobile: 'p-4', tablet: 'p-6', desktop: 'p-6' },
  className = '',
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getPadding = () => {
    if (isMobile) return padding.mobile || 'p-4';
    if (isTablet) return padding.tablet || 'p-6';
    if (isDesktop) return padding.desktop || 'p-6';
    return 'p-4';
  };

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-lg shadow-sm 
        ${getPadding()} 
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Responsive Stack Component
interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: {
    mobile?: 'row' | 'column';
    tablet?: 'row' | 'column';
    desktop?: 'row' | 'column';
  };
  spacing?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  className?: string;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = { mobile: 'column', tablet: 'row', desktop: 'row' },
  spacing = 4,
  align = 'start',
  justify = 'start',
  className = '',
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getDirection = () => {
    if (isMobile) return direction.mobile || 'column';
    if (isTablet) return direction.tablet || 'row';
    if (isDesktop) return direction.desktop || 'row';
    return 'column';
  };

  const flexDirection = getDirection();
  const gapClass = `gap-${spacing}`;
  const alignClass = `items-${align}`;
  const justifyClass = `justify-${justify}`;

  return (
    <div
      className={`
        flex 
        ${flexDirection === 'row' ? 'flex-row' : 'flex-col'} 
        ${gapClass} 
        ${alignClass} 
        ${justifyClass} 
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Responsive Text Component
interface ResponsiveTextProps {
  children: React.ReactNode;
  size?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  weight?: string;
  color?: string;
  className?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  size = { mobile: 'text-sm', tablet: 'text-base', desktop: 'text-base' },
  weight = 'font-normal',
  color = 'text-gray-900 dark:text-white',
  className = '',
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getSize = () => {
    if (isMobile) return size.mobile || 'text-sm';
    if (isTablet) return size.tablet || 'text-base';
    if (isDesktop) return size.desktop || 'text-base';
    return 'text-base';
  };

  return (
    <span className={`${getSize()} ${weight} ${color} ${className}`}>
      {children}
    </span>
  );
};