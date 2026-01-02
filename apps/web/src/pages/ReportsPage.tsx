import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileUnsupportedPage } from '../components/mobile/MobileUnsupportedPage';
import { DesktopReportsPage } from './DesktopReportsPage';

export const ReportsPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileUnsupportedPage title="Raporlar" />;
  }

  return <DesktopReportsPage />;
};

export default ReportsPage;
