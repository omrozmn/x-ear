import { Button, Sidebar } from '@x-ear/ui-web';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from '@tanstack/react-router';
import {
  Building2,
  Bot,
  Settings,
  Menu,
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Search
} from 'lucide-react';
import { useAuthStore, AuthStateUser } from '../../stores/authStore';
import { DebugRoleSwitcher } from './DebugRoleSwitcher';
import { DebugTenantSwitcher } from './DebugTenantSwitcher';
import { PagePermissionsViewer } from './PagePermissionsViewer';
import { useTheme } from '../../hooks/useTheme';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GlobalOfflineAlert } from '../common/GlobalOfflineAlert';
import { AIChatWidget, AIFeatureWrapper, AIStatusIndicator, PhaseABanner } from '../../ai/components';
import { ComposerOverlay } from '../../components/ai/ComposerOverlay';
import { AIInboxDrawer } from '../../components/ai/AIInboxDrawer';
import { useComposerStore } from '../../stores/composerStore';
import { useAIStatus, useAIContextSync } from '../../ai/hooks';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';
import { useBreakpoints } from '../../hooks/useMediaQuery';
import { useLayoutStore } from '../../stores/layoutStore';
import { BottomNav } from './BottomNav';
import {
  JWT_TOKEN,
  AUTH_TOKEN,
  REFRESH_TOKEN,
  PHASE_A_BANNER_DISMISSED,
  AUTH_STORAGE_PERSIST
} from '../../constants/storage-keys';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Route'tan page key mapping
const getPageKeyFromPath = (pathname: string): { key: string; title: string } | null => {
  const pathMap: Record<string, { key: string; title: string }> = {
    '/parties': { key: 'parties', title: 'Hastalar' },
    '/appointments': { key: 'appointments', title: 'Randevular' },
    '/sales': { key: 'sales', title: 'Satışlar' },
    '/finance': { key: 'finance', title: 'Finans' },
    '/invoices': { key: 'invoices', title: 'Faturalar' },
    '/devices': { key: 'devices', title: 'Cihazlar' },
    '/inventory': { key: 'inventory', title: 'Stok' },
    '/campaigns': { key: 'campaigns', title: 'Kampanyalar' },
    '/sgk': { key: 'sgk', title: 'SGK' },
    '/settings': { key: 'settings', title: 'Ayarlar' },
    '/team': { key: 'team', title: 'Ekip' },
    '/reports': { key: 'reports', title: 'Raporlar' },
    '/dashboard': { key: 'dashboard', title: 'Dashboard' },
  };

  // Exact match first
  if (pathMap[pathname]) return pathMap[pathname];

  // Prefix match
  for (const [prefix, value] of Object.entries(pathMap)) {
    if (pathname.startsWith(prefix)) return value;
  }

  return null;
};

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { t } = useTranslation('layout');
  const { user: rawUser, subscription } = useAuthStore();
  const user = rawUser as AuthStateUser | null;

  const navigate = useNavigate();
  const location = useLocation();

  // Breakpoint detection
  const { isMobile, isTablet, isDesktop } = useBreakpoints();

  // Sidebar state from Zustand store
  const { sidebarOpen, setSidebarOpen, toggleAiInbox, hideGlobalHeader } = useLayoutStore();

  // AI Status for header indicator
  const { data: aiStatus } = useAIStatus({ enabled: !!user });

  // AI Context Sync
  useAIContextSync();

  // AI Composer Shortcut (Cmd+K)
  const { toggleOpen } = useComposerStore();
  useHotkeys('meta+k', (e) => {
    e.preventDefault();
    toggleOpen();
  });

  useEffect(() => {
    if (subscription?.isExpired) {
      if (location.pathname !== '/settings/subscription') {
        navigate({ to: '/settings/subscription' });
      }
    }
  }, [subscription, location.pathname, navigate]);

  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const toggleDarkMode = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-black dark:text-white">
      {/* New Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={!sidebarOpen && isDesktop}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onClose={() => setSidebarOpen(false)}
        currentPath={location.pathname + location.search}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
        onNavigate={(href) => {
          navigate({ to: href as string });
        }}
      />

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-[margin] duration-300 min-w-0",
        isMobile ? "ml-0" : (
          isTablet ? "ml-16" : (sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-16")
        )
      )}>
        {/* Header - Modern Floating Glassmorphism Pill */}
        {!hideGlobalHeader && (
        <header className="sticky top-2 md:top-4 z-40 mx-2 md:mx-6 mb-2 md:mb-4 px-3 sm:px-4 md:px-6 py-2 md:py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-sm rounded-xl md:rounded-2xl transition-all">
          <div className="flex justify-between items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Button
                onClick={toggleSidebar}
                className="p-2 h-auto min-h-[44px] min-w-[44px] text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                variant='ghost'>
                <Menu size={20} />
              </Button>
            )}

            {/* Page Title */}
            <h1 className="m-0 text-base sm:text-lg md:text-2xl font-semibold text-gray-800 dark:text-white whitespace-nowrap truncate">
              {getPageKeyFromPath(location.pathname)?.title || 'Dashboard'}
            </h1>

            {/* AI Composer Trigger - Desktop Only */}
            <div className="hidden md:flex flex-1 max-w-xl mx-4">
              <div
                onClick={toggleOpen}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2 rounded-2xl cursor-pointer transition-colors border",
                  "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
                  "hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500"
                )}
              >
                <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                  <Search size={18} />
                  <Bot size={18} className="text-blue-500" />
                  <span className="text-sm">{t('header.search_placeholder')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-white dark:bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-gray-500 dark:text-gray-400 opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {/* Dark Mode Toggle */}
              <Button
                onClick={toggleDarkMode}
                className="p-2 h-auto min-h-[44px] min-w-[44px] text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isDark ? 'Açık Tema' : 'Koyu Tema'}
                variant='ghost'>
                {isDark ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
              </Button>

              {/* Notifications - Hidden on mobile */}
              <Button
                className="hidden sm:flex relative p-2 h-auto min-h-[44px] min-w-[44px] text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                title={t('header.notifications')}
                variant='ghost'>
                <Bell size={18} className="sm:w-5 sm:h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>

              {/* AI Inbox Toggle */}
              <Button
                onClick={toggleAiInbox}
                className="relative p-2 h-auto min-h-[44px] min-w-[44px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-bold"
                title="AI Inbox"
                variant='ghost'>
                <Bot size={18} className="sm:w-5 sm:h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              </Button>

              {/* AI Status Indicator - Hidden on mobile */}
              <AIFeatureWrapper hideWhenUnavailable showLoading={false}>
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-700/50" title="AI Durumu">
                  <Bot size={16} className="text-gray-600 dark:text-gray-400" />
                  <AIStatusIndicator status={aiStatus} size="sm" showLabel />
                </div>
              </AIFeatureWrapper>

              {/* Debug Switchers - Hidden on mobile */}
              <div className="hidden md:flex items-center gap-2">
                <DebugTenantSwitcher darkMode={isDark} />
                <DebugRoleSwitcher darkMode={isDark} />
              </div>

              {/* User Menu */}
              <div className="relative">
                <Button
                  onClick={toggleUserDropdown}
                  data-testid="user-menu"
                  className="flex items-center gap-2 p-2 h-auto min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  variant='ghost'>
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    <User size={16} />
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs sm:text-sm font-medium">
                      {user?.name || 'User'}
                    </div>
                    <div className="text-[10px] sm:text-xs opacity-70">
                      {user?.role || 'Guest'}
                    </div>
                  </div>
                  <ChevronDown size={12} className="hidden sm:block" />
                </Button>

                {/* User Dropdown */}
                {showUserDropdown && (
                  <div className="absolute top-full right-0 mt-2 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-[1000] py-2">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors border-b border-gray-100 dark:border-gray-700"
                    >
                      <User size={16} className="mr-2" />
                      <span>{t('header.profile')}</span>
                    </Link>
                    <Link
                      to={"/settings" as unknown as "/"}
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors border-b border-gray-100 dark:border-gray-700"
                    >
                      <Settings size={16} className="mr-2" />
                      <span>{t('nav.settings.main')}</span>
                    </Link>
                    <Button
                      onClick={() => {
                        const { logout } = useAuthStore.getState();
                        try {
                          logout();
                        } catch (e) {
                          try {
                            localStorage.removeItem(JWT_TOKEN);
                            localStorage.removeItem(AUTH_STORAGE_PERSIST);
                            localStorage.removeItem(AUTH_TOKEN);
                            localStorage.removeItem(REFRESH_TOKEN);
                            delete window.__AUTH_TOKEN__;
                          } catch {
                            // Ignore localStorage errors during logout
                          }
                        }
                        navigate({ to: '/login' as unknown as '/' });
                      }}
                      data-testid="logout-button"
                      className="flex items-center w-full px-4 py-3 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 transition-colors h-auto"
                      variant='ghost'>
                      <LogOut size={16} className="mr-2" />
                      <span>{t('header.logout')}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        )}

        {/* Content */}
        <main className={cn(
          "flex-1 bg-gray-50 dark:bg-gray-950",
          location.pathname === '/settings'
            ? 'h-[calc(100vh-64px)] overflow-hidden'
            : location.pathname === '/reports'
              ? 'relative h-[calc(100vh-64px)]'
              : 'p-3 sm:p-4 md:p-8 min-h-[calc(100vh-64px)]',
          isMobile && "pb-24"
        )}>
          {(user?.isImpersonatingTenant || user?.isImpersonating) && (
            <div className="mb-4 p-3 rounded-2xl flex items-center justify-between border-2 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-600 dark:border-emerald-500">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-emerald-800 dark:text-emerald-400" />
                <span className="font-semibold text-xs sm:text-sm text-emerald-800 dark:text-emerald-400">
                  {user?.isImpersonatingTenant && `Impersonating: ${user?.tenantName}`}
                  {user?.isImpersonating && !(user?.isImpersonatingTenant) && `Impersonating Role: ${user?.role}`}
                  {user?.isImpersonatingTenant && user?.isImpersonating && ` • Role: ${user?.role}`}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                QA Debug Mode
              </span>
            </div>
          )}

          <GlobalOfflineAlert />

          <PhaseABanner
            className="mb-4"
            storageKey={PHASE_A_BANNER_DISMISSED}
          />

          {children}

          {(() => {
            const pageInfo = getPageKeyFromPath(location.pathname);
            if (pageInfo) {
              return (
                <PagePermissionsViewer
                  pageKey={pageInfo.key}
                  pageTitle={pageInfo.title}
                  darkMode={isDark}
                />
              );
            }
            return null;
          })()}
        </main>
      </div>

      <AIChatWidget />

      {isMobile && !hideGlobalHeader && <BottomNav />}

      <ComposerOverlay />
      <AIInboxDrawer />
    </div>
  );
};