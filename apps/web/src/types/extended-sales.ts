import type { SaleRead } from '@/api/client/sales.client';

/**
 * Extended SaleRead interface to include fields injected by hybridCamelize at runtime
 * but missing from the strict OpenAPI generated schema.
 * 
 * @see !!RULES!!.md (Gap G-01: hybridCamelize bloat)
 */
export interface ExtendedSaleRead extends SaleRead {
    totalAmount?: number;
    paidAmount?: number;
    finalAmount?: number;
    discountAmount?: number;
    sgkCoverage?: number;
    partyPayment?: number;
    remainingAmount?: number;
    listPriceTotal?: number;
    productId?: string;

    // Legacy/Snake_case fields that might persist
    total_amount?: number;
    paid_amount?: number;
    final_amount?: number;
    discount_amount?: number;
    sgk_coverage?: number;
    patient_payment?: number;
    patientPayment?: number;
    totalPartyPayment?: number;
    party_payment?: number;
}

// Type guard to check if a sale has the extended fields
export function isExtendedSale(sale: SaleRead): sale is ExtendedSaleRead {
    return true; // Runtime objects imply this is always true for our app due to interceptors
}

// Helper to safely access total amount
export function getSaleTotalAmount(sale: ExtendedSaleRead): number {
    return sale.totalAmount ?? sale.total_amount ?? 0;
}

// Helper to safely access paid amount
export function getSalePaidAmount(sale: ExtendedSaleRead): number {
    return sale.paidAmount ?? sale.paid_amount ?? 0;
}
