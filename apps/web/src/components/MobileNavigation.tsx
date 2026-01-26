import React, { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  Home,
  Users,
  Calendar,
  MessageSquare,
  Settings,
  Menu,
  X,
  Bell,
  Search
} from 'lucide-react';
import { Button, Input } from '@x-ear/ui-web';
import { useResponsive } from '../hooks/useResponsive';
import { usePWA } from '../hooks/usePWA';
import { useTranslation } from 'react-i18next';

interface MobileNavigationProps {
  className?: string;
}

const navigationItems = [
  {
    name: 'nav.dashboard',
    href: '/',
    icon: Home,
  },
  {
    name: 'nav.patients',
    href: '/parties',
    icon: Users,
  },
  {
    name: 'nav.appointments',
    href: '/appointments',
    icon: Calendar,
  },
  {
    name: 'nav.communication',
    href: '/communication',
    icon: MessageSquare,
  },
  {
    name: 'nav.settings.main',
    href: '/settings',
    icon: Settings,
  },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className = '',
}) => {
  const { t } = useTranslation(['layout', 'common']);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isMobile } = useResponsive();
  const { isOnline } = usePWA();

  if (!isMobile) {
    return null;
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Top Mobile Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              X-Ear
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {/* Online/Offline Indicator */}
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />

            <Button variant="ghost" size="sm" className="p-2">
              <Search className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
            </Button>
          </div>
        </div>
      </header>

      {/* Slide-out Menu */}
      <div
        className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={closeMenu}
        />

        {/* Menu Content */}
        <div className="relative w-80 max-w-sm h-full bg-white dark:bg-gray-900 shadow-xl">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">X</span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  X-Ear
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('app.title_desc')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeMenu}
              className="p-2"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeMenu}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${isActive
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{t(item.name)}</span>
                </Link>
              );
            })}
          </nav>

          {/* Menu Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Durum: {isOnline ? t('status.online', { ns: 'common' }) : t('status.offline', { ns: 'common' })}</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-around py-2">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                  }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{t(item.name)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Content Spacer */}
      <div className="h-16" /> {/* Top header spacer */}
      <div className="h-20" /> {/* Bottom navigation spacer */}
    </>
  );
};

// Mobile Search Bar Component
interface MobileSearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  onSearch,
  placeholder = 'Ara...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const { isMobile } = useResponsive();

  if (!isMobile) {
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <div className={`px-4 py-3 bg-gray-50 dark:bg-gray-800 ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2"
        />
      </form>
    </div>
  );
};

// Mobile Action Button (Floating Action Button)
interface MobileActionButtonProps {
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  className?: string;
}

export const MobileActionButton: React.FC<MobileActionButtonProps> = ({
  onClick,
  icon: Icon = Users,
  label = 'Ekle',
  className = '',
}) => {
  const { isMobile } = useResponsive();

  if (!isMobile) {
    return null;
  }

  return (
    <Button
      onClick={onClick}
      className={`fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-lg ${className}`}
      title={label}
    >
      <Icon className="h-6 w-6" />
    </Button>
  );
};