/**
 * Custom hook for virtual scrolling functionality
 * Provides efficient rendering for large lists
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  totalItems: number;
  overscan?: number;
}

interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  offsetY: number;
  totalHeight: number;
}

export const useVirtualScroll = ({
  itemHeight,
  containerHeight,
  totalItems,
  overscan = 5
}: UseVirtualScrollOptions): [VirtualScrollResult, (scrollTop: number) => void] => {
  const [scrollTop, setScrollTop] = useState(0);

  const virtualScrollResult = useMemo((): VirtualScrollResult => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + overscan * 2);
    const offsetY = startIndex * itemHeight;
    const totalHeight = totalItems * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      offsetY,
      totalHeight
    };
  }, [scrollTop, itemHeight, containerHeight, totalItems, overscan]);

  const handleScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  return [virtualScrollResult, handleScroll];
};

/**
 * Hook for infinite scroll functionality
 */
interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
  onLoadMore: () => void;
}

export const useInfiniteScroll = ({
  hasMore,
  loading,
  threshold = 200,
  onLoadMore
}: UseInfiniteScrollOptions) => {
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    if (hasMore && !loading && scrollTop + clientHeight >= scrollHeight - threshold) {
      onLoadMore();
    }
  }, [hasMore, loading, threshold, onLoadMore]);

  return { handleScroll };
};

/**
 * Hook for lazy loading with intersection observer
 */
interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
}

export const useLazyLoading = ({
  threshold = 0.1,
  rootMargin = '50px'
}: UseLazyLoadingOptions = {}) => {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  const observerRef = useCallback((node: HTMLElement | null, itemId: string) => {
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleItems(prev => new Set(prev).add(itemId));
        } else {
          setVisibleItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.unobserve(node);
    };
  }, [threshold, rootMargin]);

  const isVisible = useCallback((itemId: string) => {
    return visibleItems.has(itemId);
  }, [visibleItems]);

  return { observerRef, isVisible, visibleItems };
};

/**
 * Hook for performance monitoring
 */
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    scrollFPS: 0,
    memoryUsage: 0
  });

  const measureRenderTime = useCallback((callback: () => void) => {
    const start = performance.now();
    callback();
    const end = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      renderTime: end - start
    }));
  }, []);

  const measureScrollFPS = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setMetrics(prev => ({
          ...prev,
          scrollFPS: frameCount
        }));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }, []);

  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
      }));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(measureMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [measureMemoryUsage]);

  return {
    metrics,
    measureRenderTime,
    measureScrollFPS,
    measureMemoryUsage
  };
};

export default useVirtualScroll;