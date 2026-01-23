/**
 * Supplier Invoices Hook - Uses real API endpoints
 * Supplier invoices are filtered from the main invoices endpoint
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCreateBirfaturaSyncInvoices } from '@/api/client/bir-fatura.client';
import { getListSuppliersQueryKey, useListSuppliers } from '@/api/client/suppliers.client';
import { useListInvoices } from '@/api/client/invoices.client';
import type { HTTPValidationError, InvoiceRead, SupplierRead } from '@/api/generated/schemas';

// ========== TYPES ==========

export interface PurchaseInvoice {
    id: string;
    invoiceNumber: string;
    supplierName: string;
    supplierId: string;
    date: string;
    totalAmount: number;
    status: 'pending' | 'paid' | 'cancelled';
    type: 'incoming' | 'outgoing';
}

export interface SuggestedSupplier {
    id: number;
    companyName: string;
    taxNumber?: string;
    taxOffice?: string;
    address?: string;
    city?: string;
    phone?: string;
    invoiceCount: number;
    totalAmount: number;
    firstInvoiceDate?: string;
    lastInvoiceDate?: string;
    currency?: string;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Transform invoice response to PurchaseInvoice format
 */
const transformInvoice = (invoice: InvoiceRead): PurchaseInvoice => ({
    id: String(invoice.id),
    invoiceNumber: invoice.invoiceNumber || '',
    supplierName: invoice.partyName || '', // Using partyName as supplier name fallback
    supplierId: String(invoice.partyId || ''),
    date: invoice.createdAt || '',
    totalAmount: invoice.devicePrice ? Number(invoice.devicePrice) : 0,
    status: (invoice.status as 'pending' | 'paid' | 'cancelled') || 'pending',
    type: 'incoming' as const,
});

// ========== HOOKS ==========

interface SupplierInvoicesParams {
    supplierId: string;
    page?: number;
    perPage?: number;
    type?: 'incoming' | 'outgoing' | 'all';
    startDate?: string;
    endDate?: string;
}

interface SupplierInvoicesResponse {
    invoices: PurchaseInvoice[];
    pagination: {
        total: number;
        page: number;
        perPage: number;
        totalPages: number;
    };
}

/**
 * Get invoices for a specific supplier
 * Uses the main invoices endpoint with filtering
 */
export const useSupplierInvoices = (params: SupplierInvoicesParams) => {
    const { supplierId, page = 1, perPage = 20 } = params;

    const { data, isLoading, isError, error, refetch } = useListInvoices({
        page,
        per_page: perPage,
        // Note: Backend doesn't have supplier_id filter yet,
        // so we fetch all and filter client-side as fallback
    });

    // Transform and filter the response
    const response: SupplierInvoicesResponse | undefined = data?.data ? {
        invoices: (Array.isArray(data.data) ? data.data : [])
            .filter((inv: InvoiceRead) => String(inv.partyId) === supplierId)
            .map(transformInvoice),
        pagination: {
            total: data.meta?.total || 0,
            page: data.meta?.page || page,
            perPage: data.meta?.perPage || perPage,
            totalPages: data.meta?.totalPages || 1,
        },
    } : undefined;

    return {
        data: response,
        isLoading,
        isError,
        error,
        refetch,
    };
};

/**
 * Get suggested suppliers from existing suppliers list
 * Calculates invoice counts and totals from available data
 */
export const useSuggestedSuppliers = () => {
    const { data, isLoading, isError, error, refetch } = useListSuppliers({
        per_page: 100,
        is_active: true,
    });

    // Transform suppliers to suggested format
    const suggestedSuppliers: SuggestedSupplier[] = data?.data
        ? (Array.isArray(data.data) ? data.data : []).map((supplier: SupplierRead) => ({
            id: Number(supplier.id) || 0,
            companyName: supplier.name || '',
            taxNumber: supplier.taxNumber ? String(supplier.taxNumber) : undefined,
            taxOffice: supplier.taxOffice ? String(supplier.taxOffice) : undefined,
            address: supplier.address ? String(supplier.address) : undefined,
            city: supplier.city ? String(supplier.city) : undefined,
            phone: supplier.phone ? String(supplier.phone) : undefined,
            invoiceCount: 0, // Would need separate API call to get accurate count
            totalAmount: supplier.totalPurchases || 0,
            currency: 'TRY',
        }))
        : [];

    return {
        suggestedSuppliers,
        success: !isError,
        isLoading,
        isError,
        error,
        refetch,
    };
};

/**
 * Accept a suggested supplier - creates the supplier in the system
 * Since suppliers already exist in our system, this is mostly a no-op
 */
export const useAcceptSuggestedSupplier = () => {
    const queryClient = useQueryClient();

    return useMutation<void, HTTPValidationError, number>({
        mutationFn: async (suggestedId: number) => {
            // The supplier already exists in the database
            // This hook is kept for API compatibility
            console.log(`[useAcceptSuggestedSupplier] Accepting supplier ID: ${suggestedId}`);
            // In a real implementation, this might update a "suggested" flag to "accepted"
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        },
    });
};

/**
 * Reject a suggested supplier
 * In practice, this could hide the supplier from suggestions
 */
export const useRejectSuggestedSupplier = () => {
    const queryClient = useQueryClient();

    return useMutation<void, HTTPValidationError, number>({
        mutationFn: async (suggestedId: number) => {
            // In a real implementation, this might set a "rejected" flag
            console.log(`[useRejectSuggestedSupplier] Rejecting supplier ID: ${suggestedId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
        },
    });
};

// ========== WORKING HOOKS (Backend'de mevcut) ==========

/**
 * ✅ WORKING: Sync invoices from BirFatura
 */
export const useSyncInvoices = () => {
    const queryClient = useQueryClient();
    const { mutateAsync, ...rest } = useCreateBirfaturaSyncInvoices({
        mutation: {
            onSuccess: () => {
                // Invalidate all invoice-related queries
                queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
            }
        }
    });

    return {
        mutateAsync: async (params?: { startDate?: string; endDate?: string }) => {
            return mutateAsync({
                data: {
                    start_date: params?.startDate,
                    end_date: params?.endDate
                }
            });
        },
        ...rest
    };
};
