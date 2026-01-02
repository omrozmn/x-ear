import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobilePatientDetailPage } from './patients/MobilePatientDetailPage';
import { DesktopPatientDetailsPage } from './DesktopPatientDetailsPage';

export const PatientDetailsPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobilePatientDetailPage />;
  }

  return <DesktopPatientDetailsPage />;
};

export default PatientDetailsPage;