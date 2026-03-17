/**
 * Supplier Invoices Hook - Uses real API endpoints
 * Supplier invoices are filtered from the main invoices endpoint
 */
import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCreateBirfaturaSyncInvoices } from '@/api/client/bir-fatura.client';
import { getListSuppliersQueryKey, useListSuppliers, useCreateSupplier } from '@/api/client/suppliers.client';
import { useListInvoices, getListInvoicesQueryKey, useListIncomingInvoices } from '@/api/client/invoices.client';
import type { HTTPValidationError, InvoiceRead, SupplierRead, IncomingInvoiceResponse } from '@/api/generated/schemas';

// ========== TYPES ==========

export interface PurchaseInvoice {
    id: string;
    invoiceId?: number;
    invoiceNumber: string;
    supplierName: string;
    supplierId: string;
    date: string;
    totalAmount: number;
    status: 'pending' | 'paid' | 'cancelled';
    type: 'incoming' | 'outgoing';
}

export interface SuggestedInvoice {
    invoiceId: number;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    currency: string;
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
    invoices?: SuggestedInvoice[];
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
 * Get suggested suppliers derived from BirFatura incoming invoices.
 * Groups invoices by supplierName + supplierTaxNumber, calculates stats,
 * then excludes suppliers that already exist in the user's supplier list.
 */
export const useSuggestedSuppliers = () => {
    // Fetch incoming invoices from BirFatura (the new endpoint)
    const { data: invoicesData, isLoading: invoicesLoading, isError: invoicesError, error: invoicesErr, refetch: refetchInvoices } = useListIncomingInvoices({
        page: 1,
        per_page: 500,
    });

    // Fetch existing suppliers to exclude them from suggestions
    const { data: suppliersData, isLoading: suppliersLoading } = useListSuppliers({
        per_page: 200,
        is_active: true,
    });

    // Get rejected supplier keys from localStorage
    const [rejectedKeys, setRejectedKeys] = useState<Set<string>>(() => {
        try {
            const stored = localStorage.getItem('rejected_suggested_suppliers');
            return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
        } catch {
            return new Set();
        }
    });

    // Build a set of existing supplier names (lowercased) for matching
    const existingSupplierNames = useMemo(() => {
        if (!suppliersData?.data) return new Set<string>();
        const arr: SupplierRead[] = Array.isArray(suppliersData.data) ? suppliersData.data : [];
        const names = new Set<string>();
        arr.forEach(s => {
            if (s.name) names.add(s.name.toLowerCase());
            if (s.companyName) names.add(s.companyName.toLowerCase());
            if (s.taxNumber) names.add(String(s.taxNumber).toLowerCase());
        });
        return names;
    }, [suppliersData]);

    // Group invoices by supplier and compute suggestions
    const suggestedSuppliers: SuggestedSupplier[] = useMemo(() => {
        const invoices: IncomingInvoiceResponse[] = invoicesData?.data?.invoices ?? [];
        if (!invoices.length) return [];

        // Group by supplierName + supplierTaxNumber
        const grouped = new Map<string, {
            supplierName: string;
            taxNumber?: string;
            invoices: IncomingInvoiceResponse[];
        }>();

        invoices.forEach(inv => {
            const name = inv.supplierName;
            if (!name) return;
            const key = (inv.supplierTaxNumber || name).toLowerCase().trim();
            if (!grouped.has(key)) {
                grouped.set(key, { supplierName: name, taxNumber: inv.supplierTaxNumber || undefined, invoices: [] });
            }
            grouped.get(key)!.invoices.push(inv);
        });

        // Convert to SuggestedSupplier format, excluding already-registered and rejected ones
        const suggestions: SuggestedSupplier[] = [];
        let autoId = 1;

        grouped.forEach((group, key) => {
            // Skip if this supplier already exists in user's supplier list
            if (existingSupplierNames.has(key)) return;
            if (group.taxNumber && existingSupplierNames.has(group.taxNumber.toLowerCase())) return;
            // Skip if rejected
            if (rejectedKeys.has(key)) return;

            const totalAmount = group.invoices.reduce((sum, inv) => {
                return sum + Number(inv.totalAmount || 0);
            }, 0);

            const dates = group.invoices
                .map(inv => inv.invoiceDate || inv.createdAt)
                .filter(Boolean)
                .sort() as string[];

            const suggestedInvoices: SuggestedInvoice[] = group.invoices.map(inv => ({
                invoiceId: inv.invoiceId,
                invoiceNumber: inv.invoiceNumber || '',
                invoiceDate: inv.invoiceDate || inv.createdAt || '',
                totalAmount: Number(inv.totalAmount || 0),
                currency: inv.currency || 'TRY',
            }));

            suggestions.push({
                id: autoId++,
                companyName: group.supplierName,
                taxNumber: group.taxNumber,
                invoiceCount: group.invoices.length,
                totalAmount,
                firstInvoiceDate: dates[0] ?? undefined,
                lastInvoiceDate: dates[dates.length - 1] ?? undefined,
                currency: 'TRY',
                invoices: suggestedInvoices,
            });
        });

        // Sort by invoice count descending
        return suggestions.sort((a, b) => b.invoiceCount - a.invoiceCount);
    }, [invoicesData, existingSupplierNames, rejectedKeys]);

    const rejectLocally = useCallback((supplierKey: string) => {
        setRejectedKeys(prev => {
            const next = new Set(prev);
            next.add(supplierKey.toLowerCase().trim());
            localStorage.setItem('rejected_suggested_suppliers', JSON.stringify([...next]));
            return next;
        });
    }, []);

    return {
        suggestedSuppliers,
        success: !invoicesError,
        isLoading: invoicesLoading || suppliersLoading,
        isError: invoicesError,
        error: invoicesErr,
        refetch: refetchInvoices,
        rejectLocally,
    };
};

/**
 * Accept a suggested supplier - creates a new supplier from invoice data
 */
export const useAcceptSuggestedSupplier = () => {
    const queryClient = useQueryClient();
    const createMutation = useCreateSupplier();

    return useMutation<void, HTTPValidationError, SuggestedSupplier>({
        mutationFn: async (suggested: SuggestedSupplier) => {
            await createMutation.mutateAsync({
                data: {
                    companyName: suggested.companyName,
                    name: suggested.companyName,
                    taxNumber: suggested.taxNumber,
                    taxOffice: suggested.taxOffice,
                    address: suggested.address,
                    city: suggested.city,
                    phone: suggested.phone,
                    isActive: true,
                },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        },
    });
};

/**
 * Reject a suggested supplier - stores the rejection in localStorage
 * Returns a helper that the component calls with the supplier's companyName
 */
export const useRejectSuggestedSupplier = () => {
    const queryClient = useQueryClient();

    return useMutation<void, HTTPValidationError, string>({
        mutationFn: async (companyName: string) => {
            const key = companyName.toLowerCase().trim();
            try {
                const stored = localStorage.getItem('rejected_suggested_suppliers');
                const arr: string[] = stored ? JSON.parse(stored) : [];
                if (!arr.includes(key)) arr.push(key);
                localStorage.setItem('rejected_suggested_suppliers', JSON.stringify(arr));
            } catch {
                // Ignore localStorage errors
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
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
                    startDate: params?.startDate,
                    endDate: params?.endDate
                }
            });
        },
        ...rest
    };
};
