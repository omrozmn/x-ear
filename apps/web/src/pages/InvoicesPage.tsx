import React from 'react';
import { DesktopInvoicesPage } from './DesktopInvoicesPage';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileInvoicesPage } from './invoices/MobileInvoicesPage';

export function InvoicesPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileInvoicesPage />;
  }

  return <DesktopInvoicesPage />;
}

export default InvoicesPage;