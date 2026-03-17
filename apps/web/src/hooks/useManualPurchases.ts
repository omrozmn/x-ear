import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '@/api/orval-mutator';
import { getListDashboardQueryKey } from '@/api/client/dashboard.client';

export interface ManualPurchaseRead {
  id: string;
  supplierId: string;
  supplierName: string;
  purchaseDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency?: string | null;
  status: string;
  paymentMethod?: string | null;
  notes?: string | null;
  referenceNumber?: string | null;
  createdAt?: string | null;
  productName?: string | null;
}

export interface ManualPurchaseCreatePayload {
  supplierId: string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  purchaseDate?: string;
  notes?: string;
  referenceNumber?: string;
  productName?: string;
}

interface Envelope<T> {
  data?: T;
  meta?: Record<string, unknown> | null;
}

const MANUAL_PURCHASES_QUERY_KEY = ['manual-purchases'];
const CASHFLOW_QUERY_KEY = ['cashflow'];

export function useManualPurchases() {
  return useQuery({
    queryKey: MANUAL_PURCHASES_QUERY_KEY,
    queryFn: async () => {
      const response = await customInstance<Envelope<ManualPurchaseRead[]>>({
        url: '/api/purchases/manual',
        method: 'GET',
      });
      return Array.isArray(response.data) ? response.data : [];
    },
  });
}

export function useCreateManualPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ManualPurchaseCreatePayload) => {
      const response = await customInstance<Envelope<ManualPurchaseRead>>({
        url: '/api/purchases/manual',
        method: 'POST',
        data,
      });
      return response.data ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MANUAL_PURCHASES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CASHFLOW_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: getListDashboardQueryKey() });
    },
  });
}

export function useRecordManualPurchasePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { purchaseIds: string[]; paymentMethod: string; paymentDate?: string; amount?: number }) => {
      const response = await customInstance<Envelope<ManualPurchaseRead[]>>({
        url: '/api/purchases/manual/record-payment',
        method: 'POST',
        data,
      });
      return Array.isArray(response.data) ? response.data : [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MANUAL_PURCHASES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CASHFLOW_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: getListDashboardQueryKey() });
    },
  });
}
