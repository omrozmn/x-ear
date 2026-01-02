import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileInventoryPage } from './inventory/MobileInventoryPage';
import { DesktopInventoryPage } from './DesktopInventoryPage';

export const InventoryPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileInventoryPage />;
  }

  return <DesktopInventoryPage />;
};

export default InventoryPage;