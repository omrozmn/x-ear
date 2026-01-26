import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Home, Users, Calendar, User } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import '@/styles/mobile.css';
import { useTranslation } from 'react-i18next';

interface NavItem {
    icon: React.ReactNode;
    label: string;
    href: string;
    badge?: number;
}

const navItems: NavItem[] = [
    { icon: <Home className="h-5 w-5" />, label: 'nav.dashboard', href: '/' },
    { icon: <Users className="h-5 w-5" />, label: 'nav.patients', href: '/parties' },
    { icon: <Calendar className="h-5 w-5" />, label: 'nav.appointments', href: '/appointments' },
    { icon: <User className="h-5 w-5" />, label: 'header.profile', href: '/profile' },
];

export const BottomNav: React.FC = () => {
    const { t } = useTranslation('layout');
    const location = useLocation();
    const { triggerSelection } = useHaptic();

    const isActive = (href: string) => {
        if (href === '/') return location.pathname === '/';
        return location.pathname.startsWith(href);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 safe-area-inset-bottom">
            <div className="grid grid-cols-4 h-16">
                {navItems.map((item) => {
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => triggerSelection()}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 transition-colors relative",
                                active ? "text-primary-600" : "text-gray-500"
                            )}
                        >
                            <div className="relative">
                                {item.icon}
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>

                            <span className={cn(
                                "text-[10px] font-medium",
                                active && "font-semibold"
                            )}>
                                {t(item.label)}
                            </span>

                            {active && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-600 rounded-b-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};
