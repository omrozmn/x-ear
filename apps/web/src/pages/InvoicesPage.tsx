import React from 'react';
import { DesktopInvoicesPage } from './DesktopInvoicesPage';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileInvoicesPage } from './invoices/MobileInvoicesPage';
import { ProformasPage } from './invoices/ProformasPage';

export function InvoicesPage() {
  const isMobile = useIsMobile();
  const activeTab =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('tab')
      : null;

  if (activeTab === 'proformas') {
    return <ProformasPage />;
  }

  if (isMobile) {
    return <MobileInvoicesPage />;
  }

  return <DesktopInvoicesPage />;
}

export default InvoicesPage;
