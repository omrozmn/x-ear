import { Button } from '@x-ear/ui-web';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from '@tanstack/react-router';
import {
  BarChart3,
  Users,
  Calendar,
  Package,
  Building2,
  FileText,
  Wallet,
  PieChart,
  Bot,
  Settings,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
  ChevronDown,
  MessageSquare,
  CreditCard,
  Search,
  Command
} from 'lucide-react';
import { useAuthStore, AuthStateUser } from '../../stores/authStore';
import { DebugRoleSwitcher } from './DebugRoleSwitcher';
import { DebugTenantSwitcher } from './DebugTenantSwitcher';
import { PagePermissionsViewer } from './PagePermissionsViewer';
import { useTheme } from '../theme-provider';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GlobalOfflineAlert } from '../common/GlobalOfflineAlert';
// AI Components - conditionally rendered based on AI availability
import { AIChatWidget, AIFeatureWrapper, AIStatusIndicator, PhaseABanner } from '../../ai/components';
import { ComposerOverlay } from '../../components/ai/ComposerOverlay';
import { useComposerStore } from '../../stores/composerStore';
import { useAIStatus, useAIContextSync } from '../../ai/hooks';
import { useHotkeys } from 'react-hotkeys-hook';
import { 
  SIDEBAR_COLLAPSED, 
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
  const { user: rawUser, subscription } = useAuthStore();
  const user = rawUser as AuthStateUser | null;
  console.log('MainLayout render - user:', user);

  const navigate = useNavigate();
  const location = useLocation();

  // AI Status for header indicator
  const { data: aiStatus } = useAIStatus({ enabled: !!user });

  // AI Context Sync - monitors tenant/party changes and cleared AI stores
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

  // Derived state for backward compatibility and children props
  // Note: We use a simple check here. For full accuracy we might need a listener, 
  // but usually 'dark' class is enough for CSS. 
  // For JS logic passed to children, we approximate.
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Define MenuItem interface locally
  interface MenuItem {
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    href?: string;
    submenu?: { label: string; href: string }[];
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED);
    return saved ? JSON.parse(saved) : false;
  });

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Removed direct DOM manipulation for dark mode as ThemeProvider handles it.

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleDarkMode = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const toggleSubmenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3, href: '/' },
    { key: 'parties', label: 'Hastalar', icon: Users, href: '/parties' },
    { key: 'appointments', label: 'Randevular', icon: Calendar, href: '/appointments' },
    {
      key: 'invoices',
      label: 'Fatura',
      icon: FileText,
      submenu: [
        { label: 'Satışlar', href: '/invoices' },
        { label: 'Alışlar', href: '/invoices/purchases' },
        { label: 'Yeni Fatura', href: '/invoices/new' },
        { label: 'Ödeme Takibi', href: '/invoices/payments' }
      ]
    },
    { key: 'inventory', label: 'Envanter', icon: Package, href: '/inventory' },
    { key: 'suppliers', label: 'Tedarikçiler', icon: Building2, href: '/suppliers' },
    { key: 'pos', label: 'Tahsilat (POS)', icon: CreditCard, href: '/pos' },
    { key: 'cashflow', label: 'Kasa', icon: Wallet, href: '/cashflow' },
    { key: 'campaigns', label: 'SMS Gönderimi', icon: MessageSquare, href: '/campaigns' },
    /* SGK - v1'de aktif edilecek
    {
      key: 'sgk',
      label: 'SGK',
      icon: Building,
      submenu: [
        { label: 'SGK Raporlari', href: '/sgk' },
        { label: 'Hasta Eslestirme', href: '/sgk/matching' },
        { label: 'Belge Yukleme', href: '/sgk/upload' },
        { label: 'Belge Indirme', href: '/sgk/downloads' }
      ]
    },
    */
    { key: 'reports', label: 'Raporlar', icon: PieChart, href: '/reports' },
    { key: 'automation', label: 'Otomasyon', icon: Bot, href: '/automation' },
    {
      key: 'settings',
      label: 'Ayarlar',
      icon: Settings,
      submenu: [
        { label: 'Genel', href: '/settings' },
        { label: 'Entegrasyon', href: '/settings/integration' },
        { label: 'Ekip Yönetimi', href: '/settings/team' },
        { label: 'Abonelik', href: '/settings/subscription' }
      ]
    }
  ];

  const renderMenuItem = (item: MenuItem) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus[item.key];

    return (
      <li key={item.key} className="mb-1">
        <div
          className={cn(
            "flex items-center py-3 px-4 rounded-md cursor-pointer transition-all duration-200",
            "text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
          )}
          onClick={() => {
            if (hasSubmenu) {
              toggleSubmenu(item.key);
            } else {
              navigate({ to: item.href });
            }
          }}
        >
          <span className={sidebarCollapsed ? 'mr-0' : 'mr-3'}>
            <item.icon size={20} />
          </span>
          {!sidebarCollapsed && (
            <>
              <span className="flex-1">{item.label}</span>
              {hasSubmenu && (
                <span className={cn(
                  "transition-transform duration-200",
                  isExpanded ? "rotate-90" : "rotate-0"
                )}>
                  <ChevronRight size={16} />
                </span>
              )}
            </>
          )}
        </div>

        {hasSubmenu && !sidebarCollapsed && isExpanded && item.submenu && (
          <ul className="list-none p-0 m-0 mt-1 ml-8 border-l-2 border-gray-200 dark:border-gray-700">
            {item.submenu.map((subItem, index) => (
              <li key={index}>
                <Link
                  to={subItem.href}
                  className={cn(
                    "block py-2 px-4 text-sm rounded-md transition-all duration-200",
                    "text-gray-500 dark:text-gray-400 no-underline",
                    "hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  {subItem.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  // Make toggleSidebar available globally for legacy compatibility
  useEffect(() => {
    window.toggleSidebar = toggleSidebar;
    return () => {
      delete window.toggleSidebar;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      {/* Sidebar */}
      <nav className={cn(
        "fixed h-screen overflow-y-auto z-[1000] transition-[width] duration-300",
        "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700",
        sidebarCollapsed ? "w-[80px]" : "w-[240px]"
      )}>
        <div className={cn(
          "p-4 flex items-center border-b border-gray-200 dark:border-gray-700",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          <Button
            onClick={toggleSidebar}
            className="p-2 h-auto text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            variant='ghost'>
            <Menu size={20} />
          </Button>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <img src="/logo/x.svg" alt="X-Ear Logo" className="w-6 h-6" />
              <h2 className="m-0 text-xl font-bold text-gray-800 dark:text-white">
                X-EAR CRM
              </h2>
            </div>
          )}
        </div>

        <ul className="list-none py-4 px-2 m-0">
          {menuItems.map(renderMenuItem)}
        </ul>
      </nav>
      {/* Main Content */}
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-[margin] duration-300",
        sidebarCollapsed ? "ml-[80px]" : "ml-[240px]"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-[999] px-8 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center gap-4">
            <h1 className="m-0 text-2xl font-semibold text-gray-800 dark:text-white whitespace-nowrap">
              Dashboard
            </h1>

            {/* AI Composer Trigger - Centered Search Bar */}
            <AIFeatureWrapper hideWhenUnavailable showLoading={false}>
              <div className="hidden md:flex flex-1 max-w-xl mx-4">
                <div
                  onClick={toggleOpen}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors border",
                    "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
                    "hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500"
                  )}
                >
                  <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                    <Search size={18} />
                    <Bot size={18} className="text-blue-500" />
                    <span className="text-sm">AI ile arama yap veya işlem başlat...</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-white dark:bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-gray-500 dark:text-gray-400 opacity-100">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </div>
                </div>
              </div>
            </AIFeatureWrapper>

            <div className="flex items-center gap-4">
              {/* Dark Mode Toggle */}
              <Button
                onClick={toggleDarkMode}
                className="p-2 h-auto text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                title={isDark ? 'Açık Tema' : 'Koyu Tema'}
                variant='ghost'>
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </Button>

              {/* Notifications */}
              <Button
                className="relative p-2 h-auto text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Bildirimler"
                variant='ghost'>
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>

              {/* AI Status Indicator - Shows AI availability status */}
              <AIFeatureWrapper hideWhenUnavailable showLoading={false}>
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700/50" title="AI Durumu">
                  <Bot size={16} className="text-gray-600 dark:text-gray-400" />
                  <AIStatusIndicator status={aiStatus} size="sm" showLabel />
                </div>
              </AIFeatureWrapper>

              {/* Debug Switchers (admin@x-ear.com only) */}
              <DebugTenantSwitcher darkMode={isDark} />
              <DebugRoleSwitcher darkMode={isDark} />

              {/* User Menu */}
              <div className="relative">
                <Button
                  onClick={toggleUserDropdown}
                  className="flex items-center gap-2 p-2 h-auto rounded-md bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  variant='ghost'>
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    <User size={16} />
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-medium">
                      {user?.name || 'User'}
                    </div>
                    <div className="text-xs opacity-70">
                      {user?.role || 'Guest'}
                    </div>
                  </div>
                  <ChevronDown size={12} />
                </Button>

                {/* User Dropdown */}
                {showUserDropdown && (
                  <div className="absolute top-full right-0 mt-2 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[1000] py-2">
                    <Link
                      to="/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors border-b border-gray-100 dark:border-gray-700"
                    >
                      <User size={16} className="mr-2" />
                      <span>Profil</span>
                    </Link>
                    <Link
                      to={"/settings" as unknown as "/"}
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors border-b border-gray-100 dark:border-gray-700"
                    >
                      <Settings size={16} className="mr-2" />
                      <span>Ayarlar</span>
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
                      className="flex items-center w-full px-4 py-3 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 transition-colors h-auto"
                      variant='ghost'>
                      <LogOut size={16} className="mr-2" />
                      <span>Çıkış Yap</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-80px)]">
          {(user?.isImpersonatingTenant || user?.isImpersonating) && (
            <div className="mb-4 p-3 rounded-lg flex items-center justify-between border-2 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-600 dark:border-emerald-500">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-emerald-800 dark:text-emerald-400" />
                <span className="font-semibold text-sm text-emerald-800 dark:text-emerald-400">
                  {user?.isImpersonatingTenant && `🏢 Impersonating: ${user?.tenantName}`}
                  {user?.isImpersonating && !(user?.isImpersonatingTenant) && `👤 Impersonating Role: ${user?.role}`}
                  {user?.isImpersonatingTenant && user?.isImpersonating && ` • Role: ${user?.role}`}
                </span>
              </div>
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                QA Debug Mode
              </span>
            </div>
          )}

          <GlobalOfflineAlert />

          {/* Phase A Banner - Shows when AI is in read-only mode */}
          {/* Dismissable per session, reappears on new session */}
          <PhaseABanner
            className="mb-4"
            storageKey={PHASE_A_BANNER_DISMISSED}
          />

          {children}

          {/* Page Permissions Viewer (admin@x-ear.com only) */}
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

      {/* AI Chat Widget - Conditionally rendered based on AI availability */}
      {/* Uses AIFeatureWrapper for graceful degradation - hides when AI unavailable */}
      <AIFeatureWrapper
        capability="chat"
        hideWhenUnavailable
        showLoading={false}
      >
        <AIChatWidget />
      </AIFeatureWrapper>

      {/* AI Composer Overlay (Cmd+K) */}
      <AIFeatureWrapper capability="actions" hideWhenUnavailable showLoading={false}>
        <ComposerOverlay />
      </AIFeatureWrapper>
    </div>
  );
};