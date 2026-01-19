import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobilePartiesPage } from './parties/MobilePartiesPage';
import { DesktopPartiesPage } from './DesktopPartiesPage';

export const PartiesPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobilePartiesPage />;
  }

  return <DesktopPartiesPage />;
};

export default PartiesPage;