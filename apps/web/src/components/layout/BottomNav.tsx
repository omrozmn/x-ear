import * as React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
    BarChart3,
    Users,
    PlusCircle,
    FileText,
    Calendar
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export const BottomNav: React.FC = () => {
    const location = useLocation();
    const pathname = location.pathname;

    const navItems = [
        { label: 'Dashboard', icon: BarChart3, href: '/' },
        { label: 'Hastalar', icon: Users, href: '/parties' },
        { label: 'Yeni', icon: PlusCircle, href: '/pos', isCenter: true },
        { label: 'Faturalar', icon: FileText, href: '/invoices' },
        { label: 'Randevu', icon: Calendar, href: '/appointments' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[2000] bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe">
            <div className="flex justify-around items-end h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                    if (item.isCenter) {
                        return (
                            <Link
                                key={item.href}
                                to={item.href as any}
                                className="flex flex-col items-center justify-center -translate-y-4"
                            >
                                <div className="w-14 h-14 rounded-full bg-blue-600 shadow-lg shadow-blue-500/40 flex items-center justify-center text-white active:scale-95 transition-transform">
                                    <item.icon size={28} />
                                </div>
                                <span className="text-[10px] mt-1 font-medium text-blue-600 dark:text-blue-400">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            to={item.href as any}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full transition-colors",
                                isActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gray-500 dark:text-gray-400"
                            )}
                        >
                            <item.icon size={22} className={cn(isActive && "animate-in zoom-in-75 duration-300")} />
                            <span className="text-[10px] mt-1 font-medium">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};
