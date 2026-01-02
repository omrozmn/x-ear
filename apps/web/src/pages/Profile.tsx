import React from 'react';
import { useIsMobile } from '../hooks/useBreakpoint';
import { MobileProfilePage } from './MobileProfilePage';
import { DesktopProfilePage } from './DesktopProfilePage';

export const ProfilePage: React.FC = () => {
    const isMobile = useIsMobile();

    if (isMobile) {
        return <MobileProfilePage />;
    }

    return <DesktopProfilePage />;
};

export default ProfilePage;
