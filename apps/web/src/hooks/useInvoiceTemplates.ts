/**
 * useInvoiceTemplates Hook
 * 
 * Fetches invoice templates from the API with proper caching and error handling.
 */

import { useListInvoiceTemplates } from '@/api/client/invoices.client';
import type { InvoiceTemplate } from '@/api/generated/schemas';

export interface UseInvoiceTemplatesResult {
  templates: InvoiceTemplate[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useInvoiceTemplates(): UseInvoiceTemplatesResult {
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useListInvoiceTemplates({
    query: {
      staleTime: 15 * 60 * 1000, // 15 minutes - templates don't change often
      retry: 2,
      refetchOnWindowFocus: false,
    },
  });

  // Unwrap ResponseEnvelope to get templates array
  const templates = response?.data || [];

  return {
    templates,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
