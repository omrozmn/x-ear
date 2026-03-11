import * as React from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Button } from '@x-ear/ui-web';
import {
    BarChart3,
    Users,
    PlusCircle,
    Calendar,
    Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLayoutStore } from '../../stores/layoutStore';
import { useNewActionStore } from '../../stores/newActionStore';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

/** Returns label + action for the center "Yeni" button based on current path */
function useNewButtonConfig(pathname: string) {
    const { fireNewAction } = useNewActionStore();
    const navigate = useNavigate();

    if (pathname.startsWith('/parties')) {
        return { label: 'Yeni Hasta', action: () => fireNewAction() };
    }
    if (pathname.startsWith('/appointments')) {
        return { label: 'Randevu', action: () => fireNewAction() };
    }
    if (pathname.startsWith('/invoices')) {
        return { label: 'Yeni Fatura', action: () => navigate({ to: '/invoices/new' }) };
    }
    if (pathname.startsWith('/inventory')) {
        return { label: 'Yeni Ürün', action: () => fireNewAction() };
    }
    if (pathname.startsWith('/sales')) {
        return { label: 'Yeni Satış', action: () => navigate({ to: '/pos' }) };
    }
    if (pathname.startsWith('/purchases')) {
        return { label: 'Yeni Alış', action: () => navigate({ to: '/invoices/new' }) };
    }
    if (pathname.startsWith('/cashflow')) {
        return { label: 'Yeni Kayıt', action: () => fireNewAction() };
    }
    return { label: 'Yeni', action: () => navigate({ to: '/pos' }) };
}

export const BottomNav: React.FC = () => {
    const location = useLocation();
    const pathname = location.pathname;
    const { toggleAiInbox } = useLayoutStore();
    const { label: centerLabel, action: centerAction } = useNewButtonConfig(pathname);

    const navItems = [
        { label: 'Dashboard', icon: BarChart3, href: '/' },
        { label: 'Hastalar', icon: Users, href: '/parties' },
        { label: centerLabel, icon: PlusCircle, isCenter: true, onClick: centerAction },
        { label: 'AI', icon: Sparkles, onClick: toggleAiInbox, isSpecial: true },
        { label: 'Randevu', icon: Calendar, href: '/appointments' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[2000] bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe">
            <div className="flex justify-around items-end h-16">
                {navItems.map((item, idx) => {
                    const isActive = item.href ? (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) : false;

                    if (item.isCenter) {
                        return (
                            <Button
                                key={idx}
                                type="button"
                                variant="ghost"
                                onClick={item.onClick}
                                className="flex h-auto flex-col items-center justify-center -translate-y-4 !bg-transparent !p-0 hover:!bg-transparent"
                            >
                                <div className="w-14 h-14 rounded-full bg-blue-600 shadow-lg shadow-blue-500/40 flex items-center justify-center text-white active:scale-95 transition-transform">
                                    <item.icon size={28} />
                                </div>
                                <span className="text-[10px] mt-1 font-medium text-blue-600 dark:text-blue-400">
                                    {item.label}
                                </span>
                            </Button>
                        );
                    }

                    const Content = (
                        <div className={cn(
                            "flex flex-col items-center justify-center w-full h-full transition-colors cursor-pointer",
                            isActive || item.isSpecial
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-gray-500 dark:text-gray-400"
                        )}>
                            <item.icon size={22} className={cn(isActive && "animate-in zoom-in-75 duration-300")} />
                            <span className="text-[10px] mt-1 font-medium">
                                {item.label}
                            </span>
                        </div>
                    );

                    if (item.href) {
                        return (
                            <Link key={idx} to={item.href as string} className="flex-1">
                                {Content}
                            </Link>
                        );
                    }

                    return (
                        <div key={idx} onClick={item.onClick} className="flex-1">
                            {Content}
                        </div>
                    );
                })}
            </div>
        </nav>
    );
};
