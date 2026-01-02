import React, { useState, ReactNode, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
    className?: string;
    pullingContent?: ReactNode;
    refreshingContent?: ReactNode;
    threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
    onRefresh,
    children,
    className,
    pullingContent,
    refreshingContent,
    threshold = 80
}) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: TouchEvent) => {
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].pageY;
            setIsPulling(true);
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isPulling || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const distance = Math.max(0, currentY - startY.current);

        if (distance > 0) {
            e.preventDefault();
            // Add resistance to pull
            const maxPull = threshold * 2;
            const resistance = 1 - distance / maxPull;
            const adjustedDistance = distance * Math.max(0.3, resistance);
            setPullDistance(Math.min(adjustedDistance, maxPull));
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling) return;

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
        setIsPulling(false);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isPulling, pullDistance, isRefreshing]);

    const showPullIndicator = (isPulling || isRefreshing) && pullDistance > 0;
    const progress = Math.min((pullDistance / threshold) * 100, 100);

    return (
        <div ref={containerRef} className={cn("relative overflow-auto", className)}>
            {/* Pull Indicator */}
            {showPullIndicator && (
                <div
                    className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out z-50"
                    style={{
                        height: `${pullDistance}px`,
                        opacity: Math.min(pullDistance / threshold, 1)
                    }}
                >
                    <div className="flex flex-col items-center gap-2">
                        {isRefreshing ? (
                            refreshingContent || (
                                <div className="h-8 w-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
                            )
                        ) : (
                            pullingContent || (
                                <div className="relative h-8 w-8">
                                    <svg className="transform rotate-180" viewBox="0 0 32 32">
                                        <circle
                                            className="text-gray-200"
                                            strokeWidth="3"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="14"
                                            cx="16"
                                            cy="16"
                                        />
                                        <circle
                                            className="text-primary-600 transition-all duration-300"
                                            strokeWidth="3"
                                            strokeDasharray={87.96}
                                            strokeDashoffset={87.96 - (87.96 * progress) / 100}
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="14"
                                            cx="16"
                                            cy="16"
                                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                                        />
                                    </svg>
                                </div>
                            )
                        )}
                        <span className="text-xs font-medium text-gray-600">
                            {isRefreshing ? 'Yenileniyor...' : pullDistance >= threshold ? 'Bırak' : 'Çek'}
                        </span>
                    </div>
                </div>
            )}

            {/* Content */}
            <div
                className="transition-transform duration-200 ease-out"
                style={{
                    transform: `translateY(${pullDistance}px)`
                }}
            >
                {children}
            </div>
        </div>
    );
};
