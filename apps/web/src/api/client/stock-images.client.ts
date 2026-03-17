/**
 * Stock Images API Client
 */
import { customInstance } from '@/api/orval-mutator';
import { useQuery, useMutation } from '@tanstack/react-query';

export interface StockImageResult {
  id: string;
  provider: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  photographer?: string;
  description?: string;
}

export interface StockImageSearchResponse {
  results: StockImageResult[];
  total: number;
  page: number;
  perPage: number;
}

// API
export const searchStockImages = (params: { query: string; provider?: string; page?: number; perPage?: number }) =>
  customInstance<{ data: StockImageSearchResponse }>({
    url: '/api/stock-images/search',
    method: 'GET',
    params,
  });

export const downloadStockImage = (data: { provider: string; imageId: string; imageUrl: string; inventoryId: string }) =>
  customInstance<{ data: unknown }>({ url: '/api/stock-images/download', method: 'POST', data });

// Hooks
export function useSearchStockImages(params: { query: string; provider?: string; page?: number; perPage?: number }) {
  return useQuery({
    queryKey: ['stock-images', params],
    queryFn: () => searchStockImages(params),
    enabled: !!params.query,
  });
}

export function useDownloadStockImage() {
  return useMutation({ mutationFn: downloadStockImage });
}
