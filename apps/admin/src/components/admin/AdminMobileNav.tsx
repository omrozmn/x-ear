import { useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  Home, Building2, Users, User, Calendar, Box, Truck, Megaphone,
  Package, ShoppingBag, Bell, Key, Shield, CreditCard, PlusCircle,
  MessageSquare, Bot, BarChart3, Activity, FileText, Settings, X,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    name: 'Ana Menü',
    items: [
      { name: 'Dashboard', href: '/', icon: Home },
      { name: 'Raporlar', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    name: 'Yönetim',
    items: [
      { name: 'Aboneler', href: '/tenants', icon: Building2 },
      { name: 'Kullanıcılar', href: '/users', icon: Users },
      { name: 'Hastalar', href: '/patients', icon: User },
      { name: 'Randevular', href: '/appointments', icon: Calendar },
    ],
  },
  {
    name: 'Operasyon',
    items: [
      { name: 'Cihaz & Stok', href: '/inventory', icon: Box },
      { name: 'Tedarikçiler', href: '/suppliers', icon: Truck },
      { name: 'Kampanyalar', href: '/campaigns', icon: Megaphone },
      { name: 'Üretim Takibi', href: '/production', icon: Package },
      { name: 'Pazaryerleri', href: '/marketplaces', icon: ShoppingBag },
    ],
  },
  {
    name: 'Sistem',
    items: [
      { name: 'Bildirimler', href: '/notifications', icon: Bell },
      { name: 'API Anahtarları', href: '/api-keys', icon: Key },
      { name: 'Roller', href: '/roles', icon: Shield },
      { name: 'Planlar', href: '/plans', icon: CreditCard },
      { name: 'Affiliateler', href: '/affiliates', icon: Users },
      { name: 'Eklentiler', href: '/addons', icon: PlusCircle },
    ],
  },
  {
    name: 'İletişim',
    items: [
      { name: 'SMS Başlıkları', href: '/sms/headers', icon: MessageSquare },
      { name: 'SMS Paketleri', href: '/sms/packages', icon: Package },
    ],
  },
  {
    name: 'AI & Gelişmiş',
    items: [
      { name: 'AI Yönetimi', href: '/ai', icon: Bot },
      { name: 'Aktivite Logları', href: '/activity', icon: Activity },
      { name: 'Dosyalar', href: '/files', icon: FileText },
    ],
  },
];

interface AdminMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminMobileNav({ isOpen, onClose }: AdminMobileNavProps) {
  const location = useLocation();
  const { isMobile } = useAdminResponsive();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Ana Menü']));

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [isOpen, location.pathname, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isMobile) {
    return null;
  }

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div className={`mobile-drawer ${isOpen ? 'open' : ''} dark:mobile-drawer-dark`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 pt-safe">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">XE</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">X-Ear Admin</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Super Admin Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 pb-safe hide-scrollbar">
          {navigationGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.name);
            
            return (
              <div key={group.name} className="mb-4">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors no-select"
                >
                  <span>{group.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Group Items */}
                {isExpanded && (
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={`
                            flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors touch-feedback
                            ${active
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }
                          `}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 pb-safe">
          <Link
            to="/settings"
            className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-feedback"
          >
            <Settings className="h-5 w-5" />
            <span className="text-sm font-medium">Ayarlar</span>
          </Link>
        </div>
      </div>
    </>
  );
}
