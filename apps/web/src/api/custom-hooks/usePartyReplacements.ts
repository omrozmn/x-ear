import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { customInstance } from '../orval-mutator';

// Define the response type based on backend standard response
export interface Replacement {
    id: string;
    tenant_id: string;
    party_id: string;
    sale_id?: string;
    old_device_id?: string;
    new_device_id?: string;
    old_device_info?: Record<string, unknown>;
    new_device_info?: Record<string, unknown>;
    replacement_reason?: string;
    status: string;
    price_difference?: number;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: string;
    gib_sent?: boolean;
    return_invoice_id?: string;
    return_invoice_status?: string;
    [key: string]: unknown;
}

export type PartiesGetPartyReplacements200 = {
    data: Replacement[];
    meta: {
        count: number;
        timestamp: string;
    };
};

export const partiesGetPartyReplacements = (
    partyId: string,
    signal?: AbortSignal
) => {
    return customInstance<PartiesGetPartyReplacements200>({
        url: `/api/parties/${partyId}/replacements`,
        method: 'GET',
        signal,
    });
};

export const getPartiesGetPartyReplacementsQueryKey = (partyId: string) => {
    return [`/api/parties/${partyId}/replacements`] as const;
};

export const getPartiesGetPartyReplacementsQueryOptions = <
    TData = Awaited<ReturnType<typeof partiesGetPartyReplacements>>,
    TError = unknown
>(
    partyId: string,
    options?: {
        query?: Partial<
            UseQueryOptions<
                Awaited<ReturnType<typeof partiesGetPartyReplacements>>,
                TError,
                TData
            >
        >;
    }
): UseQueryOptions<Awaited<ReturnType<typeof partiesGetPartyReplacements>>, TError, TData> => {
    const { query: queryOptions } = options ?? {};
    const queryKey =
        queryOptions?.queryKey ?? getPartiesGetPartyReplacementsQueryKey(partyId);
    const queryFn = ({ signal }: { signal: AbortSignal }) =>
        partiesGetPartyReplacements(partyId, signal);
    return { queryKey, queryFn, enabled: !!partyId, ...queryOptions };
};

export const usePartiesGetPartyReplacements = <
    TData = Awaited<ReturnType<typeof partiesGetPartyReplacements>>,
    TError = unknown
>(
    partyId: string,
    options?: {
        query?: Partial<
            UseQueryOptions<
                Awaited<ReturnType<typeof partiesGetPartyReplacements>>,
                TError,
                TData
            >
        >;
    }
): UseQueryResult<TData, TError> => {
    const queryOptions = getPartiesGetPartyReplacementsQueryOptions(
        partyId,
        options
    );
    const query = useQuery(queryOptions) as UseQueryResult<TData, TError>;
    return query;
};
