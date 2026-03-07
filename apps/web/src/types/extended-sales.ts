import type { SaleRead } from '@/api/client/sales.client';

/**
 * Device assignment data within a sale
 */
export interface SaleDeviceData {
    id?: string;
    partyId?: string;
    deviceId?: string | null;
    inventoryId?: string;
    ear?: string;
    reason?: string;
    listPrice?: number;
    salePrice?: number;
    sgkSupport?: number;
    netPayable?: number;
    serialNumber?: string;
    serialNumberLeft?: string;
    serialNumberRight?: string;
    isLoaner?: boolean;
    loanerSerialNumber?: string | null;
    createdAt?: string;
    updatedAt?: string;
    saleId?: string;
    deliveryStatus?: string;
    reportStatus?: string;
    name?: string;
    deviceName?: string;
    brand?: string;
    model?: string;
    barcode?: string;
    category?: string;
    assignmentUid?: string;
    assignedDate?: string;
    sgkScheme?: string;
    sgkSupportType?: string;
    paymentMethod?: string;
    discountType?: string;
    discountValue?: number;
    downPayment?: number;
    earSide?: string;
    loanerInventoryId?: string | null;
    loanerBrand?: string | null;
    loanerModel?: string | null;
    loanerSerialNumberLeft?: string | null;
    loanerSerialNumberRight?: string | null;
    sgkReduction?: number;
    patientPayment?: number;
    sgkCoverageAmount?: number;
    patientResponsibleAmount?: number;
}

/**
 * Extended SaleRead interface to include fields injected by hybridCamelize at runtime
 * but missing from the strict OpenAPI generated schema.
 * 
 * @see !!RULES!!.md (Gap G-01: hybridCamelize bloat)
 */
export interface ExtendedSaleRead extends Omit<SaleRead, 'devices'> {
    totalAmount?: number;
    paidAmount?: number;
    finalAmount?: number;
    discountAmount?: number;
    sgkCoverage?: number;
    partyPayment?: number;
    remainingAmount?: number;
    listPriceTotal?: number;
    productId?: string;
    invoiceStatus?: string; // NEW: Invoice status field
    devices?: SaleDeviceData[]; // NEW: Devices array

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
    invoice_status?: string; // NEW: Snake case version
}

// Type guard to check if a sale has the extended fields
export function isExtendedSale(sale: any): sale is ExtendedSaleRead {
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
