import { Link, useLocation } from '@tanstack/react-router';
import { Home, BarChart3, Users, Settings } from 'lucide-react';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';

interface BottomNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const bottomNavItems: BottomNavItem[] = [
  { name: 'Ana Sayfa', href: '/', icon: Home },
  { name: 'Raporlar', href: '/analytics', icon: BarChart3 },
  { name: 'Kullanıcılar', href: '/users', icon: Users },
  { name: 'Ayarlar', href: '/settings', icon: Settings },
];

export function AdminBottomNav() {
  const location = useLocation();
  const { isMobile } = useAdminResponsive();

  if (!isMobile) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mobile-bottom-nav">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`
                flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors touch-feedback
                ${active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
