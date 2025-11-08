/**
 * Cashflow API Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
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
      
      const response = await apiClient.get<CashRecordsResponse>(
        `/cash-records?${params.toString()}`
      );
      
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
      const response = await apiClient.post<CashRecordResponse>('/cash-records', data);
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
      const response = await apiClient.post<CashRecordResponse>(`/cash-records/${id}`, data);
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
      const response = await apiClient.delete(`/cash-records/${recordId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CASHFLOW_QUERY_KEY] });
    },
  });
}
