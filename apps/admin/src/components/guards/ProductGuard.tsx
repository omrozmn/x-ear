import { ReactNode } from 'react';
import { PRODUCT_REGISTRY, ProductCode } from '@/config/productRegistry';

interface ProductGuardProps {
    currentProduct: string; // Tenant's product code
    allowedProducts?: string[]; // List of allowed product codes. If empty, allows all.
    children: ReactNode;
    fallback?: ReactNode;
}

export const ProductGuard = ({
    currentProduct,
    allowedProducts,
    children,
    fallback = null
}: ProductGuardProps) => {
    // Basic validation
    if (!currentProduct) return <>{children}</>;

    // logic: If allowedProducts is provided, currentProduct must be in it.
    // If not provided, assumed safe (or use specific feature flags later).

    if (allowedProducts && allowedProducts.length > 0) {
        if (!allowedProducts.includes(currentProduct)) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
};

// Helper for checking feature availability
export const isFeatureEnabled = (productCode: string, featureKey: string): boolean => {
    // Placeholder logic. Later we can add 'features' array to PRODUCT_REGISTRY.
    // For now, assume hearing specific features are only for xear_hearing
    if (featureKey === 'hearing_aids' || featureKey === 'sms_docs') {
        return productCode === 'xear_hearing';
    }
    return true;
};
