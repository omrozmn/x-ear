/**
 * useCreatePaymentWithRefresh Hook
 * 
 * Wrapper around useCreatePaymentRecords that automatically invalidates
 * payment queries after successful payment creation
 * 
 * Requirements: 5.6
 */

import { useCreatePaymentRecords } from '@/api/generated';
import { useQueryClient } from '@tanstack/react-query';

export const useCreatePaymentWithRefresh = () => {
  const queryClient = useQueryClient();
  
  return useCreatePaymentRecords({
    mutation: {
      onSuccess: (data, variables) => {
        // Invalidate payment queries for the specific sale
        if (variables.data.saleId) {
          queryClient.invalidateQueries({
            queryKey: [`/api/sales/${variables.data.saleId}/payments`],
          });
        }
        
        // Also invalidate general payment queries
        queryClient.invalidateQueries({
          queryKey: ['/api/payment-records'],
        });
        
        // Invalidate party payment records if partyId is available
        if (variables.data.partyId) {
          queryClient.invalidateQueries({
            queryKey: [`/api/parties/${variables.data.partyId}/payment-records`],
          });
        }
      },
    },
  });
};
