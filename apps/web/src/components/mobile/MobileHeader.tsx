import React, { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
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
                "bg-white border-b border-gray-200 z-40 pt-safe",
                sticky && "sticky top-0",
                className
            )}
        >
            <div className="flex items-center justify-between h-14 px-4">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {showBack && (
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}

                    <h1 className="text-lg font-semibold text-gray-900 truncate">
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
