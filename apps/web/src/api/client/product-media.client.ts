/**
 * Product Media API Client Adapter
 *
 * Re-exports Orval-generated hooks and functions for product media operations.
 */
export {
  listProductMedia,
  createProductMedia,
  getMediaPresignedUrl,
  updateProductMedia,
  deleteProductMedia,
  reorderProductMedia,
  getListProductMediaQueryKey,
  useListProductMedia,
  useCreateProductMedia,
  useGetMediaPresignedUrl,
  useUpdateProductMedia,
  useDeleteProductMedia,
  useReorderProductMedia,
} from '@/api/generated/index';

export type {
  ProductMediaCreate,
  ProductMediaUpdate,
  ProductMediaRead,
  ProductMediaReorder,
  PresignedUrlRequest,
  PresignedUrlResponse,
} from '@/api/generated/schemas';
