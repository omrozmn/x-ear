export const PRODUCT_REGISTRY = {
    xear_hearing: {
        name: "İşitme Merkezi",
        badge: "blue",
        enabled: true,
        creatable: true,
        sector: "hearing",
    },
    xear_pharmacy: {
        name: "Eczane",
        badge: "green",
        enabled: true,
        creatable: true,
        sector: "pharmacy",
    },
    xear_medical: {
        name: "Medikal Firma",
        badge: "teal",
        enabled: true,
        creatable: true,
        sector: "medical",
    },
    xear_optic: {
        name: "Optik Mağaza",
        badge: "violet",
        enabled: true,
        creatable: true,
        sector: "optic",
    },
    xear_beauty: {
        name: "Güzellik Salonu",
        badge: "pink",
        enabled: true,
        creatable: true,
        sector: "beauty",
    },
    xcalp: {
        name: "XCalp",
        badge: "purple",
        enabled: false,
        creatable: false,
        sector: "general",
    },
    xear_hospital: {
        name: "Hastane",
        badge: "red",
        enabled: true,
        creatable: true,
        sector: "hospital",
    },
    xear_hotel: {
        name: "Otel",
        badge: "orange",
        enabled: true,
        creatable: true,
        sector: "hotel",
    },
    xear_general: {
        name: "Genel CRM",
        badge: "gray",
        enabled: true,
        creatable: true,
        sector: "general",
    }
} as const;

export type ProductCode = keyof typeof PRODUCT_REGISTRY;

export const getProductConfig = (code: string) => {
    return PRODUCT_REGISTRY[code as ProductCode] || PRODUCT_REGISTRY.xear_hearing;
};

/**
 * Get the sector code for a given product code.
 */
export const getSectorForProduct = (productCode: string): string => {
    const config = PRODUCT_REGISTRY[productCode as ProductCode];
    return config?.sector || "hearing";
};

/**
 * Get all creatable products for the tenant creation form.
 */
export const getCreatableProducts = () => {
    return Object.entries(PRODUCT_REGISTRY)
        .filter(([, config]) => config.creatable)
        .map(([code, config]) => ({
            code,
            ...config,
        }));
};
