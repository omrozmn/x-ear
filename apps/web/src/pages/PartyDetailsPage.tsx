import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobilePartyDetailPage } from './parties/MobilePartyDetailPage';
import { DesktopPartyDetailsPage } from './DesktopPartyDetailsPage';

export const PartyDetailsPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobilePartyDetailPage />;
  }

  return <DesktopPartyDetailsPage />;
};

export default PartyDetailsPage;