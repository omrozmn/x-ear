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
import { useFeatures } from '../../hooks/useFeatures';
import { usePermissions } from '../../hooks/usePermissions';
import { useSector } from '../../hooks/useSector';
import { useDynamicTitle } from '../../hooks/useDynamicTitle';
import { useListNotifications } from '../../api/generated/notifications/notifications';
import type { NotificationRead } from '../../api/generated/schemas';
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
    '/personnel': { key: 'personnel', title: 'Personel Yönetimi' },
    '/devices': { key: 'devices', title: 'Cihazlar' },
    '/inventory': { key: 'inventory', title: 'Stok' },
    '/campaigns': { key: 'campaigns', title: 'Kampanyalar' },
    '/web-management': { key: 'web-management', title: 'Web Sitesi' },
    '/web-management-preview': { key: 'web-management-preview', title: 'Web Sitesi Onizleme' },
    '/sgk': { key: 'sgk', title: 'SGK' },
    '/settings': { key: 'settings', title: 'Ayarlar' },
    '/team': { key: 'team', title: 'Ekip' },
    '/reports': { key: 'reports', title: 'Raporlar' },
    '/dashboard': { key: 'dashboard', title: 'Dashboard' },
    '/invoice-normalizer': { key: 'invoice-normalizer', title: 'Muhasebe' },
  };

  // Exact match first
  if (pathMap[pathname]) return pathMap[pathname];

  // Prefix match
  for (const [prefix, value] of Object.entries(pathMap)) {
    if (pathname.startsWith(prefix)) return value;
  }

  return null;
};

