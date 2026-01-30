/**
 * usePayments Hook
 * 
 * Fetches payment records for a specific sale
 * Requirements: 5.1
 */

import { useListPaymentRecords } from '@/api/generated';

export const usePayments = (saleId: string): ReturnType<typeof useListPaymentRecords> => {
  return useListPaymentRecords(
    { saleId },
    {
      query: {
        enabled: !!saleId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: 2,
      },
    }
  );
};
