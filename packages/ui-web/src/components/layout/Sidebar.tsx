import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Calendar,
  Package,
  Truck,
  DollarSign,
  Megaphone,
  Settings,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  X,
  BarChart3,
  ShoppingCart,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { useBreakpoints } from '../../hooks/useMediaQuery';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: MenuItem[];
  badge?: string | number;
}

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
  currentPath?: string;
  isMobile?: boolean;
  isTablet?: boolean;
  isDesktop?: boolean;
  onNavigate?: (href: string) => void;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
    href: '/',
  },
  {
    id: 'patients',
    label: 'Hastalar',
    icon: <Users className="w-5 h-5" />,
    href: '/parties',
  },
  {
    id: 'appointments',
    label: 'Randevular',
    icon: <Calendar className="w-5 h-5" />,
    href: '/appointments',
  },
  {
    id: 'inventory',
    label: 'Envanter',
    icon: <Package className="w-5 h-5" />,
    href: '/inventory',
  },
  {
    id: 'suppliers',
    label: 'Tedarikçiler',
    icon: <Truck className="w-5 h-5" />,
    href: '/suppliers',
  },
  {
    id: 'sales',
    label: 'Satışlar',
    icon: <ShoppingCart className="w-5 h-5" />,
    href: '/sales',
  },
  {
    id: 'purchases',
    label: 'Alışlar',
    icon: <CreditCard className="w-5 h-5" />,
    href: '/purchases',
  },
  {
    id: 'payments',
    label: 'Ödemeler',
    icon: <DollarSign className="w-5 h-5" />,
    href: '/payments',
  },
  {
    id: 'campaigns',
    label: 'Kampanyalar',
    icon: <Megaphone className="w-5 h-5" />,
    href: '/campaigns',
  },
  {
    id: 'invoices',
    label: 'Faturalar',
    icon: <FileText className="w-5 h-5" />,
    children: [
      {
        id: 'outgoing-invoices',
        label: 'Giden Faturalar',
        icon: <FileText className="w-4 h-4" />,
        href: '/invoices',
      },
      {
        id: 'incoming-invoices',
        label: 'Gelen Faturalar',
        icon: <FileText className="w-4 h-4" />,
        href: '/invoices/incoming',
      },
      {
        id: 'invoice-summary',
        label: 'Fatura Özeti',
        icon: <BarChart3 className="w-4 h-4" />,
        href: '/invoices/summary',
      },
      {
        id: 'new-invoice',
        label: 'Yeni Fatura',
        icon: <PlusCircle className="w-4 h-4" />,
        href: '/invoices/new',
      },
    ],
  },
  {
    id: 'sgk-reports',
    label: 'SGK',
    icon: <Activity className="w-5 h-5" />,
    children: [
      {
        id: 'sgk-upload',
        label: 'SGK Yükleme',
        icon: <Activity className="w-4 h-4" />,
        href: '/sgk/upload',
      },
      {
        id: 'sgk-reports-list',
        label: 'Rapor Listesi',
        icon: <Activity className="w-4 h-4" />,
        href: '/sgk/reports',
      },
    ],
  },
  {
    id: 'reports',
    label: 'Raporlar',
    icon: <BarChart3 className="w-5 h-5" />,
    href: '/reports',
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: <Settings className="w-5 h-5" />,
    children: [
      {
        id: 'settings-company',
        label: 'Firma Bilgileri',
        icon: <Settings className="w-4 h-4" />,
        href: '/settings?tab=company',
      },
      {
        id: 'settings-integration',
        label: 'Entegrasyonlar',
        icon: <Settings className="w-4 h-4" />,
        href: '/settings?tab=integration',
      },
      {
        id: 'settings-team',
        label: 'Ekip Yönetimi',
        icon: <Settings className="w-4 h-4" />,
        href: '/settings?tab=team',
      },
      {
        id: 'settings-parties',
        label: 'Hasta Ayarları',
        icon: <Settings className="w-4 h-4" />,
        href: '/settings?tab=parties',
      },
      {
        id: 'settings-sgk',
        label: 'SGK Ayarları',
        icon: <Settings className="w-4 h-4" />,
        href: '/settings?tab=sgk',
      },
      {
        id: 'settings-subscription',
        label: 'Abonelik',
        icon: <Settings className="w-4 h-4" />,
        href: '/settings?tab=subscription',
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggle,
  onClose,
  currentPath = '/',
  isMobile: propIsMobile,
  isTablet: propIsTablet,
  isDesktop: propIsDesktop,
  onNavigate,
}) => {
  const breakpoints = useBreakpoints();
  const isMobile = propIsMobile ?? breakpoints.isMobile;
  const isTablet = propIsTablet ?? breakpoints.isTablet;
  const isDesktop = propIsDesktop ?? breakpoints.isDesktop;

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load expanded items from localStorage
  useEffect(() => {
    const savedExpanded = localStorage.getItem('sidebar-expanded');
    if (savedExpanded) {
      setExpandedItems(new Set(JSON.parse(savedExpanded)));
    }
  }, []);

  // Save expanded items to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify([...expandedItems]));
  }, [expandedItems]);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/') return currentPath === '/';
    return currentPath === href;
  };

  const handleNavigation = (href?: string) => {
    if (href && onNavigate) {
      onNavigate(href);
      if (isMobile) {
        onClose();
      }
    }
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.href);
    const showLabel = !isCollapsed || isMobile;

    return (
      <div key={item.id}>
        <div
          data-testid={`sidebar-menu-${item.id}`}
          className={`
            flex items-center text-sm font-medium rounded-2xl border border-transparent cursor-pointer transition-all
            ${level > 0 ? (isCollapsed && !isMobile ? 'ml-0 justify-center' : 'ml-6') : ''}
            ${active
              ? 'border-blue-200/70 bg-gradient-to-r from-blue-500/15 via-cyan-500/10 to-transparent text-blue-700 shadow-sm shadow-blue-500/10 dark:border-blue-500/20 dark:text-blue-200'
              : 'text-slate-700 dark:text-slate-200 hover:border-white/70 hover:bg-white/70 dark:hover:border-white/10 dark:hover:bg-white/5'
             }
            ${!showLabel ? 'justify-center w-10 h-10 mx-auto p-0 mb-1' : 'px-3 py-2 w-full'}
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              handleNavigation(item.href);
            }
          }}
        >
          <div className={`flex items-center ${showLabel ? 'flex-1 min-w-0' : 'justify-center w-full'}`} data-testid={`sidebar-menu-item-${item.id}`}>
            <div className={`flex-shrink-0 flex items-center justify-center ${!showLabel ? 'w-full h-full' : ''}`} data-testid={`sidebar-icon-${item.id}`}>
              {item.icon}
            </div>
            {showLabel && (
              <>
                <span className="ml-3 truncate" data-testid={`sidebar-label-${item.id}`}>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid={`sidebar-badge-${item.id}`}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </div>
          {hasChildren && showLabel && (
            <div className="flex-shrink-0 ml-2" data-testid={`sidebar-expand-${item.id}`}>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
        </div>

        {/* Submenu */}
        {hasChildren && isExpanded && showLabel && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Mobile: Full screen overlay
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75"
            onClick={onClose}
          />
        )}

        {/* Sidebar */}
        <div
          data-testid="sidebar-container"
          className={`
            fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl 
            border-r border-gray-200/50 dark:border-gray-700/50 transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700" data-testid="sidebar-header">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">X</span>
                </div>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
                X-Ear
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              data-testid="sidebar-close-button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => renderMenuItem(item))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              X-Ear v1.0.0
            </div>
          </div>
        </div>
      </>
    );
  }

  // Tablet: Icon-only sidebar (64px)
  if (isTablet) {
    return (
        <div
          data-testid="sidebar-container"
          className="fixed bottom-4 left-4 top-4 z-40 w-16 overflow-hidden rounded-[28px] border border-white/60 bg-white/75 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70"
        >
          {/* Header */}
          <div className="flex items-center justify-center h-16 border-b border-slate-200/70 dark:border-white/10" data-testid="sidebar-header">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">X</span>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>
      </div>
    );
  }

  // Desktop: Collapsible sidebar (256px or 64px)
  return (
      <div
        data-testid="sidebar-container"
        className={`
         fixed bottom-4 left-4 top-4 z-40 flex flex-col overflow-hidden rounded-[28px] bg-white/75 backdrop-blur-xl 
         border border-white/60 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.4)] transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-slate-900/70
         ${isCollapsed ? 'w-16' : 'w-64'}
       `}
     >
       {/* Header */}
       <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/70 dark:border-white/10" data-testid="sidebar-header">
         {!isCollapsed && (
           <div className="flex items-center">
             <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">X</span>
              </div>
            </div>
            <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
              X-Ear
            </span>
          </div>
        )}

        {isCollapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">X</span>
            </div>
          </div>
        )}

        {/* Desktop collapse button */}
         {!isCollapsed && (
           <button
             onClick={onToggle}
             className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 dark:hover:bg-white/10"
             data-testid="sidebar-collapse-button"
           >
             <ChevronRight className="w-4 h-4 transition-transform rotate-180" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
       {isCollapsed && (
         <div className="flex justify-center py-2 border-b border-slate-200/70 dark:border-white/10">
           <button
             onClick={onToggle}
             className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/80 dark:hover:bg-white/10"
             data-testid="sidebar-expand-button"
           >
             <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>

      {/* Footer */}
       {!isCollapsed && (
         <div className="p-4 border-t border-slate-200/70 dark:border-white/10">
           <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
             X-Ear v1.0.0
           </div>
         </div>
      )}
    </div>
  );
};

export default Sidebar;
