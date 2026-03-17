/**
 * Stock Images API Client Adapter
 */
export {
  searchStockImages,
  downloadStockImage,
  useSearchStockImages,
  useDownloadStockImage,
} from '@/api/generated/index';

export type {
  StockImageResult,
  StockImageSearchResponse,
  StockImageDownloadRequest,
} from '@/api/generated/schemas';
