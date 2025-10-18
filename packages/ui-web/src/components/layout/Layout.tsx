import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  currentPath?: string;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  user,
  currentPath,
  className = '',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      const handleClickOutside = (event: MouseEvent) => {
        const sidebar = document.getElementById('sidebar');
        const target = event.target as Node;
        
        if (sidebar && !sidebar.contains(target)) {
          setSidebarOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sidebarOpen, isMobile]);

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleNotificationClick = () => {
    // Handle notification click
    console.log('Notification clicked');
  };

  const handleProfileClick = () => {
    // Handle profile click
    console.log('Profile clicked');
  };

  const handleSettingsClick = () => {
    // Handle settings click
    console.log('Settings clicked');
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Sidebar */}
      <div id="sidebar">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          currentPath={currentPath}
        />
      </div>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          title={title}
          user={user}
          onMenuToggle={handleMenuToggle}
          onNotificationClick={handleNotificationClick}
          onProfileClick={handleProfileClick}
          onSettingsClick={handleSettingsClick}
        />

        {/* Page content */}
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;