/**
 * usePayments Hook
 * 
 * Fetches payment records for a specific sale
 * Requirements: 5.1
 */

import { useListSalePayments } from '@/api/generated';

export const usePayments = (saleId: string) => {
  return useListSalePayments(
    saleId,
    {
      query: {
        enabled: !!saleId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: 2,
      },
    }
  );
};
