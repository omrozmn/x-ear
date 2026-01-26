import React, { ReactNode, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

interface FABAction {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    color?: string;
}

interface FABProps {
    actions?: FABAction[];
    onClick?: () => void;
    icon?: ReactNode;
    className?: string;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export const FloatingActionButton: React.FC<FABProps> = ({
    actions = [],
    onClick,
    icon = <Plus className="h-6 w-6" />,
    className,
    position = 'bottom-right'
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { triggerImpact, triggerSelection } = useHaptic();

    const handleMainClick = () => {
        if (actions.length > 0) {
            setIsExpanded(!isExpanded);
            triggerImpact();
        } else if (onClick) {
            onClick();
            triggerSelection();
        }
    };

    const handleActionClick = (action: FABAction) => {
        action.onClick();
        setIsExpanded(false);
        triggerSelection();
    };

    const positionStyles = {
        'bottom-right': 'bottom-20 right-4',
        'bottom-left': 'bottom-20 left-4',
        'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2'
    };

    return (
        <>
            {/* Backdrop */}
            {isExpanded && (
                <div
                    onClick={() => setIsExpanded(false)}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
                />
            )}

            {/* FAB */}
            <div className={cn("fixed z-50 md:hidden", positionStyles[position], className)}>
                {/* Speed Dial Actions */}
                {isExpanded && actions.length > 0 && (
                    <div className="flex flex-col items-end gap-3 mb-4">
                        {actions.map((action, index) => (
                            <button
                                data-allow-raw="true"
                                key={index}
                                onClick={() => handleActionClick(action)}
                                className="flex items-center gap-3 group animate-in slide-in-from-bottom-4 fade-in duration-200"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <span className="bg-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-900 whitespace-nowrap">
                                    {action.label}
                                </span>

                                <div className={cn(
                                    "h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95",
                                    action.color || "bg-white text-gray-700"
                                )}>
                                    {action.icon}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Main FAB Button */}
                <button
                    data-allow-raw="true"
                    onClick={handleMainClick}
                    className={cn(
                        "h-14 w-14 rounded-full bg-primary-600 text-white shadow-lg flex items-center justify-center",
                        "hover:bg-primary-700 active:bg-primary-800 transition-all duration-200",
                        isExpanded && "rotate-45 bg-gray-700 hover:bg-gray-800"
                    )}
                >
                    {isExpanded && actions.length > 0 ? (
                        <X className="h-6 w-6" />
                    ) : (
                        icon
                    )}
                </button>
            </div>
        </>
    );
};
