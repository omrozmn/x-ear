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
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: MenuItem[];
  badge?: string | number;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentPath?: string;
  className?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
    href: '/dashboard',
  },
  {
    id: 'patients',
    label: 'Hastalar',
    icon: <Users className="w-5 h-5" />,
    href: '/patients',
    badge: '12',
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
    id: 'cashflow',
    label: 'Nakit Akışı',
    icon: <DollarSign className="w-5 h-5" />,
    href: '/cashflow',
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
        id: 'new-invoice',
        label: 'Yeni Fatura',
        icon: <FileText className="w-4 h-4" />,
        href: '/invoices/new',
      },
      {
        id: 'invoice-list',
        label: 'Fatura Listesi',
        icon: <FileText className="w-4 h-4" />,
        href: '/invoices',
      },
    ],
  },
  {
    id: 'sgk-reports',
    label: 'SGK Raporları',
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
    icon: <FileText className="w-5 h-5" />,
    children: [
      {
        id: 'financial-reports',
        label: 'Mali Raporlar',
        icon: <FileText className="w-4 h-4" />,
        href: '/reports/financial',
      },
      {
        id: 'patient-reports',
        label: 'Hasta Raporları',
        icon: <FileText className="w-4 h-4" />,
        href: '/reports/patients',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: <Settings className="w-5 h-5" />,
    href: '/settings',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  currentPath = '/dashboard',
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed) {
      setCollapsed(JSON.parse(savedCollapsed));
    }

    // Load expanded items from localStorage
    const savedExpanded = localStorage.getItem('sidebar-expanded');
    if (savedExpanded) {
      setExpandedItems(new Set(JSON.parse(savedExpanded)));
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  // Save expanded items to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify([...expandedItems]));
  }, [expandedItems]);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

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
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const active = isActive(item.href);

    return (
      <div key={item.id}>
        <div
          className={`
            flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors
            ${level > 0 ? 'ml-6' : ''}
            ${active
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else if (item.href) {
              // Navigate to the route
              window.location.href = item.href;
            }
          }}
        >
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex-shrink-0">
              {item.icon}
            </div>
            {!collapsed && (
              <>
                <span className="ml-3 truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </div>
          {hasChildren && !collapsed && (
            <div className="flex-shrink-0 ml-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
        </div>

        {/* Submenu */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-0
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">X</span>
                </div>
              </div>
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
                X-Ear
              </span>
            </div>
          )}
          
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse button */}
          <button
            onClick={toggleCollapsed}
            className="hidden lg:block p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              X-Ear v1.0.0
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;