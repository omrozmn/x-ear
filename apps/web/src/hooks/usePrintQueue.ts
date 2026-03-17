import { useQueryClient } from '@tanstack/react-query';
import {
  useListInvoicePrintQueue,
  useCreateInvoicePrintQueue,
  getListInvoicePrintQueueQueryKey,
  type InvoiceAddToQueueRequest,
} from '@/api/generated';

/**
 * Hook for managing invoice print queue operations
 * 
 * Features:
 * - Fetches print queue with automatic polling (5 second interval)
 * - Add invoices to print queue with automatic cache invalidation
 * - Note: Process functionality requires backend endpoint implementation
 * 
 * @returns Print queue data, loading states, and mutation functions
 */
export const usePrintQueue = () => {
  const queryClient = useQueryClient();

  // Fetch print queue with polling
  const queueQuery = useListInvoicePrintQueue({
    query: {
      refetchInterval: 5000, // Poll every 5 seconds
      retry: 2,
      staleTime: 0, // Always refetch on mount due to polling
    },
  });

  // Add to print queue mutation
  const addMutation = useCreateInvoicePrintQueue({
    mutation: {
      onSuccess: () => {
        // Invalidate print queue to trigger refetch
        queryClient.invalidateQueries({
          queryKey: getListInvoicePrintQueueQueryKey(),
        });
      },
    },
  });

  // Note: Process print queue functionality would require a backend endpoint
  // POST /api/invoices/print-queue/process
  // For now, this is a placeholder that would need backend implementation
  const processQueue = async () => {
    console.warn('Process print queue endpoint not implemented in backend');
    throw new Error('Process print queue functionality requires backend endpoint implementation');
  };

  return {
    // Queue data
    queue: queueQuery.data?.data,
    isLoading: queueQuery.isLoading,
    error: queueQuery.error,
    refetch: queueQuery.refetch,

    // Add to queue
    addToQueue: (data: InvoiceAddToQueueRequest) => addMutation.mutate({ data }),
    isAdding: addMutation.isPending,
    addError: addMutation.error,

    // Process queue (placeholder - requires backend implementation)
    processQueue,
    isProcessing: false, // Would be processMutation.isPending when implemented
  };
};
