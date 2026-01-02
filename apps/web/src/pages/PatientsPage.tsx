import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobilePatientsPage } from './patients/MobilePatientsPage';
import { DesktopPatientsPage } from './DesktopPatientsPage';

export const PatientsPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobilePatientsPage />;
  }

  return <DesktopPatientsPage />;
};

export default PatientsPage;