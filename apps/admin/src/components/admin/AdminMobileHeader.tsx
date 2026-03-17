import { useState } from 'react';
import { Menu, Search, Bell, Bot } from 'lucide-react';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';
import { useComposerStore } from '../../stores/composerStore';

interface AdminMobileHeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function AdminMobileHeader({ onMenuClick, title = 'Super Admin Panel' }: AdminMobileHeaderProps) {
  const { isMobile } = useAdminResponsive();
  const { toggleOpen } = useComposerStore();
  const [showSearch, setShowSearch] = useState(false);

  if (!isMobile) {
    return null;
  }

  return (
    <header className="sticky top-2 z-40 mx-2 mb-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-sm rounded-xl mobile-header transition-all">
      <div className="flex items-center justify-between px-3 py-2">
        {/* Left: Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-feedback"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Center: Title */}
        <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate flex-1 mx-3">
          {title}
        </h1>

        {/* Right: Actions */}
        <div className="flex items-center space-x-1">
          {/* AI Composer Button */}
          <button
            onClick={toggleOpen}
            className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-feedback relative"
            aria-label="Open AI Composer"
          >
            <Bot className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>

          {/* Search Button */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-feedback"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Notifications Button */}
          <button
            className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-feedback relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Search Bar (Expandable) */}
      {showSearch && (
        <div className="px-4 pb-3 animate-slideInFromTop">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
