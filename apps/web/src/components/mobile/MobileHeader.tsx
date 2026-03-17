import React, { ReactNode } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@x-ear/ui-web';
import { useLayoutStore } from '@/stores/layoutStore';
import { cn } from '@/lib/utils';
import '@/styles/mobile.css';

interface MobileHeaderProps {
    title: string;
    showBack?: boolean;
    onBack?: () => void;
    actions?: ReactNode;
    className?: string;
    sticky?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
    title,
    showBack = true,
    onBack,
    actions,
    className,
    sticky = true
}) => {
    const navigate = useNavigate();
    const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate({ to: '..' });
        }
    };

    return (
        <header
            className={cn(
                "z-40 pt-safe transition-all",
                sticky && "sticky top-2",
                "mx-2 mb-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-border/50/50 shadow-sm rounded-xl",
                className
            )}
        >
            <div className="flex items-center justify-between h-12 px-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {!showBack && (
                        <Button
                            onClick={toggleSidebar}
                            variant="ghost"
                            className="flex items-center justify-center rounded-full p-1.5 -ml-1 text-foreground transition-colors active:scale-95 hover:bg-muted dark:hover:bg-gray-800"
                        >
                            <Menu className="h-6 w-6" />
                        </Button>
                    )}
                    {showBack && (
                        <Button
                            onClick={handleBack}
                            variant="ghost"
                            className="flex items-center justify-center rounded-full p-1.5 -ml-1 text-foreground transition-colors active:scale-95 hover:bg-muted dark:hover:bg-gray-800"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    )}

                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {title}
                    </h1>
                </div>

                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
};
