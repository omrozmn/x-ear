/**
 * Cashflow API Hooks
 * Using Orval axios for consistent auth handling
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '../api/orval-mutator';
import type { CashRecord, CashRecordFormData, CashflowFilters } from '../types/cashflow';

const CASHFLOW_QUERY_KEY = 'cashflow';

interface CashRecordsResponse {
  success: boolean;
  data: CashRecord[];
  count: number;
}

interface CashRecordResponse {
  success: boolean;
  data: CashRecord;
  message?: string;
}

/**
 * Fetch cash records with optional filters
 */
export function useCashRecords(filters?: CashflowFilters) {
  return useQuery({
    queryKey: [CASHFLOW_QUERY_KEY, 'records', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.startDate) params.append('start_date', filters.startDate);
      if (filters?.endDate) params.append('end_date', filters.endDate);
      if (filters?.transactionType) params.append('transaction_type', filters.transactionType);
      if (filters?.recordType) params.append('record_type', filters.recordType);
      if (filters?.search) params.append('search', filters.search);

      const response = await customInstance<CashRecordsResponse>({
        url: `/api/cash-records?${params.toString()}`,
        method: 'GET',
      });

      return response.data;
    },
  });
}

/**
 * Create a new cash record
 */
export function useCreateCashRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CashRecordFormData) => {
      const response = await customInstance<CashRecordResponse>({
        url: '/api/cash-records',
        method: 'POST',
        data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASHFLOW_QUERY_KEY] });
    },
  });
}

/**
 * Update a cash record
 */
export function useUpdateCashRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CashRecord> }) => {
      const response = await customInstance<CashRecordResponse>({
        url: `/api/cash-records/${id}`,
        method: 'PUT',
        data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASHFLOW_QUERY_KEY] });
    },
  });
}

/**
 * Delete a cash record
 */
export function useDeleteCashRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      await customInstance({
        url: `/api/cash-records/${recordId}`,
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASHFLOW_QUERY_KEY] });
    },
  });
}
