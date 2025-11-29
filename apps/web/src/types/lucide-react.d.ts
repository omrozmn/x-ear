// Type fix for lucide-react compatibility with React 19 types
import type React from 'react';

declare module 'lucide-react' {
    import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';

    export interface LucideProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
        size?: string | number;
        absoluteStrokeWidth?: boolean;
    }

    export type LucideIcon = ForwardRefExoticComponent<
        Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
    >;

    // Export all commonly used icons
    export const Plus: LucideIcon;
    export const Trash2: LucideIcon;
    export const Edit2: LucideIcon;
    export const Shield: LucideIcon;
    export const Lock: LucideIcon;
    export const Save: LucideIcon;
    export const X: LucideIcon;
    export const AlertCircle: LucideIcon;
    export const CheckCircle2: LucideIcon;
    export const Search: LucideIcon;
    export const Mail: LucideIcon;
    export const User: LucideIcon;
    export const Key: LucideIcon;
    export const CreditCard: LucideIcon;
    export const Calendar: LucideIcon;
    export const Calculator: LucideIcon;
}
