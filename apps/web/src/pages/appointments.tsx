import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileAppointmentsPage } from './appointments/MobileAppointmentsPage';
import { DesktopAppointmentsPage } from './DesktopAppointmentsPage';

export const AppointmentsPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileAppointmentsPage />;
  }

  return <DesktopAppointmentsPage />;
};

export default AppointmentsPage;