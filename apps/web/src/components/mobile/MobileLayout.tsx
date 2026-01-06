import React, { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';
import '@/styles/mobile.css';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showBottomNav = true,
  className
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-900", className)}>
      <main className={cn(
        "pb-safe",
        showBottomNav && isMobile && "pb-20"
      )}>
        {children}
      </main>

      {showBottomNav && isMobile && <BottomNav />}
    </div>
  );
};
