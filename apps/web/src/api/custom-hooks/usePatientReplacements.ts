import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { customInstance } from '../orval-mutator';

// Define the response type based on backend standard response
export interface Replacement {
    id: string;
    tenant_id: string;
    patient_id: string;
    sale_id?: string;
    old_device_id?: string;
    new_device_id?: string;
    old_device_info?: any;
    new_device_info?: any;
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
    [key: string]: any;
}

export type PatientsGetPatientReplacements200 = {
    data: Replacement[];
    meta: {
        count: number;
        timestamp: string;
    };
};

export const patientsGetPatientReplacements = (
    patientId: string,
    signal?: AbortSignal
) => {
    return customInstance<PatientsGetPatientReplacements200>({
        url: `/api/patients/${patientId}/replacements`,
        method: 'GET',
        signal,
    });
};

export const getPatientsGetPatientReplacementsQueryKey = (patientId: string) => {
    return [`/api/patients/${patientId}/replacements`] as const;
};

export const getPatientsGetPatientReplacementsQueryOptions = <
    TData = Awaited<ReturnType<typeof patientsGetPatientReplacements>>,
    TError = unknown
>(
    patientId: string,
    options?: {
        query?: Partial<
            UseQueryOptions<
                Awaited<ReturnType<typeof patientsGetPatientReplacements>>,
                TError,
                TData
            >
        >;
    }
): UseQueryOptions<Awaited<ReturnType<typeof patientsGetPatientReplacements>>, TError, TData> => {
    const { query: queryOptions } = options ?? {};
    const queryKey =
        queryOptions?.queryKey ?? getPatientsGetPatientReplacementsQueryKey(patientId);
    const queryFn = ({ signal }: { signal: AbortSignal }) =>
        patientsGetPatientReplacements(patientId, signal);
    return { queryKey, queryFn, enabled: !!patientId, ...queryOptions };
};

export const usePatientsGetPatientReplacements = <
    TData = Awaited<ReturnType<typeof patientsGetPatientReplacements>>,
    TError = unknown
>(
    patientId: string,
    options?: {
        query?: Partial<
            UseQueryOptions<
                Awaited<ReturnType<typeof patientsGetPatientReplacements>>,
                TError,
                TData
            >
        >;
    }
): UseQueryResult<TData, TError> => {
    const queryOptions = getPatientsGetPatientReplacementsQueryOptions(
        patientId,
        options
    );
    const query = useQuery(queryOptions) as UseQueryResult<TData, TError>;
    return query;
};