const usesStaticHeaderLayout = (pathname: string): boolean => (
  pathname.startsWith('/parties/')
  || pathname.startsWith('/inventory/')
  || pathname.startsWith('/suppliers/')
  || pathname.startsWith('/invoices/new')
  || pathname.startsWith('/invoices/summary')
  || pathname === '/web-management-preview'
);

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

  // Feature flags for sidebar
  const { features: enabledFeatures } = useFeatures();

  // Sector-based module gating
  const { enabledModules } = useSector();

  // Dynamic document title based on sector
  useDynamicTitle();

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
  const { hasAnyPermission, hasPermission, isSuperAdmin } = usePermissions();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const shouldUseStaticHeader = usesStaticHeaderLayout(location.pathname);

  const visibleSidebarItemIds = React.useMemo(() => {
    const canViewDashboard = isSuperAdmin || hasAnyPermission(['dashboard.view', 'dashboard.analytics']);
    const canViewParties = isSuperAdmin || hasPermission('parties.view');
    const canViewAppointments = isSuperAdmin || hasPermission('appointments.view');
    const canViewInventory = isSuperAdmin || hasPermission('inventory.view');
    const canViewSales = isSuperAdmin || hasPermission('sales.view');
    const canViewFinance = isSuperAdmin || hasAnyPermission(['finance.view', 'finance.cash_register']);
    const canViewCampaigns = isSuperAdmin || hasPermission('campaigns.view');
    const canViewInvoices = isSuperAdmin || hasPermission('invoices.view');
    const canViewSgk = isSuperAdmin || hasPermission('sgk.view');
    const canViewReports = isSuperAdmin || hasAnyPermission([
      'reports.view',
      'reports.overview.view',
      'reports.sales.view',
      'reports.parties.view',
      'reports.promissory.view',
      'reports.remaining.view',
      'reports.pos_movements.view',
      'reports.report_tracking.view',
      'reports.activity.view'
    ]);
    const canViewSettings = isSuperAdmin || hasAnyPermission(['settings.view', 'team.view', 'team.permissions']);
    const canViewTeam = isSuperAdmin || hasAnyPermission(['team.view', 'team.permissions']);

    return [
      ...(canViewDashboard ? ['dashboard'] : []),
      ...(canViewParties ? ['patients'] : []),
      ...(canViewAppointments ? ['appointments'] : []),
      ...(canViewInventory ? ['inventory'] : []),
      ...(canViewSales ? ['sales'] : []),
      ...(canViewFinance ? ['payments'] : []),
      ...(canViewCampaigns ? ['campaigns'] : []),
      ...(canViewInvoices ? ['invoices', 'outgoing-invoices', 'incoming-invoices', 'proformas', 'invoice-summary', 'new-invoice', 'purchases'] : []),
      ...(canViewSgk ? ['sgk-reports', 'sgk-upload', 'sgk-reports-list', 'uts'] : []),
      ...(canViewReports ? ['reports', 'reports-overview', 'reports-cashflow'] : []),
      ...(canViewSettings ? ['settings', 'settings-company', 'settings-integration', 'settings-parties', 'settings-sgk', 'settings-subscription'] : []),
      ...(canViewTeam ? ['settings-team', 'personnel'] : []),
    ];
  }, [hasAnyPermission, hasPermission, isSuperAdmin]);

  const { data: notificationsResponse, isLoading: notificationsLoading } = useListNotifications(undefined, {
    query: {
      enabled: !!user && showNotifications,
      staleTime: 60 * 1000,
      select: (response) => response.data ?? [],
    },
  });

  const notifications = React.useMemo(() => (
    Array.isArray(notificationsResponse) ? (notificationsResponse as NotificationRead[]) : []
  ), [notificationsResponse]);
  const hasUnreadNotifications = notifications.some((notification) => notification.isRead === false);

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
    <div className="flex min-h-screen bg-background text-foreground">
      {/* New Sidebar Component */}
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={!sidebarOpen && isDesktop}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onClose={() => setSidebarOpen(false)}
        currentPath={location.href}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
        onNavigate={(href) => {
          navigate({ to: href as string });
        }}
        enabledFeatures={enabledFeatures}
        visibleItemIds={visibleSidebarItemIds}
        enabledModules={enabledModules}
      />

      {/* Main Content */}
       <div className={cn(
         "flex-1 flex flex-col transition-[margin] duration-300 min-w-0",
         isMobile ? "ml-0" : (
           isTablet ? "ml-24" : (sidebarOpen ? "ml-0 md:ml-72" : "ml-0 md:ml-24")
         )
       )}>
        {/* Header - Modern Floating Glassmorphism Pill */}
        {!hideGlobalHeader && (
        <header className={cn(
          "mx-2 md:mx-6 mb-2 md:mb-4 px-3 sm:px-4 md:px-6 py-2 md:py-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-border/50/50 shadow-sm rounded-xl md:rounded-2xl transition-all",
          shouldUseStaticHeader ? "relative" : "sticky top-2 md:top-4 z-40",
        )}>
          <div className="flex justify-between items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Button
                onClick={toggleSidebar}
                className="p-2 h-auto min-h-[44px] min-w-[44px] text-foreground hover:bg-muted dark:hover:bg-gray-700"
                variant='ghost'>
                <Menu size={20} />
              </Button>
            )}

            {/* Page Title */}
            <h1 className="m-0 text-base sm:text-lg md:text-2xl font-semibold text-foreground whitespace-nowrap truncate">
              {getPageKeyFromPath(location.pathname)?.title || 'Dashboard'}
            </h1>

            {/* AI Composer Trigger - Desktop Only */}
            <div className="hidden md:flex flex-1 max-w-xl mx-4">
              <div
                onClick={toggleOpen}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2 rounded-2xl cursor-pointer transition-colors border",
                  "bg-gray-50 dark:bg-gray-900 border-border",
                  "hover:bg-muted dark:hover:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500"
                )}
              >
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Search size={18} />
                  <Bot size={18} className="text-primary" />
                  <span className="text-sm">{t('header.search_placeholder')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-white dark:bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
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
                className="p-2 h-auto min-h-[44px] min-w-[44px] text-foreground hover:bg-muted dark:hover:bg-gray-700"
                title={isDark ? 'Açık Tema' : 'Koyu Tema'}
                variant='ghost'>
                {isDark ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
              </Button>

              {/* Notifications - Hidden on mobile */}
              <div className="relative hidden sm:block">
                <Button
                  onClick={() => setShowNotifications((current) => !current)}
                  className="relative flex p-2 h-auto min-h-[44px] min-w-[44px] text-foreground hover:bg-muted dark:hover:bg-gray-700"
                  title={t('header.notifications')}
                  variant='ghost'>
                  <Bell size={18} className="sm:w-5 sm:h-5" />
                  {hasUnreadNotifications ? (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  ) : null}
                </Button>

                {showNotifications ? (
                  <div className="absolute right-0 top-full mt-3 w-[360px] overflow-hidden rounded-[24px] border border-border/80 bg-white/95 shadow-2xl backdrop-blur-xl/80 dark:bg-gray-900/95 z-[1100]">
                    <div className="border-b border-border/80 px-4 py-3/80">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">Bildirimler</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Son sistem ve ekip bildirimleri burada listelenir
                      </div>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto p-3">
                      {notificationsLoading ? (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                          Bildirimler yukleniyor
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                          Henuz bildiriminiz yok
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={cn(
                                "rounded-[20px] border px-4 py-3 transition-colors",
                                notification.isRead === false
                                  ? "border-sky-200 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/30"
                                  : "border-border bg-white/80 dark:bg-gray-950/40"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {notification.title}
                                  </div>
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    {notification.message}
                                  </div>
                                </div>
                                {notification.isRead === false ? (
                                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

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
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-xl bg-muted/50" title="AI Durumu">
                  <Bot size={16} className="text-muted-foreground" />
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
                  className="flex items-center gap-2 p-2 h-auto min-h-[44px] rounded-xl bg-muted/50 text-foreground hover:bg-accent dark:hover:bg-gray-700 transition-colors"
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
                  <div className="absolute top-full right-0 mt-2 min-w-[200px] bg-white dark:bg-gray-800 border border-border rounded-2xl shadow-xl z-[1000] py-2">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center px-4 py-3 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 w-full text-left transition-colors border-b border-border"
                    >
                      <User size={16} className="mr-2" />
                      <span>{t('header.profile')}</span>
                    </Link>
                    <Link
                      to={"/settings" as unknown as "/"}
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center px-4 py-3 text-sm text-foreground hover:bg-muted dark:hover:bg-gray-700 w-full text-left transition-colors border-b border-border"
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
                      className="flex items-center w-full px-4 py-3 text-sm text-destructive hover:bg-muted dark:hover:bg-gray-700 hover:text-destructive transition-colors h-auto"
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
          "flex-1 bg-background",
          location.pathname === '/settings'
            ? 'h-[calc(100vh-64px)] overflow-hidden'
            : location.pathname === '/reports'
              ? 'relative h-[calc(100vh-64px)]'
              : 'min-h-[calc(100vh-64px)]',
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
