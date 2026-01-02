import { useState, useEffect } from 'react';

export interface Breakpoints {
    xs: boolean;  // < 640px (phones)
    sm: boolean;  // >= 640px (large phones)
    md: boolean;  // >= 768px (tablets)
    lg: boolean;  // >= 1024px (desktop)
    xl: boolean;  // >= 1280px (large desktop)
}

export const useBreakpoint = (): Breakpoints => {
    const [breakpoints, setBreakpoints] = useState<Breakpoints>({
        xs: false,
        sm: false,
        md: false,
        lg: false,
        xl: false
    });

    useEffect(() => {
        const updateBreakpoints = () => {
            const width = window.innerWidth;
            setBreakpoints({
                xs: width < 640,
                sm: width >= 640 && width < 768,
                md: width >= 768 && width < 1024,
                lg: width >= 1024 && width < 1280,
                xl: width >= 1280
            });
        };

        updateBreakpoints();
        window.addEventListener('resize', updateBreakpoints);
        return () => window.removeEventListener('resize', updateBreakpoints);
    }, []);

    return breakpoints;
};

export const useIsMobile = (): boolean => {
    const breakpoints = useBreakpoint();
    return breakpoints.xs || breakpoints.sm;
};

export const useIsTablet = (): boolean => {
    const breakpoints = useBreakpoint();
    return breakpoints.md;
};

export const useIsDesktop = (): boolean => {
    const breakpoints = useBreakpoint();
    return breakpoints.lg || breakpoints.xl;
};
