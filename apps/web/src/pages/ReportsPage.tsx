import React from 'react';
import { DesktopReportsPage } from './DesktopReportsPage';
import { MobileReportsPage } from './reports/MobileReportsPage';
import { useIsMobile } from '@/hooks/useBreakpoint';

export const ReportsPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) return <MobileReportsPage />;
  return <DesktopReportsPage />;
};

export default ReportsPage;
