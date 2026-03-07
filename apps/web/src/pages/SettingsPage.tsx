import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileUnsupportedPage } from '../components/mobile/MobileUnsupportedPage';
import { DesktopSettingsPage } from './DesktopSettingsPage';

export const SettingsPage: React.FC = () => {
  const isMobile = useIsMobile();

  console.log('🎯 SettingsPage rendered', { isMobile });

  if (isMobile) {
    return <MobileUnsupportedPage title="Ayarlar" />;
  }

  return <DesktopSettingsPage />;
};

export default SettingsPage;
