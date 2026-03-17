/**
 * Hook: search incoming invoices by product keyword.
 * Also falls back to inventory items when no invoice results are found.
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/orval-mutator';
import type { InventoryItem } from '@/types/inventory';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MatchedInvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  unit: string | null;
}

export interface InvoiceSearchResult {
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate: string | null;
  senderName: string;
  senderTaxNumber?: string | null;
  senderAddress?: string | null;
  senderCity?: string | null;
  senderDistrict?: string | null;
  matchedItems: MatchedInvoiceItem[];
}

export type InvoiceOrInventoryResult =
  | { type: 'invoice'; invoice: InvoiceSearchResult }
  | { type: 'inventory'; item: InventoryItem };

interface ApiResponse {
  success: boolean;
  data: { invoices: InvoiceSearchResult[]; total: number };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInvoiceProductSearch(
  inventoryItems: InventoryItem[],
  initialQuery = ''
) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce 300 ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const invoiceQuery = useQuery({
    queryKey: ['invoice-product-search', debouncedQuery],
    queryFn: () =>
      customInstance<ApiResponse>({
        url: '/api/invoices/incoming/search-by-product',
        method: 'GET',
        params: { q: debouncedQuery },
      }),
    enabled: debouncedQuery.trim().length >= 2,
    select: (data) => data?.data?.invoices ?? [],
    staleTime: 30_000,
  });

  const invoices: InvoiceSearchResult[] = invoiceQuery.data ?? [];
  const hasInvoices = invoices.length > 0;

  // Fallback: filter inventory items locally
  const matchedInventory: InventoryItem[] =
    !hasInvoices && debouncedQuery.trim().length >= 2
      ? inventoryItems.filter((item) => {
          const q = debouncedQuery.toLowerCase();
          return (
            item.name?.toLowerCase().includes(q) ||
            item.brand?.toLowerCase().includes(q) ||
            item.model?.toLowerCase().includes(q)
          );
        })
      : [];

  // Combined unified results list
  const results: InvoiceOrInventoryResult[] = hasInvoices
    ? invoices.map((inv) => ({ type: 'invoice' as const, invoice: inv }))
    : matchedInventory.map((item) => ({ type: 'inventory' as const, item }));

  return {
    query,
    setQuery,
    isLoading: invoiceQuery.isFetching,
    isError: invoiceQuery.isError,
    invoices,
    matchedInventory,
    results,
    /** True when search has run but found no invoices, fell back to inventory */
    isInventoryFallback: !hasInvoices && debouncedQuery.trim().length >= 2 && matchedInventory.length > 0,
    /** True when nothing at all matched */
    isEmpty:
      debouncedQuery.trim().length >= 2 &&
      !invoiceQuery.isFetching &&
      !hasInvoices &&
      matchedInventory.length === 0,
  };
}
