/**
 * Product Media API Client Adapter
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
