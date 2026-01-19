export const PRODUCT_REGISTRY = {
    xear_hearing: {
        name: "İşitme Merkezi",
        badge: "blue",
        enabled: true,
        creatable: true
    },
    xear_pharmacy: {
        name: "Eczane",
        badge: "green",
        enabled: false,
        creatable: false // Future proofing
    },
    xcalp: {
        name: "XCalp",
        badge: "purple",
        enabled: false,
        creatable: false
    },
    xear_hospital: {
        name: "Hastane",
        badge: "red",
        enabled: false,
        creatable: false
    },
    xear_hotel: {
        name: "Otel",
        badge: "orange",
        enabled: false,
        creatable: false
    },
    xear_general: {
        name: "Genel",
        badge: "gray",
        enabled: false,
        creatable: false
    }
} as const;

export type ProductCode = keyof typeof PRODUCT_REGISTRY;

export const getProductConfig = (code: string) => {
    return PRODUCT_REGISTRY[code as ProductCode] || PRODUCT_REGISTRY.xear_hearing;
};
