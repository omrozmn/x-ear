import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileSuppliersPage } from './suppliers/MobileSuppliersPage';
import { DesktopSuppliersPage } from './DesktopSuppliersPage';

export function SuppliersPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileSuppliersPage />;
  }

  return <DesktopSuppliersPage />;
}

export default SuppliersPage;
