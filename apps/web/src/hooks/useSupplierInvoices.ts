import { useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import {
    useSuppliersGetSupplierInvoices,
    useSuppliersGetSuggestedSuppliers,
    suppliersAcceptSuggestedSupplier,
    suppliersRejectSuggestedSupplier,
    getSuppliersGetSuggestedSuppliersQueryKey,
    getSuppliersGetSuppliersQueryKey,
    getSuppliersGetSupplierInvoicesQueryKey,
    useBirfaturaSyncInvoices
} from '@/api/generated';
import { SuppliersGetSupplierInvoicesType } from '@/api/generated/schemas/suppliersGetSupplierInvoicesType';
import { SuppliersGetSupplierInvoices200 } from '@/api/generated/schemas/suppliersGetSupplierInvoices200';
import { SuppliersGetSuggestedSuppliers200 } from '@/api/generated/schemas/suppliersGetSuggestedSuppliers200';
import { ErrorResponse } from '@/api/generated/schemas/errorResponse';

// Re-export types if needed by consumers
export type { PurchaseInvoice } from '@/api/generated/schemas/purchaseInvoice';
export type { SuggestedSupplier } from '@/api/generated/schemas/suggestedSupplier';

interface SupplierInvoicesParams {
    supplierId: string;
    page?: number;
    perPage?: number;
    type?: 'incoming' | 'outgoing' | 'all';
    startDate?: string;
    endDate?: string;
}

// Hook: Get supplier invoices
export const useSupplierInvoices = (params: SupplierInvoicesParams): Omit<UseQueryResult<SuppliersGetSupplierInvoices200, ErrorResponse>, 'data'> & { data: SuppliersGetSupplierInvoices200['data'] | undefined } => {
    // Map params to generated params
    const typeMap: Record<string, SuppliersGetSupplierInvoicesType> = {
        'incoming': SuppliersGetSupplierInvoicesType.incoming,
        'outgoing': SuppliersGetSupplierInvoicesType.outgoing,
        'all': SuppliersGetSupplierInvoicesType.all
    };

    const queryResult = useSuppliersGetSupplierInvoices(params.supplierId, {
        page: params.page,
        per_page: params.perPage,
        type: params.type ? typeMap[params.type] : SuppliersGetSupplierInvoicesType.all,
        start_date: params.startDate,
        end_date: params.endDate
    });

    const { data, ...rest } = queryResult;

    // Adapt response to match previous hook's return structure
    // Previous usage: data.invoices
    // Generated response: data.data.invoices
    return {
        ...rest,
        data: data?.data
    };
};

// Hook: Get suggested suppliers
export const useSuggestedSuppliers = (): Omit<UseQueryResult<SuppliersGetSuggestedSuppliers200, ErrorResponse>, 'data'> & { suggestedSuppliers: any[], success: boolean | undefined } => {
    const queryResult = useSuppliersGetSuggestedSuppliers();
    const { data, ...rest } = queryResult;
    
    return {
        suggestedSuppliers: data?.data?.suggestedSuppliers || [],
        success: data?.success,
        ...rest
    };
};

// Hook: Accept suggested supplier
export const useAcceptSuggestedSupplier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (suggestedId: number) => suppliersAcceptSuggestedSupplier(String(suggestedId)),
        onSuccess: () => {
            // Invalidate suggested suppliers and suppliers list
            queryClient.invalidateQueries({ queryKey: getSuppliersGetSuggestedSuppliersQueryKey() });
            queryClient.invalidateQueries({ queryKey: getSuppliersGetSuppliersQueryKey() });
        },
    });
};

// Hook: Reject suggested supplier
export const useRejectSuggestedSupplier = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (suggestedId: number) => suppliersRejectSuggestedSupplier(String(suggestedId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getSuppliersGetSuggestedSuppliersQueryKey() });
        },
    });
};

// Hook: Sync invoices from BirFatura
export const useSyncInvoices = () => {
    const queryClient = useQueryClient();
    const { mutateAsync, ...rest } = useBirfaturaSyncInvoices({
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
